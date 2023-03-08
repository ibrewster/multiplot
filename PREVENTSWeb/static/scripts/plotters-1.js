// Plot function lookup object. Associate the proper plotting 
// function with each SELECT menu option.

//plotFuncs={
    //'Color Code':plotColorCode,
    //'Radiative Power':plotRadiativePower,
    //'Detection Percent':plotImageDetectPercent,
    //'Diffusion':plotDiffusion,
    //'Frequency Index (Temporally Complete)':plotEQFrequency,
//}

//---------PLOTTING FUNCTIONS-----------//
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
//            showgrid:false,
            linecolor: 'black',
            tickformat:'~e',
            dtick:1
        },
        xaxis:{
            showticklabels:false,
//            showgrid:false,
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

function eq_frequency_index_tc(data){
    const layout={
        height:200,
        margin:{t:5,b:20},
        yaxis:{
            //showgrid:false,
            linecolor:'black',
            title:{
                text:'Frequency Index'
            },
            zeroline:false,

        },
        xaxis:{
            //showgrid:false,
            linecolor:'black',
        }
    }
    
    const plotData=[
        {
            type:"scatter",
            x:data['date'],
            y:data['FI'],
            mode:'markers'
        }
    ]
    
    return [plotData, layout]
}

function eq_frequency_index_rec(data){
    return eq_frequency_index_tc(data)
}

function eq_magnitude(data){
    const layout={
        height:200,
        margin:{t:5,b:20},
        yaxis:{
            //showgrid:false,
            linecolor:'black',
            title:{
                text:'Magnitude'
            },
            zeroline:false,

        },
        xaxis:{
            //showgrid:false,
            linecolor:'black',
        }
    }
    
    const plotData=[
        {
            type:"scatter",
            x:data['date'],
            y:data['Magnitude'],
            mode:'markers'
        }
    ]
    
    return [plotData, layout]
}

function eq_location_depth(data){
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