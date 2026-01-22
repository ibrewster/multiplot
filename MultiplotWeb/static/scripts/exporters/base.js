// This is the default exporter function. It will simply create a CSV with x and y from the plot.
export function genericExport(plotDiv){
    const data=plotDiv.get(0).data

    if(data.length==0){
        alert("Unable to get data to export");
        return;
    }
    
    const dateMap = new Map();
    const seriesNames = [];

    data.forEach((item)=>{
        const name=item.name || 'value';
        seriesNames.push(name);
        
        const xVals = item.x || [];
        const yVals = item.y || [];

        xVals.forEach((date, idx) => {
            if (!dateMap.has(date)) {
                dateMap.set(date, {});
            }
            dateMap.get(date)[name] = yVals[idx];
        });
    });
    
    const sortedDates = Array.from(dateMap.keys()).sort();
    const headers = ['date', ...seriesNames];
    const vals = [sortedDates];  // First column is dates
    
    seriesNames.forEach(name => {
        const column = sortedDates.map(date => dateMap.get(date)[name] ?? '');
        vals.push(column);
    });

    return [headers,vals];
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
