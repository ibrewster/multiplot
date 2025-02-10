import glob
import json
import os
import flask

from collections import defaultdict
from dateutil.parser import parse

from . import app, utils, google, DBMetadata


@app.route('/')
def index():
    return flask.render_template('index.html')


def getPrefix():
    server_origin = flask.request.url_root
    request_origin = flask.request.headers.get('Origin')
    is_cors = request_origin and request_origin != server_origin
    if is_cors:
        script_path = flask.request.headers.get('X-Forwarded-Prefix', '')
        prefix = f'{server_origin}{script_path[1:]}/'
        app.logger.warning(f"Base URL prefix has been set to {prefix}")
    else:
        app.logger.warning("Running locally, not setting prefix")
        prefix = ''

    return prefix


@app.route('/api')
def api():
    """
    Return the main javascript page that creates the multiplot API
    """
    index_js_path = glob.glob(os.path.join(app.static_folder, 'scripts', 'index-*.js'))
    if not index_js_path:
        return flask.abort(404)


    script_file = os.path.basename(index_js_path[0])
    response = flask.send_from_directory(app.static_folder,
                                     os.path.join('scripts', script_file),
                                     mimetype='text/javascript')
    response.headers['Cache-Control'] = 'max-age=3600, no-cache'
    return response

@app.route('/headers')
def headers():
    args = {
        'prefix': getPrefix(),
        'js_funcs': json.dumps(utils.JS_FUNCS)
    }

    plottypes = []
    for cat, types in sorted(utils.GEN_CATEGORIES.items(), key = lambda x: x[0]):
        plottypes.append(f"---{cat}---")
        for item in sorted(types):
            tag = "|".join((cat, item))
            plottypes.append((tag, item))

    args['plotTypes'] = json.dumps(plottypes)

    # Get a list of database plot type options
    with utils.PostgreSQLCursor('multiplot') as cursor:
        type_SQL = """
        SELECT
            categories.name||'|'||title,
            types
        FROM plotinfo
        INNER JOIN categories ON categories.id=category
        WHERE types IS NOT NULL"""
        cursor.execute(type_SQL)
        type_lookup = {x[0]: x[1] for x in cursor}

    # Same for the PREEVENTS database
    with utils.PREEVENTSSQLCursor() as cursor:
        SQL = """
        SELECT
    discipline_name||'|'||displayname,
	array_agg(DISTINCT device_name)
FROM disciplines
INNER JOIN datasets ON datasets.discipline_id=disciplines.discipline_id
INNER JOIN datastreams ON datastreams.dataset_id=datasets.dataset_id
INNER JOIN devices ON datastreams.device_id=devices.device_id
INNER JOIN variables ON variables.variable_id=datastreams.variable_id
INNER JOIN displaynames ON displaynames.displayname_id=variables.displayname_id
WHERE variables.unit_id!=6 --id 6 = categorical
GROUP BY 1
        """
        cursor.execute(SQL)
        preevents_lookup = {x[0]: x[1] for x in cursor}
        type_lookup.update(preevents_lookup)

    args['plotDataTypes'] = json.dumps(type_lookup)

    return flask.render_template('headers.html', **args)

def longitudeSort(item):
    lng = item[1][1]
    if lng > 0:
        lng -= 360
    return lng

@app.route('/body')
def body():
    args = {
        'volcanoes': sorted(utils.VOLCANOES.items(), key = longitudeSort, reverse = True),
    }

    args['prefix'] = getPrefix()

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
        app.logger.warning(str(e))
        return str(e), 404

    return data


@app.route('/getDetails')
def get_details():
    plot_type = flask.request.args['plotType']
    cat, label = plot_type.split('|')
    details = utils.get_combined_details()

    description = details.loc[cat, label]
    return flask.jsonify(description)

@app.route('/getDescriptions')
def get_descriptions():
    data = utils.get_combined_details()
    data['Category'] = data['Category'].apply(lambda x: '' if not x else x)
    data['Dataset'] = data['Dataset'].apply(lambda x: '' if not x else x)
    data = data[['Category', 'Dataset', 'Description']].reset_index(drop = True)
    return_obj = defaultdict(dict)
    for idx, row in data.iterrows():
        return_obj[row['Category']][row['Dataset']] = row['Description']
    return return_obj
