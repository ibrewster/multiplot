let theme='dark'
let plotDescriptions={}
let prefix=''
let parent=''
const myScriptTag=document.currentScript

function multiPlot(dest){
    return new MultiPlot(dest)
}

function MultiPlot(dest){
    parent=$(dest)

    // We could skip all this if we just wanted to assume we are loading remote.
    const host=window.location.hostname
    const port=window.location.port
    const protocol=window.location.protocol

    const myURL=new URL(myScriptTag.src)
    const myServer=myURL.hostname
    const myPort=myURL.port
    const serverPrefix=myURL.pathname.replace(/static\/scripts\/.+.js/,'')

    // we don't technically need the direct host stuff, but it allows us to do different things
    // when not embedding in another webpage.
    const direct_host= (myServer==host && myPort==port)

    if (direct_host){
        //this allows us to tweak the display using CSS if we are not loading from a remote server
        $(dest).addClass('multiplot-direct')
    } else {
        prefix=`${protocol}//${myServer}`
        if (port!=443 && port!=80){
            prefix+=':'+myPort;
        }

        prefix+=serverPrefix
    }

    // get the header scripts
    $.get(prefix+'headers')
    .fail(() => {
        console.log('Unable to fetch MultiPlot headers');
    })
    .done((headers) => {
        //append the scripts and stylesheets to the header

        const parsedHtml=$.parseHTML(headers,null,true);

        // we have to track the loading of the scripts so we don't try to execute before
        // all scripts have loaded.
        const neededScripts=new Set();

        function scriptLoaded(src){
            neededScripts.delete(src);

            if(neededScripts.size===0){
                // once all scripts are loaded, go ahead load the body div
                //followed by plot initilization
                parent.load(prefix+'body', function(){
                    parent.addClass('multiplot-top-div');
                    initMultiPlot();
                })
            }
        }

        parsedHtml.forEach( (element) => {
            let newElement=element; //default, for css/link/etc tags

            if(element instanceof HTMLScriptElement){
                // If we have a script, creating a new element the same as the old one seems to
                // be the only way to get them to load, for some reason. CSS links just work...
                newElement=document.createElement('script');
                newElement.async=false;

                //if the script has text, set it on the new script.
                //Otherwise, add the onload handler and set the src attribute.
                if(element.text!=''){ newElement.text=element.text; }
                else{
                    neededScripts.add(element.src)
                    newElement.onload = () => {scriptLoaded(element.src)};
                    newElement.src=element.src;
                }
            }

            document.head.appendChild(newElement);
        });

    })
}

MultiPlot.prototype.setVolcano = (volc) => {
    const volcSelect=$('#multiplot-volcano')
    const prevVal=volcSelect.val()

    //try to change the value
    volcSelect.val(volc)

    //see if it changed. If we get a different result than provided, then the provided
    //value is invalid
    if(volcSelect.val() != volc){
        volcSelect.val(prevVal);
        console.error(`Unable to set volcano to ${volc}: Invalid option`);
        return;
    }

    volcSelect.change();
}

MultiPlot.prototype.addPlot=createPlotDiv;

MultiPlot.prototype.getPlotsDiv=() => {
    return $('.multiplot-top-div')[0];
}

MultiPlot.prototype.setDateRange=setDateRange;

MultiPlot.prototype.setStartDate=(date) => {
    const dateTo=$('#multiplot-dateTo').val();
    setDateRange(date,dateTo);
}

MultiPlot.prototype.setEndDate= (date) => {
    const dateFrom=$('#multiplot-dateFrom').val();
    setDateRange(dateFrom,date);
}

function setDateRange(dateFrom,dateTo){
    if(typeof(dateFrom)=='string'){
        dateFrom=new Date(dateFrom);
    }

    if(typeof(dateTo)=='string'){
        dateTo=new Date(dateTo);
    }

    if(isNaN(dateFrom)){
        console.log('Invalid Date From');
        return;
    }

    if(isNaN(dateTo)){
        console.log('Invalid Date To');
        return;
    }

    //ok, we have two valid date objects. Convert them to nicely formatted strings.
    const from=formatUTCDateString(dateFrom);
    const to=formatUTCDateString(dateTo);

    $('#multiplot-dateFrom').val(from);
    $('#multiplot-dateTo').val(to);

    refreshPlots();
}

