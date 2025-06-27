function gen_db_data_def(data, name, idx, dataOverrides, plotErr){
    let data_def={
        type:'scatter',
        x:data['datetime'],
        y:data['value'],
        name:name,
        mode:'lines+markers',
    }

    if(idx>1){
        data_def['yaxis']=`y${idx}`
    }

    const err1=data['error'];
    const err2=data['error2'];

    if(plotErr===true && typeof(err1)!='undefined'){
        data_def['error_y']={
            type:'data',
            array:err1,
            visible:true
        }

        if(typeof(err2)!='undefined'){
            data_def['error_y']['symmetric']=false;
            data_def['error_y']['arrayminus']=err2;
        }
    }

    if(dataOverrides!=null){
        data_def=mergeDeep(data_def,dataOverrides);
    }

    return data_def
}

export function plot_preevents_dataset(data){
    return plot_db_dataset(data);
}

export function plot_db_dataset(data){
    const labels=data['labels']
    delete data['labels'];
    const plotOverrides=data['plotOverrides'];
    delete data['plotOverrides'];

    let errAsPlot=false;
    if(plotOverrides!==null && 'errAsPlot' in plotOverrides){
        errAsPlot=plotOverrides.errAsPlot;
    }

    let layoutOverrides=null;
    let dataOverrides=null;
    if(plotOverrides!==null && typeof(plotOverrides)=="object"){
        layoutOverrides=plotOverrides.layout;
        dataOverrides=plotOverrides.data;
    }

    const keys=Object.keys(data);

    let layout={
        height:205,
        margin:{t:5,b:20},
        xaxis:{
            showticklabels:false,
            linecolor:'black'
        },
        showlegend:(keys.length>1),
        legend:{
            x:0,
            y:1,
            font:{
                color:'rgb(204,204,220)'
            }
        }
    }

    if(typeof(labels)=='string'){
        layout['yaxis']={
            autorange:true,
            title:{
                text:labels
            },
            linecolor:'black'
        }
    }

    const plotData=[]

    for(let i=0;i<keys.length;i++){
        let name=keys[i];
        let yIdx=1;

        //different labels per type
        if(typeof(labels)!='string'){
            yIdx=i+1;
            let label=labels[name];

            let yaxis='yaxis';
            if(i>0){
                yaxis+=`${yIdx}`;
            }
            console.log(yaxis);

            layout[yaxis]={
                autorange:true,
                title:{
                    text:label
                },
                linecolor:'black',
                automargin:false
            }

            if(i>0){
                layout[yaxis]['side']='right';
            }
        }

        let rawData=data[name];
        let dataDict=gen_db_data_def(rawData,name,yIdx,dataOverrides, !errAsPlot);

        if(errAsPlot){
            //Make additional data dicts for the error plots
            let err1=rawData['error'];
            let err2=rawData['error2'];
            let overrides=structuredClone(dataOverrides);
            if(!('line' in overrides)){
                overrides['line']={};
            }
            overrides['line']['width']=0;
            overrides['showlegend']=false;

            let dataLower=structuredClone(rawData);
            let lowerErr=typeof(err2)=="undefined"?err1:err2;
            let lowerY=rawData['value'].map(function(item,idx){return item-lowerErr[idx]});
            dataLower['value']=lowerY;
            let lowerData=gen_db_data_def(dataLower,"Lower Bound",yIdx,overrides);
            plotData.push(lowerData);

            dataDict['fill']="tonexty"
            dataDict['fillcolor']="rgba(0,176,246,0.2)";
            dataDict['line']['color']="rgba(0,176,246,0.75)"
            plotData.push(dataDict);

            let dataUpper=structuredClone(rawData);
            let upperY=rawData['value'].map(function(item,idx){return item+err1[idx]});
            dataUpper['value']=upperY;
            overrides['fill']="tonexty"
            overrides['fillcolor']="rgba(0,176,246,0.2)"
            let upperData=gen_db_data_def(dataUpper,"Upper Bound",yIdx,overrides);
            plotData.push(upperData);

        } else{
            plotData.push(dataDict);
        }

    }

    if(layoutOverrides!=null){
        layout=mergeDeep(layout,layoutOverrides);
    }

    return [plotData,layout];
}

//########### Merging function to "merge" default data/layout with DB "overrides" #####//
function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

function mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          if (!target[key]) target[key]={};
          mergeDeep(target[key], source[key]);
        } else {
            target[key]=source[key];
        }
      }
    }

    return mergeDeep(target, ...sources);
}