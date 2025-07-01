export function eq_location_depth(plotDiv){
    const lats=plotDiv.data('lats');
    const lons=plotDiv.data('lons');
    const depth=plotDiv.data('depth');
    const headers=['latitude','longitude','depth'];

    return [headers,[lats,lons,depth]];
}
