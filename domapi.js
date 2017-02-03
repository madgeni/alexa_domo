
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
var DeviceIDs = [];
var GroupIDs = [];
var arrRoom = [];

//This is the heart of the code - takes the request/response headers for Alexa
var func = function (event, context) {

    switch (event.header.namespace) {

        case 'Alexa.ConnectedHome.Discovery':
            handleDiscovery(event, context);
            break;


        case 'Alexa.ConnectedHome.Control':
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
    getDevs(function (passBack) {
        //log("test", passBack);
        context.succeed(passBack);
        appliances = [];
    })
}
//This handles the Control requests - based on the discovery, which should designate whether it's a switch/temp/group
function handleControl(event, context) {
    var state;
    var idx;
    var accessToken = event.payload.accessToken;
    var what = event.payload.appliance.additionalApplianceDetails.WhatAmI;
    var message_id = event.header.messageId;
    var switchtype = event.payload.appliance.additionalApplianceDetails.switchis;
    var applianceId = event.payload.appliance.applianceId;
    var maxDimLevel = event.payload.appliance.additionalApplianceDetails.maxDimLevel;

    var confirmation;
    var funcName;

    switch (what) {
        case "light":
            var switchtype = "switch";

            if (event.header.name == "TurnOnRequest") {
                confirmation = "TurnOnConfirmation";
                funcName = "On";
            }
            else if (event.header.name == "TurnOffRequest") {
                confirmation = "TurnOffConfirmation";
                funcName = "Off";
            }
            else if (event.header.name == "SetPercentageRequest") {
                // dimLevel = event.payload.percentageState.value;
                dimLevel = event.payload.percentageState.value / ( 100 / maxDimLevel);
                confirmation = "SetPercentageConfirmation";
                switchtype = 'dimmable';
                funcName = dimLevel;
            }
            var headers = {
                namespace: 'Alexa.ConnectedHome.Control',
                name: confirmation,
                payloadVersion: '2',
                messageId: message_id
            };
            ctrlLights(switchtype,applianceId, funcName, function (callback) {
                var result = {
                    header: headers,
                    payload: callback
                };
                context.succeed(result);
            }); break;
        case "blind":
            var switchtype = "switch";

            if (event.header.name == "TurnOnRequest") {
                confirmation = "TurnOnConfirmation";
                funcName = "Off";
            }
            else if (event.header.name == "TurnOffRequest") {
                confirmation = "TurnOffConfirmation";
                funcName = "On";
            }
            var headers = {
                namespace: 'Alexa.ConnectedHome.Control',
                name: confirmation,
                payloadVersion: '2',
                messageId: message_id
            };
            ctrlLights(switchtype,applianceId, funcName, function (callback) {
                var result = {
                    header: headers,
                    payload: callback
                };
                context.succeed(result);
            }); break;
        case "scene":

            var AppID = parseInt(event.payload.appliance.applianceId) - 200;

            if (event.header.name == "TurnOnRequest") {
                confirmation = "TurnOnConfirmation";
                funcName = "On";
            }
            else if (event.header.name == "TurnOffRequest") {
                confirmation = "TurnOffConfirmation";
                funcName = "Off";
            }
            headers = {
                namespace: 'Alexa.ConnectedHome.Control',
                name: confirmation,
                payloadVersion: '2',
                messageId: message_id
            };
            ctrlScene(AppID, funcName, function (callback) {
                var result = {
                    header: headers,
                    payload: callback
                };
                context.succeed(result);
            }); break;
        case "temp":

            var temp = event.payload.targetTemperature.value;

            applianceId = event.payload.appliance.applianceId;

            if (event.header.name == "SetTargetTemperatureRequest") {
                confirmation = "SetTargetTemperatureConfirmation";
                //	flVal = parseFloat(temp);
            }
            headers = {
                namespace: 'Alexa.ConnectedHome.Control',
                name: confirmation,
                payloadVersion: '2',
                messageId: message_id
            };
            var TempPayload = {
                targetTemperature: {
                    value: temp
                },
                temperatureMode: {
                    value: "HEAT"
                },
                previousState: {
                    targetTemperature: {
                        value: 0
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

        default:
            log("error ","error - not hit a device type");

    }
}

//This handles the errors - obvs!
function generateControlError(name, code, description) {
    var headers = {
        namespace: 'Alexa.ConnectedHome.Control',
        name: name,
        payloadVersion: '2'
    };

    var payload;
    payload = {
        exception: {
            code: code,
            description: description
        }
    };

    var result = {
        header: headers,
        payload: payload
    };

    return result;
}

/*This handles device discovery - based on feedback, this now does it based on Room Plans.
 // If you want a device discovered, it needs to be in a room plan
 */

function getDevs(passBack) {

    var headers = {
        namespace: 'Alexa.ConnectedHome.Discovery',
        name: 'DiscoverAppliancesResponse',
        payloadVersion: '2'
    };

    api.getDevices({}, function (error, devices) {
        var devArray = devices.results;
        if (devArray) {
            for (var i = 0; i < devArray.length; i++) {
                var device = devArray[i];

                // Omit devices which aren't in a room plan
                if (device.planID == '0')
                    continue;

                var devType = device.type;
                var setswitch = device.switchType;

                var appliancename = {
                    applianceId: device.idx,
                    manufacturerName: device.hardwareName,
                    modelName: device.subType,
                    version: device.switchType,
                    friendlyName: device.name,
                    friendlyDescription: devType,
                    isReachable: true
                }
                if (devType.startsWith("Scene") || devType.startsWith("Group")) {
                    appliancename.manufacturerName = device.name,
                        appliancename.modelName = device.name,
                        appliancename.version = device.idx,

                        appliancename.applianceId = parseInt(device.idx) + 200;
                    appliancename.applianceId.actions = ([
                        "turnOn",
                        "turnOff"
                    ])
                    appliancename.additionalApplianceDetails = ({
                        WhatAmI: "scene"
                    })
                    appliances.push(appliancename);
                }
                else if (devType.startsWith("Light")) {
                    appliancename.actions = ([
                        "incrementPercentage",
                        "decrementPercentage",
                        "setPercentage",
                        "turnOn",
                        "turnOff"
                    ])
                    appliancename.additionalApplianceDetails = ({
                        maxDimLevel: device.maxDimLevel,
                        switchis: setswitch,
                        WhatAmI: "light"
                    })
                    appliances.push(appliancename);
                }
                else if (devType.startsWith("Blind")|| devType.startsWith("RFY")) {
                    appliancename.actions = ([
                        "turnOn",
                        "turnOff"
                    ])
                    appliancename.additionalApplianceDetails = ({
                        switchis: setswitch,
                        WhatAmI: "blind"
                    })
                    appliances.push(appliancename);
                }
                else if (devType.startsWith("Temp")|| devType.startsWith("Therm")) {
                    appliancename.version = "temp";
                    appliancename.actions = ([
                        "setTargetTemperature"
                    ])
                    appliancename.additionalApplianceDetails = ({
                        WhatAmI: "temp"
                    })
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
        //     console.log(params, callback);
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
        console.log(params, callback);
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
        console.log(callback);
        var payloads = {};
        sendback(payloads)
    });
}

//This discovers your Room Plans
function getRooms(callback) {

    api.getPlans(function (error, plans) {
        if(error) {
            console.log('Error:', error);
            return;
        }

        var plansArray = plans.results;

        if (plansArray == null){
            console.log("no room plans");
            return
        }
        x = plansArray.length;

        for(var i = 0; i < plansArray.length; i++) {
            var room = plansArray[i];
            var roomID = room.idx;
            arrRoom.push(roomID);
            x--;
            if (x == 0) {
                getRoomDevices(arrRoom, callback);
            }
        }
    })
}
//This gets the list of devices in the rooms
function getRoomDevices(arrRoom, returnme){

    for (var i = 0; i < arrRoom.length; i++) {
        var devID = arrRoom[i];
        k = arrRoom.length;

        api.getPlanDevs({
            idx: devID
        }, function (params, callback) {

            var DevsArray = callback.results;
            if (DevsArray == null){
                console.log("no devices in room plans");
            } else {
                for (var i = 0; i < DevsArray.length; i++) {
                    var device = DevsArray[i];
                    //        log("device in room", device);
                    var devIDX = device.devidx;

                    // DeviceIDs.push(devIDX);
                    if (device.type === 1){
                        GroupIDs.push(devIDX)
                    }
                    else if (device.type === 0){
                        DeviceIDs.push(devIDX);
                    }
                }
            }
            k--;

            if (k == 0) {
                returnme(DeviceIDs, GroupIDs);
            }
        })
    }
}

//This is the logger
var log = function(title, msg) {

    console.log('**** ' + title + ': ' + JSON.stringify(msg));

};

getDevs(console.log);