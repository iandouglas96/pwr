//Load various libraries
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mysql = require('mysql');
var fs = require('fs');
var sma = require('./sma.js').Sma;

//Load inverter password from config file (get just the first line)
var inv_pass = fs.readFileSync("./inverter.pass", "UTF8").split('\n')[0];
console.log("Loaded inv password: "+inv_pass);

//Load db password from config file (get just the first line)
var db_pass = fs.readFileSync("./db.pass", "UTF8").split('\n')[0];
console.log("Loaded db password: "+db_pass);

//Connect to mysql db
var db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: db_pass,
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

//Connect to inverter
var inv_ip = "";
var inv_connected = false;
var inverter = new sma(function(type, data) {
  switch (type) {
    case "scan":
      inv_ip = data;
      //We have an ip, now let's try to log on
      inverter.logon(inv_ip, inv_pass);
      break;
    case "logon":
      inv_connected = true;
      break;
    case "power":
      console.log('PV pwr: '+data+' kW');

      //emit as a broadcast to the whole world
      var currentTime = new Date();
      io.emit('new_data', {time:currentTime.toISOString(), power:data});

      //push to the db
      db.query("INSERT INTO pv (power) VALUE (?)", [data]);
      break;
    default:
      console.log("Something weird happened");
      break;
  }
});
inverter.scan();

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
    if (inv_connected && inv_ip != "") {
      inverter.getPower(inv_ip);
    } else {
      //Reconnect, we have problems
      inverter.scan();
    }
}, 60000);
