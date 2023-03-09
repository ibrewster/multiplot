import json
import flask

from dateutil.parser import parse

from . import app, utils

# TODO: better way of defining this?
volcanoes = {
    'Augustine': [59.3626,-153.435,12],
    'Bogoslof': [53.9272,-168.0344,11], 
    'Redoubt': [60.4852,-152.7438,11],
    'Cleveland':[52.8222,-169.945,10] ,
    'Okmok': [53.397,-168.166,10], 
    'Pavlof': [55.4173,-161.8937,11],
    'Shishaldin': [54.7554,-163.9711,11],
    'Veniaminof': [56.1979,-159.3931,10],
}

@app.route('/')
def index():
    args = {
        'volcanoes': sorted(volcanoes.items(), key = lambda x: x[1][1], reverse = True),
        'js_funcs': json.dumps(utils.JS_FUNCS),
    }
    
    plottypes = []
    for cat, types in sorted(utils.GEN_CATEGORIES.items(), key = lambda x: x[0]):
        plottypes.append(f"---{cat}---")
        for item in sorted(types):
            plottypes.append(item)
    
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
        data = utils.GEN_FUNCS[plot_type](volcano, start_date, end_date)
    except Exception as e:
        return str(e), 404
    
    return data
    
    
    