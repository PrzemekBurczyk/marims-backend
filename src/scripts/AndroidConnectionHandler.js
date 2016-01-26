function AndroidConnectionHandler(io, sessionAndroid, androidEndpoint, sessionBrowsers, DEBUG) {
    this.listenOnSessionId = function(sessionId) {
        var androidWebsocketUrl = androidEndpoint + '/' + sessionId;

        // creating browser websocket listener for generated session
        sessionAndroid[sessionId] = io.of(androidWebsocketUrl);
        sessionAndroid[sessionId].on('connection', function(socket) {
            if (DEBUG) {
                console.log('Android connected to session ' + sessionId);
            }

            if (sessionBrowsers[sessionId] !== undefined && sessionBrowsers[sessionId] !== null) {
                sessionBrowsers[sessionId].emit('android_connected');
            }

            socket.on('disconnect', function() {
                if (DEBUG) {
                    console.log('Android disconnected from session ' + sessionId);
                }

                if (sessionBrowsers[sessionId] !== undefined && sessionBrowsers[sessionId] !== null) {
                    sessionBrowsers[sessionId].emit('android_disconnected');
                }
            });

            socket.on('logs', function(log) {
                if (DEBUG) {
                    console.log('Android log: ' + log);
                }

                if (sessionBrowsers[sessionId] !== undefined && sessionBrowsers[sessionId] !== null) {
                    sessionBrowsers[sessionId].emit('logs', log);
                }
            });
        });

        return androidWebsocketUrl;
    };
}

module.exports = AndroidConnectionHandler;