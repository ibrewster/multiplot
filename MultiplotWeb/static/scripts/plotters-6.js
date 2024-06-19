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
        //strip any HTML tags
        let cleanItem=$('<div>').html(item).text();
        //remove spaces
        cleanItem=cleanItem.replace(' ','')

        checked= (selectedArgs.length==0 || selectedArgs.includes(cleanItem)) ? 'checked' : ''

        selectorHTML+=`
            <input type="checkbox" id="${cleanItem}Type" name="types" ${checked} value="${cleanItem}">
            <label for="${cleanItem}Type">${item}</label>
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
    const types=['Ash','SO <sub>2</sub>','Elevated Temps']
    selectorHTML=generate_type_selector(types,addArgs,"Select detection types to show")
    return selectorHTML
}

// Thermal detection type selector
function plot_radiative_power_selector(addArgs){
    const types=['VIIRS','MODIS']
    selectorHTML=generate_type_selector(types,addArgs,"Select Data Types to Show")
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

////////////////////////////////

//---------PLOTTING FUNCTIONS-----------//

// Plot functions are named the same as the python back-end data retreval functions


///////////////////////////////////////////////////////////////////
// A generic plotting function that creates a scatter plot with date on the x axis
// and the specified data and label on the Y axis.
// Can be modified, if needed, by editing the returned layout and PlotData objects
// in the calling function.
///////////////////////////////////////////////////////////////////
function generic_plot(data,ylabel,ydata,type){
    // ydata can be specified either as a data set, in which case it is used directly, or
    // as string, in which case it must be a key of the data object.
    if(typeof(ydata)=="string"){
        ydata=data[ydata]
    }

    if(typeof(type)=='undefined'){
        type='scatter'
    }

    $(this).data('yValues',ydata);
    $(this).data('xValues',data['date'])

    const layout={
        height:200,
        margin:{t:5,b:20},
        yaxis:{
            linecolor:'black',
            title:{
                text: ylabel
            },
            zeroline:false,

        },
        xaxis:{
            linecolor:'black',
        }
    }

    const plotData=[
        {
            type: type,
            x: data['date'],
            y: ydata,
            mode: 'markers'
        }
    ]

    return [plotData, layout]
}

//////////////////////////////////////////////////////////////////

//various plotting functions that use the generic_plot directly,
// or with minimal changes

function eq_frequency_index_tc(data){
    return generic_plot.call(this, data,"Frequency Index",'FI')
}

function eq_frequency_index_rec(data){
    //exactly the same as frequency index tc, but from a different datasource.
    return eq_frequency_index_tc.call(this,data)
}

function eq_magnitude(data){
    return generic_plot.call(this, data, "Magnitude", 'Magnitude')
}

function eq_depth(data){
    let plotData,layout;
    [plotData,layout]=generic_plot.call(this, data,"Depth (km)", 'Depth_km')
    layout['yaxis']['autorange']="reversed"
    return [plotData,layout];
}

function eq_distance(data){
    return generic_plot.call(this, data, "Distance (km)", 'Distance')

}

function tc_event_count(data){
    return generic_plot.call(this, data,"TC Event Count", 'Count')
}

function aqms_distances(data){
    return generic_plot.call(this, data,"Distance (km)", 'distance')
}


function aqms_magnitude(data){
    return generic_plot.call(this, data, "Magnitude", 'mag')
}

function aqms_depth(data){
    let plotData,layout;
    [plotData,layout]=generic_plot.call(this, data, "Depth (km)", "depthKM")
    layout['yaxis']['autorange']="reversed"
    return [plotData,layout];
}

function aqms_event_count(data){
    return generic_plot.call(this, data, "Events/week", "Count")
}

function so2_detection_count(data){
    return generic_plot.call(this, data, "Detections","count")
}

function so2_rate(data){
    return generic_plot.call(this, data,"EM Rate","rate","bar");
}

function so2_mass(data){
    return generic_plot.call(this, data,"SO<sub>2</sub> Mass (kt)","mass","bar");
}

///////////////////////////////////////////////////////////////////////
// More advanced plotting functions that don't lend themselves
// to using the generic plotting function due to extensive differences
// or different plot types
///////////////////////////////////////////////////////////////////////
function rs_detections(data){
    const typeSymbols={
        4:["triangle-up","gray","Ash"],
        9:['circle',"purple","SO<sub>2</sub>"],
        35:['hexagon','#ED1C24',"Temp - Saturated"],
        40:['hexagon','#F7931E',"Temp - Moderate"],
        45:['hexagon','#FFFF03', "Temp - Barely"]
    }

    const plotData=[]
    let y_idx=0;
    let temp_y=null;
    let xVals={}
    for(const type in data){
        let my_y;
        if([35,40,45].includes(Number(type))){
            if(temp_y===null){
                y_idx+=1;
                temp_y=y_idx;
            }
            my_y=temp_y;
        }
        else{
            y_idx+=1;
            my_y=y_idx;
        }

        let symbol,color,title;

        [symbol,color,title]=typeSymbols[type];
        const x=data[type];

        xVals[title]=x;

        const y=new Array(x.length).fill(my_y);

        let dataItem={
            type:"scatter",
            name:title,
            x:x,
            y:y,
            mode:'markers',
            marker:{
                symbol:symbol,
                color:color,
                size:12
            }
        }

        plotData.push(dataItem);
    }

    $(this).data('plotVals',xVals);
    $(this).data('exporter',exportRSDetections);

    let height=25*y_idx+35

    const layout={
        height:height,
        showlegend:true,
        margin:{t:5,b:40},
        yaxis:{
            showgrid:false,
            linecolor:"black",
            nticks:0,
            zeroline:false,
            range:[0,y_idx+1],
            showticklabels:false
        },
        xaxis:{
            showgrid:false,
            linecolor:'black',
        },
        legend:{
            orientation:"h",
            y:1,
            yanchor:'bottom',
            font:{
                color:'rgb(204,204,220)'
            }
        }
    }

    return [plotData,layout]
}


function eq_location_depth(data){
    // This is a spatial plot, so totally different plotting function.
    isSpatial=true;
    const lat=data['Latitude'];
    const lon=data['Longitude'];
    const depth=data['Depth_km'];
    const location=$('#multiplot-volcano option:selected').data('loc');

    $(this).data('exporter',exportLocationDepth);
    $(this).data('lats',lat);
    $(this).data('lons',lon);
    $(this).data('depth',depth);


    const plotData=[{
        type:'scattermapbox',
        mode:'markers',
        lon:lon,
        lat:lat,
        marker:{
            reversescale: true,
            color:depth,
            colorbar:{
                thickness:10,
                titleside:'right',
                ticks:'outside',
                ticklen:3,
                ticksuffix:'km',
                tickcolor:'rgb(204,204,220)',
                tickfont:{
                    color:'rgb(204,204,220)',
                }
            }
        }
    }];

    const layout={
        dragmode:"zoom",
        margin:{t:5,b:5},
        mapbox:{
            style:"white-bg",
            layers:[
                {
                    sourcetype:'raster',
                    source:["https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}"],
                    below:"traces"
                }
            ],
            center:{
                lat:location[0],
                lon:location[1],
            },
            zoom:location[2]

        },
        height:600,
    }

    return [plotData,layout];
}

function plot_color_code(data){
    const layout={
        height:60,
        margin:{t:10,b:20},
        showlegend:false,
        yaxis:{
            autorange:false,
            range: [0,1],
            dtick: 1,
            fixedrange:true,
            showticklabels:false,
            showgrid:false,
            zeroline:false
        },
        xaxis:{
            showgrid:false
        }
    }

    const plotData=[]
    const start=[],end=[],color=[];
    $(this).data('exporter',exportColorCode);


    // the last record in this dataset is a "dummy" record, provided to prevent
    // off-by-one errors when running this loop, and "fill" the last color
    // code to the end date
    for(let i=1;i<data.length;i++){
        let record=data[i];
        let prev=data[i-1];
        let x=[prev['date'], record['date']];
        let y=[1,1];

        start.push(x[0]);
        end.push(x[1]);
        color.push(prev['color']);

        let dataEntry={
            type:'scatter',
            x:x,
            y:y,
            fill:'tozeroy',
            fillcolor:prev['color'],
            line:{
                color:prev['color'],
                width:0
            },
            mode:'lines'
        }

        plotData.push(dataEntry)
    }

    $(this).data('start',start);
    $(this).data('end',end);
    $(this).data('color',color);

    return [plotData, layout]
}


////////////////////////Radiative Power///////////////////
function gen_radiative_data_def(data, name, color){
    const data_def={
        type:'scatter',
        x:data['date'],
        y:data['hyst_radiance'],
        name: name,
        fill: 'tozeroy',
        fillcolor:color+'33',
        mode:'lines',
        line:{
            color: color,
            width:1
        }
    }

    return data_def
}

function plot_radiative_power(data){
    const plotData=[]

    const viirs_data=data['viirs']
    const modis_data=data['modis']

    $(this).data('exporter',exportThermalData);

    const exportData={};
    if(typeof(viirs_data)!=='undefined'){
        plotData.push(gen_radiative_data_def(viirs_data,'VIIRS','#FF0000'))
        exportData['VIIRS']=[viirs_data['date'],viirs_data['hyst_radiance']];
    }

    if(typeof(modis_data)!=='undefined'){
        plotData.push(gen_radiative_data_def(modis_data,'MODIS','#079BF5'));
        exportData['MODIS']=[modis_data['date'],modis_data['hyst_radiance']];
    }

    $(this).data('exportData',exportData);

    const layout={
        height:205,
        showlegend:true,
        legend:{
            x:0,
            y:1,
            font:{
                color:'rgb(204,204,220)'
            }
        },
        margin:{t:5,b:20},
        yaxis:{
            autorange:true,
            title:{
                text:'Radiative Power<br>Mean (MW)'
            },
            linecolor: 'black',
            exponentformat:"power",
            showexponent: 'all',
        },
        xaxis:{
            showticklabels:false,
            linecolor: 'black',
        }
    }

    return [plotData,layout]
}
////////////////END Radiative Power///////////////

function gen_detect_percent_data_def(data, name, color){
    const data_def={
        type:'scatter',
        x:data['date'],
        y:data['percent'],
        name: name,
        fill: 'tozeroy',
        fillcolor:color+'33',
        mode:'lines',
        line:{
            color: color,
            width:1
        }
    }

    return data_def
}

function plot_image_detect_percent(data){
    const layout={
        height:205,
        showlegend:true,
        legend:{
            x:0,
            y:1,
            font:{
                color:'rgb(204,204,220)'
            }
        },
        margin:{t:5,b:20},
        yaxis:{
            //showgrid:false,
            linecolor:'black',
            title:{
                text:'% of images<br>with detections'
            },
        },
        xaxis:{
            //showgrid:false,
            linecolor:'black',
            showticklabels:false
        }
    }

    const plotData=[]

    const viirs_data=data['viirs']
    const modis_data=data['modis']

    $(this).data('exporter',exportThermalData);
    const exportData={};

    if(typeof(viirs_data)!=='undefined'){
        plotData.push(gen_detect_percent_data_def(viirs_data,'VIIRS','#FF0000'))
        exportData['VIIRS']=[viirs_data['date'],viirs_data['percent']];

    }

    if(typeof(modis_data)!=='undefined'){
        plotData.push(gen_detect_percent_data_def(modis_data,'MODIS','#079BF5'));
        exportData['MODIS']=[modis_data['date'],modis_data['percent']];
    }

    $(this).data('exportData',exportData);

    return [plotData, layout]
}

function plot_diffusion(data){
    const layout={
        height:300,
        showlegend:true,
        legend:{
            x:0,
            y:0,
            font:{
                color:'rgb(204,204,220)'
            }
        },
        margin:{t:5,b:20},
        yaxis:{
            //showgrid:false,
            linecolor:'black',
            title:{
                text:'Crystal Index'
            },
            zeroline:false,

        },
        xaxis:{
            //showgrid:false,
            linecolor:'black',
        }
    }

    const plotData=[]

    const lineData=data['lines']

    // draw the error lines
    const errorData={}
    for(let i=0;i<lineData.length;i++){
        let entryData=lineData[i];
        let x=[entryData['date neg'], entryData['date pos']]
        let y=[entryData['index'], entryData['index']]

        errorData[entryData['index']]=[x[0],x[1]];
        let entry={
            type:"scatter",
            x:x,
            y:y,
            showlegend: false,
            mode:'lines',
            line:{
                color:'rgb(204,204,220)',
                width:1
            }
        }

        plotData.push(entry)
    }

    $(this).data('exporter',exportDiffusionData);
    $(this).data('errorData',errorData);

    const cpx={
        type:"scatter",
        x:data['cpx']['date'],
        y:data['cpx']['index'],
        name:'CPx Diffusion Timescales',
        showlegend: true,
        mode:'markers',
        marker:{
            color:'#FC7426',
            symbol:"diamond",
            size:8,
            line:{
                color: "#000",
                width: 1,
            }
        }
    }

    $(this).data('cpx',[data['cpx']['date'], data['cpx']['index']])

    plotData.push(cpx)

    const plag={
        type:"scatter",
        x:data['plag']['date'],
        y:data['plag']['index'],
        name:'Plag Growth Rate Timescales',
        showlegend: true,
        mode:'markers',
        marker:{
            color:'#66B3FA',
            symbol:"circle",
            size:8,
            line:{
                color: "#000",
                width: 1,
            }
        }
    }

    $(this).data('plag',[data['plag']['date'], data['plag']['index']])

    plotData.push(plag)

    return [plotData, layout]
}


function so2_mass_carn(data){
    const layout={
        height:200,
        margin:{t:5,b:20},
        yaxis:{
            linecolor:'black',
            title:{
                text:"SO<sub>2</sub> Mass (kt)"
            },
            zeroline:true
        },
        xaxis:{
            type:'date'
        },
        showlegend:false
    }

    const plotData=[]
    const starts=data['Start Date']
    const stops=data['End Date']
    const mass=data['Total SO2 Mass (kt)']

    for(let i=0;i<starts.length;i++){
        let x,y,mode
        if(starts[i]==stops[i]){
            x=[starts[i]]
            y=[mass[i]]
            mode='markers'
        }
        else {
            x=[starts[i],stops[i]]
            y=[mass[i],mass[i]]
            mode='markers+lines'
        }

        let data={
            x: x,
            y: y,
            mode:mode,
            type:"scatter",
            marker:{
                color: "rgba(0,176,246,0.6)"
            },
            showlegend:false,
        }

        plotData.push(data)
    }
    if(plotData.length>0){
        plotData[0]['name']='Carn'
        plotData[0]['showlegend']=true
    }

    return [plotData,layout]
}

function so2_mass_combined(data){
    const carn_data=data.Carn
    const avo_data=data.AVO
    let plotData=[]

    const layout={
        height:200,
        margin:{t:5,b:20},
        yaxis:{
            linecolor:'black',
            title:{
                text:"SO<sub>2</sub> Mass (kt)"
            },
            zeroline:true
        },
        xaxis:{
            type:'date'
        },
        showlegend:true,
        legend:{
            x:0,
            y:1,
            font:{
                color:'rgb(204,204,220)'
            }
        }
    }

    const yValues={};
    const xValues={};
    if (typeof(carn_data)!='undefined'){
        let carn_plot, carn_layout;
        [carn_plot, carn_layout]=so2_mass_carn(carn_data)
        plotData=plotData.concat(carn_plot)

        xValues['carn']=[carn_data['Start Date'], carn_data['End Date']]
        yValues['carn']=carn_data['Total SO2 Mass (kt)']
    }

    if(typeof(avo_data)!='undefined'){
        let avo_plot,avo_layout;
        [avo_plot,avo_layout]=so2_mass(avo_data)
        avo_plot[0]['name']='AVO'
        plotData=plotData.concat(avo_plot)

        xValues['AVO']=[avo_data['date'],avo_data['date']];
        yValues['AVO']=avo_data['mass'];
    }

    $(this).data('yValues',yValues);
    $(this).data('xValues',xValues);
    $(this).data('exporter',exportSO2Mass);

    return [plotData,layout]
}

function so2_em_rate_combined(data){
    const fioletov_data=data.Fioletov
    const avo_data=data.avo
    let plotData=[]

    const layout={
        height:200,
        margin:{t:5,b:20},
        yaxis:{
            linecolor:'black',
            title:{
                text:"EM Rate (t/d)"
            },
            zeroline:true
        },
        xaxis:{
            type:'date'
        },
        showlegend:true,
        legend:{
            x:0,
            y:1,
            font:{
                color:'rgb(204,204,220)'
            }
        }
    }

    const yValues={};
    const xValues={};
    if (typeof(fioletov_data)!='undefined'){
        let fioletov_plot, fioletov_layout;
        [fioletov_plot, fioletov_layout]=so2_rate_fioletov(fioletov_data)
        plotData=plotData.concat(fioletov_plot)

        yValues['fioletov']=[fioletov_data['lower'],fioletov_data['rate'],fioletov_data['upper']]
        xValues['fioletov']=fioletov_data['year']
    }

    if(typeof(avo_data)!='undefined'){
        let avo_plot,avo_layout;
        [avo_plot,avo_layout]=so2_rate(avo_data)
        avo_plot[0]['name']='AVO'
        plotData=plotData.concat(avo_plot)

        yValues['AVO']=avo_data['rate']
        xValues['AVO']=avo_data['date']
    }

    $(this).data('yValues',yValues);
    $(this).data('xValues',xValues);
    $(this).data('exporter',exportSO2Rate);

    return [plotData,layout]
}

function so2_rate_fioletov(data){
    const layout={
        height:200,
        margin:{t:5,b:20},
        yaxis:{
            linecolor:'black',
            title:{
                text:"Annual Mean<br>EM Rate (t/d)"
            },
            zeroline:true
        },
        xaxis:{
            type:'date'
        },
        showlegend:false
    }

    const plotData=[
      {
            x: data['year'],
            y: data['lower'],
            line: {
                width: 0,
                shape: 'hv',

            },
            mode: "lines",
            name: "Lower Bound",
            type: "scatter",
            showlegend: false,
        },
        {
            type:"scatter",
            mode:"lines",
            line:{
                shape: 'hv',
                color: "rgba(0,176,246,0.75)"
            },
            x: data['year'],
            y: data['rate'],
            fill:"tonexty",
            fillcolor:"rgba(0,176,246,0.2)",
            name:'Fioletov'
        },
        {
            x: data['year'],
            y:data['upper'],
            fill:"tonexty",
            fillcolor: "rgba(0,176,246,0.2)",
            line: {
                width:0,
                shape: 'hv'
            },
            mode: "lines",
            name: "Upper Bound",
            type: "scatter",
            showlegend: false,
        }
    ]

    return [plotData, layout]
}


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

function plot_db_dataset(data){
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

    const layout={
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
        console.log(labels)
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
                automargin:true
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
