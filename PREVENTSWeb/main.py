import json
import flask

from dateutil.parser import parse

from . import app
from .generators import TYPES

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
        # "---Seismology---", 
        # 'Earthquakes',
        '---Petrology---',
        'Diffusion', 
        '---Thermal---', 
        'Radiative Power', 
        'Detection Percent',
    ]
    
    
    args['plotTypes'] = json.dumps(plottypes)
    return flask.render_template("index.html", **args)

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
        
    try:
        data = TYPES[plot_type](volcano, start_date, end_date)
    except Exception as e:
        return str(e), 404
    
    return data
    
    
    