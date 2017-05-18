
var Domoticz = require('./node_modules/domoticz-api/api/domoticz');

var conf = require('./conf.json');
var api = new Domoticz({
    protocol: conf.protocol,
    host: conf.host,
    port: conf.port,
    username: conf.username,
    password: conf.password
});
log = require('./logger')

module.exports = function (idx, devType, sendback){
    var intRet;
    api.getDevice({
        idx: idx
    }, function(params, callback) {
        var devArray = callback.results;
        if (devArray) {
            //turn this on to check the list of values the device returns
       //     log("device list", devArray)
            for (var i = 0; i < devArray.length; i++) {
                var device = devArray[i];
                var devName = device.name;
                if (device.description !== "") {
                    var regex = /Alexa_Name:\s*(.+)/im;
                    var match = regex.exec(device.description);
                    if (match !== null) {
                        devName = match[1].trim();
                    }
                }
                var callBackString = {};
                if(devType === 'temp'){
                    if (device.subType === "SetPoint"){
                        intRet = device.setPoint
                    } else {
                        intRet = device.temp
                    }
                    callBackString.value1 = intRet;
                    callBackString.value2 = devName;
                } else if (devType === 'light'){
                    callBackString = device.level
                } else if (devType === 'lock'){
                    callBackString = device.state
                }
                sendback(callBackString)
            }}
    });
};