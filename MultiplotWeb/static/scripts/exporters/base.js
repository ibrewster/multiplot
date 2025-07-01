// This is the default exporter function. It will simply create a CSV with x and y from the plot.
export function genericExport(plotDiv){
//TODO: make this even more generic - use plotly x/y
    const yvals=plotDiv.data('yValues');
    const xvals=plotDiv.data('xValues');
    const headers=['date','y value'];
    return [headers,[xvals,yvals]]
}

export function color_code(plotDiv){
    const colorLookup={
        '#FF0000':'RED',
        '#FFA500':'ORANGE',
        '#FFFF00':'YELLOW',
        '#00FF00':'GREEN',
        '#888888':'UNASSIGNED'
    }

    const colors=plotDiv.data('color');
    const start=plotDiv.data('start');
    const end=plotDiv.data('end');
    const colorNames=[];

    for(const colorCode of colors){
        colorNames.push(colorLookup[colorCode]);
    }
    const headers=['code','start','end'];
    return [headers,[colorNames,start,end]]
}
