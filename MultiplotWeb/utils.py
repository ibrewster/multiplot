import inspect
import re
import warnings

from collections import defaultdict
from collections.abc import Iterable
from contextvars import ContextVar
from functools import wraps, partial
from html.parser import HTMLParser
from io import StringIO

import pandas
import psycopg
import pymysql

from psycopg.cursor import Cursor as Psycopg3Cursor

import numpy as np

from . import config, google, DBMetadata

# TODO: better way of defining this? We need the latitude and longitude of the
# view center - which may not be the same as the "volcano location" - as well
# as a zoom level. But only for volcanoes with data.
VOLCANOES = {
    'Augustine': [59.3626, -153.435, 12],
    'Bogoslof': [53.9272, -168.0344, 11],
    'Redoubt': [60.4852, -152.7438, 11],
    'Cleveland': [52.8222, -169.945, 10],
    'Okmok': [53.397, -168.166, 10],
    'Pavlof': [55.4173, -161.8937, 11],
    'Shishaldin': [54.7554, -163.9711, 11],
    'Veniaminof': [56.1979, -159.3931, 10],
}
VOLC_IDS = {}

# DATA_DIR = os.path.join(app.static_folder, 'data')
DATA_DIR = '/shared/data/multiplot'

current_plot_tag = ContextVar("current_plot_tag")

class MYSQLCursor():
    def __init__(self, DB, user = config.GDDB_USER, password = config.GDDB_PASS):
        self._conn = None
        self._db = DB
        self._user = user
        self._pass = password
        self._server = config.GDDB_HOST

    def __enter__(self) -> pymysql.cursors.Cursor:
        self._conn = pymysql.connect(user = self._user, password = self._pass,
                                     database = self._db, host = self._server)
        return self._conn.cursor()

    def __exit__(self, *args, **kwargs):
        self._conn.rollback()
        self._conn.close()


class PostgreSQLCursor():
    def __init__(self, DB, user = config.PGDB_USER, password = config.PGDB_PASS,
                 host = config.PGDB_HOST, row_factory = None):
        self._conn = None
        self._db = DB
        self._user = user
        self._pass = password
        self._server = host
        self._row_factory = row_factory

    def __enter__(self) -> Psycopg3Cursor:
        self._conn = psycopg.connect(user = self._user, password = self._pass,
                                     dbname = self._db, host = self._server)
        return self._conn.cursor(row_factory = self._row_factory)

    def __exit__(self, *args, **kwargs) -> None:
        self._conn.rollback()
        self._conn.close()

# The PREEVENTS db is postgresql, so we can just re-use the above PostgreSQL cursor,
# but with different default settings.
PREEVENTSSQLCursor = partial(
    PostgreSQLCursor,
    DB = "preevents",
    user = config.PREEVENTS_USER,
    password = config.PREEVENTS_PASS,
    host = config.PREEVENTS_HOST
)


######## Generator Decorator########
# This decorator registers a function with a category and label to do three things:
# 1) Create a label-->function lookup dictionary so python knows what function to run
#    when the user requests a plot with a given label.
# 2) Add the label to a list for the category to be used when generating
#    the select list in the javascript.
# 3) Create a label-->function *name* lookup dictionary to be used by the javascript to
#    determine what plotting function to run when the user requests a plot with a given
#    label (requires the existance of a javascript plotting function with the same name
#    as the python function)
#####################################
GEN_FUNCS = {}
GEN_CATEGORIES = defaultdict(list)
JS_FUNCS = {}
GEN_DESCRIPTIONS: list[pandas.DataFrame] = []


