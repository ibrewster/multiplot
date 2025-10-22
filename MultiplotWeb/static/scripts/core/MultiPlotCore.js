export async function initMultiPlot(){
    if(localStorage.theme){
        theme=localStorage.getItem('theme');
    }

    if(theme==='dark'){
        parent.addClass('multiplot-dark');
    }
    else{
        parent.removeClass('multiplot-dark');
    }

    parent.on('click','.multiplot-plotSelect',selectPlotType);
    parent.on('click','div.multiplot-removePlot',removePlotDiv);
    parent.on('click','div.multiplot-download',downloadPlotData);

    //set date range to last five years
    const curDate=new Date();
    let curMonth=curDate.getUTCMonth()+1
    if(curMonth<10){
        curMonth=`0${curMonth}`
    }

    let curDay=curDate.getUTCDate();
    if(curDay<10){
        curDay=`0${curDay}`;
    }

    const curYear=curDate.getUTCFullYear();
    const dateTo=`${curYear}-${curMonth}-${curDay}`
    const dateFrom=`${curYear-10}-${curMonth}-${curDay}`

    $('#multiplot-dateFrom').val(dateFrom);
    $('#multiplot-dateTo').val(dateTo);

    $('#multiplot-addPlot').click(function(){createPlotDiv()});
    $('.multiplot-rangeDate').blur(refreshPlots);
    $('#multiplot-volcano').change(refreshPlots);

    $('#multiplot-print').click(generatePDF);

    $('#multiplot-menuGuard').click(hideMenu)

    $('#multiplot-plots').sortable({
        handle:'div.multiplot-sort',
        update:refreshPlots
    })
    
    const response=await fetch(prefix+'getDescriptions');
    plotDescriptions = response.ok ? await response.json() : {};

    if(window.matchMedia) {
        const mediaQueryList=window.matchMedia('print');
        mediaQueryList.addListener(function(mql){
            if(!mql.matches){
                restoreAfterPrint();
            }
        });
    }
};
