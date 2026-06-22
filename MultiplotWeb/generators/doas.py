from psycopg import sql

CATEGORY = "Gas - Terrestrial"

from urllib.parse import parse_qs

import flask
import pandas

from . import utils, generator
column_mapping = {
    'DOAS SO<sub>2</sub> rate': 'so2_rate_t_d',
    'DOAS Wind Speed': 'wind_speed',
    'DOAS Wind Direction': 'wind_direction',
    'DOAS Temperature': 'temperature',
    'DOAS Plume Height': 'plume_height'
}

@generator(column_mapping.keys())
def plot_doas(volcano, start=None, end=None):
    volc_id = utils.VOLC_IDS[volcano]
    tag = utils.current_plot_tag.get()

    category, title = tag.split("|")
    column = column_mapping[title]
    # query_string = flask.request.args.get('addArgs', '')
    # args = parse_qs(query_string)
    # station = args.get('station', 'clne')
    SQL = sql.SQL("""
                  SELECT datetime date, {column} y, instrument_id type, COALESCE (plume_completeness>0.5, FALSE) as plume_complete
                  FROM doas
                  WHERE volcano = %s
                    AND plume_completeness > 0.5
                    AND datetime BETWEEN %s
                    AND %s""").format(column=sql.Identifier(column))

    with utils.PostgreSQLCursor("multiplot") as cursor:
        cursor.execute(SQL, (volc_id,start, end))
        df=pandas.DataFrame(cursor, columns = ['date', 'y','type','complete'])

    if df.empty:
        raise FileNotFoundError("Unable to find requested data")

    df['date'] = df['date'].dt.strftime('%Y-%m-%d %H:%M:%S')
    grouped_df = df.groupby('type')

    result = {
        str(x): {
            'date':grp['date'].tolist(),
            'y':grp['y'].tolist(),
            'plume_complete': grp['complete'].tolist()
        }
        for x, grp in grouped_df
    }
    return result

@generator("DOAS Availability")
def doas_availability(volcano, start=None, end=None):
    volc_id = utils.VOLC_IDS[volcano]
    SQL = sql.SQL("""
                  WITH instruments AS (SELECT DISTINCT instrument_id
                                       FROM doas
                                       WHERE volcano = %(volc)s),
                       days AS (SELECT generate_series(%(start)s::date, %(stop)s::date,
                                                       interval '1 day')::date AS day)
                  SELECT days.day AS date,
                         instruments.instrument_id,
                         EXISTS (SELECT 1
                                 FROM doas
                                 WHERE doas.volcano = %(volc)s
                                   AND doas.instrument_id = instruments.instrument_id
                                   AND doas.datetime >= days.day
                                   AND doas.datetime < days.day + interval '1 day') AS has_records
                  FROM days
                      CROSS JOIN instruments
                  ORDER BY days.day, instruments.instrument_id;
                  """)

    with utils.PostgreSQLCursor("multiplot") as cursor:
        cursor.execute(SQL, {'volc': volc_id, 'start': start, 'stop': end})
        df = pandas.DataFrame(cursor, columns = ['date', 'instrument_id', 'has_records'])

    pivot = df.pivot(index='instrument_id', columns='date', values='has_records')
    result = {
        'date': pivot.columns.astype(str).tolist(),
        'y': pivot.index.tolist(),
        'z': pivot.fillna(0).astype(int).values.tolist(),
    }

    return result