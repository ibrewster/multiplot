import glob
import json
import os
import pathlib

import flask

from collections import defaultdict
from dateutil.parser import parse

from . import app, utils, generator, descriptors


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
    response = flask.send_from_directory(
        app.static_folder,
        os.path.join('scripts', script_file),
        mimetype='text/javascript'
    )
    response.headers['Cache-Control'] = 'max-age=3600, no-cache'
    return response

@app.route('/headers')
def headers():
    args = {
        'prefix': getPrefix(),
        'js_funcs': json.dumps(generator.JS_FUNCS)
    }

    plottypes = []
    for cat, types in sorted(generator.GEN_CATEGORIES.items(), key = lambda x: x[0]):
        plottypes.append(f"---{cat}---")
        for item in sorted(types):
            tag = "|".join((cat, item))
            plottypes.append((tag, item))

    args['plotTypes'] = json.dumps(plottypes)
    
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

    # Make the plot type "tag" available to any function that wants it.
    utils.current_plot_tag.set(plot_type)

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
        data = generator.GEN_FUNCS[plot_type](volcano, start_date, end_date)
    except Exception as e:
        app.logger.warning(str(e))
        return str(e), 404

    return data


@app.route('/getDetails')
def get_details():
    plot_type = flask.request.args['plotType']
    cat, label = plot_type.split('|')
    details = descriptors.get_descriptions()

    description = details.loc[cat, label]
    return flask.jsonify(description)

@app.route('/getDescriptions')
def get_descriptions():
    data = descriptors.get_descriptions()
    data['Category'] = data['Category'].apply(lambda x: '' if not x else x)
    data['Dataset'] = data['Dataset'].apply(lambda x: '' if not x else x)
    data = data[['Category', 'Dataset', 'Description']].reset_index(drop = True)
    return_obj = defaultdict(dict)
    for idx, row in data.iterrows():
        return_obj[row['Category']][row['Dataset']] = row['Description']
    return return_obj


@app.route('/list-js/<subdir>')
def list_js_files(subdir):
    """Return a list of .js files (not recursive) in a subdir of /static/scripts/."""
    base_path = pathlib.Path(app.static_folder) / 'scripts'
    base_path = base_path.resolve()
    scripts_path = base_path / subdir
    scripts_path = scripts_path.resolve()

    try:
        scripts_path.relative_to(base_path)
    except ValueError:
        flask.abort(400)


    return flask.jsonify([f.name for f in scripts_path.glob('*.js')])

@app.route('/list-scripts')
def list_core_scripts():
    scripts_path = os.path.join(app.static_folder, 'scripts','core')
    try:
        files = [
            f for f in os.listdir(scripts_path)
            if os.path.isfile(os.path.join(scripts_path, f))
            and f.endswith('.js')
            and f != 'utils.js'
        ]
    except FileNotFoundError:
        files = []

    # We need to make sure to load utils first
    files = ['utils.js'] + files

    return flask.jsonify(files)
