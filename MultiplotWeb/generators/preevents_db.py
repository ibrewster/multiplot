"""Generic database table plotting function. Should be written to work with ANY table provided."""
from datetime import timedelta
from urllib.parse import parse_qs

import flask
import pandas
import psycopg

from .. import utils

def plot_preevents_dataset(tag, volcano, start=None, end=None):
    """Get plot data for a specified dataset from the database"""

    category, title = tag.split("|")
    query_string = flask.request.args.get('addArgs', '')
    requested_types = parse_qs(query_string).get('types')

    METADATA_SQL = """SELECT
        array_agg(datastream_id),
        array_agg(device_name),
        array_agg(variable_name),
        array_agg(unit_name)
    FROM datastreams
    INNER JOIN devices ON devices.device_id=datastreams.device_id
    INNER JOIN variables ON variables.variable_id=datastreams.variable_id
    INNER JOIN units ON variables.unit_id=units.unit_id
    WHERE datastream_displayname=%s
    AND volcano_id=%s
    """

    args = [[]]

    data_sql = """
        SELECT timestamp, datavalue, device_name
        FROM datavalues
        INNER JOIN datastreams ON datastreams.datastream_id=datavalues.datastream_id
        INNER JOIN devices ON devices.device_id=datastreams.device_id
        WHERE datavalues.datastream_id=ANY(%s)
        AND datavalue IS NOT NULL
    """

    if start is not None:
        data_sql += " AND timestamp>=%s"
        start -= timedelta(days = 366)
        args.append(start)
    if end is not None:
        end += timedelta(days = 366)
        data_sql += " AND timestamp<=%s"
        args.append(end)

    data_sql += " ORDER BY device_name, timestamp"

    meta_args = (title, utils.VOLC_IDS[volcano])
    if requested_types is not None:
        METADATA_SQL += " AND device_name=ANY(%s)"
        meta_args.append(requested_types)

    with utils.PREEVENTSSQLCursor() as cursor:
        cursor.execute(METADATA_SQL, meta_args)
        metadata = cursor.fetchone()

        if metadata is None:
            raise FileNotFoundError(f"Unable to locate config for {category} - {title}")

        datastreams, types, variables, units = metadata
        args[0] = datastreams
        # args[0] = tuple(args[0])

        # Compose the data request SQL statement
        cursor.execute(data_sql, args)
        df = pandas.DataFrame(cursor, columns=['datetime', 'value', 'type'])

    df['datetime'] = df['datetime'].apply(lambda x: pandas.to_datetime(x).isoformat())
    result ={
        'labels': units,
        'plotOverrides': None,
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
