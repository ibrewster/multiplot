CATEGORY = "Geodesy"

from urllib.parse import parse_qs

import flask
import pandas
import requests

from . import utils, generator

@generator([
    'Radial Deformation',
    'Transverse Deformation',
    'Vertical Deformation'
])
def plot_geodesy_dataset(volcano, start, end):
    tag = utils.current_plot_tag.get()
    category, title = tag.split('|')
    part = title.split()[0]
    error = part + " Error"
    label = part + " (cm)"
    if part == "Vertical":
        # Vertical is different. Because of course it is.
        part = "UD"
        error = "UDE"

    query_string = flask.request.args.get('addArgs', '')
    args = parse_qs(query_string)
    station = args.get('station')
    base = args.get('base')

    if station is None:
        sta_req = requests.get(f'https://apps.avo.alaska.edu/geodesy/api/sites/{volcano}/stations')
        sta_req.raise_for_status()
        stations = sta_req.json()
        station = stations[0]['id']

    volc_req = requests.get(f'https://apps.avo.alaska.edu/geodesy/api/sites/{volcano}')
    volc_req.raise_for_status()
    volc_info = volc_req.json()

    data_args = {
        'station': station,
        'from': start.isoformat(),
        'to': end.isoformat(),
        'format': 'RTU',
        'RTULat': volc_info['lat'],
        'RTULon': volc_info['lon'],
        'output': 'json',
    }

    if base is not None:
        data_args['baseline'] = base

    data_req = requests.get('https://apps.avo.alaska.edu/geodesy/api/gnss/data', params=data_args)
    data_req.raise_for_status()
    data = data_req.json()
    df = pandas.DataFrame(data)
    if df.empty:
        raise FileNotFoundError("No data found for this site/base pair")

    df = df[[part, error, "date"]].rename(columns={
        part: "y",
        error: "y_error",
    })

    # Start at 0 to match web
    df['y'] -= df['y'][0]
    ret_dict = df.to_dict(orient="list")
    ret_dict['ylabel'] = label
    return ret_dict

