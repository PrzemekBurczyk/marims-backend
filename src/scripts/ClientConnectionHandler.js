var fs = require('fs');
var uuid = require('node-uuid');
var path = require('path');
var _ = require('lodash');

function ClientConnectionHandler(app, io, clientEndpoint, sessions, sessionBrowsers, sessionAndroid, DEBUG) {

    var clients = io.of(clientEndpoint);
    clients.on('connection', function(socket) {
        if (DEBUG) {
            console.log('Client connected');
        }

        fs.readdir('files/', function(err, files) {
            if (err) return next(err);
            socket.emit('files', files);
        });

        socket.on('createSession', function(session) {
            if (DEBUG) {
                console.log('Creating session for: ' + session.file);
            }
            fs.readFile(path.normalize(__dirname + '/../../files/' + file), function(err, file) {
                if (err) return socket.emit('sessionCreationFailed');
                session.id = uuid.v4();
                sessions.push(session);
                clients.emit('sessions', sessions);
            });
        });

        socket.on('removeSession', function(sessionId) {
            if (DEBUG) {
                console.log('Removing session with id: ' + sessionId);
            }
            var removedSessions = _.remove(sessions, function(session) {
                return session.id === sessionId;
            });
            if (removedSessions.length === 0) {
                return socket.emit('sessionRemovalFailed');
            } else {
                clients.emit('sessions', sessions);
            }
        });

        ////generate new session id here
        //var sessionId = uuid.v4();
        //// var sessionId = '123e4567-e89b-12d3-a456-426655440000';
        //
        //var androidWebsocketUrl = androidEndpoint + '/' + sessionId;
        //var androidAppUrl = 'marims://' + androidWebsocketUrl;
        //var browserUrl = sessionId;
        //var browserWebsocketUrl = clientEndpoint + '/' + sessionId;
        //
        ////creating browser http listener for generated session
        //app.get('/' + sessionId, function(req, res) {
        //    res.sendfile(path.resolve('src/html/session.html'));
        //});
        //
        ////notifying that the session is ready to use
        //socket.emit('sessionGenerated', {
        //    sessionId: sessionId,
        //    androidAppUrl: androidAppUrl,
        //    browserUrl: browserUrl,
        //    browserWebsocketUrl: browserWebsocketUrl
        //});
    });
}

module.exports = ClientConnectionHandler;