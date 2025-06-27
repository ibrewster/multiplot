export function plot_db_dataset(addArgs){
    const plotType=$(this).data('plotType');
    const typeList=plotDataTypes[plotType];
    if(typeList==null || typeof(typeList)=='undefined'){
        return null;
    }

    return generate_type_selector(typeList,addArgs,"Select data types to show","Select Data Types...")
}

//Generic preevents db plot type selector
export function plot_preevents_dataset(addArgs){
    const plotType=$(this).data('plotType');

    const typeList=plotDataTypes[plotType];
    if(typeList==null || typeof(typeList)=='undefined'){
        return null;
    }

    return generate_type_selector(typeList,addArgs,"Select data types to show","Select Data Types...")
}
