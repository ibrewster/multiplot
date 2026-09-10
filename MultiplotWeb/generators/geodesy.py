CATEGORY = "Geodesy"

from pathlib import Path
from urllib.parse import parse_qs

import flask
import h5py
import pandas
import requests

from . import utils, generator, config, app

@generator("LOS Deformation")
def plot_los_deformation(volcano, start, end):
    from . import _insar_utils # Only import if needed
    with utils.PostgreSQLCursor("multiplot") as cursor:
        try:
            cursor.execute(
                """SELECT 
                       label, 
                       insar_pixel_selection.latitude, 
                       insar_pixel_selection.longitude, 
                       ref_latitude, 
                       ref_longitude, 
                       source_file 
                   FROM insar_pixel_selection
                   INNER JOIN volcano ON volcano.volcano_id=insar_pixel_selection.volcano_id
                   WHERE is_active=TRUE AND volcano_name=%s""",
                (volcano,)
            )
        except Exception as e:
            app.logger.error(f"Unable to load metadata: {e}")
            raise

        metadata = cursor.fetchall()
    if not metadata:
        raise FileNotFoundError("No source pixel found for this volcano")
    source=metadata[0]
    source_point= (source[1], source[2])
    ref_point= (source[3], source[4])

    # Find the source file in the Overlay directory
    source_opts=config.OVERLAY_DIR.rglob(f"*/insar/timeseries_{source[5]}.h5")

    source_file:str|None=None
    for source_opt in source_opts:
        if source_opt.is_file():
            source_file=source_opt
            break

    if source_file is None:
        raise FileNotFoundError("No source file found for this volcano")

    insar_data = _insar_utils.process_insar_timeseries(source_file,source_point,ref_point)

    return {
        'date': insar_data['dates'],
        'y': insar_data['ts'],
        "ylabel": "cm/year"
    }

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

