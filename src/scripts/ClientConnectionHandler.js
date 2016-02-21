var fs = require('fs');
var uuid = require('node-uuid');
var path = require('path');
var _ = require('lodash');
var Helpers = require('./Helpers');
var Users = require('../models/User');

function ClientConnectionHandler(app, io, clientEndpoint, sessions, sessionBrowsers, sessionAndroid, browserConnectionHandler, DEBUG) {

    var clients = io.of(clientEndpoint);
    clients.use(function(socket, next) {
        Helpers.authorize(socket.request, {}, next);
    });
    clients.on('connection', function(socket) {
        if (DEBUG) {
            console.log('Client connected:', socket.request.user.email);
        }

        fs.readdir('files/', function(err, files) {
            if (err) return next(err);
            socket.emit('files', files);
        });

        socket.emit('sessions', sessions);

        socket.on('disconnect', function() {
            if (DEBUG) {
                console.log('Client disconnected:', socket.request.user.email);
            }
        });

        socket.on('createSession', function(filename) {
            if (DEBUG) {
                console.log('Creating session for: ' + filename);
            }
            fs.readFile(path.normalize(__dirname + '/../../files/' + filename), function(err, file) {
                if (err) return socket.emit('sessionCreationFailed');
                browserConnectionHandler.listenOnSessionId(uuid.v4(), filename);
            });
        });

        socket.on('removeSession', function(sessionId) {
            if (DEBUG) {
                console.log('Removing session with id: ' + sessionId);
            }
            if (!browserConnectionHandler.stopListeningOnSessionId(sessionId)) {
                return socket.emit('sessionRemovalFailed');
            }
        });

        socket.on('addMember', function(email, filename) {
            if (DEBUG) {
                console.log('Adding member: ' + email + ' to file: ' + filename);
            }

            Users.addFileMember(email, filename, function(err, user) {
                if (err) return console.log(err);
            });
        });

        socket.on('removeMember', function(email, filename) {
            if (DEBUG) {
                console.log('Removing member: ' + email + ' from file: ' + filename);
            }

            Users.removeFileMember(email, filename, function(err, user) {
                if (err) return console.log(err);
            });
        });
    });
}

module.exports = ClientConnectionHandler;