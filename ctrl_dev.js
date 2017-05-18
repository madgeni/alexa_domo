
var Domoticz = require('./node_modules/domoticz-api/api/domoticz');

var conf = require('./conf.json');
var api = new Domoticz({
    protocol: conf.protocol,
    host: conf.host,
    port: conf.port,
    username: conf.username,
    password: conf.password
});
log = require('./logger');

module.exports = function (switchtype, applianceId, func, sendback) {

    api.changeSwitchState({
        type: switchtype,
        idx: applianceId,
        state: func
    }, function (params) {
        var payloads = {};
        sendback(payloads)
    });
}