function formatUTCDateString(date){
    let dateYear=date.getUTCFullYear();
    let dateMonth=date.getUTCMonth()+1;
    let dateDay=date.getUTCDate();

    if(dateMonth<10){ dateMonth = "0" + dateMonth; }
    if(dateDay<10){ dateDay = "0" + dateDay;}

    return `${dateYear}-${dateMonth}-${dateDay}`
}

function initMultiPlot(){
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

    $('#multiplot-print').click(sizeAndPrint);

    // Create one plot by default, the color code plot
    createPlotDiv('General|Color Code')

    $('#multiplot-menuGuard').click(hideMenu)

    $('#multiplot-plots').sortable({
        handle:'div.multiplot-sort',
        update:refreshPlots
    })

    $.getJSON(prefix+'getDescriptions').
    done(function(data){
        plotDescriptions=data
    })
};

function hideMenu(){
    $('.multiplot-plotSelectMenu:visible').hide()
    $('#multiplot-menuGuard').hide();
    $('.multiplot-plotSelect').removeClass('multiplot-open');
    $('.multiplot-help').hide();
}

function setTheme(colorScheme){
    if(colorScheme!=='dark' && colorScheme!=='light'){
        console.error('Invalid theme specified');
        return;
    }

    theme=colorScheme;
    localStorage.setItem('theme',theme);
    if(theme==='dark'){
        parent.addClass('multiplot-dark');
    }
    else{
        parent.removeClass('multiplot-dark');
    }

    refreshPlots();
}

function sizeAndPrint(){
    const WIDTH=768; //~8 inches
    const lastStyle=theme;
    setTheme('light');

    setTimeout(function(){
        $('.multiplot-plotContent').each(function(){
            Plotly.relayout(this,{'width':WIDTH});
            Plotly.Plots.resize(this);
        });

        calcPageBreaks();

        //slight delay here so things can figure themselves out
        setTimeout(function(){
            window.print();

            setTimeout(function(){
                console.log('Relayout back to original size')
                $('.multiplot-plotContent').each(function(){
                   Plotly.relayout(this,{'width':null});
                   Plotly.Plots.resize(this);
                });

                setTheme(lastStyle);
            },500) //let the print dialog open and block execution
        },500) // let the size relayout display
    },500) //let the theme change display
}

const PAGE_HEIGHT=984;

function calcPageBreaks(){
    let lastPage=0;
    const plotsTop=$('#multiplot-plots').offset().top
    $('div.multiplot-plot').each(function(){
        const plotContainer=$(this);
        const plotHeight=$(this).height();
        // Find the "print" height of the top of this div.
        const plotTop=plotContainer.offset().top-plotsTop;
        const plotBottom=plotTop+plotHeight;
        if(plotBottom>lastPage+PAGE_HEIGHT){
            plotContainer.addClass('multiplot-pagebreak');
            lastPage+=PAGE_HEIGHT;
        }
        else{
            plotContainer.removeClass('multiplot-pagebreak');
        }

    });
}

