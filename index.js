var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

//Serve up index.html.  It's what's for dinner
app.get('/', function (req, res) {
	res.sendFile(__dirname + '/public/index.html');
});
app.use(express.static('public'));

//Open a port (3000 in this case)
http.listen(3000, function () {
	console.log('listening on *:3000');
});

//Regularly fetch data every 5 seconds
setInterval(function () {
    console.log('sending update...');
    //Just push a random number for now
    //emit as a broadcast to the whole world
    io.emit('data', {power:Math.random()*6.2});
}, 5000);