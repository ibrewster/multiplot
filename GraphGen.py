import h5py
import obspy
import pymysql
import pandas
import numpy

import plotly.graph_objects as go

from datetime import datetime
pandas.options.plotting.backend = "plotly"


class MYSQlCursor():
    def __init__(self, DB, user = 'israel', password = "Sh@nima1981"):
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


COLORS = {
    'UNASSIGNED': '#888888',
    'GREEN': '#00FF00',
    'YELLOW': '#FFFF00',
    'ORANGE': '#FFA500',
    'RED': '#FF0000',
}


def get_color_codes(volcano):
    SQL = """
    SELECT sent_utc,color_code
    FROM code_change_date
    INNER JOIN volcano ON volcano.volcano_id=code_change_date.volcano_id
    WHERE volcano_name=%s
    ORDER BY sent_utc
    """
    with MYSQlCursor('hans2') as cursor:
        cursor.execute(SQL, (volcano, ))
        change_dates = cursor.fetchall()

    change_dates = pandas.DataFrame(change_dates, columns = ["date", "Code"])
    change_dates['color'] = change_dates.replace({"Code": COLORS, })["Code"]
    change_dates["date"] = pandas.to_datetime(change_dates["date"])
    change_dates["value"] = [1] * len(change_dates["Code"])
    change_dates.set_index('date', inplace = True)

    return change_dates


def plot_color_code(volcano):
    cc = get_color_codes(volcano)
    last_date = None
    last_color = None
    fig = go.Figure(layout = {
        'height': 200,
        'showlegend': False,
        'yaxis': {
            'autorange': False,
            'range': [0, 1],
            'dtick': 1,
            'fixedrange': True,
            'showticklabels': False,
        },
    })

    # TODO: figure out if a horizontally stacked line chart would work more easily for this.
    for row in cc.itertuples():
        if not last_date:
            last_date = row.Index
            last_color = row.color
            line = go.scatter.Line(color = last_color, width = 0)
            continue
        x = [str(last_date), str(row.Index)]
        y = [1, 1]

        trace = go.Scatter(x = x, y = y, mode = 'lines',
                           fill = 'tozeroy', fillcolor = last_color, line = line)
        if fig is None:
            fig = go.Figure(data = trace)
        else:
            fig.add_trace(trace)

        last_date = row.Index
        last_color = row.color
        line = go.scatter.Line(color = last_color, width = 0)

    # Add the final value. Arguably end date should be "current day"
    x = [last_date, last_date + pandas.DateOffset(days = 5)]
    y = [1, 1]

    fig.add_trace(go.Scatter(x = x, y = y, mode = 'lines',
                             fill = 'tozeroy', fillcolor = last_color, line = line))

    return fig.data


def plot_so2():
    filename = "Lopez_2013_OMI_SO2timeseries_final.csv"

    def date_parser(date, time):
        if type(time) != str:
            return datetime.strptime(date, "%m/%d/%y")

        return datetime.strptime(date + ' ' + time, "%m/%d/%y %H:%M")

    df = pandas.read_csv(filename, parse_dates = {'date': ['Date', 'Time UTC']},
                         date_parser = date_parser)

    # Plot Mass vs Date
    fig = df.plot(x = "date", y = "OMI Mass (tonnes)", title = "SO2 Mass")

    # Plot Emissison rate vs Date
    fig2 = df.plot(x = "date", y = "OMI ER (t/d)", title = "SO2 Emission Rate")

    return fig2.data


def plot_aster():
    filename = "Wessels2011_ASTER.csv"
    df = pandas.read_csv(filename, parse_dates = {'date': ['Date']})
    fig = df.plot(x = 'date', y = 'deltaT', title = 'Max temperature minus background mean')
    df.plot(x = 'date', y = 'Number of pixels greater than background mean + 3SD', title = '# Pixels > Mean')
    df.plot(x = 'date', y = 'Highest sub-pixel temps (C)', title = 'Highest Sub-pixel Temp')

    return fig.data


