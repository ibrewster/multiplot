"""
RemoteSensing.py

Data generation functions for the Remote Sensing discipline.

"""
CATEGORY = "Remote Sensing"
import os

from datetime import timedelta
from urllib.parse import parse_qs

import flask
import pandas

from .. import utils, config
from ..utils import generator


##############Thermal###############
FILE_LOOKUP = {
    'Augustine': 'augu',
    'Bogoslof': 'bogo',
    'Redoubt': 'redo',
    'Cleveland': 'clev',
    'Okmok': 'okmo_mirova',
    'Pavlof': 'pavl',
    'Shishaldin': 'shis',
    'Veniaminof': 'veni_mirova',
}

################ Loaders ################


def load_viirs_data(volc, start, end):
    viirs_csv_filename = f"V4_{FILE_LOOKUP[volc]}.csv"
    viirs_csv_path = os.path.join(utils.DATA_DIR, 'VIIRS 2012-2022', viirs_csv_filename)
    return load_data(viirs_csv_path, start, end)


def load_modis_data(volc, start, end):
    files = {}
    for sat in ['Aqua', 'Terra']:
        modis_csv_filename = f"{FILE_LOOKUP[volc]}_{sat}.csv"
        modis_csv_path = os.path.join(utils.DATA_DIR, 'MODIS 2000-2021', modis_csv_filename)
        files[sat] = load_data(modis_csv_path, start, end)

    modis_data = files['Aqua'].merge(files['Terra'], how = 'outer')
    return modis_data


def load_data(csv_path, start, end):
    data = pandas.read_csv(csv_path)
    data['image_time'] = pandas.to_datetime(data['image_time'])
    data['unet_class'] = data['unet_class'].replace({'True': 1, 'False': 0, "0.0":
                                                     0}).astype(int)

    data.set_index('image_time', drop = False, inplace = True)
    data.index.rename('date', inplace = True)

    # Probably overly complicated, but does a single filtering operation if both start and end
    # are specified.
    if start is not None and end is not None:
        data = data.loc[start:end]
    else:
        if start is not None:
            data = data.loc[start:]
        if end is not None:
            data = data.loc[:end]

    return data

############ Remote Detections #################
def get_detection_data(volcano: str, start, end) -> pandas.DataFrame:
    volc_id = utils.VOLC_IDS[volcano]
    args = [volc_id]

    SQL = """
SELECT DISTINCT
    date,
    ((mass_prelim*1000)/plume_age)*24 as rate,
    keyword.keyword_id as type,
    icon,
    mass_prelim as mass
FROM report
LEFT JOIN report_volcano AS rv ON report.report_id=rv.report_id
LEFT JOIN report_volcano_keyword AS rvk ON rv.report_volcano_id=rvk.report_volcano_id
LEFT JOIN report_volcano_keyword_meta AS rvkm  ON rvk.report_volcano_keyword_id=rvkm.report_volcano_keyword_id
INNER JOIN keyword ON keyword.keyword_id=rvk.keyword_id
WHERE report.published='yes'
AND keyword.keyword_id in (4,9,35,40,45,25)
AND volcano_id=%s
"""

    if start is not None:
        SQL += "AND date>=%s "
        args.append(start)
    if end is not None:
        SQL += "AND date<=%s "
        args.append(end)

    SQL += "ORDER BY date"

    with utils.MYSQLCursor(
        DB = config.RSDB_DB, user = config.RSDB_USER, password = config.RSDB_PASS
    ) as cursor:
        cursor.execute(SQL, args)
        headers = [x[0] for x in cursor.description]
        detections = pandas.DataFrame(cursor, columns = headers)

    if detections.size <= 0:
        return detections

    detections['date'] = detections['date'].dt.normalize()
    detections.set_index('date', drop = False, inplace = True)

    return detections


