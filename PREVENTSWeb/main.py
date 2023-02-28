import json
import flask

from dateutil.parser import parse

from . import app, generators

# TODO: better way of defining this?
volcanoes = [
    'Augustine',
    'Bogoslof', 
    'Redoubt',
    'Cleveland',
    'Okmok',
    'Pavlof',
    'Shishaldin',
    'Veniaminof',
]

@app.route('/')
def index():
    args = {
        'volcanoes': sorted(volcanoes),
    }
    
    plottypes = [
        "---General---", 
        'Color Code',
        "---Seismology---", 
        'Earthquakes',
        '---Thermal---', 
        'Radiative Power']
    
    
    args['plotTypes'] = json.dumps(plottypes)
    return flask.render_template("index.html", **args)

# Map plot type to generator functions that return the needed data
TYPES = {
    'Color Code': generators.get_color_codes,
    'Radiative Power': generators.get_radiative_power
}


@app.route('/getPlot')
def get_plot():
    plot_type = flask.request.args['plotType']
    volcano = flask.request.args['volcano']
    start_date = flask.request.args.get('dateFrom')
    end_date = flask.request.args.get('dateTo')
    
    if start_date:
        start_date = parse(start_date)
    else:
        # Handle the empty string scenerio
        start_date = None
        
    if end_date:
        end_date = parse(end_date)
    else:
        end_date = None
        
    data = TYPES[plot_type](volcano, start_date, end_date)
    return data
    
    
    