from pathlib import Path

import h5py
import numpy
import pandas

from . import utils, app

def get_lon_lats(file):
    """
    Generate a lon/lat list from the specified file using FIRST, STEP and LENGTH/WIDTH values
    """

    if isinstance(file, str):
        h5_file = h5py.File(file)
    else:
        h5_file = file

    lon_start = float(h5_file.attrs["X_FIRST"])
    lon_step = float(h5_file.attrs["X_STEP"])
    lon_count = int(h5_file.attrs["WIDTH"])

    if lon_start > 0:
        lon_start -= 360

    lat_start = float(h5_file.attrs["Y_FIRST"])
    lat_step = float(h5_file.attrs["Y_STEP"])
    lat_count = int(h5_file.attrs["LENGTH"])

    lons = numpy.arange(lon_start, lon_start + (lon_step * lon_count), step=lon_step)
    lats = numpy.arange(lat_start, lat_start + (lat_step * lat_count), step=lat_step)

    # Make sure we have the right number of values. I have occasionally seen
    # the above generation process produce an extra value - probably due to rounding issues.
    lons = lons[:lon_count]
    lats = lats[:lat_count]

    return lons, lats


def find_closest_idx(lon_grid, lat_grid, lng, lat, zero_data=None):
    """
    Find the closest grid point with data to a specified point by comparing
    the distances from the clicked point to each point on the grid.

    NOTES
    -----
    This is HARDLY the most efficient method. Since the data is on a regular lat/lon
    grid, you could simply find the difference between the grid start and the
    clicked point, and divide by the grid step to find the grid point. This does,
    however, have the advantage of enabling you to eliminate any points with no data
    from contention, and seems to be fast enough.
    """
    # Compute a grid of distances, so we can set any all-zero cells to large distances
    dists = utils.haversine_np(lon_grid, lat_grid, lng, lat)

    # Set the dist for any grid points that are all zeros to a high value so it doesn't match.
    # any finds slices that have non-zero values in them. We use ~ to
    # invert the logic (slices with ONLY zeros).
    if len(zero_data.shape) > 2:
        all_zero = ~zero_data.any(axis=0)
    else:
        all_zero = zero_data == 0

    dists[all_zero] = 999

    closest_idx = numpy.unravel_index(dists.argmin(), dists.shape)
    return closest_idx

def process_insar_timeseries(filename:str, point:tuple[float,float],ref_point:tuple[float,float]):
    """Given an InSAR timeseries file and user-selected point, return
    the timeseries data closest to the selected point."""
    file = h5py.File(filename)

    # Create a 2D grid of lons and lats matching the data
    lons, lats = get_lon_lats(file)

    lon_grid, lat_grid = numpy.meshgrid(lons, lats)

    ts_data = numpy.asarray(file["timeseries"])

    closest_idx = find_closest_idx(lon_grid, lat_grid, point[1], point[0], ts_data)

    ts = ts_data[:, closest_idx[0], closest_idx[1]]

    cust_ref = find_closest_idx(lon_grid, lat_grid, ref_point[1], ref_point[0], ts_data)
    ref_ts = ts_data[:, cust_ref[0], cust_ref[1]]
    ts -= ref_ts

    ts *= 100  # Meters/year to cm/year

    try:
        date_list = numpy.asarray(file["date"]).astype(str)  # convert from bytes
    except UnicodeDecodeError as e:
        app.logger.error(f"Unable to load date list: {e} \nRaw data:")
        app.logger.error(numpy.asarray(file["date"]))
        raise

    # Parse dates to a list of actual datetime objects. Format argument isn't explicitly
    # needed, but given anyway to prevent any potential confusion.
    date_objs = pandas.to_datetime(date_list, format="%Y%m%d")

    # To get the dates into a more standardized format that plotly likes
    dates = date_objs.astype(str)

    return {
        "dates": dates.tolist(),
        "ts": ts.tolist(),
    }