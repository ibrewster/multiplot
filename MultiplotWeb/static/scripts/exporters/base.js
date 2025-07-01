// This is the default exporter function. It will simply create a CSV with x and y from the plot.
export function genericExport(plotDiv){
    const data=plotDiv.get(0).data
    const headers=['date']
    const vals=[]

    if(data.length==0){
        alert("Unable to get data to export");
        return;
    }

    //x axis/date/time
    vals.push(data[0].x)

    data.forEach((item)=>{
        const name=item.name || 'value';
        const val=item.y;
        headers.push(name);
        vals.push(val);
    })

    return [headers,vals]
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
