// Plot function lookup object. Associate the proper plotting 
// function with each SELECT menu option.
plotFuncs={
    'Color Code':plotColorCode,
    'Radiative Power':plotRadiativePower,
    'Detection Percent':plotImageDetectPercent,
    'Diffusion':plotDiffusion,
}

//---------PLOTTING FUNCTIONS-----------//
function plotColorCode(data){
    const layout={
        height:60,
        margin:{t:5,b:15},
        showlegend:false,
        yaxis:{
            autorange:false,
            range: [0,1],
            dtick: 1,
            fixedrange:true,
            showticklabels:false,
            showgrid:false
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


function plotRadiativePower(data){
    const plotData=[]
    const viirs_data=data['viirs']
    const viirs={
        type:'scatter',
        x:viirs_data['date'],
        y:viirs_data['simple_radiance'],
        name:'VIIRS',
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
        },
        margin:{t:5,b:20},
        yaxis:{
            type:'log',
            autorange:true,
            title:{
                text:'Radiative Power<br>Mean (MW)'
            },
            showgrid:false,
            linecolor: 'black',
            mirror:true,
            tickformat:'~e',
            dtick:1
        },
        xaxis:{
            showticklabels:false,
            showgrid:false,
            linecolor: 'black',
            mirror:true,
        }
    }
    
    return [plotData,layout]
}

function plotImageDetectPercent(data){
    const layout={
        height:205,
        showlegend:true,
        legend:{
            x:0,
            y:1
        },
        margin:{t:5,b:20},
        yaxis:{
            showgrid:false,
            linecolor:'black',
            mirror:true,
            title:{
                text:'% of images<br>with detections'
            },
        },
        xaxis:{
            showgrid:false,
            linecolor:'black',
            mirror:true,
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
        line:{
            color:'#F00',
            width:1
        }
    }
    
    plotData.push(viirs)
    
    return [plotData, layout]
}

function plotDiffusion(data){
    const layout={
        height:300,
        showlegend:true,
        legend:{
            x:0,
            y:0
        },
        margin:{t:5,b:20},
        yaxis:{
            showgrid:false,
            linecolor:'black',
            mirror:true,
            title:{
                text:'Crystal Index'
            },
            zeroline:false,

        },
        xaxis:{
            showgrid:false,
            linecolor:'black',
            mirror:true,
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
                color:'#000',
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