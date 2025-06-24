from contextvars import ContextVar
from functools import partial
from html.parser import HTMLParser
from io import StringIO

import pandas
import psycopg
import pymysql

from psycopg.cursor import Cursor as Psycopg3Cursor

import numpy as np

from . import config

########## Global description decorator/functions ##########
GEN_DESCRIPTION_SOURCES = []
def global_description_source(func):
    """
    Registers a function that returns a pandas DataFrame of descriptions.
    Each function must return a DataFrame indexed by (category, label),
    with a 'Description' column.

    These sources will be included in generator_descriptions().
    """
    GEN_DESCRIPTION_SOURCES.append(func)
    return func

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

############## GENERAL UTILITY FUNCTIONS ################

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
