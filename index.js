//Load various libraries
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mysql = require('mysql');

//Connect to mysql db
var db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pwr'
});

db.connect();

//Serve up index.html.  It's what's for dinner
app.get('/', function (req, res) {
	res.sendFile(__dirname + '/public/index.html');
});
app.use(express.static('public'));

//Open a port (3000 in this case)
http.listen(3000, function () {
	console.log('listening on *:3000');
});

//Connect to client
io.on('connection', function(socket) {
    //Wait for data requests from clients and serve 'em up
    console.log('new connection');
    socket.on('request_data', function(args) {
        console.log('sending data...');
        if (args.type == 'pv_power' && args.time == 'today') {
            db.query('SELECT * FROM pv WHERE time >= CURDATE()', function(err, results, fields) {
                //Convert data to JSON object
                data = JSON.parse(JSON.stringify(results));
                socket.emit('data_return', data);
            });
        }
    });
});

//Regularly fetch data every 5 seconds
setInterval(function () {
    //Just push a random number for now
    var pvPower = Math.random()*6.2;
    console.log('PV pwr: '+pvPower+' kW');
    
    //emit as a broadcast to the whole world
    var currentTime = new Date();
    io.emit('new_data', {time:currentTime.toISOString(), power:pvPower});
    
    //push to the db
    db.query("INSERT INTO pv (power) VALUE (?)", [pvPower]);
}, 60000);