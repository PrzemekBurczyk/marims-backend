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
    },
    authorOfFiles: [String],
    memberOfFiles: [String]
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

module.exports.addFileAuthor = function(id, filename, callback) {
    if (_.isNull(id) || _.isUndefined(id)) return callback();
    if (_.isNull(filename) || _.isUndefined(filename)) return callback();

    User.findByIdAndUpdate(id, {
        $addToSet: {
            authorOfFiles: filename
        }
    }).exec(callback);
};

module.exports.addFileMember = function(email, filename, callback) {
    if (_.isNull(email) || _.isUndefined(email)) return callback();
    if (_.isNull(filename) || _.isUndefined(filename)) return callback();

    User.findOneAndUpdate({
        email: email
    }, {
        $addToSet: {
            memberOfFiles: filename
        }
    }).exec(callback);
};

module.exports.removeFileMember = function(email, filename, callback) {
    if (_.isNull(email) || _.isUndefined(email)) return callback();
    if (_.isNull(filename) || _.isUndefined(filename)) return callback();

    User.findOneAndUpdate({
        email: email
    }, {
        $pull: {
            memberOfFiles: filename
        }
    }).exec(callback);
};
