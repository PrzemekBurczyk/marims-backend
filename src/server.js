require('colors');
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io').listen(http);

var imgPath = 'uploads/image';

app.use(bodyParser({ limit: '5mb'}));

io.on('connection', function(socket){
  console.log('User connected');
  socket.emit('refresh');
});

var androidSocket = io.of('/android');
androidSocket.on('connection', function(socket){
  console.log('Android connected');
});

androidSocket.on('image', function(image){
  io.emit('refresh', { image: req.body.image });
});

var port = Number(80);
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