var DEBUG = false;
var port = 5000;
var udpPort = 6666;
var tcpPort = 7777;

require('colors');
var mongoose = require('mongoose');
var async = require('async');

console.log(('DEBUG: ' + DEBUG).yellow);

async.series([
    function(callback) {
        console.log(('Connecting to the database...').blue);
        mongoose.connect('mongodb://localhost/marims');
        mongoose.connection.on('error', callback);
        mongoose.connection.once('open', callback);
    }
], function(err) {
    if (err) {
        console.log(JSON.stringify(err, null, 2).red);
        return process.exit(1);
    }
    console.log(('Database connected').green);

    var dgram = require('dgram');
    var net = require('net');

    var express = require('express');
    var bodyParser = require('body-parser');
    var path = require('path');
    var app = express();

    app.use(express.static('./lib'));

    var http = require('http').Server(app);
    var io = require('socket.io').listen(http, { log: false });

    var imgPath = 'uploads/image';

    app.use(bodyParser({ limit: '5mb' }));

    var androidEndpoint = '/android';
    var browserEndpoint = '/browser';
    var clientEndpoint = '/client';

    var sessionBrowsers = {};
    var sessionAndroid = {};
    var sessions = [];

    var AndroidConnectionHandler = require('./scripts/AndroidConnectionHandler');
    var androidConnectionHandler = new AndroidConnectionHandler(io, sessionAndroid, androidEndpoint, sessionBrowsers, DEBUG);

    var BrowserConnectionHandler = require('./scripts/BrowserConnectionHandler');
    var browserConnectionHandler = new BrowserConnectionHandler(app, io, sessions, clientEndpoint, browserEndpoint, androidEndpoint, sessionBrowsers, sessionAndroid, androidConnectionHandler, DEBUG);

    var ClientConnectionHandler = require('./scripts/ClientConnectionHandler');
    var clientConnectionHandler = new ClientConnectionHandler(app, io, clientEndpoint, sessions, sessionBrowsers, sessionAndroid, browserConnectionHandler, DEBUG);

    var HttpConnectionHandler = require('./scripts/HttpConnectionHandler');
    var httpConnectionHandler = new HttpConnectionHandler(io, imgPath, http, port, app, sessionBrowsers, clientEndpoint, sessions);

    var UdpConnectionHandler = require('./scripts/UdpConnectionHandler');
    var udpConnectionHandler = new UdpConnectionHandler(dgram, udpPort, sessionBrowsers);

    var TcpConnectionHandler = require('./scripts/TcpConnectionHandler');
    var tcpConnectionHandler = new TcpConnectionHandler(net, tcpPort, sessionBrowsers);
});