function createPlotDiv(type){
    const dest=$('#multiplot-plots')
    const div=$('<div class="multiplot-plot">')

    const typeDisplay=$('<div class="multiplot-plotSelect">')
    typeDisplay.html('<div class="multiplot-typeString">Select...</div>')

    const helpDiv=$('<div class="multiplot-help" style="display:none;">')
    helpDiv.append('<div class="multiplot-category">')
    helpDiv.append('<div class="multiplot-dataset">')
    helpDiv.append('<div class="multiplot-description">')

    typeDisplay.prepend(helpDiv)


    const typeSelect=$('<ul class="multiplot-plotSelectMenu" style="display:none">')

    let curCat=null;
    let curCatTitle=''
    for(const plot of plotTypes){
        let opt;
        if(typeof(plot)=='string' && plot.startsWith('-')){
            opt=$('<li class="multiplot-plot-cat-group">')
            curCatTitle=plot.replaceAll('---','')
            let title=$('<div>').html(curCatTitle)
            opt.append(title)
            curCat=$('<ul>')
            opt.append(curCat)
            opt.data('category',curCatTitle)
            opt.data('label','')
            typeSelect.append(opt)
        }
        else{
            let tag,label;
            [tag,label]=plot
            opt=$('<li>');
            opt.append($('<div>').html(label))
            opt.data('tag',tag)
            opt.data('category',curCatTitle)
            opt.data('label',label)
            if(typeof(type)!='undefined' && type==tag){
                typeDisplay.data('plotType',tag)
                typeDisplay.find('.multiplot-typeString').html(`${curCatTitle} - ${label}`)
            }
            curCat.append(opt)
        }
    }

    const selectDiv=$('<div class="multiplot-typeSelectWrapper">')
    selectDiv.append(typeDisplay)
    selectDiv.append(typeSelect)
    typeSelect.menu({
        focus:plotSelectFocused,
        select:plotSelectSelected
    })

    const downloadDiv=$('<div class="multiplot-download">');
    downloadDiv.html(downloadSVG());
    selectDiv.append(downloadDiv);

    div.append(selectDiv)
    div.append('<div class="multiplot-plotContent"><div class="multiplot-placeholder">Select a plot type</div></div>')
    const rightDiv=$('<div class="multiplot-right">')
    rightDiv.append('<div class="multiplot-sort">')
    rightDiv.append('<div class=multiplot-removePlot>&times;</div>')
    div.append(rightDiv)
    dest.append(div)

    if(typeof(type)!=='undefined'){
        plotTypeChanged.call(typeDisplay.get(0));
    }
}

function plotSelectFocused(event, ui){
    const item=ui.item;
    const selectButton=item.closest('.multiplot-typeSelectWrapper').find('.multiplot-plotSelect')
    const help=selectButton.find('.multiplot-help')

    const label=item.data('label')
    const cleanLabel=$('<div>').html(label).text()
    const cat=item.data('category')
    const cleanCat=$('<div>').html(cat).text()

    let description="No Description Provided"
    try {
        description = plotDescriptions[cleanCat][cleanLabel]
    } catch (error) {
        help.hide();
        return;
    }

    if(typeof(description)=='undefined' || description===null){
        description="No Description Provided"
    }

    help.show();
    help.children('.multiplot-category').html(cat)
    help.children('.multiplot-dataset').html(label)
    help.children('.multiplot-description').html(description)
}

function plotSelectSelected(event, ui){
    const item=ui.item;
    const plotType=item.data('tag')
    if(typeof(plotType)=='undefined'){
        return; //not a plot type
    }

    hideMenu();
    const selectButton=item.closest('.multiplot-typeSelectWrapper').find('.multiplot-plotSelect')
    const label=item.data('label')
    const cat=item.data('category')
    selectButton.find('div.multiplot-typeString').html(`${cat} - ${label}`)
    selectButton.data('plotType',plotType);
    plotTypeChanged.call(selectButton.get(0))
}

function refreshPlots(){
    $('div.multiplot-plotSelect').each(function(){
        genPlot.call(this);
    });
}

function clearDateAxis(setLast){
    $('.js-plotly-plot:not(multiplot-spatial)').each(function(){
        Plotly.relayout(this,{'xaxis.showticklabels':false})
    });

    if(setLast===true){
        const lastPlot=$('.js-plotly-plot:not(multiplot-spatial):last').get(0)
        Plotly.relayout(lastPlot,{'xaxis.showticklabels':true})
    }
}

COLORS={
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
    const left_margin=90;
    const right_margin=10;


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

    if('yaxis' in layout){
        layout['yaxis']['color']=themeColors['text']
        layout['yaxis']['gridcolor']=themeColors['gridcolor']
    }

    return layout;
}

function selectPlotType(){
    const plotSelectMenu=$(this).parent().find('.multiplot-plotSelectMenu')
    plotSelectMenu.show();
    $('#multiplot-menuGuard').show();
    $(this).addClass('multiplot-open');
}

function plotTypeChanged(){
    const plotType=$(this).data('plotType');

    //remove any existing custom selectors
    $(this).siblings('.multiplot-customSelector').remove();

    // add any custom components needed.
    // Custom component function is named the same as the
    // plot function, but with _selector appended.
    const selector=plotFuncs[plotType]+"_selector"
    const custFunc=window[selector];

    if(typeof(custFunc)!=="undefined"){
        const selector=$('<div class="multiplot-customSelector">')
        selector.append(custFunc());
        $(this).after(selector);
    }

    //clear data from plot div
    $(this).parent().siblings('div.multiplot-plotContent').removeData();
    genPlot.call(this);
}

