function HttpConnectionHandler(io, imgPath, http, port, app, sessionBrowsers, clientEndpoint) {
    var fs = require('fs');
    var path = require('path');
    var multer = require('multer');
    var async = require('async');
    var Users = require('../models/User');
    var User = Users.User;
    var Tokens = require('../models/Token');
    var passport = require('passport');
    var _ = require('lodash');
    var HttpBearerStrategy = require('passport-http-bearer').Strategy;

    var storage = multer.diskStorage({
        destination: 'files/',
        filename: function(req, file, callback) {
            var applicationName = req.body.applicationName;
            var applicationVersion = req.body.applicationVersion;
            var applicationVersionCode = req.body.applicationVersionCode;
            var applicationPackage = req.body.applicationPackage;
            if (applicationName && applicationVersion && applicationVersionCode) {
                return callback(null, '[' + applicationPackage + ']' + applicationName + '-' + applicationVersion + '-(' + applicationVersionCode + ').apk');
            } else {
                return callback(null, file.originalname);
            }
        }
    });

    var upload = multer({
        storage: storage,
        fileFilter: function(req, file, callback) {
            var applicationName = req.body.applicationName;
            var applicationVersion = req.body.applicationVersion;
            var applicationVersionCode = req.body.applicationVersionCode;
            var applicationPackage = req.body.applicationPackage;
            if (applicationName && applicationVersion && applicationVersionCode && applicationPackage) {
                return callback(null, true);
            } else {
                return callback(null, false);
            }
        },
        limits: {
            fieldSize: 1024 * 1024 * 100 // 100MB
        }
    });

    var logIn = function(req, res, next) {
        passport.authenticate('local', function(err, user, info) {
            if (err) return next(err);

            if (!user) {
                return res.status(401).send({
                    code: 'BadCredentials',
                    msg: 'Unauthorized due to invalid login data'
                });
            }

            req.logIn(user, { session: false }, function(err) {
                return next(err);
            });
        })(req, res, next);
    };

    var authorize = function(req, res, next) {
        passport.authenticate('bearer', function(err, user, info) {
            if (err) return next(err);

            if (!user) {
                return res.status(401).send({
                    code: 'BadCredentials',
                    msg: 'Unauthorized due to invalid authorization token'
                });
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
                res.status(201).send({
                    email: email,
                    id: token.user,
                    token: token._id
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

    app.post('/files', upload.single('file'), function(req, res, next) {
        if (req.file) {
            res.status(204).send();
            fs.readdir('files/', function(err, files) {
                if (err) return console.log(err);
                io.of(clientEndpoint).emit('files', files);
            });
        } else {
            res.status(400).send("File upload failed");
        }
    });

    app.get('/files', function(req, res, next) {
        fs.readdir('files/', function(err, files) {
            if (err) return next(err);
            res.status(200).send(files);
        });
    });

    app.get('/files/:filename', function(req, res, next) {
        var filename = req.params.filename;
        res.status(200).sendfile(path.normalize(__dirname + '/../../files/' + filename));
    });

    app.delete('/files/:filename', function(req, res, next) {
        var filename = req.params.filename;
        fs.unlink(path.normalize(__dirname + '/../../files/' + filename), function(err) {
            if (err) return res.status(400).send();
            res.status(204).send();
            fs.readdir('files/', function(err, files) {
                if (err) return console.log(err);
                io.of(clientEndpoint).emit('files', files);
            });
        });
    });

    app.use(function(req, res, next) {
        var err = new Error('Page not found: ' + req.originalUrl);
        err.status = 404;
        return next(err);
    });

    app.use(function(err, req, res, next) {
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