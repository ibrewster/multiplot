"""
    get_color_codes.py

    Sample code to retrieve a list of color code changes for a given volcano.
    Uses the HANS database to retrieve color codes for 2008-present, but could be modified
    to also query GEODIVA for older records, if needed.
"""
import pymysql
import pandas


class MYSQlCursor():
    """
        MySQL cursor class to be used as a context manager for connecting to a MySQL database
    """

    def __init__(self, DB: str, user: str, password: str):
        self._conn = None
        self._db = DB
        self._user = user
        self._pass = password
        self._server = 'augustine.snap.uaf.edu'

    def __enter__(self):
        self._conn = pymysql.connect(user = self._user, password = self._pass,
                                     database = self._db, host = self._server)
        return self._conn.cursor()

    def __exit__(self, *args, **kwargs):
        self._conn.rollback()
        self._conn.close()


def get_color_codes(volcano: str) -> pandas.DataFrame:
    """
        Retrieve a dataframe of color code changes for a specified volcano

        PARAMETERS
        __________
        volcano: str
            The volcano for which to retrieve color code changes. Must match the
            volcano_name column in the database

        RETURNS
        -------
        change_dates:DataFrame
            A data frame with a datetime index and one column which is the
            color code to which the volcano was changed at that time.
    """

    SQL = """
    SELECT
        sent_utc,
        color_code
    FROM code_change_date
    INNER JOIN volcano ON volcano.volcano_id=code_change_date.volcano_id
    WHERE volcano_name=%s
    ORDER BY sent_utc
    """

    ###################
    # NOTE: you will need to replace my_user and  my_pass with valid DB credentials that have
    # at least SELECT privileges on the hans2 schema
    ###################
    with MYSQlCursor('hans2', 'my_user', 'my_pass') as cursor:
        cursor.execute(SQL, (volcano, ))
        change_dates = cursor.fetchall()

    # This doesn't do much with the results, just converts the date field into a pandas datetime
    # object and creates a dataframe containing a column with the color code for each date it changed.
    # It is left as an excercise for the reader to do something usefull with this data :-)
    change_dates = pandas.DataFrame(change_dates, columns = ["date", "Code"])
    change_dates["date"] = pandas.to_datetime(change_dates["date"])
    change_dates.set_index('date', inplace = True)

    return change_dates


if __name__ == "__main__":
    # Simple test code, just retrieves and prints the listing of color code changes for Redoubt
    code_changes = get_color_codes('Redoubt')
    print(code_changes)
