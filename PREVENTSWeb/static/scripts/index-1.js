$(document).ready(function(){    
    $(document).on('change','.plotSelect',refreshPlots);
    $(document).on('click','div.removePlot',removePlotDiv);
    
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
    
    $('#dateFrom').val(dateFrom);
    $('#dateTo').val(dateTo);
    
    $('#addPlot').click(function(){createPlotDiv()});
    $('.rangeDate').blur(refreshPlots);
    $('#volcano').change(refreshPlots);
        
    // Create one plot by default, the color code plot
    createPlotDiv('Color Code')
    
});

function createPlotDiv(type){
    const dest=$('#plots')
    const div=$('<div class="plot">')
    const typeSelect=$('<select class="plotSelect">')
    typeSelect.append('<option value="">Select...</option>')
    
    for(const plot of plotTypes){
        let opt;
        if(plot.startsWith('-')){
            opt=`<optgroup label=${plot}></optgroup`
        }
        else{
            opt=$('<option>');
            opt.text(plot)
        }
        typeSelect.append(opt)
    }
    div.append(typeSelect)
    div.append('<div class="plotContent"><div class="placeholder"><---Select a plot type</div></div>')
    div.append('<div class=removePlot>&times;</div>')
    dest.append(div)
    
    if(typeof(type)!=='undefined'){
        typeSelect.val(type).change()
    }
}

function refreshPlots(){
    $('select.plotSelect').each(function(){
        genPlot.call(this);
    });
}

function setXaxis(layout,showLabels){
    const dateFrom=$('#dateFrom').val();
    const dateTo=$('#dateTo').val();
    const range=[dateFrom,dateTo];
    
    
    if('xaxis' in layout){
        layout['xaxis']['range']=range;
        layout['xaxis']['type']='date';
        layout['xaxis']['autorange']=false;
        layout['xaxis']['showticklabels']=showLabels;
    }
    else{
        layout['xaxis']={
            range:range,
            type:'date',
            autorange:false,
            showticklabels:showLabels
        }
    }
    return layout;
}

function genPlot(){
    const plotDiv=$(this).siblings('div.plotContent').get(0);
    Plotly.purge(plotDiv);
    
    const showXLabels=$(this).closest('div.plot').is(':last-child');
    $(this).siblings('div.plotContent').find('.placeholder').remove();
    
    const plotType=this.value;
    const volcano=$('#volcano').val()
    const dateFrom=$('#dateFrom').val()
    const dateTo=$('#dateTo').val()
    
    $.getJSON('getPlot',{
        'plotType':plotType,
        'volcano':volcano,
        'dateFrom':dateFrom,
        'dateTo':dateTo
    }).done(function(data){
        let plotData,layout;
        [plotData,layout]=plotFuncs[plotType](data);
        
        config={'responsive':true}
        
        const left_margin=90;
        const right_margin=10;
        
        if('margin' in layout){
            layout['margin']['l']=left_margin;
            layout['margin']['r']=right_margin;
        }
        else{
            layout['margin']={'l':left_margin,'r':right_margin}
        }
        
        layout=setXaxis(layout,showXLabels)
        
        Plotly.newPlot(plotDiv,plotData,layout,config);
        
        plotDiv.removeListener('plotly_relayout',plotRangeChanged)
        plotDiv.on('plotly_relayout',plotRangeChanged);
    }).fail(function(e){
        if(e.status==404){
            const errorPlaceholder=$('<div class="placeholder error">')
            errorPlaceholder.html(`Unable to show plot for selected volcano/plot type. 
            <br>No data found for this selection`);
            $(plotDiv).append(errorPlaceholder)
        }
        else{
            alert(`Error generating plot: ${e.status}, ${e.responseText}`)
        }
    })
}

function plotRangeChanged(eventdata){
    if(!('xaxis.range[0]' in eventdata) ){
        return;
    }
    const dateFrom=eventdata['xaxis.range[0]'].slice(0,10)
    const dateTo=eventdata['xaxis.range[1]'].slice(0,10)
    $('#dateFrom').val(dateFrom);
    $('#dateTo').val(dateTo);
    refreshPlots();
}

function removePlotDiv(){
    $(this).closest('div.plot').remove();
    refreshPlots();
}