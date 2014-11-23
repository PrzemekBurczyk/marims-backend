require('colors');
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io').listen(http);

var imgPath = 'uploads/image';

app.use(bodyParser({ limit: '5mb'}));

var androidEndpoint = '/android';
var browserEndpoint = '/browser';

var sessionBrowsers = {};
var sessionAndroid = {};
var sessionId = '123e4567-e89b-12d3-a456-426655440000';

var browsers = io.of(browserEndpoint);
browsers.on('connection', function(socket){
  console.log('Browser connected');

  //generate new session id here
  
  var androidWebsocketUrl = androidEndpoint + '/' + sessionId;
  var androidAppUrl = 'marims://' + androidWebsocketUrl;
  var browserUrl = sessionId;
  var browserWebsocketUrl = browserEndpoint + '/' + sessionId;

  //creating browser websocket listener for generated session
  sessionBrowsers[sessionId] = io.of(browserWebsocketUrl);
  sessionBrowsers[sessionId].on('connection', function(socket){
    console.log('Browser connected to session ' + sessionId);
    socket.emit('start', 'browser');
  });

  //creating android websocket listener for generated session
  // sessionAndroid[sessionId] = io.of(androidWebsocketUrl);
  // sessionAndroid[sessionId].on('connection', function(socket){
  //   console.log('Android connected to session ' + sessionId);
  //   socket.emit('start', 'android');
  // });

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
  console.log('Someone connected');
  socket.emit('start', 'anyone');
  socket.on('image', function(data){
    // socket.emit('image', 'image send success');
    sessionBrowsers[sessionId].emit('debug', data);
    // sessionBrowsers[data.sessionId].emit('refresh', { image: data.imageData });
  });
});

var port = Number(process.env.PORT || 5000);
http.listen(port, function() {
  console.log(('Listening on ' + port).green);
});

app.get('/', function(req, res) {
  res.sendfile(path.resolve('src/index.html'));
});

app.post('/upload', function(req, res) {
  res.send('OK!');
  io.emit('refresh', { image: req.body.image });
});

app.get('/image', function(req, res){
  res.sendfile(path.resolve(imgPath));
});