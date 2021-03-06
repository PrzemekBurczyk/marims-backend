function AndroidConnectionHandler(io, sessionAndroid, androidEndpoint, sessionBrowsers, DEBUG) {
    this.listenOnSessionId = function(sessionId) {
        var androidWebsocketUrl = androidEndpoint + '/' + sessionId;

        // creating browser websocket listener for generated session
        io.of(androidWebsocketUrl).on('connection', function(socket) {
            if (DEBUG) {
                console.log('Android connected to session ' + sessionId);
            }

            sessionAndroid[sessionId] = socket;

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

            socket.on('memoryStatus', function(memoryStatus) {
                if (DEBUG) {
                    console.log('Android memory status: ' + JSON.stringify(memoryStatus, null, 2));
                }

                if (sessionBrowsers[sessionId] !== undefined && sessionBrowsers[sessionId] !== null) {
                    sessionBrowsers[sessionId].emit('memoryStatus', memoryStatus);
                }
            });
        });

        return androidWebsocketUrl;
    };
}

module.exports = AndroidConnectionHandler;