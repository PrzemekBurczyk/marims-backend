var passport = require('passport');

module.exports.authorize = function(req, res, next) {
    passport.authenticate('bearer', function(err, user, info) {
        if (err) return next(err);

        if (!user) {
            if (res.status) {
                return res.status(401).send({
                    code: 'BadCredentials',
                    msg: 'Unauthorized due to invalid authorization token'
                });
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