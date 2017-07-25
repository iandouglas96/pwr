//Connect to the websocket
var socket = io();

//gauge for instantaneous power
var power_gauge = c3.generate({
    bindto: '#power_gauge',
    data: {
        columns: [
            ['power', 0]
        ],
        type: 'gauge'
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
		columns: [
			['power', 1, 3, 2, 4, 3]
		]
	}
});

//Have new data, push it to the graph
socket.on('data', function(data) {
	console.log(data);
    //update graph
    power_chart.flow({
        columns: [
            ['power', data.power]
        ],
        duration: 1500,
        to: 0
    });
    //update gauge
    power_gauge.load({
        columns: [['power', data.power]]
    });
});