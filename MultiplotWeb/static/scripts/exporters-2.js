function downloadPlotData(){
    const plotDiv=$(this).closest('div.multiplot-plot').find('div.multiplot-plotContent');
    const type=$(this).siblings('.multiplot-plotSelect').data('plotType');

    let category,label;
    [category,label] = type.split('|');

    let exporter=plotDiv.data('exporter');
    if(typeof(exporter)==='undefined'){
        exporter=genericExport;
    }
    let headers,columns;
    [headers,columns] = exporter(plotDiv);

    generateCSV(category, label, headers, columns);
}

function generateCSV(category, label, headers, columns){
    const dateFrom=$('#multiplot-dateFrom').val()
    const dateTo=$('#multiplot-dateTo').val()

    let csvContent="data:text/csv;charset=utf-8,"

    //"write" the headers
    for(const header of headers){
        csvContent+=`${header},`
    }

    csvContent+='\r\n';

    //all columns *should* be the same length. Use the length of the first column
    const rows=columns[0].length;
    for(let r=0;r<rows;r++){
        for(const column of columns){
            csvContent+=`${column[r]},`;
        }
        csvContent+='\r\n';
    }

    const encodedUri=encodeURI(csvContent);
    const file_name=`${category}_${label}_${dateFrom}_${dateTo}.csv`

    $('#multiplot-downloadLink')
    .attr('download',file_name)
    .attr('href',encodedUri)
    .get(0)
    .click()
}

///////// Data formatters for CSV export/////////
// Returns an array of headers, columns /////////
// Columns is an array of columunar data/////////
/////////////////////////////////////////////////
function genericExport(plotDiv){
    const yvals=plotDiv.data('yValues');
    const xvals=plotDiv.data('xValues');
    const headers=['date','y value'];
    return [headers,[xvals,yvals]]
}

function exportRSDetections(plotDiv){
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

function exportLocationDepth(plotDiv){
    const lats=plotDiv.data('lats');
    const lons=plotDiv.data('lons');
    const depth=plotDiv.data('depth');
    const headers=['latitude','longitude','depth'];

    return [headers,[lats,lons,depth]];
}

function exportColorCode(plotDiv){
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

function exportThermalData(plotDiv){
    const exportData=plotDiv.data('exportData');

    const types=[],dates=[],values=[];
    const headers=['type','date','value'];
    for(const type in exportData){
        let date,value;
        [date,value]=exportData[type];
        for(let i=0;i<date.length;i++){
            types.push(type);
            dates.push(date[i]);
            values.push(value[i]);
        }
    }

    return [headers,[types,dates,values]];
}

function exportDiffusionData(plotDiv){
    const error=plotDiv.data('errorData');
    const cpx=plotDiv.data('cpx');
    const plag=plotDiv.data('plag');
    const data={
        'cpx':cpx,
        'plag':plag,
    }

    const headers=['type','date','date neg','date pos']
    const types=[],dates=[],negs=[],pos=[]
    for(const type in data){
        for(let i=0;i<data[type][0].length;i++){
            let date=data[type][0][i];
            let index=data[type][1][i];
            let dateNeg,datePos;
            [dateNeg,datePos]=error[index];
            types.push(type);
            dates.push(date);
            negs.push(dateNeg);
            pos.push(datePos);
        }
    }

    return [headers, [types,dates,negs,pos]]
}
