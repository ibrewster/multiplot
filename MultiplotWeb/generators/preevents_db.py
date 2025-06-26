"""Generic database table plotting function. Should be written to work with ANY table provided."""

import decimal
import re

from datetime import timedelta
from urllib.parse import parse_qs

from cachetools.func import ttl_cache

import flask
import pandas
import psycopg

from . import generator, utils, app

########## Label queries ############
@ttl_cache(ttl = 86400) # cache for one day.
def preevents_label_query():
    with utils.PREEVENTSSQLCursor() as cursor:
        cursor.execute("""
WITH displayname_dataset_counts AS (
    SELECT
        display_names.displayname,
        disciplines.discipline_name,
        COUNT(DISTINCT datasets.dataset_id) AS dataset_count
    FROM disciplines
    INNER JOIN datasets ON datasets.discipline_id = disciplines.discipline_id
    INNER JOIN datastreams ON datastreams.dataset_id = datasets.dataset_id
    INNER JOIN variables ON variables.variable_id = datastreams.variable_id
    INNER JOIN displaynames AS display_names ON display_names.displayname_id = variables.displayname_id
    WHERE variables.unit_id != 6 --id 6 = categorical
    GROUP BY display_names.displayname, disciplines.discipline_name
)
SELECT DISTINCT ON (enhanced_displayname, discipline_name)
    CASE
        WHEN ddc.dataset_count > 1 THEN display_names.displayname || ' (' || datasets.dataset_name || ')'
        ELSE display_names.displayname
    END AS enhanced_displayname,
    disciplines.discipline_name,
    datasets.dataset_id,
    datastreams.variable_id,
    variable_name,
    variable_description,
    dataset_description
FROM disciplines
INNER JOIN datasets ON datasets.discipline_id = disciplines.discipline_id
INNER JOIN datastreams ON datastreams.dataset_id = datasets.dataset_id
INNER JOIN variables ON variables.variable_id = datastreams.variable_id
INNER JOIN displaynames AS display_names ON display_names.displayname_id = variables.displayname_id
INNER JOIN displayname_dataset_counts AS ddc ON ddc.displayname = display_names.displayname AND ddc.discipline_name = disciplines.discipline_name
WHERE variables.unit_id != 6 --id 6 = categorical
ORDER BY discipline_name, enhanced_displayname
"""
                    )
        return cursor.fetchall()

def get_preevents_labels():
    with utils.PostgreSQLCursor("multiplot") as cursor:
        cursor.execute("SELECT dataset_id,variable_id,hidden FROM preevents")
        display_flags = {
            (x[0], x[1]): x[2]
            for x in cursor
        }

    labels = preevents_label_query()
    labels = [
        label[:2]
        for label in preevents_label_query()
        if not display_flags.get(label[2:4], False)
    ]
    return labels

######## Processing #################
def parse_condition(condition):
    """
    Parse condition like:
      - 'datavalue=0'
      - 'categoryvalue.satellite = Aqua'
      - 'categoryvalue->>satellite != Aqua'
    Returns: (is_jsonb, field/column name, optional key, operator, value)
    """
    condition = condition.strip()

    # Match JSON-style: categoryvalue.satellite or categoryvalue->>satellite
    json_match = re.match(
        r"^(\w+)(?:\.|->>)(\w+)\s*(=|!=|>=|<=|>|<)\s*(.+)$",
        condition
    )
    if json_match:
        column, key, operator, value = json_match.groups()
        is_jsonb = True
    else:
        # Standard field match
        match = re.match(r'^(\w+)\s*(=|!=|>=|<=|>|<)\s*(.+)$', condition)
        if not match:
            raise ValueError(f"Invalid condition format: {condition}")
        column, operator, value = match.groups()
        key = None
        is_jsonb = False

    # Sanitize operator
    if operator not in ('=', '!=', '>=', '<=', '>', '<'):
        raise ValueError(f"Unsupported operator: {operator}")

    # Try to cast value to int or float
    value = value.strip()
    if value.lstrip('-').isdigit():
        value = int(value)
    elif re.match(r'^-?\d+\.\d+$', value):
        value = float(value)
    # Otherwise treat as string (safe as parameter)

    return is_jsonb, column, key, operator, value


