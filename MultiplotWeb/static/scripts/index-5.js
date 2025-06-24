let theme='dark'
let plotDescriptions={}
let prefix=''
let parent=''
const myScriptTag=document.currentScript

function multiPlot(dest){
    return new MultiPlot(dest)
}

function MultiPlot(dest){
    //constructor Function
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
    this.initialized=new Promise((resolve) => {
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
                        initMultiPlot(resolve);
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
    })
}

// -------------- MultiPlot Prototype Functions ------------//
MultiPlot.prototype.setVolcano = (volc) => {
    const volcSelect=$('#multiplot-volcano')
    const prevVal=volcSelect.val()

    //try to change the value
    volcSelect.val(volc)

    //see if it changed. If we get a different result than provided, then the provided
    //value is invalid
    console.log(volcSelect.val())
    console.log(volcSelect)
    if(volcSelect.val() != volc){
        volcSelect.val(prevVal);
        console.error(`Unable to set volcano to ${volc}: Invalid option`);
        return;
    }

    return refreshPlots();
}

MultiPlot.prototype.removePlot=(idx) =>{
    removePlotDiv.call($('.multiplot-plotContent').eq(idx))
}

MultiPlot.prototype.addPlot=createPlotDiv;

MultiPlot.prototype.getPlotsDiv=() => {
    return $('.multiplot-top-div')[0];
}

MultiPlot.prototype.getPlots = () => {
    return $('.multiplot-plotContent').toArray();
}

MultiPlot.prototype.getPlotParams=(idx)=>{
    if(typeof(idx)=='undefined'){
        return $('div.multiplot-plotSelect').map((idx,element)=>{
            return getPlotArgs.call(element);
        })
    }
    else{
        return getPlotArgs.call($('div.multiplot-plotSelect').eq(idx)[0])
    }

}

MultiPlot.prototype.setStartDate=function(date){
    const dateTo=$('#multiplot-dateTo').val();
    return this.setDateRange(date,dateTo);
}

MultiPlot.prototype.setEndDate= function(date){
    const dateFrom=$('#multiplot-dateFrom').val();
    return this.setDateRange(dateFrom,date);
}

MultiPlot.prototype.setDateRange = (dateFrom,dateTo) => {
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

    return refreshPlots();
}

// ---------- END MultiPlot Functions------------------/



function formatUTCDateString(date){
    let dateYear=date.getUTCFullYear();
    let dateMonth=date.getUTCMonth()+1;
    let dateDay=date.getUTCDate();

    if(dateMonth<10){ dateMonth = "0" + dateMonth; }
    if(dateDay<10){ dateDay = "0" + dateDay;}

    return `${dateYear}-${dateMonth}-${dateDay}`
}

function initMultiPlot(resolve){
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
        if(typeof(resolve)!='undefined'){
            resolve();
        }
    });

    if(window.matchMedia) {
        const mediaQueryList=window.matchMedia('print');
        mediaQueryList.addListener(function(mql){
            if(!mql.matches){
                restoreAfterPrint();
            }
        });
    }
};

function hideMenu(){
    $('.multiplot-plotSelectMenu:visible').hide()
    $('#multiplot-menuGuard').hide();
    $('.multiplot-plotSelect').removeClass('multiplot-open');
    $('.multiplot-help').hide();
}

function setTheme(colorScheme, save){
    if(colorScheme!=='dark' && colorScheme!=='light'){
        console.error('Invalid theme specified');
        return;
    }

    theme=colorScheme;

    if(save==true || typeof(save)=='undefined')
        localStorage.setItem('theme',theme);

    if(theme==='dark'){
        parent.addClass('multiplot-dark');
    }
    else{
        parent.removeClass('multiplot-dark');
    }

    refreshPlots();
}

// -----printing three stage ---//
function createNewWindowForPrint(){
    const myWindow=window.open('','PRINT','width=736px,height=1056px')

    myWindow.document.write('<html><head>');
    myWindow.document.write('<script src="https://apps.avo.alaska.edu/multiplot/static/scripts/jquery-3.6.3.min.js"></script>\n');
    myWindow.document.write(myScriptTag.outerHTML);

    let bodyClass='';
    if (navigator.appVersion.indexOf("Chrome/") != -1) {
        bodyClass='class="multiplot-print-chrome"'
    }

    myWindow.document.write(`</head><body ${bodyClass}>`);
    myWindow.document.write('<div id="multiplot-print-div" class="multiplot-print" style="width:8in"></div>');

    const dateFrom=$('#multiplot-dateFrom').val();
    const dateTo=$('#multiplot-dateTo').val();
    const volc=$('#multiplot-volcano').val();
    const plots=JSON.stringify(plot.getPlotParams().toArray())

    const initScript=`<script type="text/javascript">
        $(document).ready(function(){
            prefix='${prefix}';
            plot=new MultiPlot(document.getElementById('multiplot-print-div'))
            plot.initialized.then(()=>{
                setTheme('light',false);
                plot.removePlot(0);
                plot.setVolcano('${volc}');
                plot.setDateRange('${dateFrom}','${dateTo}');
                const plots=${plots}
                const plotFutures=plots.map(function(element){
                    const type=element['plotType']
                    const addArgs=element['addArgs']
                    return plot.addPlot(type,addArgs)
                })

                Promise.all(plotFutures).then(()=>{
                    setTheme('light',false); //not really needed, but it "kicks" the display nicely.
                    calcPageBreaks();
                    window.print();
                });
            });
        })
    </script>
    `
    myWindow.document.write(initScript)

    myWindow.document.write('</body></html>');

    myWindow.document.close();
    myWindow.focus();
}

// Stage 1: size for print page (8" wide")
function sizeAndPrint(){
    createNewWindowForPrint();
}

