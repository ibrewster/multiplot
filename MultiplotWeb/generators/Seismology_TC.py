"""
Seismology_TC.py

DESCRIPTION: Data generation functions for the Seismology discipline, using the "Temporally Complete" catalog.
"""
CATEGORY = "Seismology (TC)"

import glob
import os

import pandas

from . import config, generator

def get_seismology_tc(volcano):
    """Utility function to retrieve the temporally complete event list for a volcano as a pandas data frame"""
    data_dir = os.path.join(config.DATA_DIR, "SeismoAcoustic_Data")
    volc_dir = glob.glob(os.path.join(data_dir, f"{volcano}*"))
    if not volc_dir:
        raise FileNotFoundError(f"No data found for {volcano}")

    volc_dir = volc_dir[0]
    data_file = glob.glob(os.path.join(volc_dir, "*_temporally_complete_event_list.csv"))
    data_file = data_file[0]
    data = pandas.read_csv(data_file, parse_dates = ['UTCDateTime']).rename(columns = {'UTCDateTime': 'date', })
    data.set_index('date', drop = False, inplace = True)
    data['date'] = data['date'].apply(lambda x: pandas.to_datetime(x).isoformat())

    return data


@generator("Weekly Event Count")
def tc_event_count(volcano, start = None, end = None):
    data = get_seismology_tc(volcano)

    # Group by the index, which is the date as an object
    grouper = pandas.Grouper(level = 0, freq = 'W')
    # Too much chaining to get a single-line function :-)
    counts = data.loc[:, 'FI'].groupby([grouper]).count().reset_index(drop = False).rename(columns = {'FI': 'y'})

    #Plotly wants an ISO string for the date, simple json doesn't convert correctly.
    counts['date'] = counts['date'].apply(lambda x: pandas.to_datetime(x).isoformat())
    ret = counts.to_dict(orient = "list")
    ret['ylabel'] = 'TC Event Count'

    return ret


@generator("Frequency Index")
def eq_frequency_index_tc(volcano, start = None, end = None):
    data = get_seismology_tc(volcano)
    data.rename(columns={'FI': 'y',}, inplace=True)
    resp = data.to_dict(orient = "list")
    resp['ylabel'] = 'Frequency Index'

    return resp
