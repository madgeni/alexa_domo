
var listDevs = require('./get_Devices');

log = require('./logger');

module.exports = //This handles the Discovery
    function handleDiscovery(event, context) {
        listDevs(event, context, function (passBack) {
            context.succeed(passBack);
            appliances = [];
        })
    };