const exporterRegistry=loadUserModules('exporters')

export async function downloadPlotData(){
    const parentPlot=$(this).closest('div.multiplot-plot')
    const plotDiv=parentPlot.find('div.multiplot-plotContent');
    const type=parentPlot.find('.multiplot-plotSelect').data('plotType');

    let category,label;
    [category,label] = type.split('|');

    const htmlTagFilter=/<[^>]+>/g
    category=category.replace(htmlTagFilter,'')
    label=label.replace(htmlTagFilter,'')

    const exporter = await getFunc(exporterRegistry,type,'genericExport')
    const [headers,columns] = exporter(plotDiv);

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
