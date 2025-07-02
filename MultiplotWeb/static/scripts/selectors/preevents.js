export class RemoteSensing {
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
        const typeList=$(this).data('datasetTypes') || []; //custom for preevents DB

        if(typeof(selectedArgs)!='undefined'){
            selectedArgs=new URLSearchParams(selectedArgs);
        }
        else{
            selectedArgs=new URLSearchParams();
        }
        const selectedTypes=selectedArgs.getAll('types');
        const selectedFilters=selectedArgs.getAll('filters');
        

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
            const isChecked= selectedFilters.includes(item_value);
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
                closeTypeSelector(this);
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

            const isChecked= (selectedTypes.length==0 || selectedTypes.includes(item_value));
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
