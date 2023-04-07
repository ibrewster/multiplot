//---------Custom plot selectors--------//
CUSTOM_SELECTORS={
    'Remote Sensing|Detections':addRSTypeSelector,
}

/////////////////////////////////
// Remote sensing detection type selector
////////////////////////////////
function addRSTypeSelector(){
    const selButton=$('<button>');
    selButton.text("Select Types...");
    selButton.click(showRSTypeSelector);

    const selectorHTML=`
        <div class="rsTypeSelector" style="display:none">
            <div class=rsTypeHeader>Select detection types to show</div>
            <form class="addArgs">
                <div class=rsTypes>
                    <input type="checkbox" id="rsAshType" name="detectTypes" checked value="Ash">
                    <label for="rsAshType">Ash</label>
                    <input type="checkbox" id="rsSO2Type" name="detectTypes" checked value="so2">
                    <label for="rsSO2Type">SO <sub>2</sub></label>
                    <input type="checkbox" id="rsTempType" name="detectTypes" checked value="surfaceTemp"> 
                    <label for="rsTempType">Elevated Temps</label>
                </div>
            </form>
            <div class="rsTypesFooter">
                <button type="button" class="close" onclick="closeRSTypeSelector(this)">Close</button>
            </div>
        </div>
    `
    const wrapper=$('<div class="rsTypeSelectorWrapper">');
    wrapper.append(selButton);
    wrapper.append(selectorHTML);
    return wrapper;
}

function closeRSTypeSelector(button){
    $(button).closest('.rsTypeSelector').hide();
    const select=$(button).closest('.typeSelectWrapper').find('.plotSelect');
    genPlot.call(select.get(0));
}

function showRSTypeSelector(){
    $(this).closest('div').find('.rsTypeSelector').show();
}
////////////////////////////////

//---------PLOTTING FUNCTIONS-----------//


///////////////////////////////////////////////////////////////////
// A generic plotting function that creates a scatter plot with date on the x axis
// and the specified data and label on the Y axis.
// Can be modified, if needed, by editing the returned layout and PlotData objects
// in the calling function.
///////////////////////////////////////////////////////////////////
function generic_plot(data,ylabel,ydata){
    // ydata can be specified either as a data set, in which case it is used directly, or
    // as string, in which case it must be a key of the data object.
    if(typeof(ydata)=="string"){
        ydata=data[ydata]
    }

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
            type: "scatter",
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
    return generic_plot(data,"Frequency Index",'FI')
}

function eq_frequency_index_rec(data){
    //exactly the same as frequency index tc, but from a different datasource.
    return eq_frequency_index_tc(data)
}

function eq_magnitude(data){
    return generic_plot(data, "Magnitude", 'Magnitude')
}

function eq_depth(data){
    return generic_plot(data,"Depth (km)", 'Depth_km')
}

function eq_distance(data){
    return generic_plot(data, "Distance (km)", 'Distance')

}

function tc_event_count(data){
    return generic_plot(data,"TC Event Count", 'Count')
}

function aqms_distances(data){
    return generic_plot(data,"Distance (km)", 'distance')
}


function aqms_magnitude(data){
    return generic_plot(data, "Magnitude", 'mag')
}

function aqms_depth(data){
    return generic_plot(data,"Depth (km)", "depthKm")
}

function aqms_event_count(data){
    return generic_plot(data,"Events/week", "Count")
}

function so2_detection_count(data){
    return generic_plot(data,"Detections","count")
}

function so2_rate(data){
    return generic_plot(data,"EM Rate","rate")
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

    let height=25*y_idx+35

    const layout={
        height:height,
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
    const location=$('#volcano option:selected').data('loc');

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
    for(let i=1;i<data.length;i++){
        let record=data[i];
        let prev=data[i-1];
        let x=[prev['date'], record['date']];
        let y=[1,1];

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

    return [plotData, layout]
}


function plot_radiative_power(data){
    const plotData=[]
    const viirs_data=data['viirs']
    const viirs={
        type:'scatter',
        x:viirs_data['date'],
        y:viirs_data['simple_radiance'],
        name:'VIIRS',
        fill: 'tonexty',
        mode:'lines',
        line:{
            color:'#F00',
            width:1
        }
    }

    plotData.push(viirs)

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
            type:'log',
            autorange:true,
            title:{
                text:'Radiative Power<br>Mean (MW)'
            },
            linecolor: 'black',
            exponentformat:"power",
            showexponent: 'all',
            dtick:1
        },
        xaxis:{
            showticklabels:false,
            linecolor: 'black',
        }
    }

    return [plotData,layout]
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
    const viirs={
        type:'scatter',
        x:viirs_data['date'],
        y:viirs_data['percent'],
        name:'VIIRS',
        mode:'lines',
        fill: 'tonexty',
        line:{
            color:'#F00',
            width:1
        }
    }

    plotData.push(viirs)

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
    for(let i=0;i<lineData.length;i++){
        let entryData=lineData[i];
        let x=[entryData['date neg'], entryData['date pos']]
        let y=[entryData['index'], entryData['index']]
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

    plotData.push(plag)

    return [plotData, layout]
}
