import { generic_plot } from './base.js';

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

function so2_mass(data){
    return generic_plot.call(this, data,"SO<sub>2</sub> Mass (kt)","mass","bar");
}


export function so2_mass_combined(data){
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


export function so2_em_rate_combined(data){
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

function so2_rate(data){
    return generic_plot.call(this, data,"EM Rate","rate","bar");
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
