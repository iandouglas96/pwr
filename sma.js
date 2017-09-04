//Need udp library (protocol to talk to inverter)
var udp = require('dgram');

//Semi-random serial number for our fake "device"
var AppSerial = 900000000 + Math.floor(Math.random()*100000000);

// create udp socket to talk to inverter
var sma_server = udp.createSocket('udp4');

//Default "constructor"
function Sma(callback) {
  var state = "off";
  //New 520 character buffer
  var packet = Buffer.alloc(520).fill(0x00);
  var packetLength = 0;

  //Handler for replies from inverter
  sma_server.on('message', function(msg,info){
    //State machine for how to process
    reply = Buffer.from(msg);
    //Data processing is dependent on the command type
    switch(state) {
      case "scan":
        if (Buffer.byteLength(reply) >= 0x29) {
          var retval = ""+reply.readUInt8(0x26)+".";
          retval += reply.readUInt8(0x27)+".";
          retval += reply.readUInt8(0x28)+".";
          retval += reply.readUInt8(0x29);
        } else {
          var retval = "error";
        }
        break;
      case "logon":
        var retval = "success";
        break;
      case "power":
        if (Buffer.byteLength(reply) >= 0x68-0x2A) {
          var retval = reply.readUInt32LE(0x68-0x2A)/1000.0;
          //If it's really big, actually 0
          if (retval > 1000000) {
            retval = 0;
          }
        } else {
          var retval = "error";
        }
        break;
      default:
        var retval = "error";
        break;
    }
    console.log(state+" data received: "+retval);
    var type = state;
    //reset state before callback so recursion works
    state = "off";
    //Pass the data back
    callback(type, retval);
  });

  this.scan = function() {
    //Make sure there isn't another in progress operation
    if (state == "off") {
      //Scan for inverter IP
      const packet_buf = Buffer.from([0x53,0x4d,0x41,0x00,0x00,0x04,0x02,0xa0,0xff,0xff,0xff,0xff,0x00,0x00,0x00,0x20,0x00,0x00,0x00,0x00])

      //Broadcast
      sma_server.send(packet_buf, 0, packet_buf.length, 9522, "239.12.255.254", function(error){
        if(error){
          sma_server.close();
        }else{
          console.log('Scanning for inverters...');
        }
      });
      state = "scan";
    }
  }

  this.logon = function(ip, pwd) {
    //Make sure there isn't another in progress operation
    if (state == "off") {
      var len = 0;
      len = writePacketHeader(packet, 0x3A, 0x0E, 0xA0, 0x0100, 0xFFFF, 0xFFFFFFFF);
      len = packet.writeUInt32LE(0xFFFD040C, len);
      len = packet.writeUInt32LE(0x00000007, len);
      len = packet.writeUInt32LE(0x00000384, len);
      len = packet.writeUInt32LE(Math.round(new Date().getTime()/1000), len); //seconds since epoch
      len = packet.writeUInt32LE(0x00000000, len);

      //Encode the password
      //Password is 12 characters, each of which is 0x88 or the value+0x88
      for (var i=0; i<12; i++) {
        if (i < pwd.length) {
          len = packet.writeUInt8(pwd.charCodeAt(i)+0x88, len);
        } else {
          len = packet.writeUInt8(0x88, len);
        }
      }

      len = packet.writeUInt32LE(0x00000000, len);

      //Transmit
      sma_server.send(packet, 0, len, 9522, ip, function(error){
        if(error){
          sma_server.close();
        }else{
          console.log('Logging in...');
        }
      });
      state = "logon";
    }
  }

  this.getPower = function(ip) {
    //Make sure there isn't another in progress operation
    if (state == "off") {
      var len = 0;
      len = writePacketHeader(packet, 0x26, 0x09, 0xA0, 0x0000, 0xFFFF, 0xFFFFFFFF);
      len = packet.writeUInt32LE(0x51000200, len);
      len = packet.writeUInt32LE(0x00263F00, len);
      len = packet.writeUInt32LE(0x00263FFF, len);
      len = packet.writeUInt32LE(0x00000000, len);

      //Transmit
      sma_server.send(packet, 0, len, 9522, ip, function(error){
        if(error){
          sma_server.close();
        }else{
          console.log('Getting Power...');
        }
      });
      state = "power";
    }
  }
}

//Assemble the beginning of the packet
function writePacketHeader(buffer, length, longwords, ctrl, ctrl2, destSUSYID, destSerial) {
  var len = 0;
  len = writeCharArray(buffer, [0x53,0x4d,0x41,0x00,0x00,0x04,0x02,0xa0,0x00,0x00,0x00,0x01,0x00], len);
  len = buffer.writeUInt8(length, len);
  len = buffer.writeUInt32LE(0x65601000, len);
  len = buffer.writeUInt8(longwords, len);
  len = buffer.writeUInt8(ctrl, len);
  len = buffer.writeUInt16LE(destSUSYID, len);
  len = buffer.writeUInt32LE(destSerial, len);
  len = buffer.writeUInt16LE(ctrl2, len);
  len = buffer.writeUInt16LE(125, len); //AppSUSyID
  len = buffer.writeUInt32LE(AppSerial, len);
  len = buffer.writeUInt16LE(ctrl2, len);
  len = buffer.writeUInt32LE(0x00000000, len);
  len = buffer.writeUInt16LE(0x8000, len); //packet ID

  return len;
}

//Write series of chars to array
function writeCharArray(buffer, array, pos) {
  for (var i=0; i<array.length; i++) {
    pos = buffer.writeUInt8(array[i], pos);
  }
  return array.length;
}

//Make this an externally visible class
exports.Sma = Sma;
