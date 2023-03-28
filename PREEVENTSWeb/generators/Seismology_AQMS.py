"""
Seismology_AQMS.py

Data generation functions for the Seismology discipline, using the "AQMS" catalog.

"""
CATEGORY = "Seismology (AQMS)"

import pandas

from psycopg.rows import dict_row

from .. import utils, config
from ..utils import generator


def get_aqms_data(volcano, t_start = None, t_end = None):
    v_lat, v_lon = utils.VOLCANOES[volcano][:2]
    max_dist = 20 #in KM

    args = {
        'volcLon': v_lon,
        'volcLat': v_lat,
        'maxDist': max_dist,
    }

    where_terms = []

    query = """
    SELECT  e.evid as "eventId",
            truetime.true2nominalf(o.datetime) as "unixTime",
            lat,
            lon as "long",
            round(depth::numeric, 2) as "depthKM",
            (o.rflag='A') as auto,
            type,
            round(magnitude::numeric,2) as "mag",
            o.gap as "azimuthal-gap",
            ndef as "num-phases-used",
            erhor as "horizontal-error",
            sdep as "vertical-error",
            ST_Distance(ST_SetSRID(ST_MakePoint(lon, lat), 4326),
                        ST_SetSRID(ST_MakePoint(%(volcLon)s, %(volcLat)s), 4326),
                        false) as distance
        FROM event e
        INNER JOIN origin o ON o.orid=e.prefor
        INNER JOIN netmag n ON e.prefmag=n.magid
    WHERE
    -- start with a max distance of 20km to associate with this volcano.
    ST_Distance(ST_SetSRID(ST_MakePoint(lon, lat), 4326),
                ST_SetSRID(ST_MakePoint(%(volcLon)s, %(volcLat)s), 4326),
                false) < (%(maxDist)s*1000)
    AND
    """

    if t_start is not None:
        where_terms.append("o.datetime >= %(starttime)s")
        args['starttime'] = t_start.timestamp()

    if t_end is not None:
        where_terms.append("o.datetime <= %(endtime)s")
        args['endtime'] = t_end.timestamp()

    where_terms.append("bogusflag=0")
    where_terms.append("selectflag=1")
    where_terms.append("o.rflag in ('A','F')")

    query += " AND ".join(where_terms)
    query += """
    ORDER BY datetime;
    """

    with utils.PostgreSQLCursor(config.AQMS_DB, user = config.AQMS_USER,
                                password = config.AQMS_PASS, host = config.AQMS_HOST,
                                row_factory = dict_row) as cur:
        cur.execute(query, args)
        events = pandas.DataFrame(cur)

    if events.size > 0:
        events.loc[:, 'eventId'] = "av" + events.eventId.astype(str)
        events['unixTime'] *= 1000
        events.loc[:, 'date'] = pandas.to_datetime(events.unixTime, unit = 'ms')
        events.set_index('date', drop = False, inplace = True)

    # Get a list of volcanoes that are within 40 km of this one.
    # Since we limited the results to events that are within 20km of this volcano,
    # any volcano that is more than twice that distance from this one is going to be more
    # than 20km from the event, and therfore further from the event than this one.
    # Since there are fewer volcanoes than events typically, this should minimize
    # computational resources.

    volc_locs = pandas.DataFrame([(key, val[1], val[0]) for key, val in utils.VOLCANOES.items() if key != volcano],
                                 columns = ['volc', 'lon', 'lat'])

    volc_locs.loc[:, 'dist'] = utils.haversine_np(v_lon, v_lat, volc_locs.lon, volc_locs.lat)

    canidate_volcs = volc_locs[volc_locs.dist < (max_dist * 2)]
    #canidate_volcs = volc_locs
    if canidate_volcs.size > 0:

        # Limit to only events that are closest to this volcano
        # get distance to all volcanoes
        dist_cols = ['distance', ]
        for volc_rec in canidate_volcs.itertuples():
            if volc_rec.volc == volcano:
                continue #already have this value.

            dist_col_name = f"dist_{volc_rec.volc}"
            dist_cols.append(dist_col_name)

            #Convert km to m to keep units the same
            events.loc[:, dist_col_name] = utils.haversine_np(volc_rec.lon,
                                                              volc_rec.lat,
                                                              events['long'],
                                                              events['lat']) * 1000

        # Get the distance to the closest volcano
        events.loc[:, 'min_dist'] = events.loc[:, dist_cols].min(axis = 1)

        # Filter the data to only those where the closest volcano is the volcano of interest
        events = events[events.min_dist == events.distance]

    events.loc[:, 'distance'] = (events['distance'] / 1000).round(2)

    # Make the date column be in ISO format for plotting
    events['date'] = events['date'].apply(lambda x: x.isoformat())

    return events


@generator("Distance")
def aqms_distances(volcano, start = None, end = None):
    data = get_aqms_data(volcano, start, end)
    return data[['date', 'distance']].to_dict(orient = "list")


@generator("Magnitude")
def aqms_magnitude(volcano, start = None, end = None):
    data = get_aqms_data(volcano, start, end)
    data = data.loc[:, ['date', 'mag']]

    return data.to_dict(orient = "list")


@generator("Depth")
def aqms_depth(volcano, start = None, end = None):
    data = get_aqms_data(volcano)
    data = data.loc[:, ['date', 'depthKM']]

    return data.to_dict(orient = "list")
