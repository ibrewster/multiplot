export function rs_detections(data){
    const typeSymbols={
        4:["triangle-up","gray","Ash"],
        9:['circle',"purple","SO<sub>2</sub>"],
        25:["triangle-down",'blue','Steam/Water'],
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
