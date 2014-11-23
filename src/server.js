require('colors');
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var app = express();
app.use(express.static('./lib'));
var http = require('http').Server(app);
var io = require('socket.io').listen(http);
var uuid = require('node-uuid');

var imgPath = 'uploads/image';

app.use(bodyParser({ limit: '5mb'}));

var androidEndpoint = '/android';
var browserEndpoint = '/browser';

var browsers = io.of(browserEndpoint);
browsers.on('connection', function(socket){
  console.log('Browser connected');
  //generate new session id here
  var sessionId = uuid.v4();

  var androidWebsocketUrl = androidEndpoint + '/' + sessionId;
  var androidAppUrl = 'marims://' + androidWebsocketUrl;
  var browserUrl = sessionId;
  var browserWebsocketUrl = browserEndpoint + '/' + sessionId;

  //creating browser websocket listener for generated session
  var sessionBrowsers = io.of(browserWebsocketUrl);
  sessionBrowsers.on('connection', function(socket){
    console.log('Browser connected to session ' + sessionId);
    socket.emit('start');
	socket.on('click', function(data){
		console.log("clicked: x=" + data.xPos + " y=" + data.yPos);
	  });
  });

  //creating android websocket listener for generated session
  io.of(androidWebsocketUrl).on('connection', function(socket){
    console.log('Android connected to session ' + sessionId);
    socket.emit('start');
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
  //Someone connected
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