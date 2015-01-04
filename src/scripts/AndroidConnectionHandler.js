function AndroidConnectionHandler(io, sessionAndroid){
  io.on('connection', function(socket){
    //Android connected
    socket.on('register', function(data){
      sessionAndroid[data.sessionId] = socket;
    });
    
  });
};

module.exports = AndroidConnectionHandler;