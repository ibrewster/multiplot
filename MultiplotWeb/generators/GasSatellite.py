"""
Thermal.py

Data generation functions for the Thermal discipline.

"""
CATEGORY = "Gas - Satellite SO<sub>2</sub>"

import os

from urllib.parse import parse_qs

import flask
import pandas

from .RemoteSensing import get_detection_data
from .database import plot_db_dataset
from .. import utils, app
from ..utils import generator


def so2_rate(volcano, start, end) -> pandas.DataFrame:
    data = get_detection_data(volcano, start, end)

    # only SO2 detections for the rate plot
    data = data[data['type'] == 9]
    data.dropna(inplace = True)
    if data.size <= 0:
        raise FileNotFoundError

    data['date'] = data['date'].apply(lambda x: x.isoformat())
    return data.to_dict(orient = "list")


def so2_rate_fioletov(volcano, start, end):

    # data_filename = "Carn2017Alaska.csv"
    # data_path = os.path.join(utils.DATA_DIR, data_filename)
    # data = pandas.read_csv(data_path, header = 1, index_col = 'Volcano')
    # try:
        # volc_data = data.loc[volcano].to_frame().reset_index(drop = False)
    # except KeyError:
        # raise FileNotFoundError

    # rate_data = volc_data = volc_data[~pandas.to_numeric(volc_data['index'], errors = 'coerce').isnull()]
    # rate_data.rename(columns = {'index': 'year'}, inplace = True)
    # rate_data['year'] = rate_data['year'].astype(float)
    # rate_data['is_rate'] = rate_data['year'].apply(lambda x: x.is_integer())

    # em_rate = rate_data[rate_data['is_rate'] == True].reset_index(drop = True)
    # em_error = rate_data[rate_data['is_rate'] == False].reset_index(drop = True)

    # em_error.loc[:, 'year'] -= 0.1

    # em_rate.rename(columns = {volcano: 'rate'}, inplace = True)
    # em_error.rename(columns = {volcano: 'error'}, inplace = True)

    # em_rate.drop(columns = 'is_rate', inplace = True)
    # em_error.drop(columns = 'is_rate', inplace = True)

    # volc_data = pandas.merge(em_rate, em_error, on = 'year')
    # volc_data.loc[:, 'upper'] = volc_data.loc[:, 'rate'] + volc_data.loc[:, 'error']
    # volc_data.loc[:, 'lower'] = volc_data.loc[:, 'rate'] - volc_data.loc[:, 'error']
    # volc_data['year'] = volc_data['year'].astype(int)

    # volc_data = volc_data[volc_data['year'] >= start.year]
    # volc_data = volc_data[volc_data['year'] <= end.year]

    db_data = plot_db_dataset('Gas - Satellite SO<sub>2</sub>|Fioletov Catalogue', volcano, start, end)
    db_data = pandas.DataFrame(db_data['Fioletov Catalogue']).rename(columns = {'value': 'rate',})
    db_data['upper']=db_data['rate']+db_data['error']
    db_data['lower']=db_data['rate']-db_data['error']
    db_data['year'] = pandas.to_datetime(db_data['datetime']).dt.year
    db_data = db_data.drop(columns = 'datetime')
    return db_data.to_dict(orient = "list")


@generator("SO<sub>2</sub> Emission Rate")
def so2_em_rate_combined(volcano, start, end):
    ret_data = {}
    query = flask.request.args.get('addArgs', '')
    requested = parse_qs(query).get('types', ['Fioletov', 'AVO'])

    if not requested:
        return flask.abort(400, 'No datasets requested')

    if 'Fioletov' in requested:
        try:
            fioletov = so2_rate_fioletov(volcano, start, end)
            ret_data['Fioletov'] = fioletov
        except FileNotFoundError:
            app.logger.error('Unable to load so2 rate (Fioletov) for selected options')

    if 'AVO' in requested:
        try:
            avo = so2_rate(volcano, start, end)
            ret_data['avo'] = avo
        except FileNotFoundError:
            app.logger.error("Unable to load so2 rate (AVO) for selected options")

    return ret_data

####################
# Mass
####################
def so2_mass(volcano, start, end) -> pandas.DataFrame:
    # No calculations needed, so just use the same function here.
    return so2_rate(volcano, start, end)


def so2_mass_carn(volcano, start, end):
    data_filename = "GVP_Emission_Results.csv"
    data_path = os.path.join(utils.DATA_DIR, data_filename)
    data = pandas.read_csv(
        data_path,
        header = 1,
        index_col = "Volcano Name",
        parse_dates = ['Start Date', 'End Date']
    )

    try:
        volc_data = data.loc[[volcano]].reset_index()
    except KeyError:
        raise FileNotFoundError

    # Filter by date
    volc_data = volc_data[volc_data['End Date'] >= start]
    volc_data = volc_data[volc_data['Start Date'] <= end]

    volc_data = volc_data[['Start Date', 'End Date', 'Total SO2 Mass (kt)']]
    volc_data['Start Date'] = volc_data['Start Date'].apply(lambda x: x.isoformat())
    volc_data['End Date'] = volc_data['End Date'].apply(lambda x: x.isoformat())

    return volc_data.to_dict(orient = "list")


@generator("SO<sub>2</sub> Mass")
def so2_mass_combined(volcano, start, end):
    ret_data = {}
    query = flask.request.args.get('addArgs', '')
    requested = parse_qs(query).get('types', ['Carn', 'AVO'])

    if not requested:
        return flask.abort(400, 'No datasets requested')

    if 'Carn' in requested:
        try:
            carn = so2_mass_carn(volcano, start, end)
            ret_data['Carn'] = carn
        except FileNotFoundError:
            app.logger.error('Unable to load SO2 Mass for Carn dataset')

    if 'AVO' in requested:
        try:
            avo = so2_mass(volcano, start, end)
            ret_data['AVO'] = avo
        except FileNotFoundError:
            app.logger.error('Unable to load SO@ Mass for AVO dataset')

    return ret_data
