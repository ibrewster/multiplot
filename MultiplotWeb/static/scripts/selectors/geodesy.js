export async function plot_geodesy_dataset(addArgs){

    addArgs=Object.fromEntries(new URLSearchParams(addArgs))
    const wrapper=$('<div class="multiplot-typeSelectorWrapper">');
    const selButton=$('<button>').text("Options...").click(showTypeSelector);
    
    const selector=$('<div>',{
        class:"multiplot-GeodesyOpts multiplot-typeSelector",
        style:"display:none"
    });
    
    wrapper.append(selButton);
    wrapper.append(selector);
    
    selector.append($('<div class="multiplot-typeSelectorGuard">'))
    const geodesyForm=$('<form class="multiplot-addArgs">')
    selector.append(geodesyForm);
    
    //get a list of stations for the volcano
    const volc=$('#multiplot-volcano').val();
    const url=`https://apps.avo.alaska.edu/geodesy/api/sites/${volc}/stations`
    const response = await fetch(url);
    const data = await response.json();
    const station_select=$('<select>',{
        class:"geodesyStation",
        name:"station"
    })
    
    const curStation=addArgs.station;
    for(const item of data){
        const staName=item['id'];
        const option=$('<option>').text(staName);
        if(curStation && curStation==staName){
            option.attr('selected',true);
        }
        station_select.append(option);
    }
    geodesyForm.append($('<label>').text("Station:"));
    geodesyForm.append(station_select);
    
    const closeButton=$('<button>',{
        type:"button",
        class:"multiplot-close",
        text:"Close"
    }).click(function(){
        geodesyFilterChanged.call(this, station_select);
        closeTypeSelector(this);
    });
    
    const footer=$('<div class="multiplot-typesFooter">');
    footer.append(closeButton);
    
    selector.append(footer);
    
    // Set up observer to call geodesyFilterChanged once attached
    const observer = new MutationObserver((mutations, obs) => {
        if (document.contains(wrapper[0])) {
            obs.disconnect();
            geodesyFilterChanged.call(closeButton[0], station_select);
        }
    });
    
    // Start observing before we return
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    return wrapper;
}

function geodesyFilterChanged(staSelect){
        const wrapper = $(this).closest('.multiplot-typeSelectWrapper');
        const cur_type = wrapper.find('.multiplot-typeString');

        if (!cur_type.length) {
            console.warn('No .multiplot-typeString element found in wrapper');
            return;
        }
        
        let cur_str=cur_type.html();
        cur_str=cur_str.replace(/\s*\(.+\)$/,'')
        
        const station=staSelect.val();
        
        cur_str+=` (${station})`;
        cur_type.html(cur_str);
}