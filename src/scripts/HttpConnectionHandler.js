function HttpConnectionHandler(io, path, imgPath, http, port, app, sessionBrowsers, clientEndpoint) {
    var fs = require('fs');
    var path = require('path');
    var multer = require('multer');

    var storage = multer.diskStorage({
        destination: 'files/',
        filename: function(req, file, callback) {
            var applicationName = req.body.applicationName;
            var applicationVersion = req.body.applicationVersion;
            var applicationVersionCode = req.body.applicationVersionCode;
            if (applicationName && applicationVersion && applicationVersionCode) {
                return callback(null, applicationName + '-' + applicationVersion + '-(' + applicationVersionCode + ').apk');
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
            if (applicationName && applicationVersion && applicationVersionCode) {
                return callback(null, true);
            } else {
                return callback(null, false);
            }
        },
        limits: {
            fieldSize: 1024 * 1024 * 100 // 100MB
        }
    });

    http.listen(port, function() {
        console.log(('HTTP listening on ' + port).green);
    });

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
}

module.exports = HttpConnectionHandler;