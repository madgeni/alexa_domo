
var Domoticz = require('../node_modules/domoticz-api/api/domoticz');

var conf = require('../conf.json');
var api = new Domoticz({
    protocol: conf.protocol,
    host: conf.host,
    port: conf.port,
    username: conf.username,
    password: conf.password
});
log = require('./logger');

module.exports = function (idx, hue, brightness, sendback){
    api.setColour({
        idx: idx,
        hue: hue,
        brightness: brightness,
    }, function (params){
        var payload = hue;
        sendback(payload)
    })
};