import {generic_plot} from './base.js';

function so2_plot(data, type) {
    return {
        type: 'scatter',
        x: data['date'],
        y: data[type],
        mode: 'markers',
        name: type,
    }
}

export function plot_doas(data) {
    const ylabel=data['ylabel']
    delete data['ylabel']
    const stations = Object.keys(data)
    let plotData = []

    const layout = {
        height: 200,
        margin: {t: 5, b: 20},
        yaxis: {
            linecolor: 'black',
            zeroline: true,
            title: {
                text: ylabel
            }
        },
        xaxis: {
            type: 'date'
        },
        showlegend: true,
        legend: {
            x: 0,
            y: 1,
            font: {
                color: 'rgb(204,204,220)'
            }
        }
    }

    const yValues = {};
    const xValues = {};
    for (const station of stations) {
        let station_data = data[station]
        let y_data = station_data['y']
        let x_data = station_data['date']
        let [station_data_dict, station_layout] = generic_plot(station_data, station, 'y');
        if ('plume_complete' in station_data) {
            station_data_dict[0]['marker'] ??= {};
            station_data_dict[0]['marker']['symbol'] =
                station_data['plume_complete'].map(c => c ? 'circle' : 'circle-open');
        }
        station_data_dict[0]['name'] = station

        plotData.push(station_data_dict[0]);
        yValues[station] = y_data;
        xValues[station] = x_data;
    }


    $(this).data('yValues', yValues);
    $(this).data('xValues', xValues);

    return [plotData, layout]
}

export function doas_availability(data) {
    const layout = {
        height: 100,
        margin: {t: 5, b: 30},
        yaxis: {
            linecolor: 'black',
            zeroline: true
        },
        xaxis: {
            type: 'date'
        },
    }

    const plotData = [
        {
            x: data['date'],
            y: data['y'],
            z: data['z'],
            colorscale: [[0, '#922b21'], [1, '#1e8449']],
            zmin:0,
            zmax:1,
            type: 'heatmap',
            name: 'Availability',
            showscale: false,
        }
    ]

    return [plotData, layout]
}