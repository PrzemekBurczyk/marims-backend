function HttpConnectionHandler(io, imgPath, http, port, app, sessionBrowsers, clientEndpoint, sessions) {
    var fs = require('fs');
    var path = require('path');
    var multer = require('multer');
    var async = require('async');
    var Users = require('../models/User');
    var User = Users.User;
    var Tokens = require('../models/Token');
    var Helpers = require('./Helpers');
    var passport = require('passport');
    var _ = require('lodash');
    var HttpBearerStrategy = require('passport-http-bearer').Strategy;

    function getFilename(req) {
        var user = req.user;
        var applicationName = req.body.applicationName;
        var applicationVersion = req.body.applicationVersion;
        var applicationVersionCode = req.body.applicationVersionCode;
        var applicationPackage = req.body.applicationPackage;

        if (user && applicationName && applicationVersion && applicationVersionCode && applicationPackage) {
            return '[' + user._id.toHexString() + ']' + '[' + applicationPackage + ']' + applicationName + '-' + applicationVersion + '-(' + applicationVersionCode + ').apk';
        } else {
            return null;
        }
    }

    var storage = multer.diskStorage({
        destination: 'files/',
        filename: function(req, file, callback) {
            var filename = getFilename(req);
            if (filename) {
                return callback(null, filename);
            } else {
                return callback(null, file.originalname);
            }
        }
    });

    var upload = multer({
        storage: storage,
        limits: {
            fieldSize: 1024 * 1024 * 100 // 100MB
        }
    });

    var logIn = function(req, res, next) {
        passport.authenticate('local', function(err, user, info) {
            if (err) return next(err);

            if (!user) {
                return res.status(401).send('Unauthorized due to invalid login data');
            }

            req.logIn(user, { session: false }, function(err) {
                return next(err);
            });
        })(req, res, next);
    };

    app.use(passport.initialize());

    passport.use(User.createStrategy());
    passport.use(new HttpBearerStrategy(function(token, done) {
        process.nextTick(function() {
            Tokens.get(token, function(err, localToken) {
                if (err) return done(err);
                if (!localToken || !localToken.user) return done(null, false);
                return done(null, _.assign(localToken.user, {
                    token: token
                }));
            });
        });
    }));

    app.get('/', function(req, res) {
        res.sendfile(path.resolve('src/html/index.html'));
    });

    app.post('/upload', function(req, res) {
        res.send('OK');
        sessionBrowsers[req.body.sessionId].emit('refresh', {
            image: req.body.image,
            screenWidth: req.body.screenWidth,
            screenHeight: req.body.screenHeight
        });
    });

    app.get('/image', function(req, res) {
        res.sendfile(path.resolve(imgPath));
    });

    app.post('/register', function(req, res, next) {
        var email = req.body.email;
        var password = req.body.password;
        Users.getByEmail(email, function(err, existingUser) {
            if (err) return next(err);
            if (existingUser) return res.status(400).send('Email already in use');

            var user = {
                email: email
            };

            async.waterfall([
                function(callback) {
                    Users.create(user, password, callback);
                },
                function(user, callback) {
                    Tokens.createForUser(user._id, callback);
                }
            ], function(err, token) {
                if (err) return next(err);

                async.auto({
                    sendResponse: function(callback) {
                        res.status(201).send({
                            email: email,
                            id: token.user,
                            token: token._id
                        });
                        return callback();
                    },
                    getUsers: function(callback) {
                        return Users.getAll(callback);
                    },
                    emitUsersEvent: ['getUsers', function(callback, results) {
                        var users = results.getUsers;
                        io.of(clientEndpoint).emit('users', _.map(users, Users.toResponse));
                        return callback();
                    }]
                }, function(err, results) {
                    if (err) return console.log(err);
                });

            });
        });
    });

    app.post('/login', logIn, function(req, res, next) {
        Tokens.createForUser(req.user._id, function(err, token) {
            if (err) return next(err);
            return res.status(200).send({
                email: req.user.email,
                id: req.user._id,
                token: token._id
            })
        });
    });

    app.post('/logout', Helpers.authorize, function(req, res, next) {
        Tokens.delete(req.user.token, function(err) {
            if (err) return next(err);
            return res.status(204).send();
        });
    });

    app.post('/files', Helpers.authorize, upload.single('file'), function(req, res, next) {
        var user = req.user;
        if (req.file) {
            async.auto({
                readFilesDir: function(callback) {
                    return fs.readdir('files/', callback);
                },
                emitFilesEvent: ['readFilesDir', function(callback, results) {
                    var files = results.readFilesDir;
                    io.of(clientEndpoint).emit('files', files);
                    return callback();
                }],
                addFileAuthor: function(callback) {
                    Users.addFileAuthor(user._id, req.file.filename, callback);
                },
                getUsers: ['addFileAuthor', function(callback) {
                    return Users.getAll(callback);
                }],
                emitUsersEvent: ['getUsers', function(callback, results) {
                    var users = results.getUsers;
                    io.of(clientEndpoint).emit('users', _.map(users, Users.toResponse));
                    return callback();
                }]
            }, function(err, results) {
                if (err) return next(err);
                return res.status(204).send();
            });
        } else {
            res.status(400).send("File upload failed");
        }
    });

    app.get('/files', Helpers.authorize, function(req, res, next) {
        fs.readdir('files/', function(err, files) {
            if (err) return next(err);
            res.status(200).send(files);
        });
    });

    app.get('/files/:filename', Helpers.authorize, Helpers.checkIfFileAuthorOrMember, function(req, res, next) {
        var filename = req.params.filename;
        res.status(200).sendfile(path.normalize(__dirname + '/../../files/' + filename));
    });

    app.delete('/files/:filename', Helpers.authorize, Helpers.checkIfFileAuthor, function(req, res, next) {
        var filename = req.params.filename;
        var user = req.user;
        async.auto({
            unlinkFile: function(callback) {
                return fs.unlink(path.normalize(__dirname + '/../../files/' + filename), callback);
            },
            readFilesDir: ['unlinkFile', function(callback) {
                return fs.readdir('files/', callback);
            }],
            emitFilesEvent: ['readFilesDir', function(callback, results) {
                var files = results.readFilesDir;
                io.of(clientEndpoint).emit('files', files);
                return callback();
            }],
            removeFileAuthor: function(callback) {
                Users.removeFileAuthor(user._id, filename, callback);
            },
            getUsers: ['removeFileAuthor', function(callback) {
                return Users.getAll(callback);
            }],
            emitUsersEvent: ['getUsers', function(callback, results) {
                var users = results.getUsers;
                io.of(clientEndpoint).emit('users', _.map(users, Users.toResponse));
                return callback();
            }]
        }, function(err, results) {
            if (err) return res.status(400).send();
            return res.status(204).send();
        });
    });

    //creating browser http listener for generated session
    app.get('/:sessionId', function(req, res, next) {
        var sessionId = req.params.sessionId;
        if (_.includes(_.map(sessions, 'id'), sessionId)) {
            return res.sendfile(path.resolve('src/html/session.html'));
        } else {
            return next();
        }
    });

    app.use(function(req, res, next) {
        var err = new Error('Page not found: ' + req.originalUrl);
        err.status = 404;
        return next(err);
    });

    app.use(function(err, req, res, next) {
        console.log(err);
        return res.status(err.status || 500).send({
            name: err.name,
            message: err.message
        })
    });

    http.listen(port, function() {
        console.log(('HTTP listening on ' + port).green);
    });
}

module.exports = HttpConnectionHandler;