var Domoticz = require('./node_modules/domoticz-api/api/domoticz');

var conf = require('./conf.json');

var api = new Domoticz({
    protocol: conf.protocol,
    host: conf.host,
    port: conf.port,
    username: conf.username,
    password: conf.password
});

var result;
var payloads;
var appliances = [];

//This is the heart of the code - takes the request/response headers for Alexa
var func =  function (event, context) {

    switch (event.header.namespace) {

        case 'Alexa.ConnectedHome.Discovery':
            handleDiscovery(event, context);
            break;
        case 'Alexa.ConnectedHome.Control':
        case 'Alexa.ConnectedHome.Query':
            handleControl(event, context);
            break;
        default:
            console.log('Err', 'No supported namespace: ' + event.header.namespace);
            context.fail('Something went wrong');
            break;
    }

};
exports.handler = func;

//This handles the Discovery
function handleDiscovery(event, context) {
    getDevs(event, context, function (passBack) {
        context.succeed(passBack);
        appliances = [];
    })
}

//This handles the Control requests - based on the discovery, which should designate whether it's a switch/temp/group
function handleControl(event, context) {
    var state;
    var idx;
    var what = event.payload.appliance.additionalApplianceDetails.WhatAmI;
    var message_id = event.header.messageId;
    var switchtype = event.payload.appliance.additionalApplianceDetails.switchis;
    var applianceId = event.payload.appliance.applianceId;
    var maxDimLevel = event.payload.appliance.additionalApplianceDetails.maxDimLevel;

    var confirmation;
    var funcName;
    var strHeader = event.header.name;
    //  log("event is: ", event)
    switch (what) {

        case "blind":
        case "light":
            switchtype = "switch";
            if (strHeader === "TurnOnRequest") {
                confirmation = "TurnOnConfirmation";
                funcName = "On";
            }
            else if (strHeader === "TurnOffRequest") {
                confirmation = "TurnOffConfirmation";
                funcName = "Off";
            }
            else if (strHeader === "SetPercentageRequest") {
                dimLevel = event.payload.percentageState.value / ( 100 / maxDimLevel);
                confirmation = "SetPercentageConfirmation";
                switchtype = 'dimmable';
                funcName = dimLevel;
            }
            else if (strHeader.includes("IncrementPercent") || strHeader.includes("DecrementPercent")) {
                var strConf = strHeader.replace('Request', 'Confirmation');

                confirmation = strConf;

                var incLvl = event.payload.deltaPercentage.value;

                switchtype = 'dimmable';

                getDevice(applianceId, what, function (returnme) {
                    var intRet = parseInt(returnme);
                    if (strConf.charAt(0) === 'I') {
                        funcName = intRet + (intRet / 100 * incLvl);
                    } else {
                        funcName = intRet - (intRet / 100 * incLvl);
                    }
                    var headers = generateResponseHeader(event,confirmation);

                    ctrlLights(switchtype, applianceId, funcName, function (callback) {
                        var result = {
                            header: headers,
                            payload: callback
                        };
                        context.succeed(result);
                    });
                });
                break;
            }

            var headers = generateResponseHeader(event,confirmation);

            ctrlLights(switchtype, applianceId, funcName, function (callback) {
                var result = {
                    header: headers,
                    payload: callback
                };
                context.succeed(result);
            });
            break;

        case "scene":

            var AppID = parseInt(event.payload.appliance.applianceId) - 200;

            if (strHeader === "TurnOnRequest") {
                confirmation = "TurnOnConfirmation";
                funcName = "On";
            }
            else if (strHeader === "TurnOffRequest") {
                confirmation = "TurnOffConfirmation";
                funcName = "Off";
            }

            var headers = generateResponseHeader(event,confirmation);
            ctrlScene(AppID, funcName, function (callback) {
                var result = {
                    header: headers,
                    payload: callback
                };
                context.succeed(result);
            });
            break;
        case "temp":
            applianceId = event.payload.appliance.applianceId;

            if (strHeader.includes("IncrementTargetTemperature") || strHeader.includes("DecrementTargetTemperature")) {
                strConf = strHeader.replace('Request', 'Confirmation');
                confirmation = strConf;
                incLvl = event.payload.deltaTemperature.value;
                getDevice(applianceId, what, function (returnme) {
                    var intRet = parseFloat(returnme);
                    intTemp = intRet;
                    if (strConf.charAt(0) === 'I') {
                        temp = intRet + incLvl;
                    } else {
                        temp = intRet - incLvl
                    }
                    log("temperature to set is: ", temp);
                    var headers = generateResponseHeader(event,confirmation);

                    var TempPayload = {
                        targetTemperature: {
                            value: temp
                        },
                        temperatureMode: {
                            value: "HEAT"
                        },
                        previousState: {
                            targetTemperature: {
                                value: intTemp
                            },
                            mode: {
                                value: "Heat"
                            }
                        }
                    };
                    ctrlTemp(applianceId, temp, function (callback) {
                        var result = {
                            header: headers,
                            payload: TempPayload
                        };
                        context.succeed(result);
                    });
                });
                break;

            } else if (strHeader.includes("SetTargetTemperature")) {
                confirmation = "SetTargetTemperatureConfirmation";
                var temp = event.payload.targetTemperature.value;
                //    log("temp to set is ", temp)
                var intTemp = 0;

                var headers = generateResponseHeader(event,confirmation);

                TempPayload = {
                    targetTemperature: {
                        value: temp
                    },
                    temperatureMode: {
                        value: "HEAT"
                    },
                    previousState: {
                        targetTemperature: {
                            value: intTemp
                        },
                        mode: {
                            value: "Heat"
                        }
                    }
                };
                ctrlTemp(applianceId, temp, function (callback) {
                    var result = {
                        header: headers,
                        payload: TempPayload
                    };
                    context.succeed(result);
                });
                break;

            }
            //GetTemp request
            else if ((strHeader === "GetTemperatureReadingRequest")||(strHeader === "GetTargetTemperatureRequest")) {
                strConf = strHeader.replace('Request', 'Response')
                confirmation = strConf;
                getDevice(applianceId, what, function (callback) {
                    log("temperature is ", callback.value1)
                    var GetPayload = {
                        targetTemperature: {
                            value: parseFloat(callback.value1)
                        },
//                        applianceResponseTimestamp: Date.now(),
                        temperatureMode: {
                            value: "CUSTOM",
                            friendlyName: callback.value2
                        }
                    };
                    var headers = generateResponseHeader(event,confirmation);
                    var result = {
                        header: headers,
                        payload: GetPayload
                    };
                    //   log("result is ", result)
                    context.succeed(result);

                });
                break;
            }
        default:
            log("error ","error - not hit a device type");

    }
}