@generator("Detections")
def rs_detections(volcano, start, end) -> pandas.DataFrame:
    data = get_detection_data(volcano, start, end)

    rs_types = {
        'Ash': [4],
        'SO2': [9],
        'ElevatedTemps': [35, 40, 45],
        'Steam/Water': [25],
    }

    types_string = flask.request.args.get('addArgs')
    types_dict = parse_qs(types_string)
    types = types_dict['types']
    selectedTypes = []
    for rstype in types:
        selectedTypes += rs_types[rstype]

    data = data.loc[data['type'].isin(selectedTypes)]

    if data.size <= 0:
        return {}

    # For detection counts, we don't care about the rate (we're just going to get a count anyway),
    # so just set it to 1 everywhere
    data.loc[:, 'rate'] = 1

    data['date'] = data['date'].apply(lambda x: x.isoformat())
    found_types = data['type'].unique().tolist()
    grouped_data = data.groupby('type')

    result = {
        str(x): grouped_data.get_group(x)['date'].tolist()
        for x in found_types
    }

    return result


############ Thermal Processors ####################
def process_radiative_power(data):
    month_grouper = pandas.Grouper(key = 'image_time', freq = 'MS')

    radiance = data.groupby(month_grouper).mean(numeric_only = True)['hyst_radiance']
    radiance /= 1000000 # Convert to MW

    # Replace NaN values with zero and convert to a dataframe so we can add the date column
    radiance = radiance.fillna(0).to_frame()

    radiance['date'] = radiance.index + timedelta(days = 15)
    radiance.sort_values('date', inplace = True)

    # Convert the date column to an ISO string
    radiance['date'] = radiance['date'].apply(lambda x: pandas.to_datetime(x).isoformat())
    return radiance


def process_percent_data(data):
    month_grouper = pandas.Grouper(key = 'image_time', freq = 'MS')

    percent = data.groupby(month_grouper).mean(numeric_only = True)['unet_class']
    percent *= 100
    percent = percent.round(1)

    final = percent.to_frame().reset_index().rename(columns = {
        'image_time': 'date',
        'unet_class': 'percent',
    })

    final['date'] += timedelta(days = 15)
    final.sort_values('date', inplace = True)

    final['date'] = final['date'].apply(lambda x: pandas.to_datetime(x).isoformat())

    return final

############### Generators ####################


@generator("Radiative Power")
def plot_radiative_power(volcano, start = None, end = None):
    ret_data = {}
    query_string = flask.request.args.get('addArgs', '')
    # Default to everything if nothing provided
    requested = parse_qs(query_string).get('types', ['VIIRS', 'MODIS'])

    if not requested:
        return flask.abort(400, 'No datasets requested')

    if 'VIIRS' in requested:
        try:
            viirs_data = load_viirs_data(volcano, start, end)
            viirs_radiance = process_radiative_power(viirs_data)
            ret_data['viirs'] = viirs_radiance.to_dict(orient = 'list')
        except FileNotFoundError:
            pass

    if 'MODIS' in requested:
        try:
            modis_data = load_modis_data(volcano, start, end)
            modis_radiance = process_radiative_power(modis_data)
            ret_data['modis'] = modis_radiance.to_dict(orient = 'list')
        except FileNotFoundError:
            pass

    if not ret_data:
        return flask.abort(400, 'No valid datasets requested')

    return ret_data


@generator("Thermal Detection Percent")
def plot_image_detect_percent(volcano, start = None, end = None):
    ret_data = {}
    query_string = flask.request.args.get('addArgs', '')
    # Default to everything if nothing provided
    requested = parse_qs(query_string).get('types', ['VIIRS', 'MODIS'])

    if not requested:
        return flask.abort(400, 'No datasets requested')

    if 'VIIRS' in requested:
        try:
            viirs_data = load_viirs_data(volcano, start, end)
            viirs_data = process_percent_data(viirs_data)
            ret_data['viirs'] = viirs_data.to_dict(orient = 'list')
        except FileNotFoundError:
            pass

    if 'MODIS' in requested:
        try:
            modis_data = load_modis_data(volcano, start, end)
            modis_data = process_percent_data(modis_data)
            ret_data['modis'] = modis_data.to_dict(orient = 'list')
        except FileNotFoundError:
            pass

    if not ret_data:
        return flask.abort(400, 'No valid datasets requested')

    return ret_data

##############END Thermal################
