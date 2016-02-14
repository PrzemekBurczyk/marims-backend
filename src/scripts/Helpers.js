var passport = require('passport');

module.exports.authorize = function(req, res, next) {
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