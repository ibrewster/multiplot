import json
import flask

from collections import defaultdict
from dateutil.parser import parse

from . import app, utils, google


@app.route('/')
def index():
    return flask.render_template('index.html')

@app.route('/body')
def body():
    args = {
        'volcanoes': sorted(utils.VOLCANOES.items(), key = lambda x: x[1][1], reverse = True),
        'js_funcs': json.dumps(utils.JS_FUNCS),
    }

    plottypes = []
    for cat, types in sorted(utils.GEN_CATEGORIES.items(), key = lambda x: x[0]):
        plottypes.append(f"---{cat}---")
        for item in sorted(types):
            tag = "|".join((cat, item))
            plottypes.append((tag, item))

    args['plotTypes'] = json.dumps(plottypes)

    server_origin = flask.request.url_root
    request_origin = flask.request.headers.get('Origin')
    is_cors = request_origin and request_origin != server_origin
    if is_cors:
        app.logger.error(str(flask.request.headers))
        script_path = flask.request.script_root
        prefix = f'{server_origin}/{script_path}/'
        app.logger.warning(f"Base URL prefix has been set to {prefix}")
    else:
        app.logger.warning("Running locally, not setting prefix")
        prefix = ''

    args['prefix'] = prefix

    return flask.render_template("body.html", **args)


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


@app.route('/getDetails')
def get_details():
    plot_type = flask.request.args['plotType']
    cat, label = plot_type.split('|')
    details = google.get_data()
    description = details.loc[cat, label]
    return flask.jsonify(description)

@app.route('/getDescriptions')
def get_descriptions():
    data = google.get_data()
    data['Category'] = data['Category'].apply(lambda x: '' if not x else x)
    data['Dataset'] = data['Dataset'].apply(lambda x: '' if not x else x)
    data = data[['Category', 'Dataset', 'Description']].reset_index(drop = True)
    return_obj = defaultdict(dict)
    for idx, row in data.iterrows():
        return_obj[row['Category']][row['Dataset']] = row['Description']
    return return_obj
