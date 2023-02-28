import os
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

