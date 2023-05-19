"""
Thermal.py

Data generation functions for the Thermal discipline.

"""
CATEGORY = "Thermal"

import os

from urllib.parse import parse_qs

import flask
import pandas

from .. import utils
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


def load_modis_data(sat, volc, start, end):
    modis_csv_filename = f"{FILE_LOOKUP[volc]}_{sat}.csv"
    modis_csv_path = os.path.join(utils.DATA_DIR, 'MODIS 2000-2021', modis_csv_filename)
    return load_data(modis_csv_path, start, end)


def load_data(csv_path, start, end):
    data = pandas.read_csv(csv_path)
    data['image_time'] = pandas.to_datetime(data['image_time'])
    data['unet_class'] = data['unet_class'].replace({'True': 1, 'False': 0, "0.0":
                                                     0}).astype(int)

    data.set_index('image_time', drop = False, inplace = True)

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

############ Processors ####################


def process_radiative_power(data):
    month_grouper = pandas.Grouper(key = 'image_time', freq = 'M')

    radiance = data.groupby(month_grouper).mean(numeric_only = True)['hyst_radiance']
    radiance /= 1000000 # Convert to MW

    # Replace NaN values with zero and convert to a dataframe so we can add the date column
    radiance = radiance.fillna(1).to_frame()

    radiance['date'] = radiance.index
    radiance.sort_values('date', inplace = True)

    # Convert the date column to an ISO string
    radiance['date'] = radiance['date'].apply(lambda x: pandas.to_datetime(x).isoformat())
    return radiance


def process_percent_data(data):
    month_grouper = pandas.Grouper(key = 'image_time', freq = 'M')

    percent = data.groupby(month_grouper).mean(numeric_only = True)['unet_class']
    percent *= 100
    percent = percent.round(1)

    final = percent.to_frame().reset_index().rename(columns = {
        'image_time': 'date',
        'unet_class': 'percent',
    })

    final.sort_values('date', inplace = True)

    final['date'] = final['date'].apply(lambda x: pandas.to_datetime(x).isoformat())

    return final

############### Generators ####################


@generator("Radiative Power")
def plot_radiative_power(volcano, start = None, end = None):
    ret_data = {}
    query_string = flask.request.args.get('addArgs', '')
    # Default to everything if nothing provided
    requested = parse_qs(query_string).get('dataTypes', ['VIIRS', 'AQUA', 'TERRA'])

    if not requested:
        return flask.abort(400, 'No datasets requested')

    if 'VIIRS' in requested:
        viirs_data = load_viirs_data(volcano, start, end)
        viirs_radiance = process_radiative_power(viirs_data)
        ret_data['viirs'] = viirs_radiance.to_dict(orient = 'list')

    if 'AQUA' in requested:
        aqua_data = load_modis_data("Aqua", volcano, start, end)
        aqua_radiance = process_radiative_power(aqua_data)
        ret_data['aqua'] = aqua_radiance.to_dict(orient = 'list')

    if 'TERRA' in requested:
        terra_data = load_modis_data("Terra", volcano, start, end)
        terra_radiance = process_radiative_power(terra_data)
        ret_data['terra'] = terra_radiance.to_dict(orient = 'list')

    return ret_data


@generator("Detection Percent")
def plot_image_detect_percent(volcano, start = None, end = None):
    viirs_data = load_viirs_data(volcano, start, end)
    viirs_data = process_percent_data(viirs_data)

    ret_data = {
        'viirs': viirs_data.to_dict(orient = 'list'),
    }

    return ret_data

##############END Thermal################
