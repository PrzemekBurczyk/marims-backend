var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ModelNames = require('./ModelNames');
var async = require('async');
var _ = require('lodash');
var passportLocalMongoose = require('passport-local-mongoose');

var UserSchema = new Schema({
    email: {
        type: String,
        unique: true,
        required: true
    }
});

UserSchema.index({
    email: 1
});

UserSchema.plugin(passportLocalMongoose, {
    usernameField: 'email'
});

var User = module.exports.User = mongoose.model(ModelNames.USER, UserSchema);

module.exports.create = function(user, password, callback) {
    User.register(user, password, callback);
};

module.exports.getByEmail = function(email, callback) {
    if (_.isNull(email) || _.isUndefined(email)) return callback();
    User.findOne({ email: email }).exec(callback);
};
