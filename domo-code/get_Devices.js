
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
var makeHeader = require('./HeaderGen');
var appliances = [];

module.exports = function (event, context, passBack) {

    var response_name = "DiscoverAppliancesResponse";
    var headers = makeHeader(event,response_name);
//lets get the devices from Domoticz:
    api.getDevices({}, function (error, devices) {
        if (error){
            log("error:", error);
            handleError(event, context, "TargetBridgeConnectivityUnstableError");
            return;
        }
        var devArray = devices.results;
        if (devArray) {
            for (var i = 0; i < devArray.length; i++) {
                var device = devArray[i];
                //      log("device detail is: ", device)
                // Omit devices which aren't in a room plan
                if (device.planID === '0')
                    continue;

                var devType = device.type;
                var setswitch = device.switchType;
                var dz_name = device.name;

                if (device.description !== "") {
                    // Search for Alexa_Name string, ignore casesensitive and whitespaces

                    var regex = /Alexa_Name:\s*(.+)/im;
                    var match = regex.exec(device.description);
                    if (match !== null) {
                        dz_name = match[1].trim();
                    }
                }
                //var msg = ("device name is - ", device.name, " and friendly description is ", dz_name);
                // log("device info", msg);
                var appliancename = {
                    applianceId: device.idx,
                    manufacturerName: device.hardwareName,
                    modelName: device.subType,
                    version: device.switchType,
                    friendlyName: dz_name,
                    friendlyDescription: devType,
                    isReachable: true
                };

                if (devType.startsWith("Scene") || devType.startsWith("Group")) {
                    appliancename.manufacturerName = device.name,
                        appliancename.modelName = device.name,
                        appliancename.version = device.idx,
                        appliancename.applianceId = parseInt(device.idx) + 200;
                        appliancename.actions = ([
                        "turnOn",
                        "turnOff"
                    ]);
                    appliancename.additionalApplianceDetails = ({
                        WhatAmI: "scene"
                    });
                    appliances.push(appliancename);
                }
                else if (devType.startsWith("Light")) {
                    appliancename.actions = ([
                        "incrementPercentage",
                        "decrementPercentage",
                        "setPercentage",
                        "turnOn",
                        "turnOff",
                        "setColor",
                        "setColorTemperature"
                    ]);
                    appliancename.additionalApplianceDetails = ({
                        maxDimLevel: device.maxDimLevel,
                        switchis: setswitch,
                        WhatAmI: "light"
                    });
                    appliances.push(appliancename);
                }
                else if (devType.startsWith("Blind")|| devType.startsWith("RFY")) {
                    appliancename.actions = ([
                        "turnOn",
                        "turnOff"
                    ]);
                    appliancename.additionalApplianceDetails = ({
                        switchis: setswitch,
                        WhatAmI: "blind"
                    });
                    appliances.push(appliancename);
                }
                else if (devType.startsWith("Temp")|| devType.startsWith("Therm")) {
                    appliancename.version = "temp";
                    appliancename.actions = ([
                        "getTargetTemperature",
                        "getTemperatureReading",
                        "incrementTargetTemperature",
                        "decrementTargetTemperature",
                        "setTargetTemperature"
                    ]);
                    appliancename.additionalApplianceDetails = ({
                        WhatAmI: "temp"
                    });
                    appliances.push(appliancename);
                }
            }
        }
        log("payload: ", appliances);
        var payloads = {
            discoveredAppliances: appliances
        };
        var result = {
            header: headers,
            payload: payloads
        };
        passBack(result);
    });

};
//This handles the errors - obvs!
function handleError(event, context, name) {

    var headers = makeHeader(event,name);

    var payload = {};

    var result = {
        header: headers,
        payload: payload
    };

    context.succeed(result);
}