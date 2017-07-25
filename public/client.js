var socket = io();
socket.on('news', function(data) {
	console.log(data);
});

var chart = c3.generate({
	bindto: '#chart',
	data: {
		columns: [
			['data1', 10, 30, 20, 400, 3],
			['data2', 50, 20, 45, 67, 67]
		]
	}
});
