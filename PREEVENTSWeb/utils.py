import os

from functools import wraps
from collections import defaultdict

import psycopg
import pymysql

from . import config, app


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


GEN_FUNCS = {}
GEN_CATEGORIES = defaultdict(list)
JS_FUNCS = {}

def generator(category: str, label: str):
    """A wrapper to register a function with a category and label"""
    GEN_CATEGORIES[category].append(label)
    def inner(func):
        GEN_FUNCS[label] = func
        JS_FUNCS[label] = func.__name__
        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return inner