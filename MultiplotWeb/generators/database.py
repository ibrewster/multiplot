"""Generic database table plotting function. Should be written to work with ANY table provided."""
from datetime import timedelta
from urllib.parse import parse_qs

import flask
import pandas
import psycopg

from .. import utils

def plot_db_dataset(tag, volcano, start=None, end=None):
    """Get plot data for a specified dataset from the database"""

    category, title = tag.split("|")
    query_string = flask.request.args.get('addArgs', '')
    requested_types = parse_qs(query_string).get('types')

    METADATA_SQL = """SELECT
    tablename, value_column, units, types, plot_format
    FROM plotinfo
    WHERE title=%s
    AND category=(
        SELECT id
        FROM categories
        WHERE name=%s
    )
    """

    COLUMN_SQL = """
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema='public'
    AND table_name=%s
    """

    args = [utils.VOLC_IDS[volcano], ]

    data_sql = """
        SELECT datetime, {fields}
        FROM {table}
        WHERE volcano=%s
    """

    if start is not None:
        data_sql += " AND datetime>=%s"
        start -= timedelta(days = 366)
        args.append(start)
    if end is not None:
        end += timedelta(days = 366)
        data_sql += " AND datetime<=%s"
        args.append(end)


    with utils.PostgreSQLCursor("multiplot") as cursor:
        cursor.execute(METADATA_SQL, (title, category))
        metadata = cursor.fetchone() # better be one, and only one, otherwise
        # there's a bug in the code.

        if metadata is None:
            raise FileNotFoundError(f"Unable to locate config for {category} - {title}")

        table, field, units, types, plot_format = metadata

        # get table columns
        cursor.execute(COLUMN_SQL, (table, ))
        columns = [x[0] for x in cursor]
        result_cols = ['datetime', 'value']
        fields = [field]
        if('error' in columns):
            fields.append('error')
            result_cols.append('error')
        if('error2' in columns):
            fields.append('error2')
            result_cols.append('error2')
        if('type' in columns):
            fields.append('type')
            result_cols.append('type')
            if requested_types:
                data_sql += " AND type=ANY(%s)"
                args.append(requested_types)

        sql_fields = psycopg.sql.SQL(',').join([
            psycopg.sql.Identifier(x)
            for x in fields
        ])

        data_sql += " ORDER BY datetime"

        # Compose the data request SQL statement
        data_query = psycopg.sql.SQL(data_sql).format(
            fields=sql_fields,
            table=psycopg.sql.Identifier(table)
        )
        cursor.execute(data_query, args)
        df = pandas.DataFrame(cursor, columns=result_cols)

    if len(df) == 0:
        raise FileNotFoundError("Unable to find requested data")
    
    df['datetime'] = df['datetime'].apply(lambda x: pandas.to_datetime(x).isoformat())
    result ={
        'labels': units,
        'plotOverrides': plot_format,
    }

    if types is not None:
        type_df = df.groupby("type")
        for record_type in types:
            try:
                result[record_type] = type_df.get_group(record_type).to_dict(orient='list')
            except KeyError:
                if type(units) == dict and record_type in units:
                    del units[record_type]
    else:
        result[title] = df.to_dict(orient='list')


    return result
