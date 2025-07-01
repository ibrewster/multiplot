////////////////////////////////

//---------PLOTTING FUNCTIONS-----------//

// Plot functions are named the same as the python back-end data retreval functions


///////////////////////////////////////////////////////////////////
// A generic plotting function that creates a scatter plot with date on the x axis
// and the specified data and label on the Y axis.
// Can be modified, if needed, by editing the returned layout and PlotData objects
// in the calling function.
///////////////////////////////////////////////////////////////////
export function generic_plot(data,ylabel,ydata,type){
    // ydata can be specified either as a data set, in which case it is used directly, or
    // as string, in which case it must be a key of the data object.
    if(typeof(ydata)=="string"){
        ydata=data[ydata]
    }

    type=type ?? 'scatter'

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
        }
    ]

    if(type=="bar"){
        plotData[0]['width'] = 86400000 // One day, in ms.
    } else{
        plotData[0]['mode'] = 'markers'
    }


    return [plotData, layout]
}

export function plot_generic_plot(data){
    return generic_plot.call(this, data, data['ylabel'], "y");
}

//############ COLOR CODE ##########
export function color_code(data){
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