/*This handles device discovery - based on feedback, this now does it based on Room Plans.
 If you want a device discovered, it needs to be in a room plan
 */

function getDevs(event, context, passBack) {

    var response_name = "DiscoverAppliancesResponse";
    var headers = generateResponseHeader(event,response_name);

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
                    appliancename.applianceId.actions = ([
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
                        "turnOff"
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
        //log("payload: ", appliances);
        var payloads = {
            discoveredAppliances: appliances
        };
        var result = {
            header: headers,
            payload: payloads
        };
        passBack(result);
    });

}
//handles lights

function ctrlLights(switchtype, applianceId, func, sendback) {

    api.changeSwitchState({
        type: switchtype,
        idx: applianceId,
        state: func
    }, function (params, callback) {
        var payloads = {};
        sendback(payloads)
    });
}

//handles Groups
function ctrlScene(idx, func, sendback) {
    api.changeSceneState({
        idx: idx,
        state: func
    }, function (params, callback) {
        var payloads = {};
        sendback(payloads)
    });

}

//handles temperature sensors
function ctrlTemp(idx, temp, sendback) {

    api.uTemp({
        idx: idx,
        value: temp
    }, function(params, callback) {
        var payloads = {};
        sendback(payloads)
    });
}

//This handles the errors - obvs!
function handleError(event, context, name) {

    var headers = generateResponseHeader(event,name);

    var payload = {};

    var result = {
        header: headers,
        payload: payload
    };

    context.succeed(result);
}

function getDevice(idx, devType, sendback){
    var intRet;
    api.getDevice({
        idx: idx
    }, function(params, callback) {
        var devArray = callback.results;
        if (devArray) {
            //turn this on to check the list of values the device returns
            log("device list", devArray)
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
                } else if (devType === 'light'){
                    intRet = device.level
                }
                callBackString.value1 = intRet;
                callBackString.value2 = devName;
                sendback(callBackString)
            }}
    });
}

function generateResponseHeader(request,response_name){
    header = {
        'namespace': request.header.namespace,
        'name': response_name,
        'payloadVersion': '2',
        'messageId': request.header.messageId
    };
    return header;
}
//This is the logger
var log = function(title, msg) {

    console.log('**** ' + title + ': ' + JSON.stringify(msg));

};