def generator(label_or_labels_or_func, category=None, description = None):
    """
    Decorator to register a function under one or more (label, category) pairs.

    Accepts:
    ---------
    label_or_labels_or_func : str | list[str] | list[tuple[str, str]] | Callable
        - A single string label (uses default or global category)
        - A list of string labels (all use default or global category)
        - A list of (label, category) tuples
        - A function returning one of the above

    category : str, optional
        The fallback category to use if labels are not paired with explicit categories.
        If omitted, the decorator looks for a `CATEGORY` global variable defined in the
        module where the decorator is used.

    Returns:
    --------
    Callable
        The decorated function, registered under all specified label/category pairs.

    Notes:
    ------
    - If a tuple contains more than two elements, only the first two are used.
      This allows passing extra metadata without interfering with registration.
    """
    # Try to determine a default category from the caller's module if not provided explicitly
    frame = inspect.stack()[1]
    if category is None:
        category = frame.frame.f_globals.get('CATEGORY') # May still be None, fine depending on how labels is passed.

    if callable(description):
        GEN_DESCRIPTIONS.append(description())

    labels = resolve_labels(label_or_labels_or_func, category)
    category_doc = frame.frame.f_globals.get('__doc__')

    def inner(func):
        desc_rows = {}
        default_func_doc = desc_from_docstring(func.__doc__)

        for label, category in labels:
            if category is None:
                raise ValueError(f"No category provided for label {label}")

            if category not in GEN_CATEGORIES:
                GEN_CATEGORIES[category] = []

            tag = f"{category}|{label}"

            if label in GEN_CATEGORIES[category]:
                raise ValueError(f"Label '{label}' is duplicated in category '{category}'.")

            GEN_CATEGORIES[category].append(label)
            GEN_FUNCS[tag] = func
            JS_FUNCS[tag] = func.__name__

            # descriptions
            # Add function-level label description
            if not callable(description):
                func_doc = None
                if isinstance(description, dict):
                    # Try label+category key first, then label alone, else fallback
                    func_doc = description.get((label, category)) or description.get(label)
                elif isinstance(description, str):
                    if len(labels) > 1:
                        raise ValueError("Need dict or callable description for multiple labels")
                    func_doc = description
                elif description is None and len(labels) == 1:
                    func_doc = default_func_doc
                elif description is not None:
                    raise ValueError("description must be either callable, dictionary, string, or None")

                if func_doc is not None:
                    desc_rows[(category, label)] = (category, label, func_doc)

                # Add category-level description if not already present
                if (category, '') not in desc_rows:
                    desc_rows[(category, '')] = (category, '', category_doc)

        if desc_rows:
            df = create_description_dataframe(desc_rows.values())
            GEN_DESCRIPTIONS.append(df)

        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        return wrapper

    return inner

###############Other utility functions #################

