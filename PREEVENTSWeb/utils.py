import os

from functools import wraps
from collections import defaultdict

import psycopg
import pymysql

import numpy as np

from . import config, app

# TODO: better way of defining this? We need the latitude and longitude of the 
# view center - which may not be the same as the "volcano location" - as well 
# as a zoom level. But only for volcanoes with data.
VOLCANOES = {
    'Augustine': [59.3626,-153.435,12],
    'Bogoslof': [53.9272,-168.0344,11], 
    'Redoubt': [60.4852,-152.7438,11],
    'Cleveland':[52.8222,-169.945,10] ,
    'Okmok': [53.397,-168.166,10], 
    'Pavlof': [55.4173,-161.8937,11],
    'Shishaldin': [54.7554,-163.9711,11],
    'Veniaminof': [56.1979,-159.3931,10],
}

DATA_DIR = os.path.join(app.static_folder, 'data')

class MYSQlCursor():
    def __init__(self, DB, user = config.DB_USER, password = config.DB_PASS):
        self._conn = None
        self._db = DB
        self._user = user
        self._pass = password
        self._server = config.DB_HOST

    def __enter__(self):
        self._conn = pymysql.connect(user = self._user, password = self._pass,
                                     database = self._db, host = self._server)
        return self._conn.cursor()

    def __exit__(self, *args, **kwargs):
        self._conn.rollback()
        self._conn.close()
        
class PostgreSQLCursor():
    def __init__(self, DB, user = config.PGDB_USER, password = config.PGDB_PASS):
        self._conn = None
        self._db = DB
        self._user = user
        self._pass = password
        self._server = config.PGDB_HOST

    def __enter__(self):
        self._conn = psycopg.connect(user = self._user, password = self._pass,
                                     database = self._db, host = self._server)
        return self._conn.cursor()

    def __exit__(self, *args, **kwargs):
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

def generator(category: str, label: str):
    """A wrapper to register a function with a category and label"""
    if label in GEN_CATEGORIES[category]:
        raise ValueError(f"Label '{label}' is duplicated. Labels must be unique.")
    # Register the label under the specified category
    GEN_CATEGORIES[category].append(label)
    
    def inner(func):
        # Register the function itself into a lookup dictionary we can use 
        # to call the specified function when the specified label is selected 
        # by the user.
        GEN_FUNCS[label] = func
        
        # And store the function *name* in a seperate dictionary we can use on the 
        # javascript side for a similar purpose.
        JS_FUNCS[label] = func.__name__
        
        #Then we can just run the function as normal when called :-)
        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return inner

def haversine_np(lon1, lat1, lon2, lat2):
    """
    Calculate the great circle distance between two points
    on the earth (specified in decimal degrees)

    Less precise than vincenty, but fine for short distances,
    and works on vector math

    """
    lon1, lat1, lon2, lat2 = map(np.radians, [lon1, lat1, lon2, lat2])

    dlon = lon2 - lon1
    dlat = lat2 - lat1

    a = np.sin(dlat / 2.0)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2.0)**2

    c = 2 * np.arcsin(np.sqrt(a))
    km = 6367 * c
    return km