function AndroidConnectionHandler(io, sessionAndroid, androidEndpoint, DEBUG) {
    this.listenOnSessionId = function(sessionId) {
        var androidWebsocketUrl = androidEndpoint + '/' + sessionId;

        // creating browser websocket listener for generated session
        sessionAndroid[sessionId] = io.of(androidWebsocketUrl);
        sessionAndroid[sessionId].on('connection', function(socket) {
            if (DEBUG) {
                console.log('Android connected to session ' + sessionId);
            }
        });

        return androidWebsocketUrl;
    };
}

module.exports = AndroidConnectionHandler;