def plot_quakes():
    events_file = "sub_catalog_layer.xml"
    cat = obspy.core.event.read_events(events_file)

    # Get the interesting data out into a format I can work with.
    data = pandas.DataFrame([(event.origins[0].time,
                              event.magnitudes[0].mag,
                              event.origins[0].depth,
                              event.origins[0].longitude,
                              event.origins[0].latitude,
                              event.comments[4].text.split("=")[1])
                             for event in cat if
                             event.magnitudes],
                            columns = ["Date", "Magnitude", "Depth", "longitude", "latitude", "FI"])

    data.sort_values("Date", inplace = True)
    data.reset_index(inplace = True)

    cc = plot_color_code('Redoubt')
    magPlot = go.Scatter(x = data["Date"], y = data["Magnitude"], yaxis = 'y2',
                         mode = "markers")
    depthPlot = go.Scatter(x = data["Date"], y = data["Depth"], yaxis = 'y3', mode = "markers")
    FIPlot = go.Scatter(x = data["Date"], y = data["FI"], yaxis = 'y4', mode = "markers")

    plot_data = cc + (magPlot, depthPlot, FIPlot)

    fig = go.Figure(data = plot_data,
                    layout = {
                        'title': {
                            'text': 'Seismic Activity',
                        },
                        'height': 1000,
                        'showlegend': False,
                        'yaxis': {
                            'autorange': False,
                            'range': [0, 1],
                            'fixedrange': True,
                            'showticklabels': False,
                            'domain': [.97, 1]
                        },
                        'yaxis2': {
                            'domain': [.64, .95],
                            'title': "Magnitude",
                        },
                        'yaxis3': {
                            'domain': [.32, .63],
                            'title': 'Depth (m)',
                        },
                        'yaxis4': {
                            'domain': [0, .31],
                            'title': 'FI',
                        },
                    })

    # Plot geographically
    plot = go.Scattermapbox(lon = data['longitude'], lat = data['latitude'], mode = 'markers',
                            marker = {
        'color': data.index.tolist(),
        'colorscale': 'Reds',
    }
    )
    fig2 = go.Figure(data = plot)
    fig2.update_layout(title = "May Swarm Events", geo_scope = 'usa',
                       mapbox_style="white-bg",
                       mapbox_layers=[
                               {
                                   "below": 'traces',
                                   "sourcetype": "raster",
                                   "sourceattribution": "United States Geological Survey",
                                   "source": [
                                       "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}"
                                   ]
                               }
                       ]
                       )

    return (plot_data[-1], )


def plot_multi():
    cc = plot_color_code('Redoubt')
    so2 = plot_so2()
    so2[0]['yaxis'] = 'y2'
    aster = plot_aster()
    aster[0]['yaxis'] = 'y3'
    quakes = plot_quakes()

    plot_data = cc + so2 + aster + quakes

    fig = go.Figure(data = plot_data,
                    layout = {
                        'title': {
                            'text': 'Multi-Disciplinary Activity',
                        },
                        'height': 1000,
                        'showlegend': False,
                        'yaxis': {
                            'autorange': False,
                            'range': [0, 1],
                            'fixedrange': True,
                            'showticklabels': False,
                            'domain': [.97, 1]
                        },
                        'yaxis2': {
                            'domain': [.64, .95],
                            'title': "OMI ER (t/d)",
                        },
                        'yaxis3': {
                            'domain': [.32, .63],
                            'title': 'Max Temp - bkg mean (ºC)',
                        },
                        'yaxis4': {
                            'domain': [0, .31],
                            'title': 'FI',
                        },
                    })

    fig.show()


if __name__ == "__main__":
    # plot_color_code('Redoubt')
    # plot_so2()
    # plot_aster()
    # plot_quakes()
    plot_multi()
