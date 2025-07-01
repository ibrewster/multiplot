const plotterRegistry = loadUserModules('plotters'); //this returns a promise. Use as such.
const selectorRegistryPromise = loadUserModules('selectors');

export function plotSelectSelected(event, ui){
    const item=ui.item;
    const plotType=item.data('tag')
    if(typeof(plotType)=='undefined'){
        return; //not a plot type
    }

    //we handle this click, don't pass it on
    event.stopPropagation();

    hideMenu();
    const selectButton=item.closest('.multiplot-typeSelectWrapper').find('.multiplot-plotSelect')
    const label=item.data('label')
    const cat=item.data('category')
    selectButton.find('div.multiplot-typeString').html(`${cat} - ${label}`)
    selectButton.data('plotType',plotType);
    plotTypeChanged.call(selectButton.get(0))
}

export async function plotTypeChanged(addArgs, resolve){
    const plotType=$(this).data('plotType');

    //remove any existing custom selectors
    $(this).siblings().find('.multiplot-customSelector').remove();

    // add any custom components needed.
    // Custom component function is either a function with the same
    // name as the plot/python function for single-label/selector situations,
    // or a class for category, with static functions for each label
    const custFunc=await getFunc(selectorRegistryPromise,plotType);

    //if neither are found, do nothing. Otherwise, run the code and add the HTML block
    if(custFunc){
        const content=custFunc.call(this, addArgs);
        if(content){
            const selector=$('<div class="multiplot-customSelector">')
            selector.append(content);
            $(this).siblings('.multiplot-selectRight').prepend(selector);
        }
    }

    //clear data from plot div
    $(this).parent().siblings('div.multiplot-plotContent').removeData();
    genPlot.call(this).then(()=>{
        if(typeof(resolve)!='undefined'){
            resolve();
        }
    })
}

let isSpatial=false;
export function genPlot(){
    const plotDiv=$(this).parent().siblings('div.multiplot-plotContent');
    const plotContainer=$(this).closest('div.multiplot-plot');
    const plotElement=plotDiv.get(0);
    const showXLabels=plotContainer.is(':last-child');
    const args=getPlotArgs.call(this);
    const placeholder=plotDiv.find('.multiplot-placeholder')

    if(typeof(args.plotType)=='undefined'){
        //no plot selected. Don't do anything
        return;
    }

    if(placeholder.length>0){
        placeholder.text("Fetching data. Please wait...")
    }

    const plotGenerated=new Promise((resolve,reject)=>{
        $.getJSON(prefix+'getPlot',args).then(async function(data){
            Plotly.purge(plotElement)

            placeholder.remove();

            const plotType=args['plotType']

            isSpatial=false;
            const plotFunc=await getFunc(plotterRegistry,plotType,'plot_generic_plot');
            // if plotFunc is undefined (which it should never be with the default option)
            // then this will "crash". Arguably, that's as good an option as any, as we can't
            // continue without a valid plot func.
            let [plotData,layout]=plotFunc.call(plotElement,data);

            if(isSpatial){
                plotDiv.addClass('multiplot-spatial');
            }
            else{
                plotDiv.removeClass('multiplot-spatial');
            }

            const config={'responsive':true}


            layout=setLayoutDefaults(layout,showXLabels)

            Plotly.newPlot(plotElement,plotData,layout,config).then(()=>{resolve()});

            plotElement.removeListener('plotly_relayout',plotRangeChanged)
            plotElement.on('plotly_relayout',plotRangeChanged);
        }).fail(function(e){
            if(e.status==404){
                Plotly.purge(plotDiv);
                $(plotDiv).empty();
                const errorPlaceholder=$('<div class="multiplot-placeholder error">')
                errorPlaceholder.html(`Unable to show plot for selected volcano/plot type.
                <br>No data found for this selection`);
                $(plotDiv).append(errorPlaceholder)
                resolve();
            }
            else{
                if(e.status!=0){
                    alert(`Error generating plot: ${e.status}, ${e.responseText}`);
                }
                reject();
            }
        }).always(function(){
            clearDateAxis(true);
        })
    })

    return plotGenerated
}