// Stage 2: Print the page
function printPage(){
    calcPageBreaks();
    window.print();
}

// Stage 3: Restore to original size
function restoreAfterPrint(){
    //setTheme(multiplotPrePrintStyle);
}

// ------- Printing Complete ---------//
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

function createPlotDiv(type,addArgs){
    return new Promise((resolve) => {
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
        typeDisplay.append(typeSelect);
        //selectDiv.append(typeSelect)
        typeSelect.menu({
            focus:plotSelectFocused,
            select:plotSelectSelected
        })

        const auxDiv=$('<div class="multiplot-selectRight">');
        const downloadDiv=$('<div class="multiplot-download">');
        downloadDiv.html(downloadSVG());
        auxDiv.append(downloadDiv);
        selectDiv.append(auxDiv);

        div.append(selectDiv)
        div.append('<div class="multiplot-plotContent"><div class="multiplot-placeholder">Select a plot type</div></div>')
        const rightDiv=$('<div class="multiplot-right">')
        rightDiv.append('<div class="multiplot-sort">')
        rightDiv.append('<div class=multiplot-removePlot>&times;</div>')
        div.append(rightDiv)
        dest.append(div)

        if(typeof(type)!=='undefined'){
            plotTypeChanged.call(typeDisplay.get(0), addArgs, resolve);
        }
        else{
            //done. Resolve the promise.
            resolve();
        }

    })

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

    const categoryDiv = help.children('.multiplot-category').html(cat)
    const datasetDiv = help.children('.multiplot-dataset').html(label)
    help.children('.multiplot-description').html(description)
    const helpParent=help.parent()
    const parentRight=helpParent.offset().left;
    const viewportLeft = window.scrollX;
    const helpRightMargin=parseInt(help.css('margin-right'),10);
    const availableWidth=parentRight-viewportLeft-(2*helpRightMargin)

    // Attempt to set a reasonable width based on a pleasing height-to-width ratio
    //const goldenRatio = 1.618;
    const goldenRatio=3;
    const tempElement = $('<div>').css({
        'position': 'absolute',
        'visibility': 'hidden',
        'white-space': 'nowrap',
        'font': help.css('font'),
    }).text(description);
    $('body').append(tempElement);
    const singleLineWidth = tempElement.width();
    const lineHeight=tempElement.height();
    const header_height=categoryDiv.height()+datasetDiv.height()

    let lines=1;
    let targetWidth=singleLineWidth;
    while (targetWidth/((lineHeight*lines)+header_height)>goldenRatio ){
        lines++;
        targetWidth=singleLineWidth/lines;
    }

    const maxWidth=Math.max(Math.min(availableWidth, targetWidth),200);
    help.css('width', `${maxWidth}px`);

    help.show();

}

function plotSelectSelected(event, ui){
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

function refreshPlots(){
    return Promise.all($('div.multiplot-plotSelect').map((idx,element)=>{
        return genPlot.call(element);
    }));
}

function clearDateAxis(setLast){
    $('.js-plotly-plot:not(multiplot-spatial)').each(function(){
        Plotly.relayout(this,{'xaxis.showticklabels':false})
    });

    if(setLast===true){
        const lastPlot=$('.js-plotly-plot:not(multiplot-spatial):last').get(0)
        if(typeof(lastPlot)!='undefined'){
            Plotly.relayout(lastPlot,{'xaxis.showticklabels':true})
        }
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

function selectPlotType(){
    const plotSelectMenu=$(this).parent().find('.multiplot-plotSelectMenu')
    plotSelectMenu.show();
    $('#multiplot-menuGuard').show();
    $(this).addClass('multiplot-open');
}

function plotTypeChanged(addArgs, resolve){
    const plotType=$(this).data('plotType');

    //remove any existing custom selectors
    $(this).siblings().find('.multiplot-customSelector').remove();

    // add any custom components needed.
    // Custom component function is named the same as the
    // plot function, but with _selector appended for simple options,
    // or is a class/function for more complicated needs.
    const [selectorCat,selectorTitle]=plotType.replace(/[^a-zA-Z0-9|]/g, '').split('|')

    //check for a plotType *specific* option first
    let custFunc=CustomOptionMap[selectorCat];
    if(custFunc){
        custFunc=custFunc[selectorTitle];
    }

    //if no plot type specific function, check for a generic "plot function" based option
    if(!custFunc){
        const selectorFuncName=plotFuncs[plotType]+"_selector"
        custFunc=window[selectorFuncName];
    }

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
    console.log(resolve)
    genPlot.call(this).then(()=>{
        if(typeof(resolve)!='undefined'){
            resolve();
        }
    })
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
    const addArgs=$(this).siblings().find('.multiplot-customSelector').find('form.multiplot-addArgs');
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

    const plotGenerated=new Promise((resolve,reject)=>{
        $.getJSON(prefix+'getPlot',args).done(function(data){
            Plotly.purge(plotElement)

            placeholder.remove();

            const plotType=args['plotType']

            let plotData,layout;
            const plotFuncName=plotFuncs[plotType];

            isSpatial=false;
            plotFunc=window[plotFuncName];
            if (plotFunc==null){
                [plotData,layout]=generic_plot.call(plotElement, data, data['ylabel'],"y")
            } else {
                [plotData,layout]=plotFunc.call(plotElement,data);
            }


            if(isSpatial){
                plotDiv.addClass('multiplot-spatial');
            }
            else{
                plotDiv.removeClass('multiplot-spatial');
            }

            config={'responsive':true}


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

function removePlotDiv(){
    const plotlyDiv=$(this).closest('div.multiplot-plot').find('.js-plotly-plot').get(0)
    if(typeof(plotlyDiv)!='undefined'){
        Plotly.purge(plotlyDiv)
    }
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
