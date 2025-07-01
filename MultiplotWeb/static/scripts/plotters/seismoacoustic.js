import { generic_plot } from './base.js';

export function eq_depth(data){
    let plotData,layout;
    [plotData,layout]=generic_plot.call(this, data,"Depth (km)", 'Depth_km')
    layout['yaxis']['autorange']="reversed"
    return [plotData,layout];
}

export function aqms_depth(data){
    let plotData,layout;
    [plotData,layout]=generic_plot.call(this, data, "Depth (km)", "depthKM")
    layout['yaxis']['autorange']="reversed"
    return [plotData,layout];
}

export function seisdb_keywords(result){
    const keywordSymbols={
        71:['star','red','Seismic Swarm',1],
        81:['circle','orangered','Low-Frequency Event',2],
        91:['circle','blue','very long period event(s)',2],
        101:['square','indianred','tremor',4],
        111:['hexagon','gray','suspected rockfall/debris flow/avalanche',6],
        121:['star','gray','other earthquake of note',6],
        122:['diamond','gray','composite event',6],
        123:['X','gray','felt event',6],
        131:['pentagon','gray','Station Problem',6],
        141:['circle','red','Local Earthquake',1],
        151:['triangle-right','gray','Wind Noise',6],
        161:['cross','gold','Ground Coupled Airwaves',3],
        171:['square','gray','Other Seismic Events',6],
        181:['circle','gray','Mystery Events',6],
        191:['diamond','maroon','Explosions/Eruption',3],
        201:['square','gray','Network Outage',5],
    }
    const text_symbols=['*','|']
    const data=result['data']
    const order=result['order']

    const plotData=[]
    const yLookup={

    }

    let xVals={}
    // two loops. First, figure out the y values to use for each keyword.
    //The loops are short and fast.
    for(const keyword in data){
        let row=keywordSymbols[keyword][3]
        yLookup[row]=row // start with default, but only for data we actually have
    }

    const sortedRows=Object.keys(yLookup).map(Number).sort().reverse()
    for(let i=0;i<sortedRows.length;i++){
        yLookup[sortedRows[i]]=i+1
    }

    const seenY=[]

    // Now that we know the row for each original row.
    for(const keyword of order){
        let symbol,color,title,row;
        [symbol,color,title,row]=keywordSymbols[keyword];

        let my_y=yLookup[row]
        const x=data[keyword];

        const y=new Array(x.length).fill(my_y);
        const usedCount=seenY.filter(x=>x===my_y).length
        seenY.push(my_y)

        xVals[title]=x;

        let dataItem={
            type:"scatter",
            name:title,
            x:x,
            y:y,
            marker:{
                symbol:symbol,
                size:12,
            }
        }

        let mode="markers";
        let marker_color=color;
        if(text_symbols.includes(symbol)){
            mode="markers+text";
            marker_color='rgba(0,0,0,0)';
            text=new Array(x.length).fill(symbol);
            dataItem['text']=text;
            dataItem['textposition']='middle center';
            textfont={
                family: 'Arial, sans-serif',
                size: 18,
                color: color
            }
            dataItem['textfont']=textfont;
            delete dataItem['marker']['symbol']
        }

        if(symbol=='cross'){
            dataItem['marker']['size']=9
        }

        dataItem['mode']=mode;
        dataItem['marker']['color']=marker_color;

        plotData.push(dataItem);
    }

    $(this).data('plotVals',xVals);

    const topY=sortedRows.length+1
    let height=35*topY+35

    const layout={
        height:height,
        showlegend:true,
        margin:{t:5,b:40},
        yaxis:{
            showgrid:false,
            linecolor:"black",
            nticks:0,
            zeroline:false,
            range:[0,topY+1],
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

export function eq_location_depth(data){
    // This is a spatial plot, so totally different plotting function.
    isSpatial=true;
    const lat=data['Latitude'];
    const lon=data['Longitude'];
    const depth=data['Depth_km'];
    const location=$('#multiplot-volcano option:selected').data('loc');

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
