"""
Petrology.py

Data generation functions for the Petrology discipline.

"""
CATEGORY = "Petrology"

import os

import pandas

from .. import utils
from ..utils import generator


##############Petrology###############


@generator("Diffusion")
def plot_diffusion(volcano, start = None, end = None):    
    data_filename = f"{volcano} Moshrefzadeh.csv"
    data_path = os.path.join(utils.DATA_DIR, 'Diffusion', data_filename)
    date_cols = [
        'cpx date',
        'cpx date neg',
        'cpx date pos',
        # 'Plag Date',
        # 'Plag Date Neg',
        # 'plag date pos'
    ]
    data = pandas.read_csv(data_path, parse_dates = date_cols)
    cpx_data = data.loc[:, ['cpx date', 'cpx date neg', 'cpx date pos']]
    cpx_data.dropna(inplace = True)
    cpx_data.loc[:, 'type'] = 'cpx'

    cpx_data.rename(columns = {
        'cpx date': "date",
        'cpx date neg': "date neg",
        'cpx date pos': "date pos",
    }, inplace = True)

    try:
        plag_data = data.loc[:, ['Plag Date', 'Plag Date Neg', 'plag date pos']]
    except KeyError:
        plag_data = pandas.DataFrame(columns = cpx_data.columns)
    else:
        plag_data.dropna(inplace = True)
        plag_data['Plag Date'] = pandas.to_datetime(plag_data['Plag Date'])
        plag_data['Plag Date Neg'] = pandas.to_datetime(plag_data['Plag Date Neg'])
        plag_data['plag date pos'] = pandas.to_datetime(plag_data['plag date pos'])

        plag_data.loc[:, 'type'] = 'plag'
        plag_data.rename(columns = {
            'Plag Date': "date",
            'Plag Date Neg': "date neg",
            'plag date pos': "date pos",
        }, inplace = True)

    data = pandas.concat([cpx_data, plag_data]).sort_values(
        'date',
        ascending = False,
        ignore_index = True
    )

    data.loc[:, 'index'] = data.index

    data['date'] = data['date'].apply(lambda x: pandas.to_datetime(x).isoformat())
    data['date neg'] = data['date neg'].apply(lambda x: pandas.to_datetime(x).isoformat())
    data['date pos'] = data['date pos'].apply(lambda x: pandas.to_datetime(x).isoformat())

    lines = data.loc[:, ['date neg', 'date pos', 'index']]

    cpx_points = data.loc[data['type'] == 'cpx', ['date', 'index']]
    plag_points = data.loc[data['type'] == 'plag', ['date', 'index']]

    ret_data = {
        'cpx': cpx_points.to_dict(orient = "list"),
        'plag': plag_points.to_dict(orient = "list"),
        'lines': lines.to_dict(orient = "records"),
    }

    return ret_data

##############END PETROLOGY################
