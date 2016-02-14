var mongoose = require('mongoose');
var _ = require('lodash');
var uuid = require('node-uuid');

var Schema = mongoose.Schema;

var ModelNames = require('./ModelNames');

var TokenSchema = new Schema({
    _id: {
        type: String,
        default: uuid.v4
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: ModelNames.USER
    }
});

TokenSchema.index({
    "user": 1
});

var Token = module.exports.Token = mongoose.model(ModelNames.TOKEN, TokenSchema);

module.exports.createForUser = function(userId, callback) {
    if (_.isNull(userId) || _.isUndefined(userId)) return callback();
    new Token({ user: userId }).save(callback);
};

module.exports.get = function(id, callback) {
    if (_.isNull(id) || _.isUndefined(id)) return callback();
    Token.findById(id).populate('user').exec(callback);
};

module.exports.delete = function(id, callback) {
    if (_.isNull(id) || _.isUndefined(id)) return callback();
    Token.findByIdAndRemove(id, callback);
};