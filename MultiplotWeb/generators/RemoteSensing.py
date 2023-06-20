"""
RemoteSensing.py

Data generation functions for the Remote Sensing discipline.

"""
CATEGORY = "Remote Sensing"

from urllib.parse import parse_qs

import flask
import pandas

from .. import utils, config
from ..utils import generator


def get_so2_data(volcano: str, start, end) -> pandas.DataFrame:
    volc_id = utils.VOLC_IDS[volcano]
    args = [volc_id]

    SQL = """
SELECT DISTINCT
    date,
    ((mass_prelim*1000)/plume_age)*24 as rate,
    keyword.keyword_id as type,
    icon,
    mass_prelim as mass
FROM report
LEFT JOIN report_volcano AS rv ON report.report_id=rv.report_id
LEFT JOIN report_volcano_keyword AS rvk ON rv.report_volcano_id=rvk.report_volcano_id
LEFT JOIN report_volcano_keyword_meta AS rvkm  ON rvk.report_volcano_keyword_id=rvkm.report_volcano_keyword_id
INNER JOIN keyword ON keyword.keyword_id=rvk.keyword_id
WHERE report.published='yes'
AND keyword.keyword_id in (4,9,35,40,45,25)
AND volcano_id=%s
"""

    if start is not None:
        SQL += "AND date>=%s "
        args.append(start)
    if end is not None:
        SQL += "AND date<=%s "
        args.append(end)

    SQL += "ORDER BY date"

    with utils.MYSQLCursor(
        DB = config.RSDB_DB, user = config.RSDB_USER, password = config.RSDB_PASS
    ) as cursor:
        cursor.execute(SQL, args)
        headers = [x[0] for x in cursor.description]
        detections = pandas.DataFrame(cursor, columns = headers)

    if detections.size <= 0:
        return detections

    detections['date'] = detections['date'].dt.normalize()
    detections.set_index('date', drop = False, inplace = True)

    return detections


@generator("Detections")
def rs_detections(volcano, start, end) -> pandas.DataFrame:
    data = get_so2_data(volcano, start, end)

    rs_types = {
        'Ash': [4],
        'so2': [9],
        'surfaceTemp': [35, 40, 45],
    }

    types_string = flask.request.args.get('addArgs')
    types_dict = parse_qs(types_string)
    types = types_dict['detectTypes']
    selectedTypes = []
    for rstype in types:
        selectedTypes += rs_types[rstype]

    data = data.loc[data['type'].isin(selectedTypes)]

    if data.size <= 0:
        return {}

    # For detection counts, we don't care about the rate (we're just going to get a count anyway),
    # so just set it to 1 everywhere
    data.loc[:, 'rate'] = 1

    data['date'] = data['date'].apply(lambda x: x.isoformat())
    found_types = data['type'].unique().tolist()
    grouped_data = data.groupby('type')

    result = {
        str(x): grouped_data.get_group(x)['date'].tolist()
        for x in found_types
    }

    return result


@generator("SO<sub>2</sub> Emission Rate")
def so2_rate(volcano, start, end) -> pandas.DataFrame:
    data = get_so2_data(volcano, start, end)

    # only SO2 detections for the rate plot
    data = data[data['type'] == 9]
    data.dropna(inplace = True)
    if data.size <= 0:
        return {}

    data['date'] = data['date'].apply(lambda x: x.isoformat())
    return data.to_dict(orient = "list")


@generator("SO<sub>2</sub> Mass")
def so2_mass(volcano, start, end) -> pandas.DataFrame:
    # No calculations needed, so just use the same function here.
    return so2_rate(volcano, start, end)
