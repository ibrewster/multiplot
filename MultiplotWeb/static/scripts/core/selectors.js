function closeTypeSelector(button){
    $(button).closest('.multiplot-typeSelector').hide();
    const select=$(button).closest('.multiplot-typeSelectWrapper').find('.multiplot-plotSelect');
    genPlot.call(select.get(0));
}

function showTypeSelector(){
    $(this).closest('div').find('.multiplot-typeSelector').show();
}

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

        const checked= (selectedArgs.length==0 || selectedArgs.includes(item_value)) ? 'checked' : ''

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