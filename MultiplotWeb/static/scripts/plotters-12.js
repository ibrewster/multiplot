//---------Custom plot selectors--------//
// Selectors are tied to the plot by function name.
// The name of the function to generate the selector "widget" will
// be the same as the name of the plot function, with "_sselector" appended.

// Selector utility functions to open/close the selector windows

function closeTypeSelector(button){
    $(button).closest('.multiplot-typeSelector').hide();
    const select=$(button).closest('.multiplot-typeSelectWrapper').find('.multiplot-plotSelect');
    genPlot.call(select.get(0));
}

function showTypeSelector(){
    $(this).closest('div').find('.multiplot-typeSelector').show();
}

// Utility function to generate a generic type selector with various options
function generate_type_selector(types, selectedArgs, header, label){
    if(typeof(label)=='undefined'){
        label="Select Types..."
    }

    if(typeof(selectedArgs)!='undefined'){
        selectedArgs=new URLSearchParams(selectedArgs).getAll('types');
    }
    else{
        selectedArgs=[];
    }

    const selButton=$('<button>');
    selButton.text(label);
    selButton.click(showTypeSelector);

    let selectorHTML=`
        <div class="multiplot-typeSelector" style="display:none">
            <div class="multiplot-typeSelectorGuard"></div>
            <div class="multiplot-typeHeader">${header}</div>
            <form class="multiplot-addArgs">
                <div class="multiplot-selectorTypes">
    `

    for(let item of types){
        let item_label, item_value;
        if (Array.isArray(item) && item.length==2){
            [item_label, item_value] = item;
        } else if (typeof item === 'string'){
            item_label=item;
            //strip any HTML tags
            item_value=$('<div>').html(item_label).text();
            //remove spaces
            item_value=item_value.replace(' ','')
        } else {
            console.error('The items must be either a string for an array with exactly two elements.')
        }

        checked= (selectedArgs.length==0 || selectedArgs.includes(item_value)) ? 'checked' : ''

        selectorHTML+=`
            <input type="checkbox" id="${item_value}Type" name="types" ${checked} value="${item_value}">
            <label for="${item_value}Type">${item_label}</label>
        `
    }

    selectorHTML+=`
                </div>
            </form>
            <div class="multiplot-typesFooter">
                <button type="button" class="multiplot-close" onclick="closeTypeSelector(this)">Close</button>
            </div>
        </div>
    `
    const wrapper=$('<div class="multiplot-typeSelectorWrapper">');
    wrapper.append(selButton);
    wrapper.append(selectorHTML);
    return wrapper;
}


// Remote sensing detection type selector
function rs_detections_selector(addArgs){
    const types=['Ash','SO <sub>2</sub>','Elevated Temps','Steam/Water'];
    selectorHTML=generate_type_selector(types,addArgs,"Select detection types to show")
    return selectorHTML
}

// seidb keyword selector
function seisdb_keywords_selector(addArgs){
    const types=[
        ['Seismic Swarm', 71],
        ['Low-Frequency Event', 81],
        ['very long period event(s)',91],
        ['tremor',101],
        ['suspected rockfall/debris flow/avalanche',111],
        ['other earthquake of note',121],
        ['composite event',122],
        ['felt event',123],
        ['Station Problem',131],
        ['Local Earthquake',141],
        ['Wind Noise',151],
        ['Ground Coupled Airwaves',161],
        ['Other Seismic Events',171],
        ['Mystery Events',181],
        ['Explosions/Eruption',191],
        ['Network Outage',201],
    ];
    selectorHTML=generate_type_selector(types,addArgs,"Select detection types to show")
    return selectorHTML
}

//SO2 emission rate Fioletov/AVO selector
function so2_em_rate_combined_selector(addArgs){
    const types=['AVO','Fioletov']
    selectorHTML=generate_type_selector(types,addArgs,"Select Datasets to Show","Select Datasets...")
    return selectorHTML
}

//SO2 mass Carn/AVO selector
function so2_mass_combined_selector(addArgs){
    const types=['AVO','Carn']
    selectorHTML=generate_type_selector(types,addArgs,"Select Datasets to Show","Select Datasets...")
    return selectorHTML
}

function plot_db_dataset_selector(addArgs){
    const plotType=$(this).data('plotType');
    const typeList=plotDataTypes[plotType];
    if(typeList==null || typeof(typeList)=='undefined'){
        return null;
    }

    const selectorHTML=generate_type_selector(typeList,addArgs,"Select data types to show","Select Data Types...")
    return selectorHTML
}

//Generic preevents db plot type selector
function plot_preevents_dataset_selector(addArgs){
    const plotType=$(this).data('plotType');

    const typeList=plotDataTypes[plotType];
    if(typeList==null || typeof(typeList)=='undefined'){
        return null;
    }

    const selectorHTML=generate_type_selector(typeList,addArgs,"Select data types to show","Select Data Types...")
    return selectorHTML
}


/* lower level custom selector HTML, for when
    a single plot-function based selector isn't enough */

CustomOptionMap={}

class RemoteSensing {
    static register = CustomOptionMap[RemoteSensing.name] = RemoteSensing;
    static instanceID=0;

