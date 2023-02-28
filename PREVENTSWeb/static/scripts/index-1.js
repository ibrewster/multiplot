$(document).ready(function(){    
    $(document).on('change','.plotSelect',genPlot);
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
    const dateFrom=`${curYear-5}-${curMonth}-${curDay}`
    
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

plotFuncs={
    'Color Code':plotColorCode,
    'Radiative Power':plotRadiativePower
}

function refreshPlots(){
    $('select.plotSelect').each(function(){
        genPlot.call(this);
    });
}

function setXRange(layout){
    const dateFrom=$('#dateFrom').val();
    const dateTo=$('#dateTo').val();
    const range=[dateFrom,dateTo];
    
    if('xaxis' in layout){
        layout['xaxis']['range']=range;
        layout['xaxis']['type']='date';
        layout['xaxis']['autorange']=false;
    }
    else{
        layout['xaxis']={
            range:range,
            type:'date',
            autorange:false
        }
    }
    return layout;
}

function genPlot(){
    const plotDiv=$(this).siblings('div.plotContent').get(0);
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
        
        layout=setXRange(layout)
        
        Plotly.newPlot(plotDiv,plotData,layout,config);
        
        plotDiv.removeListener('plotly_relayout',plotRangeChanged)
        plotDiv.on('plotly_relayout',plotRangeChanged);
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
}


//---------PLOT FUNCTIONS-----------//
function plotColorCode(data){
    const layout={
        height:60,
        margin:{t:5,b:15},
        showlegend:false,
        yaxis:{
            autorange:false,
            range: [0,1],
            dtick: 1,
            fixedrange:true,
            showticklabels:false,
            showgrid:false
        },
        xaxis:{
            showgrid:false
        }
    }
    
    const plotData=[]
    for(let i=1;i<data.length;i++){
        let record=data[i];
        let prev=data[i-1];
        let x=[prev['date'], record['date']];
        let y=[1,1];
        
        let dataEntry={
            type:'scatter',
            x:x,
            y:y,
            fill:'tozeroy',
            fillcolor:prev['color'],
            line:{
                color:prev['color'],
                width:0
            },
            mode:'lines'
        }
        
        plotData.push(dataEntry)
    }
    
    return [plotData, layout]
}

function plotRadiativePower(data){
    const plotData=[]
    const viirs_data=data['viirs']
    const viirs={
        type:'scatter',
        x:viirs_data['date'],
        y:viirs_data['simple_radiance'],
        name:'VIIRS',
        mode:'lines',
        line:{
            color:'#F00',
            width:1
        }
    }
    
    plotData.push(viirs)
    
    const layout={
        height:200,
        showlegend:true,
        legend:{
            x:0,
            y:1,
        },
        margin:{t:5,b:15},
        yaxis:{
            type:'log',
            autorange:true,
            title:{
                text:'Radiative Power<br>Mean (MW)'
            },
            showgrid:false,
            linecolor: 'black',
            mirror:true,
            tickformat:'~e',
            dtick:1
        },
        xaxis:{
            showticklabels:false,
            showgrid:false,
            linecolor: 'black',
            mirror:true,
        }
    }
    
    return [plotData,layout]
}