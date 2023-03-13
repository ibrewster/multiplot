$(document).ready(function(){    
    $(document).on('change','.plotSelect', genPlot);
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
    
    $('#print').click(sizeAndPrint);
        
    // Create one plot by default, the color code plot
    createPlotDiv('Color Code')
    
});

function sizeAndPrint(){
    const WIDTH=768; //~8 inches
    $('.plotContent').each(function(){
        Plotly.relayout(this,{'width':WIDTH});
        Plotly.Plots.resize(this);
    });
    calcPageBreaks();
    
    //slight delay here so things can figure themselves out
    setTimeout(function(){
        window.print();
       
        $('.plotContent').each(function(){
           Plotly.relayout(this,{'width':null});
           Plotly.Plots.resize(this);
        });
    },50)
}

const PAGE_HEIGHT=984;

function calcPageBreaks(){
    let lastPage=0;
    const plotsTop=$('#plots').offset().top
    $('div.plot').each(function(){
        const plotContainer=$(this);
        const plotHeight=$(this).height();
        // Find the "print" height of the top of this div.
        const plotTop=plotContainer.offset().top-plotsTop;
        const plotBottom=plotTop+plotHeight;
        if(plotBottom>lastPage+PAGE_HEIGHT){
            plotContainer.addClass('pagebreak');
            lastPage+=PAGE_HEIGHT;
        }
        else{
            plotContainer.removeClass('pagebreak');
        }
        
    });
}

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
    const selectDiv=$('<div class="typeSelectWrapper">')
    selectDiv.append(typeSelect)
    div.append(selectDiv)
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

function clearDateAxis(setLast){
    $('.js-plotly-plot').each(function(){
        Plotly.relayout(this,{'xaxis.showticklabels':false})
    });
    
    if(setLast===true){            
        const lastPlot=$('.js-plotly-plot:last').get(0)
        Plotly.relayout(lastPlot,{'xaxis.showticklabels':true})
    }
}

function setLayoutDefaults(layout,showLabels){
    const dateFrom=$('#dateFrom').val();
    const dateTo=$('#dateTo').val();
    const range=[dateFrom,dateTo];
    const left_margin=90;
    const right_margin=10;
    
    
    if('xaxis' in layout){
        layout['xaxis']['range']=range;
        layout['xaxis']['type']='date';
        layout['xaxis']['autorange']=false;
        layout['xaxis']['showticklabels']=showLabels;
        layout['xaxis']['gridcolor']='#373A3F';
        layout['xaxis']['tickfont']={
            'size':14,
            'color':'rgb(204,204,220)'
        }
    }
    else{
        layout['xaxis']={
            range:range,
            type:'date',
            autorange:false,
            showticklabels:showLabels,
            gridcolor:'#373A3F',
            tickfont:{
                'size':14,
                'color':'rgb(204,204,220)'
            }
        }
    }
    
    //top-level layout stuff
    layout['paper_bgcolor']='rgba(0,0,0,0)'
    layout['plot_bgcolor']='rgba(0,0,0,0)'
    
    if('margin' in layout){
        layout['margin']['l']=left_margin;
        layout['margin']['r']=right_margin;
    }
    else{
        layout['margin']={'l':left_margin,'r':right_margin}
    }
    
    if('yaxis' in layout){
        layout['yaxis']['color']='rgb(204,204,220)'
        layout['yaxis']['gridcolor']='#373A3F'
    }
    
    return layout;
}

function genPlot(){
    const plotDiv=$(this).parent().siblings('div.plotContent');
    const plotContainer=$(this).closest('div.plot');

    plotDiv.find('.placeholder').remove();

    const plotElement=plotDiv.get(0);
    const showXLabels=plotContainer.is(':last-child');
    
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
        const plotFunc=plotFuncs[plotType];
        [plotData,layout]=window[plotFunc](data);
        
        config={'responsive':true}
        
        layout=setLayoutDefaults(layout,showXLabels)
        
        Plotly.newPlot(plotElement,plotData,layout,config);
        
        plotElement.removeListener('plotly_relayout',plotRangeChanged)
        plotElement.on('plotly_relayout',plotRangeChanged);
    }).fail(function(e){
        if(e.status==404){
            Plotly.purge(plotDiv);
            $(plotDiv).empty();
            const errorPlaceholder=$('<div class="placeholder error">')
            errorPlaceholder.html(`Unable to show plot for selected volcano/plot type. 
            <br>No data found for this selection`);
            $(plotDiv).append(errorPlaceholder)
        }
        else{
            alert(`Error generating plot: ${e.status}, ${e.responseText}`)
        }
    }).always(function(){
        clearDateAxis(true);
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
    clearDateAxis(true);
}