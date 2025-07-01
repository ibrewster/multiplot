export function hideMenu(){
    $('.multiplot-plotSelectMenu:visible').hide()
    $('#multiplot-menuGuard').hide();
    $('.multiplot-plotSelect').removeClass('multiplot-open');
    $('.multiplot-help').hide();
}

export function setTheme(colorScheme, save){
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

export function selectPlotType(){
    const plotSelectMenu=$(this).parent().find('.multiplot-plotSelectMenu')
    plotSelectMenu.show();
    $('#multiplot-menuGuard').show();
    $(this).addClass('multiplot-open');
}


export function removePlotDiv(){
    const plotlyDiv=$(this).closest('div.multiplot-plot').find('.js-plotly-plot').get(0)
    if(typeof(plotlyDiv)!='undefined'){
        Plotly.purge(plotlyDiv)
    }
    $(this).closest('div.multiplot-plot').remove();
    clearDateAxis(true);
}

export function createPlotDiv(type,addArgs){
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
