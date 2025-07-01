export function rs_detections(plotDiv){
    //keys are detection types, values are lists of detection dates
    const detections=plotDiv.data('plotVals');
    const headers=['date','type'];
    const dates=[],types=[]
    for(const type in detections){
        const displayType=type.replace('<sub>','').replace('</sub>','');
        const dateList=detections[type];
        for(const date of dateList){
            dates.push(date);
            types.push(displayType);
        }
    }

    return [headers,[dates,types]];
}

//advanced usage: register the same exporter for *two* functions!
rs_detections.aliases=['seisdb_keywords'];
