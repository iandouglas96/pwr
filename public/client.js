//Connect to the websocket
var socket = io();

//gauge for instantaneous power
var power_gauge = c3.generate({
    bindto: '#power_gauge',
    data: {
        columns: [['power', 0]],
        type: 'gauge',
        colors: {
            'power': "#6ABD45"
        }
    },
    gauge: {
        label: {
            format: function (value, ratio) {
                return parseFloat(value).toFixed(2);
            }
        },
        min: 0,
        max: 6.2,
        units: ' kW'
    },
    size: {
        height: 150
    }
});

//Create chart object to show power over time
var power_chart = c3.generate({
	bindto: '#power_chart',
	data: {
        xFormat: '%Y-%m-%dT%H:%M:%S.%LZ',
        columns: [],
        keys: {
            x: 'time',
            value: ['power']
        },
        empty: {
            label: {
                text: "No Data Available"
            }
        },
        colors: {
            'power': "#6ABD45"
        }
	},
    axis: {
        x: {
            type: 'timeseries',
            localtime: true,
            tick: {
                format: '%H:%M:%S'
            }
        }
    }
});

//Request the day's data to display
socket.emit('request_data', {type:'pv_power', time:'today'});
//Wait for the response
socket.on('data_return', function(data) {
    //Load data into chart
    power_chart.load({
        json: data,
        keys: {
            x: 'time',
            value: ['power']
        }
    });

    //Gauge should show most recent value
    if (data.length > 0) {
        power_gauge.load({
            columns: [['power', data[data.length-1].power]]
        });
    }
});

//Have new data, push it to the graph
socket.on('new_data', function(data) {
	console.log(data);
    //update graph
    power_chart.flow({
        columns: [
            ['power', data.power],
            ['time', data.time]
        ],
        duration: 1500,
        to: 0
    });
    //update gauge
    power_gauge.load({
        columns: [['power', data.power]]
    });
});
