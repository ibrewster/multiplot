import inspect
import os

from functools import wraps, partial
from collections import defaultdict

import pandas
import psycopg
import pymysql

import numpy as np

from . import config, app, google, DBMetadata

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

DATA_DIR = os.path.join(app.static_folder, 'data')


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

    def __enter__(self) -> psycopg.Cursor:
        self._conn = psycopg.connect(user = self._user, password = self._pass,
                                     dbname = self._db, host = self._server)
        return self._conn.cursor(row_factory = self._row_factory)

    def __exit__(self, *args, **kwargs) -> None:
        self._conn.rollback()
        self._conn.close()


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


def generator(label: str):
    """
    A wrapper to register a function with a category and label.
    label is provided as an argument to the decorator, while the category
    is the filename in which the wrapped function lives.
    """
    frame = inspect.stack()[1]
    category = frame.frame.f_globals['CATEGORY']

    tag = f"{category}|{label}"

    if label in GEN_CATEGORIES[category]:
        raise ValueError(f"Label '{label}' is duplicated. Labels must be unique.")

    # Register the label under the specified category
    GEN_CATEGORIES[category].append(label)

    def inner(func):
        # Register the function itself into a lookup dictionary we can use
        # to call the specified function when the specified label is selected
        # by the user.
        GEN_FUNCS[tag] = func

        # And store the function *name* in a seperate dictionary we can use on the
        # javascript side for a similar purpose.
        JS_FUNCS[tag] = func.__name__

        #Then we can just run the function as normal when called :-)
        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return inner

###############Other utility functions #################


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
            "SELECT volcano_id, volcano_name,latitude,longitude FROM volcano WHERE volcano_name in %s OR (observatory='avo' and volcano_id=volcano_parent_id)", # AND monitored=true)",
            (volcs, )
        )

        for volc in cursor:
            (volc_id, volc_name,
             latitude, longitude) = volc

            VOLC_IDS[volc_name] = volc_id
            if volc_name not in VOLCANOES:
                VOLCANOES[volc_name] = [latitude, longitude, 10]

def get_db_labels():
    from .generators import database
    with PostgreSQLCursor("multiplot") as cursor:
        cursor.execute("SELECT title, categories.name FROM plotinfo INNER JOIN categories ON categories.id=category")
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
    g_details = google.get_data()
    db_details = DBMetadata.get_db_details()
    
    details = pandas.concat([g_details, db_details], sort=True, copy=False)
    # Entries from the google spreadsheet override identical entries from the database
    # Change 'first' to 'last' to reverse this logic.
    details = details[~details.index.duplicated(keep='first')]
    details = details.sort_index();
    
    return details
    