require('colors');
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var fs = require('fs');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var imgPath = 'uploads/image';

app.use(bodyParser({ limit: '5mb'}));

io.on('connection', function(socket){
  console.log('User connected');
  socket.emit('refresh');
});

var port = Number(process.env.PORT || 5000);
http.listen(port, function() {
  console.log(('Listening on ' + port).green);
});

app.get('/client', function(req, res) {
  res.sendfile(path.resolve('src/index.html'));
});

app.post('/upload', function(req, res) {
  fs.writeFile(imgPath, req.body.image, 'base64', function(err){
    if(err !== null){
      console.log(err);
    }
  });
  res.send('OK!');
  io.emit('refresh');
});

app.get('/image', function(req, res){
  res.sendfile(path.resolve(imgPath));
});