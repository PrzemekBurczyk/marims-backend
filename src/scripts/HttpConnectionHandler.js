function HttpConnectionHandler(path, imgPath, http, port, app, sessionBrowsers) {
    var fs = require('fs');
    var path = require('path');
    var multer = require('multer');

    var storage = multer.diskStorage({
        destination: 'files/',
        filename: function(req, file, callback) {
            var applicationName = req.body.applicationName;
            var applicationVersion = req.body.applicationVersion;
            if (applicationName && applicationVersion) {
                return callback(null, applicationName + '-' + applicationVersion + '.apk');
            } else {
                return callback(null, file.originalname);
            }
        }
    });

    var upload = multer({
        storage: storage,
        fileFilter: function(req, file, callback) {
            return callback(null, true);
        },
        limits: {
            fieldSize: 1024 * 1024 * 100 // 100MB
        }
    });

    http.listen(port, function() {
        console.log(('Listening on ' + port).green);
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
        res.status(204).send();
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
            if (err) return next(err);
            res.status(204).send();
        });
    });
}

module.exports = HttpConnectionHandler;