function getPlotArgs(){
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
    const addArgs=$(this).siblings('.multiplot-customSelector').find('form.multiplot-addArgs');
    if(addArgs.length>0){
        const queryString=addArgs.serialize();
        args['addArgs']=queryString;
    }

    return args
}

let isSpatial=false;
function genPlot(){
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

    $.getJSON(prefix+'getPlot',args).done(function(data){
        Plotly.purge(plotElement)

        placeholder.remove();

        const plotType=args['plotType']

        let plotData,layout;
        const plotFunc=plotFuncs[plotType];

        isSpatial=false;
        [plotData,layout]=window[plotFunc].call(plotElement,data);

        if(isSpatial){
            plotDiv.addClass('multiplot-spatial');
        }
        else{
            plotDiv.removeClass('multiplot-spatial');
        }

        config={'responsive':true}

        layout=setLayoutDefaults(layout,showXLabels)

        Plotly.newPlot(plotElement,plotData,layout,config);

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
    $('#multiplot-dateFrom').val(dateFrom);
    $('#multiplot-dateTo').val(dateTo);
    refreshPlots();
}

function removePlotDiv(){
    $(this).closest('div.multiplot-plot').remove();
    clearDateAxis(true);
}


function downloadSVG(){
    return `
<svg height="32pt" version="1.1" viewBox="0 0 370.9 527.96" xmlns="http://www.w3.org/2000/svg">
 <g transform="translate(-180.99 -17.213)">
  <path d="m391.4 449.97v-78.805h-49.695v78.805h-54.891l80.676 95.207 80.676-95.207z"/>
  <path d="m525.74 172.65v-42.344c0-2.2188-0.92969-4.4727-2.4883-6.0547l-103.16-104.48c-1.3438-1.6797-4.0625-2.5586-6.1289-2.5586h-197.29c-4.7578 0-8.6172 3.8555-8.6172 8.6172v146.82h-27.066v171.07h27.066v72.461c0 4.7617 3.8555 8.6172 8.6172 8.6172h110.66v-17.23l-102.05-4e-3v-63.848h283.21v63.848h-102.75v17.23h111.37c4.7578 0 8.6172-3.8555 8.6172-8.6172v-72.461h26.156v-171.07zm-103.16-125.84 73.914 74.887h-73.914zm-117.1 236.32c5.2852 0 11.141-1.1484 14.59-2.5273l2.6406 13.668c-3.2148 1.6094-10.449 3.332-19.867 3.332-26.762 0-40.543-16.652-40.543-38.707 0-26.418 18.836-41.117 42.266-41.117 9.0742 0 15.965 1.8398 19.066 3.4453l-3.5625 13.898c-3.5625-1.4922-8.5-2.8711-14.699-2.8711-13.898 0-24.695 8.3867-24.695 25.613 0 15.5 9.1875 25.266 24.805 25.266zm53.418 14.469c-8.8438 0-17.574-2.3008-21.938-4.7109l3.5625-14.473c4.7109 2.4141 11.945 4.8203 19.41 4.8203 8.043 0 12.289-3.3281 12.289-8.3828 0-4.8242-3.6758-7.582-12.98-10.91-12.863-4.4805-21.25-11.602-21.25-22.855 0-13.207 11.023-23.316 29.289-23.316 8.7266 0 15.16 1.8398 19.754 3.9062l-3.9023 14.125c-3.1016-1.4922-8.6172-3.6758-16.195-3.6758-7.582 0-11.254 3.4453-11.254 7.4648 0 4.9414 4.3633 7.1211 14.355 10.914 13.668 5.0508 20.102 12.172 20.102 23.086 0 12.98-9.9922 24.008-31.242 24.008zm87.527-1.1484h-20.441l-24.809-77.41h19.18l9.418 32.734c2.6406 9.1914 5.0547 18.031 6.8906 27.68h0.34375c1.9531-9.3047 4.3633-18.492 7.0039-27.336l9.875-33.078h18.605zm62.082-123.8h-283.21v-138.2h180.05v95.855c0 4.7578 3.8555 8.6172 8.6172 8.6172h94.547z"/>
 </g>
</svg>
    `
}
