#####################
# Code to load and generate the data needed for various types of graphs
#####################
CATEGORY = "General"

from datetime import datetime

import pandas

from .. import utils
from ..utils import generator

######### COLOR CODES##########
COLORS = {
    'UNASSIGNED': '#888888',
    'GREEN': '#00FF00',
    'YELLOW': '#FFFF00',
    'ORANGE': '#FFA500',
    'RED': '#FF0000',
}


@generator("Color Code")
def plot_color_code(volcano, start = None, end = None):
    args = [volcano, ]
    SQL_BASE = """
    SELECT sent_utc,color_code
    FROM code_change_date
    INNER JOIN volcano ON volcano.volcano_id=code_change_date.volcano_id
    WHERE volcano_name=%s
    """
    SQL = SQL_BASE

    if start is not None:
        SQL += " AND sent_utc>=%s "
        args.append(start)

    if end is not None:
        SQL += " AND sent_utc<=%s "
        args.append(end)

    SQL += """
    ORDER BY sent_utc
    """

    start_entry = None
    with utils.MYSQLCursor('hans2') as cursor:
        cursor.execute(SQL, args)
        change_dates = cursor.fetchall()

        if not change_dates:
            # No change within the specified date range
            # Get the most recent change that is older than end, if set.
            SQL = SQL_BASE
            args = [volcano, ]
            if end is not None:
                SQL += " AND sent_utc<=%s"
                args.append(end)

            SQL += "ORDER BY sent_utc DESC limit 1"
            cursor.execute(SQL, args)
            change_dates = cursor.fetchall()

        # If start is not none, get the most recent change *before* start as well,
        # so we can fill in the first portion of the graph
        if start is not None:
            SQL = SQL_BASE + " AND sent_utc<=%s ORDER BY sent_utc DESC limit 1"
            args = (volcano, start)
            cursor.execute(SQL, args)
            start_entry = cursor.fetchone()

    change_dates = pandas.DataFrame(change_dates, columns = ["date", "Code"])

    geodiva_changes = None

    # Get older color code changes from geodiva
    if start is None or start < datetime(2009, 1, 1):
        SQL = """
        SELECT
ReleaseDate,
ColorCode
FROM tblreleaseinfo
INNER JOIN tbllinkvolcidcoloridreleaseid ON tblreleaseinfo.ReleaseID=tbllinkvolcidcoloridreleaseid.ReleaseID
INNER JOIN tblcolorcode ON tblcolorcode.ColorID=tbllinkvolcidcoloridreleaseid.ColorID
INNER JOIN tbllistvolc ON tbllistvolc.VolcNameID=tbllinkvolcidcoloridreleaseid.VolcNameID
WHERE volcano=%s
ORDER BY ReleaseDate;
        """
        args = (volcano, )
        with utils.MYSQLCursor('geodiva') as cursor:
            cursor.execute(SQL, args)
            geodiva_changes = cursor.fetchall()
        geodiva_changes = pandas.DataFrame(geodiva_changes, columns = ["date", "Code"])
        geodiva_changes['date'] = pandas.to_datetime(geodiva_changes['date'])

    if start_entry:
        change_dates.loc[len(change_dates.index)] = start_entry

    change_dates["date"] = pandas.to_datetime(change_dates["date"])
    if geodiva_changes is not None:
        if change_dates.size > 0:
            geodiva_changes = geodiva_changes[geodiva_changes['date'] < change_dates['date'].min()]
        change_dates = pandas.concat([geodiva_changes, change_dates])

    change_dates['color'] = change_dates.replace({"Code": COLORS, })["Code"]
    change_dates["value"] = [1] * len(change_dates["Code"])

    change_dates.sort_values('date', inplace = True)

    #Drop any consecutive duplicates
    change_dates = change_dates.loc[change_dates['Code'].shift() != change_dates['Code']]

    # Append one more "change" that is the current (or end) date
    max_record = change_dates[change_dates['date'] == change_dates['date'].max()][:]
    if end is None:
        max_record['date'] = datetime.now()
    else:
        max_record['date'] = end

    change_dates = pandas.concat([change_dates, max_record])

    change_dates.reset_index(drop=True, inplace = True)

    return change_dates.to_json(orient = "records", date_format = 'iso')

##############END COLOR CODES################


############# END GENERATOR FUNCTIONS################
