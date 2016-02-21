var passport = require('passport');
var Users = require('../models/User');
var _ = require('lodash');

module.exports.authorize = function(req, res, next) {
    passport.authenticate('bearer', function(err, user, info) {
        if (err) return next(err);

        if (!user) {
            if (res.status) {
                return res.status(401).send('Unauthorized due to invalid authorization token');
            } else {
                return next(new Error('Bad credentials'));
            }
        }

        if (req.logIn) {
            req.logIn(user, { session: false }, function(err) {
                return next(err);
            });
        } else {
            req.user = user;
        }
    })(req, res, next);
};

module.exports.checkIfFileAuthor = function(req, res, next) {
    var user = req.user;
    var filename = req.params.filename;
    Users.getById(user._id, function(err, user) {
        if (err) return next(err);

        if (!_.includes(user.authorOfFiles, filename)) {
            return res.status(403).send('File access not granted, need to be file author');
        }

        return next();
    });
};

module.exports.checkIfFileAuthorOrMember = function(req, res, next) {
    var user = req.user;
    var filename = req.params.filename;
    Users.getById(user._id, function(err, user) {
        if (err) return next(err);

        if (!_.includes(user.authorOfFiles, filename) && !_.includes(user.memberOfFiles, filename)) {
            return res.status(403).send('File access not granted, need to be file author or member');
        }

        return next();
    });
};