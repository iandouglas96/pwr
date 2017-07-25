//Connect to the websocket
var socket = io();

//Create chart object to 
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
    power_chart.flow({
        columns: [
            ['power', data.power]
        ],
        duration: 1500
    });
});



