var DEBUG = false;

require('colors');
var dgram = require('dgram');
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var app = express();
app.use(express.static('./lib'));
var http = require('http').Server(app);
var io = require('socket.io').listen(http, { log: false });
var uuid = require('node-uuid');

var imgPath = 'uploads/image';

app.use(bodyParser({ limit: '5mb'}));

var androidEndpoint = '/android';
var browserEndpoint = '/browser';

var sessionBrowsers = {};
var sessionAndroid = {};

var browsers = io.of(browserEndpoint);
browsers.on('connection', function(socket){
  if(DEBUG){
    console.log('Browser connected');
  }

  //generate new session id here
  // var sessionId = uuid.v4();
  var sessionId = '123e4567-e89b-12d3-a456-426655440000';

  var androidWebsocketUrl = androidEndpoint + '/' + sessionId;
  var androidAppUrl = 'marims://' + androidWebsocketUrl;
  var browserUrl = sessionId;
  var browserWebsocketUrl = browserEndpoint + '/' + sessionId;

  // creating browser websocket listener for generated session
  sessionBrowsers[sessionId] = io.of(browserWebsocketUrl);
  sessionBrowsers[sessionId].on('connection', function(socket){
    if(DEBUG){
      console.log('Browser connected to session ' + sessionId);
    }

  	socket.on('mouseDown', function(data){
      if(DEBUG){
        console.log("mouseDown: x=" + data.xPos + " y=" + data.yPos + " t=" + data.time);
      }
      androidSocket = sessionAndroid[sessionId];
      if(androidSocket !== undefined && androidSocket !== null){
        androidSocket.emit('motionEvent', {
          x: data.xPos,
          y: data.yPos,
          time: data.time,
          event: "MOUSE_DOWN"
        });
      }
  	});
  	socket.on('mouseMove', function(data){
      if(DEBUG){
        console.log("mouseMove: x=" + data.xPos + " y=" + data.yPos + " t=" + data.time);
      }
      androidSocket = sessionAndroid[sessionId];
      if(androidSocket !== undefined && androidSocket !== null){
        androidSocket.emit('motionEvent', {
          x: data.xPos,
          y: data.yPos,
          time: data.time,
          event: "MOUSE_MOVE"
        });
      }
  	});
  	socket.on('mouseUp', function(data){
      if(DEBUG){
        console.log("mouseUp: x=" + data.xPos + " y=" + data.yPos + " t=" + data.time);
      }
      androidSocket = sessionAndroid[sessionId];
      if(androidSocket !== undefined && androidSocket !== null){
        androidSocket.emit('motionEvent', {
          x: data.xPos,
          y: data.yPos,
          time: data.time,
          event: "MOUSE_UP"
        });
      }
  	});

  });

  //creating browser http listener for generated session
  app.get('/' + sessionId, function(req, res) {
    res.sendfile(path.resolve('src/session.html'));
  });

  //notifying that the session is ready to use
  socket.emit('sessionGenerated', {
    sessionId: sessionId,
    androidAppUrl: androidAppUrl,
    browserUrl: browserUrl,
    browserWebsocketUrl: browserWebsocketUrl 
  });

});

io.on('connection', function(socket){
  //Android connected
  socket.on('register', function(data){
    sessionAndroid[data.sessionId] = socket;
  });
  
});

var port = Number(5000);
http.listen(port, function() {
  console.log(('Listening on ' + port).green);
});

app.get('/', function(req, res) {
  res.sendfile(path.resolve('src/index.html'));
});

app.post('/upload', function(req, res) {
  res.send('OK');
  sessionBrowsers[req.body.sessionId].emit('refresh', { 
    image: req.body.image,
    screenWidth: req.body.screenWidth,
    screenHeight: req.body.screenHeight
  });
});

app.get('/image', function(req, res){
  res.sendfile(path.resolve(imgPath));
});

var udpSocket = dgram.createSocket('udp4');

udpSocket.on('error', function(error){
  console.log('udp error: ' + error.stack);
  udpSocket.close();
});

udpSocket.on('listening', function(){
  var address = udpSocket.address();
  console.log('udp listening: ' + address.address + ':' + address.port);
});

buffer = {};

udpSocket.on('message', function(msg, rinfo){
  var screenshotId = msg[2];
  var payloadId = msg[0];
  var payloadCount = msg[1];
  var sessionId = msg.toString('ascii', 3, 39);
  if(sessionBrowsers[sessionId] !== undefined && sessionBrowsers[sessionId] !== null){
    console.log(screenshotId + ": " + payloadId + "/" + payloadCount);
    // if whole screen was more than 1 payload
    if(payloadCount > 1){
      var payload = msg.slice(39);
      // if session does not exist in buffer yet
      if(buffer[sessionId] === undefined){
        buffer[sessionId] = { 
          lastSentScreenshotId: null,
          firstUnsentScreenshotId: null,
          payloads: {}
        };
      } 
      var lastSentScreenshotId = buffer[sessionId].lastSentScreenshotId;

      // if screenshot that came is after last sent one
      if(lastSentScreenshotId === null || screenshotId > lastSentScreenshotId || lastSentScreenshotId - screenshotId > 100){
        // if screenshotId did not come yet
        if(buffer[sessionId].payloads[screenshotId] === undefined){
          buffer[sessionId].payloads[screenshotId] = new Array(payloadCount);
        }
        // if screenshotId was not flagged as unsent yet
        if(buffer[sessionId].firstUnsentScreenshotId === null){
          buffer[sessionId].firstUnsentScreenshotId = screenshotId;
        }
        buffer[sessionId].payloads[screenshotId][payloadId - 1] = payload;

        var haveCompleteScreenshot = true;
        for(var i = 0; i < payloadCount; i++){
          if(buffer[sessionId].payloads[screenshotId][i] === undefined){
            haveCompleteScreenshot = false;
          }
        }
        if(haveCompleteScreenshot === true){
          try {
            buffer[sessionId].lastSentScreenshotId = screenshotId;
            var data = JSON.parse(Buffer.concat(buffer[sessionId].payloads[screenshotId]));
            sessionBrowsers[sessionId].emit('refresh', { 
              image: data.image,
              screenWidth: data.screenWidth,
              screenHeight: data.screenHeight
            });
            var firstUnsentScreenshotId = buffer[sessionId].firstUnsentScreenshotId;
            var lastSentScreenshotId = buffer[sessionId].lastSentScreenshotId;

            // cleanup old screenshots
            if(firstUnsentScreenshotId <= lastSentScreenshotId){
              for(var i = firstUnsentScreenshotId; i <= lastSentScreenshotId; i++){
                buffer[sessionId].payloads[i] = undefined;
              }
            } else {
              for(var i = firstUnsentScreenshotId; i < 256; i++){
                buffer[sessionId].payloads[i] = undefined;
              }
              for(var i = 0; i <= lastSentScreenshotId; i++){
                buffer[sessionId].payloads[i] = undefined;
              }
            }
            buffer[sessionId].firstUnsentScreenshotId = (lastSentScreenshotId + 1) % 256;
          } catch(err) {
            console.log(err);
          }
        }
      }
    } else if(payloadCount === 1) { // if screen was only 1 payload
      var data = JSON.parse(msg.slice(39));
      sessionBrowsers[sessionId].emit('refresh', { 
        image: data.image,
        screenWidth: data.screenWidth,
        screenHeight: data.screenHeight
      });
    }
  }
});

udpSocket.bind(6666);