def desc_from_docstring(docstring: str) -> str:
    """
    If a DESCRIPTION: section exists in the docstring, use it.
    Otherwise return the entire docstring.
    """
    if not docstring:
        return ''
    match = re.search(r"DESCRIPTION:(.*)", docstring, re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else docstring.strip()


# Normalize input into a list of (label, category) tuples
def resolve_labels(value, default_category):
    """
    Normalize various input types into a list of (label, category) pairs.
    Category may be None if not provided.
    """

    # If a function is passed in, call it and treat the result as the label input
    if callable(value):
        value = value()

    if isinstance(value, str):
        return [(value, default_category)]

    if isinstance(value, Iterable): # str is already handled, so no need to check here.
        out = []
        for item in value:
            if isinstance(item, str):
                out.append((item, default_category))
            elif isinstance(item, (tuple, list)) and len(item) >= 2:
                label, category = item[:2]
                if not (isinstance(label, str) and isinstance(category, str)):
                    raise TypeError("Label and category in tuple/list must both be strings.")
                out.append((label, category))
                if len(item) > 2:
                    warnings.warn("Ignoring extra elements in label/category tuple")
            else:
                raise TypeError("Iterable must contain strings or (label, category) tuples/lists.")
        return out

    else:
        raise TypeError(
            "Argument must be a string, iterable of strings or (label, category) pairs, or a function returning one of those."
        )


def create_description_dataframe(data: list[tuple], columns=['Category', 'Dataset', 'Description']) -> pandas.DataFrame:
    """
    Creates a standardized description DataFrame with proper formatting and indexing.

    ARGUMENTS
    ---------
        data: List of tuples containing the raw data
        columns: Column names for the DataFrame (default: ['Category', 'Dataset', 'Description'])

    RETURNS
    -------
        pandas.DataFrame: Formatted DataFrame with MultiIndex
    """
    df = pandas.DataFrame(data, columns=columns)

    # Strip HTML formatting from Category and Dataset
    df['Category'] = df['Category'].apply(stripHTML)
    df['Dataset'] = df['Dataset'].apply(stripHTML)

    # Create MultiIndex from Category and Dataset
    df.index = pandas.MultiIndex.from_frame(df[['Category', 'Dataset']])

    return df

class Stripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.reset()
        self.strict = False
        self.convert_charrefs = True
        self.text = StringIO()

    def handle_data(self, data):
        # This function is only called for the raw text, so tags don't show up here.
        self.text.write(data)
    def get_clean(self):
        return self.text.getvalue()

def stripHTML(value):
    html = Stripper()
    html.feed(value)
    return html.get_clean()

def haversine_np(lon1, lat1, lon2, lat2):
    """
    Calculate the great circle distance between two points
    on the earth (specified in decimal degrees)

    Less precise than vincenty, but fine for short distances,
    and works on vector math

    Returns distance in KM

    """
    lon1, lat1, lon2, lat2 = map(np.radians, [lon1, lat1, lon2, lat2])

    dlon = lon2 - lon1
    dlat = lat2 - lat1

    a = np.sin(dlat / 2.0)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2.0)**2

    c = 2 * np.arcsin(np.sqrt(a))
    km = 6367 * c
    return km


def get_volcs():
    # Default is Geodiva
    volcs = tuple(VOLCANOES.keys())
    #Default is Geodiva
    with MYSQLCursor(DB = 'geodiva') as cursor:
        cursor.execute(
            "SELECT volcano_id, volcano_name,latitude,longitude FROM volcano WHERE volcano_name in %s OR (observatory='avo' AND monitored=true AND volcano_id=volcano_parent_id) ORDER BY longitude DESC", # OR (observatory='avo' and volcano_id=volcano_parent_id)", # AND monitored=true)",
            (volcs, )
        )

        for volc in cursor:
            (volc_id, volc_name,
             latitude, longitude) = volc

            VOLC_IDS[volc_name] = volc_id
            if volc_name not in VOLCANOES:
                VOLCANOES[volc_name] = [latitude, longitude, 10]

def get_db_labels():
    """Get a list of datasets from the database"""
    from .generators import database
    with PostgreSQLCursor("multiplot") as cursor:
        cursor.execute("SELECT title, categories.name FROM plotinfo INNER JOIN categories ON categories.id=category WHERE visible=true")
        for title, category in cursor:
            tag = f"{category}|{title}"
            if not title in GEN_CATEGORIES[category]:
                GEN_CATEGORIES[category].append(title)

            # Use the database by default, so if there is already a function
            # for this category and title, this database version will override it.
            func = partial(database.plot_db_dataset, tag)
            GEN_FUNCS[tag] = func
            JS_FUNCS[tag] = database.plot_db_dataset.__name__

def get_combined_details():
    to_concat = GEN_DESCRIPTIONS.copy()
    try:
        g_details = google.get_data()
        to_concat.append(g_details)
    except Exception as e:
        print(f"Unable to get google sheet descriptions. {e}")

    db_details = DBMetadata.get_db_details()
    to_concat.append(db_details)
    # preevents_details = DBMetadata.get_preevents_db_details()
    # to_concat.append(preevents_details)

    details = pandas.concat(to_concat, sort=True, copy=False)
    # Entries from the google spreadsheet override identical entries from the database
    # Change 'first' to 'last' to reverse this logic.
    details = details[~details.index.duplicated(keep='first')]
    details = details.sort_index();

    return details
