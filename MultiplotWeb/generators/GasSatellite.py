"""
Thermal.py

Data generation functions for the Thermal discipline.

"""
CATEGORY = "Gas - Satellite SO<sub>2</sub>"

import os

from datetime import timedelta
from urllib.parse import parse_qs

import flask
import pandas

from .RemoteSensing import get_detection_data
from .. import utils
from ..utils import generator



@generator("SO<sub>2</sub> Emission Rate (AVO)")
def so2_rate(volcano, start, end) -> pandas.DataFrame:
    data = get_detection_data(volcano, start, end)

    # only SO2 detections for the rate plot
    data = data[data['type'] == 9]
    data.dropna(inplace = True)
    if data.size <= 0:
        return {}

    data['date'] = data['date'].apply(lambda x: x.isoformat())
    return data.to_dict(orient = "list")


@generator("SO<sub>2</sub> Mass (AVO)")
def so2_mass(volcano, start, end) -> pandas.DataFrame:
    # No calculations needed, so just use the same function here.
    return so2_rate(volcano, start, end)

@generator("SO<sub>2</sub> Emission Rate (Carn)")
def so2_rate_carn(volcano, start, end):
    data_filename = "Carn2017Alaska.csv"
    data_path = os.path.join(utils.DATA_DIR, data_filename)
    data = pandas.read_csv(data_path, header = 1, index_col = 'Volcano')
    try:
        volc_data = data.loc[volcano].to_frame().reset_index(drop = False)
    except KeyError:
        return flask.abort(404)
    
    rate_data = volc_data = volc_data[~pandas.to_numeric(volc_data['index'], errors = 'coerce').isnull()]
    rate_data.rename(columns = {'index': 'year'}, inplace = True)
    rate_data['year'] = rate_data['year'].astype(float)
    rate_data['is_rate'] = rate_data['year'].apply(lambda x: x.is_integer())
    
    em_rate = rate_data[rate_data['is_rate']==True].reset_index(drop = True)
    em_error = rate_data[rate_data['is_rate']==False].reset_index(drop = True)
    
    em_error.loc[:,'year'] -=  0.1
    
    em_rate.rename(columns = {volcano: 'rate'}, inplace = True)
    em_error.rename(columns = {volcano: 'error'}, inplace = True)
    
    em_rate.drop(columns = 'is_rate', inplace = True)
    em_error.drop(columns = 'is_rate', inplace = True)
    
    volc_data = pandas.merge(em_rate, em_error, on = 'year')
    volc_data['year'] = volc_data['year'].astype(int)
    
    return volc_data.to_dict(orient = "list")