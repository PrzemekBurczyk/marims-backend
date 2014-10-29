require('colors');
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io').listen(http);

var imgPath = 'uploads/image';

app.use(bodyParser({ limit: '5mb'}));

var sockets = [];

io.on('connection', function(socket){
  sockets.push(socket);
  console.log('User connected');
  socket.emit('start');
  socket.on('image', function(image){
	  console.log('got image');
	  for(i = 0; i < sockets.length; i++){
	  	sockets[i].emit('refresh', image);
	  }
	});
});

var port = Number(process.env.PORT || 5000);
http.listen(port, function() {
  console.log(('Listening on ' + port).green);
});

app.get('/client', function(req, res) {
  res.sendfile(path.resolve('src/index.html'));
});

app.post('/upload', function(req, res) {
  res.send('OK!');
  io.emit('refresh', { image: req.body.image });
});

app.get('/image', function(req, res){
  res.sendfile(path.resolve(imgPath));
});