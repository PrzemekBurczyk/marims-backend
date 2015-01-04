function HttpConnectionHandler(path, imgPath, http, port, app, sessionBrowsers){
  http.listen(port, function() {
    console.log(('Listening on ' + port).green);
  });

  app.get('/', function(req, res) {
    res.sendfile(path.resolve('src/html/index.html'));
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
};

module.exports = HttpConnectionHandler;