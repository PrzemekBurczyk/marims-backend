var DEBUG = false;
var port = 5000;
var udpPort = 6666;
var tcpPort = 7777;

require('colors');

console.log(('DEBUG: ' + DEBUG).yellow);

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
var browserConnectionHandler = new BrowserConnectionHandler(app, io, path, sessions, clientEndpoint, browserEndpoint, androidEndpoint, sessionBrowsers, sessionAndroid, androidConnectionHandler, DEBUG);

var ClientConnectionHandler = require('./scripts/ClientConnectionHandler');
var clientConnectionHandler = new ClientConnectionHandler(app, io, clientEndpoint, sessions, sessionBrowsers, sessionAndroid, browserConnectionHandler, DEBUG);

var HttpConnectionHandler = require('./scripts/HttpConnectionHandler');
var httpConnectionHandler = new HttpConnectionHandler(io, path, imgPath, http, port, app, sessionBrowsers, clientEndpoint);

var UdpConnectionHandler = require('./scripts/UdpConnectionHandler');
var udpConnectionHandler = new UdpConnectionHandler(dgram, udpPort, sessionBrowsers);

var TcpConnectionHandler = require('./scripts/TcpConnectionHandler');
var tcpConnectionHandler = new TcpConnectionHandler(net, tcpPort, sessionBrowsers);