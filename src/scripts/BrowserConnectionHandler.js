var uuid = require('node-uuid');
var _ = require('lodash');

function BrowserConnectionHandler(app, io, path, sessions, clientEndpoint, browserEndpoint, androidEndpoint, sessionBrowsers, sessionAndroid, androidConnectionHandler, DEBUG) {
    var browsers = io.of(browserEndpoint);
    var self = this;

    this.listenOnSessionId = function(sessionId, filename) {
        var browserWebsocketUrl = browserEndpoint + '/' + sessionId;

        var session = {
            creationTimestamp: Date.now(),
            id: sessionId,
            file: filename
        };
        sessions.push(session);

        // creating browser websocket listener for generated session
        sessionBrowsers[sessionId] = io.of(browserWebsocketUrl);
        sessionBrowsers[sessionId].on('connection', function(socket) {
            if (DEBUG) {
                console.log('Browser connected to session ' + sessionId);
            }

            var androidSocket = sessionAndroid[sessionId];
            if (androidSocket !== undefined && androidSocket !== null) {
                sessionBrowsers[sessionId].emit('android_connected');
            }

            socket.on('disconnect', function(socket) {
                if (DEBUG) {
                    console.log('Browser disconnected from session ' + sessionId);
                }
            });

            socket.on('key', function(data) {
                if (DEBUG) {
                    console.log("key: text=" + data.text);
                }
                var androidSocket = sessionAndroid[sessionId];
                if (androidSocket !== undefined && androidSocket !== null) {
                    androidSocket.emit('keyEvent', {
                        text: data.text
                    });
                }
            });

            socket.on('specialKey', function(data) {
                if (DEBUG) {
                    console.log("specialKey: name=" + data.name);
                }
                var androidSocket = sessionAndroid[sessionId];
                if (androidSocket !== undefined && androidSocket !== null) {
                    androidSocket.emit('specialKeyEvent', {
                        name: data.name
                    });
                }
            });

            socket.on('mouseDown', function(data) {
                if (DEBUG) {
                    console.log("mouseDown: x=" + data.xPos + " y=" + data.yPos + " t=" + data.time);
                }
                var androidSocket = sessionAndroid[sessionId];
                if (androidSocket !== undefined && androidSocket !== null) {
                    androidSocket.emit('motionEvent', {
                        x: data.xPos,
                        y: data.yPos,
                        time: data.time,
                        event: "MOUSE_DOWN"
                    });
                }
            });
            socket.on('mouseMove', function(data) {
                if (DEBUG) {
                    console.log("mouseMove: x=" + data.xPos + " y=" + data.yPos + " t=" + data.time);
                }
                var androidSocket = sessionAndroid[sessionId];
                if (androidSocket !== undefined && androidSocket !== null) {
                    androidSocket.emit('motionEvent', {
                        x: data.xPos,
                        y: data.yPos,
                        time: data.time,
                        event: "MOUSE_MOVE"
                    });
                }
            });
            socket.on('mouseUp', function(data) {
                if (DEBUG) {
                    console.log("mouseUp: x=" + data.xPos + " y=" + data.yPos + " t=" + data.time);
                }
                var androidSocket = sessionAndroid[sessionId];
                if (androidSocket !== undefined && androidSocket !== null) {
                    androidSocket.emit('motionEvent', {
                        x: data.xPos,
                        y: data.yPos,
                        time: data.time,
                        event: "MOUSE_UP"
                    });
                }
            });

        });

        //creating browser http listener for generated session
        app.get('/' + sessionId, function(req, res) {
            res.sendfile(path.resolve('src/html/session.html'));
        });

        androidConnectionHandler.listenOnSessionId(sessionId);

        io.of(clientEndpoint).emit('sessions', sessions);

        return browserWebsocketUrl;
    };

    this.stopListeningOnSessionId = function(sessionId) {
        var removedSessions = _.remove(sessions, function(session) {
            return session.id === sessionId;
        });
        if (removedSessions.length === 0) {
            return false;
        } else {
            io.of(clientEndpoint).emit('sessions', sessions);
            return true;
        }
    };

    browsers.on('connection', function(socket) {
        if (DEBUG) {
            console.log('Browser connected');
        }

        socket.on('disconnect', function(socket) {
            if (DEBUG) {
                console.log('Browser disconnected');
            }
        });

        //generate new session id here
        var sessionId = uuid.v4();

        var androidWebsocketUrl = androidEndpoint + '/' + sessionId;
        var androidAppUrl = 'marims://' + androidWebsocketUrl;
        var browserUrl = sessionId;
        var browserWebsocketUrl = self.listenOnSessionId(sessionId);

        //notifying that the session is ready to use
        socket.emit('sessionGenerated', {
            sessionId: sessionId,
            androidAppUrl: androidAppUrl,
            browserUrl: browserUrl,
            browserWebsocketUrl: browserWebsocketUrl
        });

    });
}

module.exports = BrowserConnectionHandler;