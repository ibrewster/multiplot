"""
Thermal.py

Data generation functions for the Thermal discipline.

"""
CATEGORY = "Thermal"

import os

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


@generator("Radiative Power")
def plot_radiative_power(volcano, start = None, end = None):
    viirs_csv_filename = f"V4_{FILE_LOOKUP[volcano]}.csv"
    viirs_csv_path = os.path.join(utils.DATA_DIR, 'VIIRS 2012-2022', viirs_csv_filename)

    viirs_data = pandas.read_csv(viirs_csv_path)
    viirs_data['image_time'] = pandas.to_datetime(viirs_data['image_time'])

    month_grouper = pandas.Grouper(key = 'image_time', freq = 'M')

    viirs_radiance = viirs_data.groupby(month_grouper).mean(numeric_only = True)['simple_radiance']
    viirs_radiance /= 1000000 # Convert to MW

    # Replace NaN values with zero and convert to a dataframe so we can add the date column
    viirs_radiance = viirs_radiance.fillna(1).to_frame()

    viirs_radiance['date'] = viirs_radiance.index
    viirs_radiance.sort_values('date', inplace = True)

    if start is not None:
        viirs_radiance = viirs_radiance[viirs_radiance['date'] >= start]
    if end is not None:
        viirs_radiance = viirs_radiance[viirs_radiance['date'] <= end]

    # Convert the date column to an ISO string
    viirs_radiance['date'] = viirs_radiance['date'].apply(lambda x: pandas.to_datetime(x).isoformat())

    ret_data = {
        'viirs': viirs_radiance.to_dict(orient = 'list'),
    }

    return ret_data


@generator("Detection Percent")
def plot_image_detect_percent(volcano, start = None, end = None):
    viirs_csv_filename = f"V4_{FILE_LOOKUP[volcano]}.csv"
    viirs_csv_path = os.path.join(utils.DATA_DIR, 'VIIRS 2012-2022', viirs_csv_filename)

    viirs_data = pandas.read_csv(viirs_csv_path)
    viirs_data['unet_class'] = viirs_data['unet_class'].replace({'True': 1, 'False': 0, "0.0":
                                                                 0}).astype(int)
    viirs_data['image_time'] = pandas.to_datetime(viirs_data['image_time'])

    month_grouper = pandas.Grouper(key = 'image_time', freq = 'M')

    viirs_percent = viirs_data.groupby(month_grouper).mean(numeric_only = True)['unet_class']
    viirs_percent *= 100
    viirs_percent = viirs_percent.round(1)

    viirs = viirs_percent.to_frame().reset_index().rename(columns = {
        'image_time': 'date',
        'unet_class': 'percent',
    })
    viirs.sort_values('date', inplace = True)

    viirs['date'] = viirs['date'].apply(lambda x: pandas.to_datetime(x).isoformat())

    ret_data = {
        'viirs': viirs.to_dict(orient = 'list'),
    }

    return ret_data

##############END Thermal################