function plotRangeChanged(eventdata){
    if(!('xaxis.range[0]' in eventdata) ){
        return;
    }
    const dateFrom=eventdata['xaxis.range[0]'].slice(0,10)
    const dateTo=eventdata['xaxis.range[1]'].slice(0,10)
    $('#multiplot-dateFrom').val(dateFrom);
    $('#multiplot-dateTo').val(dateTo);
    refreshPlots();
}

export function getPlotArgs(){
    const plotType=$(this).data('plotType');

    const volcano=$('#multiplot-volcano').val()
    const dateFrom=$('#multiplot-dateFrom').val()
    const dateTo=$('#multiplot-dateTo').val()

    const args={
        'plotType':plotType,
        'volcano':volcano,
        'dateFrom':dateFrom,
        'dateTo':dateTo
    }

    //see if there are any custom args for this plot
    const addArgs=$(this).siblings().find('.multiplot-customSelector').find('form.multiplot-addArgs');
    if(addArgs.length>0){
        const queryString=addArgs.serialize();
        args['addArgs']=queryString;
    }

    return args
}


const COLORS={
    dark:{
        background:'rgba(0,0,0,0)',
        text:'rgb(204,204,220)',
        gridcolor:'#373A3F'
    },
    light:{
        background:'rgba(0,0,0,0)',
        text:'black',
        gridcolor:'#373A3F'
    }
}

function setLayoutDefaults(layout,showLabels){
    const themeColors=COLORS[theme];

    const dateFrom=$('#multiplot-dateFrom').val();
    const dateTo=$('#multiplot-dateTo').val();
    const range=[dateFrom,dateTo];
    const left_margin=80;
    const right_margin=50;


    if('xaxis' in layout){
        layout['xaxis']['range']=range;
        layout['xaxis']['type']='date';
        layout['xaxis']['autorange']=false;
        layout['xaxis']['showticklabels']=showLabels;
        layout['xaxis']['gridcolor']=themeColors['gridcolor'];
        layout['xaxis']['tickfont']={
            'size':14,
            'color':themeColors['text']
        }
    }
    else{
        layout['xaxis']={
            range:range,
            type:'date',
            autorange:false,
            showticklabels:showLabels,
            gridcolor:themeColors['gridcolor'],
            tickfont:{
                'size':14,
                'color':themeColors['text']
            }
        }
    }

    //top-level layout stuff
    layout['paper_bgcolor']=themeColors['background']
    layout['plot_bgcolor']=themeColors['background']

    if('margin' in layout){
        layout['margin']['l']=left_margin;
        layout['margin']['r']=right_margin;
    }
    else{
        layout['margin']={'l':left_margin,'r':right_margin}
    }

    //modify *all* y axis
    const yAxes=Object.keys(layout).filter(function(x){return x.startsWith('yaxis');})
    for(const axis of yAxes){
        layout[axis]['color']=themeColors['text']
        layout[axis]['gridcolor']=themeColors['gridcolor']
    }

    if('legend' in layout && 'font' in layout['legend']){
        layout['legend']['font']['color']=themeColors['text']
    }

    return layout;
}

export function refreshPlots(){
    return Promise.all($('div.multiplot-plotSelect').map((idx,element)=>{
        return genPlot.call(element);
    }));
}

export function clearDateAxis(setLast){
    $('.js-plotly-plot:not(multiplot-spatial)').each(function(){
        try {
            Plotly.relayout(this,{'xaxis.showticklabels':false})
        } catch {
            console.log("Unable to set showticklabels on");
            console.log(this);
        }
    });

    if(setLast===true){
        const lastPlot=$('.js-plotly-plot:not(multiplot-spatial):last').get(0)
        if(typeof(lastPlot)!='undefined'){
            try {
                Plotly.relayout(lastPlot,{'xaxis.showticklabels':true})
            } catch {
                console.log("Unable to set showticklabels on");
                console.log(lastPlot)
            }
        }
    }
}

