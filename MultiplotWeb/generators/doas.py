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
    tag = utils.current_plot_tag.get()

    category, title = tag.split("|")
    column = column_mapping[title]
    query_string = flask.request.args.get('addArgs', '')
    args = parse_qs(query_string)
    station = args.get('station', 'clne')
    SQL = sql.SQL("""
                  SELECT datetime date, {column} y
                  FROM doas
                  WHERE instrument_id = %s
                    AND datetime BETWEEN %s
                    AND %s""").format(column=sql.Identifier(column))

    with utils.PostgreSQLCursor("multiplot") as cursor:
        cursor.execute(SQL, (station, start, end))
        df=pandas.DataFrame(cursor, columns = ['date', 'y'])
        df['date'] = df['date'].apply(lambda x: pandas.to_datetime(x).isoformat())

    return df.to_dict(orient = "list")