@generator(get_preevents_labels)
def plot_preevents_dataset(volcano, start=None, end=None):
    """Get plot data for a specified dataset from the database"""

    tag = utils.current_plot_tag.get()

    category, title = tag.split("|")
    query_string = flask.request.args.get('addArgs', '')
    query_args = parse_qs(query_string)
    requested_types = query_args.get('types')
    requested_filters = query_args.get('filters', [])


    METADATA_SQL = """SELECT
        array_agg(datastream_id),
        array_agg(device_name),
        array_agg(unit_name),
        datastreams.dataset_id,
        datastreams.variable_id
    FROM datastreams
    INNER JOIN datasets ON datastreams.dataset_id=datasets.dataset_id
    INNER JOIN disciplines ON disciplines.discipline_id=datasets.discipline_id
    INNER JOIN devices ON devices.device_id=datastreams.device_id
    INNER JOIN variables ON variables.variable_id=datastreams.variable_id
    INNER JOIN displaynames ON variables.displayname_id=displaynames.displayname_id
    INNER JOIN units ON variables.unit_id=units.unit_id
    WHERE discipline_name=%s
        AND displayname=%s
        AND volcano_id=%s
    """

    args = {}

    data_withs = []
    data_joins = []

    data_sql = psycopg.sql.SQL("""base AS (
        SELECT dv.*, ds.device_id, ds.volcano_id, ds.dataset_id
        FROM datavalues dv
        INNER JOIN datastreams ds ON ds.datastream_id=dv.datastream_id
        WHERE dv.datastream_id = ANY(%(datastream_ids)s)
        AND dv.datavalue IS NOT NULL
        AND dv.datavalue::text!='NaN'
        """)

    data_base = [data_sql]

    if start is not None:
        data_base.append(psycopg.sql.SQL(" AND dv.timestamp>=%(start_time)s"))
        start -= timedelta(days = 366)
        args['start_time'] = start
    if end is not None:
        end += timedelta(days = 366)
        data_base.append(psycopg.sql.SQL(" AND dv.timestamp<=%(end_time)s"))
        args['end_time'] = end

    data_base.append(psycopg.sql.SQL(")"))
    data_withs.append(psycopg.sql.Composed(data_base))

    for i, filter_value in enumerate(requested_filters):
        try:
            filter_var_id, condition = filter_value.split('|')
            filter_var_id = int(filter_var_id)

            # Parse the condition
            is_json, field, key, operator, value = parse_condition(condition)
        except ValueError:
            app.logger.error(f"Bad filter passed. Not using. {filter_value}")
            continue

        # Alias values
        filter_alias = psycopg.sql.Identifier(f"filter_{i}")
        datavalue_alias = psycopg.sql.Identifier(f"dv{i}")
        var_param = f"variable_id_{i}"
        value_param = f"value_{i}"


        filter_sql = psycopg.sql.SQL("""
        {filter_alias} AS (
            SELECT datastream_id, device_id, dataset_id, volcano_id
            FROM datastreams
            WHERE variable_id={var_id}
        )
        """).format(
               filter_alias=filter_alias,
               var_id=psycopg.sql.Placeholder(var_param)
        )
        data_withs.append(filter_sql)
        args[var_param] = filter_var_id

        if is_json:
            # Safely construct: column->>'key'
            field_expr = psycopg.sql.SQL("{}->>{}").format(
                psycopg.sql.Identifier(field),
                psycopg.sql.Literal(key)
            )
        else:
            field_expr = psycopg.sql.Identifier(field)

        join_sql = psycopg.sql.SQL("""
            JOIN {f_alias} f{idx}
              ON f{idx}.device_id = b.device_id
              AND f{idx}.dataset_id = b.dataset_id
              AND f{idx}.volcano_id = b.volcano_id
            JOIN datavalues {dv_alias}
              ON {dv_alias}.timestamp = b.timestamp
              AND {dv_alias}.datastream_id = f{idx}.datastream_id
              AND {dv_alias}.{field} {op} {threshold}
        """).format(
            f_alias=filter_alias,
            dv_alias=datavalue_alias,
            idx=psycopg.sql.SQL(str(i)),
            field=field_expr,
            op=psycopg.sql.SQL(operator),
            threshold=psycopg.sql.Placeholder(value_param)
        )
        data_joins.append(join_sql)
        args[value_param] = value


    data_sql = psycopg.sql.SQL("""
    WITH {withs}
    SELECT b.timestamp, b.datavalue, d.device_name
    FROM base b
    {joins}
    JOIN devices d ON d.device_id=b.device_id
    ORDER BY d.device_name, b.timestamp
    """).format(
        withs=psycopg.sql.SQL(',\n').join(data_withs),
        joins=psycopg.sql.SQL('\n').join(data_joins)
    )

    meta_args = [category, title, utils.VOLC_IDS[volcano]]

    # If the user has requested specific types, filter query by requested types.
    if requested_types is not None:
        METADATA_SQL += " AND device_name=ANY(%s)"
        meta_args.append(requested_types)

    METADATA_SQL += """
    GROUP BY datastreams.dataset_id, datastreams.variable_id
    ORDER BY datastreams.dataset_id"""


    with utils.PREEVENTSSQLCursor() as cursor:
        cursor.execute(METADATA_SQL, meta_args)
        metadata = cursor.fetchone()

        if metadata is None:
            raise FileNotFoundError(f"Unable to locate config for {category} - {title}")

        datastreams, types, units, dataset_id, variable_id = metadata
        units = [u if u != 'unitless' else '' for u in units]
        if all(x == units[0] for x in units):
            units = units[0]
        else:
            units = dict(zip(types, units))
        args['datastream_ids'] = datastreams

        # Compose the data request SQL statement
        cursor.execute(data_sql, args)
        df = pandas.DataFrame(cursor, columns=['datetime', 'value', 'type'])

    if len(df) == 0:
        raise FileNotFoundError("Unable to find requested data")

    # Get rid of any NaN values. There shouldn't be any at this point, but better safe (belt-and-suspenders)
    df = df.dropna(subset = ['value'])

    df['datetime'] = df['datetime'].apply(lambda x: pandas.to_datetime(x).isoformat())
    # look for any overrides for this plot
    with utils.PostgreSQLCursor("multiplot") as cursor:
        cursor.execute("SELECT overrides FROM preevents WHERE dataset_id=%s and variable_id=%s",
                       (dataset_id, variable_id))
        overrides = cursor.fetchone()
        if overrides is not None:
            overrides = overrides[0]

    result ={
        'labels': units,
        'plotOverrides': overrides,
    }

    # convert Decimal values to *real* numbers
    if len(df) > 0 and isinstance(df['value'].iloc[0], decimal.Decimal):
        df['value'] = df['value'].astype(float)

    if types is not None:
        type_df = df.groupby("type")
        for record_type in types:
            try:
                result[record_type] = type_df.get_group(record_type).to_dict(orient='list')
            except KeyError:
                if type(units) == dict and record_type in units:
                    del units[record_type]
    else:
        result[title] = df.to_dict(orient='list')


    return result
