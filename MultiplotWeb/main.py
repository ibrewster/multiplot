import json
import flask

from dateutil.parser import parse

from . import app, utils, google


@app.route('/')
def index():
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


@app.route('/getDetails')
def get_details():
    plot_type = flask.request.args['plotType']
    details = google.get_data()
    print(details)
    return flask.jsonify(details)