var fs = require('fs');
var uuid = require('node-uuid');
var path = require('path');
var _ = require('lodash');
var async = require('async');
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

        async.auto({
            readFilesDir: function(callback) {
                return fs.readdir('files/', callback);
            },
            emitFilesEvent: ['readFilesDir', function(callback, results) {
                var files = results.readFilesDir;
                socket.emit('files', _.map(files, function(file) {
                    return file.replace(/\[.*?\]/, '');
                }));
                return callback();
            }],
            emitSessionsEvent: function(callback) {
                socket.emit('sessions', sessions);
                return callback();
            },
            getUsers: function(callback) {
                return Users.getAll(callback);
            },
            emitUsersEvent: ['getUsers', function(callback, results) {
                var users = results.getUsers;
                socket.emit('users', _.map(users, Users.toResponse));
                return callback();
            }]
        }, function(err) {
            if (err) console.log(err);
        });

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

            async.auto({
                addFileMember: function(callback) {
                    return Users.addFileMember(email, filename, callback);
                },
                getUsers: ['addFileMember', function(callback) {
                    return Users.getAll(callback);
                }],
                emitUsersEvent: ['getUsers', function(callback, results) {
                    var users = results.getUsers;
                    io.of(clientEndpoint).emit('users', _.map(users, Users.toResponse));
                    return callback();
                }]
            }, function(err) {
                if (err) console.log(err);
            });
        });

        socket.on('removeMember', function(email, filename) {
            if (DEBUG) {
                console.log('Removing member: ' + email + ' from file: ' + filename);
            }

            async.auto({
                removeFileMember: function(callback) {
                    return Users.removeFileMember(email, filename, callback);
                },
                getUsers: ['removeFileMember', function(callback) {
                    return Users.getAll(callback);
                }],
                emitUsersEvent: ['getUsers', function(callback, results) {
                    var users = results.getUsers;
                    io.of(clientEndpoint).emit('users', _.map(users, Users.toResponse));
                    return callback();
                }]
            }, function(err) {
                if (err) console.log(err);
            });
        });
    });
}

module.exports = ClientConnectionHandler;