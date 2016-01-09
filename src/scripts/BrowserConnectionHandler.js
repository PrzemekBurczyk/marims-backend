var uuid = require('node-uuid');

function BrowserConnectionHandler(app, io, path, browserEndpoint, androidEndpoint, sessionBrowsers, sessionAndroid, DEBUG) {
    var browsers = io.of(browserEndpoint);
    browsers.on('connection', function(socket) {
        if (DEBUG) {
            console.log('Browser connected');
        }

        //generate new session id here
        var sessionId = uuid.v4();
        // var sessionId = '123e4567-e89b-12d3-a456-426655440000';

        var androidWebsocketUrl = androidEndpoint + '/' + sessionId;
        var androidAppUrl = 'marims://' + androidWebsocketUrl;
        var browserUrl = sessionId;
        var browserWebsocketUrl = browserEndpoint + '/' + sessionId;

        // creating browser websocket listener for generated session
        sessionBrowsers[sessionId] = io.of(browserWebsocketUrl);
        sessionBrowsers[sessionId].on('connection', function(socket) {
            if (DEBUG) {
                console.log('Browser connected to session ' + sessionId);
            }

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