    static filterChanged(){
        const wrapper = $(this).closest('.multiplot-typeSelectWrapper');
        const cur_type = wrapper.find('.multiplot-typeString');

        if (!cur_type.length) {
            console.warn('No .multiplot-typeString element found in wrapper');
            return;
        }

        // Check if any filter or type checkbox differs from its default state
        const allCheckboxes = wrapper.find('input[name="filters"], input[name="types"]');
        const isFiltered = allCheckboxes.toArray().some(checkbox => {
            const $checkbox = $(checkbox);
            const isChecked = $checkbox.is(':checked');
            const defaultState = $checkbox.data('default') === true; // Convert to boolean
            return isChecked !== defaultState; // Filter active if state differs
        });

        const currentHtml = cur_type.html();
        const filteredText = " (filtered)";

        if (isFiltered && !currentHtml.endsWith(filteredText)) {
            cur_type.html(currentHtml + filteredText);
        } else if (!isFiltered && currentHtml.endsWith(filteredText)) {
            cur_type.html(currentHtml.replace(filteredText, ""));
        }
    }

    static HotLINKRadiativePower(addArgs){
        return RemoteSensing.HotLINKGeneric.call(this, addArgs);
    }

    static HotLINKprobability(addArgs){
        return RemoteSensing.HotLINKGeneric.call(this, addArgs);
    }

    static BackgroundMIRBrightnessTemperature(addArgs){
        return RemoteSensing.HotLINKGeneric.call(this, addArgs);
    }

    static HotspotMIRMaximumBrightnessTemperature(addArgs){
        return RemoteSensing.HotLINKGeneric.call(this, addArgs);
    }

    static HotspotMIRMeanBrightnessTemperature(addArgs){
        return RemoteSensing.HotLINKGeneric.call(this, addArgs);
    }

    static NumberofHotspotPixels(addArgs){
        return RemoteSensing.HotLINKGeneric.call(this, addArgs);
    }

    static HotLINKGeneric(selectedArgs, label, header){
        RemoteSensing.instanceID++;
        label=label ?? "Select Filters...";
        header=header ?? "Select Plot Filters"

        const plotType=$(this).data('plotType');
        const typeList=plotDataTypes[plotType];

        if(typeof(selectedArgs)!='undefined'){
            selectedArgs=new URLSearchParams(selectedArgs).getAll('types');
        }
        else{
            selectedArgs=[];
        }

        const selButton = $('<button>', {
            text: label,
            click: showTypeSelector
        });

        const selectorDiv = $('<div>', {
            class: 'multiplot-typeSelector',
            style: 'display:none'
        });

        const selectorGuard = $('<div>', {
            class: 'multiplot-typeSelectorGuard'
        });

        const typeHeader = $('<div>', {
            class: 'multiplot-typeHeader',
            text: header
        });

        const addArgsForm = $('<form>', {
            class: 'multiplot-addArgs'
        });

        const typesContainer = $('<div>', {
            class: 'multiplot-selectorTypes'
        });

        const filterContainer=$('<div>',{
            class: 'multiplot-selectorTypes',
            style: 'border-top:3px groove;'
        });

        const filterTitle=$('<div>',{
            style: 'text-align:center;grid-column:1/-1',
            html: '<b>Data Filters</b>'
        });

        filterContainer.append(filterTitle);

        //filters
        const filters=[
            ['Night Only',"24|categoryvalue->>day_night=N"],
            ['P Over .75','3|datavalue>0.75']
        ]

        for(const [item_label,item_value] of filters){
            const isChecked= selectedArgs.includes(item_value);
            const checkID=`${item_value}Filter_${RemoteSensing.instanceID}`;

            const checkbox = $('<input>', {
                type: 'checkbox',
                id: checkID,
                name: 'filters',
                value: item_value,
                checked: isChecked,
                change: RemoteSensing.filterChanged,
                'data-default': isChecked
            });

            const labelElement = $('<label>', {
                for: checkID,
                text: item_label
            });

            filterContainer.append(checkbox,labelElement);
        }

        // add the selectors to the form
        addArgsForm.append(typesContainer);
        addArgsForm.append(filterContainer);

        //create and the footer elements
        const closeButton = $('<button>', {
            type: 'button',
            class: 'multiplot-close',
            text: 'Close',
            click: function() {
                closeTypeSelector(this); // Assuming closeTypeSelector is defined elsewhere
            }
        });

        const typesFooter = $('<div>', {
            class: 'multiplot-typesFooter'
        }).append(closeButton);

        // Append all major sections to the main selectorDiv
        selectorDiv.append(
            selectorGuard,
            typeHeader,
            addArgsForm,
            typesFooter
        );


        for(let item of typeList){
            let item_label, item_value;
            if (Array.isArray(item) && item.length==2){
                [item_label, item_value] = item;
            } else if (typeof item === 'string'){
                item_label=item;
                //strip any HTML tags and remove spaces
                item_value=$('<div>').html(item_label).text().replace(' ','');
            } else {
                console.error('The items must be either a string for an array with exactly two elements.')
            }

            const isChecked= (selectedArgs.length==0 || selectedArgs.includes(item_value));
            const checkID=`${item_value}Type_${RemoteSensing.instanceID}`

            const checkbox = $('<input>', {
                type: 'checkbox',
                id: checkID,
                name: 'types',
                value: item_value,
                checked: isChecked,
                'data-default': isChecked
            });

            const labelElement = $('<label>', {
                for: checkID,
                text: item_label
            });

            typesContainer.append(checkbox,labelElement);
        }

        const wrapper = $('<div>', {
            class: 'multiplot-typeSelectorWrapper'
        }).append(selButton, selectorDiv);

        return wrapper;
    }
}