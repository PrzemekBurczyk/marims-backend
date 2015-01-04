function TcpConnectionHandler(net, tcpPort, sessionBrowsers){
  var tcpBuffer = {};

  net.createServer(function(socket){
    var address = socket.remoteAddress + ':' + socket.remotePort;
    console.log('tcp connected: ' + address);

    tcpBuffer[address] = '';

    socket.on('data', function(msg) {
      tcpBuffer[address] += msg;
      if(msg[msg.length - 1] === 10) { // 10 is Line Feed
        try {
          var data = JSON.parse(tcpBuffer[address]);
          var sessionId = data.sessionId;
          if(sessionBrowsers[sessionId] !== undefined && sessionBrowsers[sessionId] !== null){
            sessionBrowsers[sessionId].emit('refresh', { 
              image: data.image,
              screenWidth: data.screenWidth,
              screenHeight: data.screenHeight
            });
            tcpBuffer[address] = '';
          }
        } catch(err) {
          tcpBuffer[address] = '';
        }
      }
    });

    socket.on('close', function(data){
      console.log('tcp closed: ' + address);
      delete tcpBuffer[address];
    });

  }).listen(tcpPort);
};

module.exports = TcpConnectionHandler;