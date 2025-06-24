"""
Seismology_REC.py

DESCRIPTION: Data generation functions for the Seismology discipline, using the "Relocated" catalog.
"""
CATEGORY = "Seismology (REC)"

import glob
import os

from datetime import timezone

import pandas

from . import utils, generator

def get_seismology_rec(volcano):
    """Utility function to retrieve the relocated catalog for a volcano as a pandas data frame"""
    data_dir = os.path.join(utils.DATA_DIR, "SeismoAcoustic_Data")
    volc_dir = glob.glob(os.path.join(data_dir, f"{volcano}*"))
    if not volc_dir:
        raise FileNotFoundError(f"No data found for {volcano}")

    volc_dir = volc_dir[0]
    data_file = glob.glob(os.path.join(volc_dir, "*_relocated_catalog.csv"))
    data_file = data_file[0]
    data = pandas.read_csv(
        data_file,
        parse_dates = ['UTCDateTime']).rename(columns = {'UTCDateTime': 'date', })
    data.set_index('date', drop = False, inplace = True)
    data['date'] = data['date'].apply(lambda x: pandas.to_datetime(x).isoformat())

    return data.loc[data['Magnitude'] > -5]


@generator("Frequency Index")
def eq_frequency_index_rec(volcano, start = None, end = None):
    data = get_seismology_rec(volcano)
    data = data.loc[:, ['date', 'FI']]

    return data.to_dict(orient = "list")


@generator("Magnitude")
def eq_magnitude(volcano, start = None, end = None):
    data = get_seismology_rec(volcano)
    data = data.loc[:, ['date', 'Magnitude']]

    return data.to_dict(orient = "list")


@generator("Depth")
def eq_depth(volcano, start = None, end = None):
    data = get_seismology_rec(volcano)
    data = data.loc[:, ['date', 'Depth_km']]

    return data.to_dict(orient = "list")


@generator("Distance")
def eq_distance(volcano, start = None, end = None):
    data = get_seismology_rec(volcano)
    data = data.loc[data['Magnitude'] > -5, ['date', 'Latitude', 'Longitude']]
    # TODO: Calculate distance to volcano
    v_lat, v_lon = utils.VOLCANOES[volcano][:2]
    distances = utils.haversine_np(v_lon, v_lat, data['Longitude'], data['Latitude'])
    data.loc[:, 'Distance'] = distances

    return data.to_dict(orient = "list")


@generator("Location/Depth")
def eq_location_depth(volcano, start = None, end = None):
    data = get_seismology_rec(volcano)
    data = data.loc[:, ['date', 'Latitude', 'Longitude', 'Depth_km']]

    # Filter the data by date, since we do not have a date axis
    # to zoom on with our plotly grah for this.
    if start is not None or end is not None:
        dateFilter = pandas.to_datetime(data['date'])
        if start is not None:
            start = start.replace(tzinfo = timezone.utc)
            data = data[dateFilter >= start]

        if end is not None:
            end = end.replace(tzinfo = timezone.utc)
            data = data[dateFilter <= end]

    return data.to_dict(orient = "list")
