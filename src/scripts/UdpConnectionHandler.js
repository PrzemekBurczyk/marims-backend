function UdpConnectionHandler(dgram, udpPort, sessionBrowsers) {
    var udpSocket = dgram.createSocket('udp4');

    udpSocket.on('error', function(error) {
        console.log('udp error: ' + error.stack);
        udpSocket.close();
    });

    udpSocket.on('listening', function() {
        var address = udpSocket.address();
        console.log(('UDP listening on ' + address.port).green);
    });

    buffer = {};

    udpSocket.on('message', function(msg, rinfo) {
        var screenshotId = msg[2];
        var payloadId = msg[0];
        var payloadCount = msg[1];
        var sessionId = msg.toString('ascii', 3, 39);
        if (sessionBrowsers[sessionId] !== undefined && sessionBrowsers[sessionId] !== null) {
            // if whole screen was more than 1 payload
            if (payloadCount > 1) {
                var payload = msg.slice(39);
                // if session does not exist in buffer yet
                if (buffer[sessionId] === undefined) {
                    buffer[sessionId] = {
                        lastSentScreenshotId: null,
                        firstUnsentScreenshotId: null,
                        payloads: {}
                    };
                }
                var lastSentScreenshotId = buffer[sessionId].lastSentScreenshotId;

                // if screenshot that came is after last sent one
                if (lastSentScreenshotId === null || screenshotId > lastSentScreenshotId || lastSentScreenshotId - screenshotId > 100) {
                    // if screenshotId did not come yet
                    if (buffer[sessionId].payloads[screenshotId] === undefined) {
                        buffer[sessionId].payloads[screenshotId] = new Array(payloadCount);
                    }
                    // if screenshotId was not flagged as unsent yet
                    if (buffer[sessionId].firstUnsentScreenshotId === null) {
                        buffer[sessionId].firstUnsentScreenshotId = screenshotId;
                    }
                    buffer[sessionId].payloads[screenshotId][payloadId - 1] = payload;

                    var haveCompleteScreenshot = true;
                    for (var i = 0; i < payloadCount; i++) {
                        if (buffer[sessionId].payloads[screenshotId][i] === undefined) {
                            haveCompleteScreenshot = false;
                        }
                    }
                    if (haveCompleteScreenshot === true) {
                        try {
                            buffer[sessionId].lastSentScreenshotId = screenshotId;
                            var data = JSON.parse(Buffer.concat(buffer[sessionId].payloads[screenshotId]));
                            sessionBrowsers[sessionId].emit('refresh', {
                                image: data.image,
                                screenWidth: data.screenWidth,
                                screenHeight: data.screenHeight
                            });
                            var firstUnsentScreenshotId = buffer[sessionId].firstUnsentScreenshotId;
                            var lastSentScreenshotId = buffer[sessionId].lastSentScreenshotId;

                            // cleanup old screenshots
                            if (firstUnsentScreenshotId <= lastSentScreenshotId) {
                                for (var i = firstUnsentScreenshotId; i <= lastSentScreenshotId; i++) {
                                    buffer[sessionId].payloads[i] = undefined;
                                }
                            } else {
                                for (var i = firstUnsentScreenshotId; i < 256; i++) {
                                    buffer[sessionId].payloads[i] = undefined;
                                }
                                for (var i = 0; i <= lastSentScreenshotId; i++) {
                                    buffer[sessionId].payloads[i] = undefined;
                                }
                            }
                            buffer[sessionId].firstUnsentScreenshotId = (lastSentScreenshotId + 1) % 256;
                        } catch (err) {
                            console.log(err);
                        }
                    }
                }
            } else if (payloadCount === 1) { // if screen was only 1 payload
                var data = JSON.parse(msg.slice(39));
                sessionBrowsers[sessionId].emit('refresh', {
                    image: data.image,
                    screenWidth: data.screenWidth,
                    screenHeight: data.screenHeight
                });
            }
        }
    });

    udpSocket.bind(udpPort);
}

module.exports = UdpConnectionHandler;