export async function plot_geodesy_dataset(addArgs){
    //Initiate the required API calls asyncronously
    const volc=$('#multiplot-volcano').val();
    const volcPromise=fetch(`https://apps.avo.alaska.edu/geodesy/api/sites/${volc}`).then((r)=>r.json())
    const stationsPromise=fetch(`https://apps.avo.alaska.edu/geodesy/api/sites/${volc}/stations`).then((r)=>r.json())
    
    //parse the addArgs query string into an object
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
    const geodesyForm=$('<form class="multiplot-addArgs geodesyOpts">')
    selector.append(geodesyForm);
    
    
    const stationSelect=$('<select>',{
        class:"geodesyStation geodesySelect",
        name:"station"
    });
    
    const baseSelect=$('<select>',{
        class:"geodesyBaseline geodesySelect",
        name: "base"
    })
    
    geodesyForm.append($('<label>').text("Station: "));
    geodesyForm.append(stationSelect);
    
    geodesyForm.append($('<label>').text("Baseline: "));
    geodesyForm.append(baseSelect);
    
    const closeButton=$('<button>',{
        type:"button",
        class:"multiplot-close",
        text:"Close"
    }).click(function(){
        geodesyFilterChanged.call(this, stationSelect, baseSelect);
        closeTypeSelector(this);
    });
    
    const footer=$('<div class="multiplot-typesFooter">');
    footer.append(closeButton);
    
    selector.append(footer);
    
    //populate the select lists
    const curStation=addArgs.station;
    const stationsData=await stationsPromise;
    for(const item of stationsData){
        const staName=item['id'];
        const option=$('<option>').text(staName);
        if(curStation && curStation==staName){
            option.attr('selected',true);
        }
        stationSelect.append(option);
    }
    
    const curBase=addArgs.base;
    const volcData=await volcPromise;
    for(const baseline of volcData.baselines){
        const option=$('<option>').text(baseline);
        if(curBase && curBase==baseline){
            option.attr('selected',true);
        }
        baseSelect.append(option);
    }
    
    wrapper.onAttached=()=>{geodesyFilterChanged.call(closeButton[0], stationSelect, baseSelect);}
    
    return wrapper;
}

function geodesyFilterChanged(staSelect,baseSelect){
        const wrapper = $(this).closest('.multiplot-typeSelectWrapper');
        const cur_type = wrapper.find('.mp-typeStringSuffix');

        if (!cur_type.length) {
            console.warn('No .multiplot-typeString element found in wrapper');
            return;
        }
        
        const station=staSelect.val();
        const baseline=baseSelect.val();
        const cur_str=` (${station}-${baseline})`;
        
        cur_type.html(cur_str);
}