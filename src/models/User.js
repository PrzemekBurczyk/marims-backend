var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ModelNames = require('./ModelNames');
var async = require('async');
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

module.exports.create = function(user, password, callback) {
    User.register(user, password, callback);
};