var Domoticz = require('./node_modules/domoticz-api/api/domoticz');

var conf = require('./conf.json')

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
                dimLevel = event.payload.percentageState.value;
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
        case "group":

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
            ctrlTemp(applianceId, temp, function (callback) {
                var result = {
                    header: headers,
                    payload: callback
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

    getRooms(function (callback, groups) {
        if (groups.length > 0) {

            for (var t = 0; t < groups.length; t++) {
                var groupID = parseInt(groups[t]);

                api.getScenesGroups(function (error, groups) {
                    var sceneArray = groups.results;

                    for (var i = 0; i < sceneArray.length; i++) {
                        y = sceneArray.length;
                        var element = sceneArray[i];
                        if (groupID == element.idx) {
                            //domoticz allows same IDX numbers for devices/scenes - yeah, i know.
                            var elid = parseInt(element.idx) + 200

                            var sceneName = {
                                applianceId: elid,
                                manufacturerName: element.name,
                                modelName: element.name,
                                version: element.idx,
                                friendlyName: element.name,
                                friendlyDescription: "Group",
                                isReachable: true,
                                actions: [
                                    "turnOn",
                                    "turnOff"
                                ],
                                additionalApplianceDetails: {
                                    WhatAmI: "scene"
                                }
                            };
                            appliances.push(sceneName);
                            t--;
                        }
                        if (t == 0) {
                            break;
                        }
                    }
                });
            }
        }
        for (var i = 0; i < callback.length; i++) {
            var devID = callback[i];
            m = callback.length;

            api.getDevice({
                idx: devID
            }, function (error, devices) {
                var devArray = devices.results;
                for (var i = 0; i < devArray.length; i++) {

                    var device = devArray[i];
                    var devType = device.type;
                    var setswitch = device.switchType;

                    if (devType.startsWith("Light")) {
                        var appliancename = {
                            applianceId: device.idx,
                            manufacturerName: device.hardwareName,
                            modelName: device.subType,
                            version: device.switchType,
                            friendlyName: device.name,
                            friendlyDescription: devType,
                            isReachable: true,
                            actions: [
                                "incrementPercentage",
                                "decrementPercentage",
                                "setPercentage",
                                "turnOn",
                                "turnOff"
                            ],
                            additionalApplianceDetails: {
                                switchis: setswitch,
                                WhatAmI: "light"
                            }

                        };
                        appliances.push(appliancename);
                    }
                    if (devType.startsWith("Blind")|| devType.startsWith("RFY")) {
                        var appliancename = {
                            applianceId: device.idx,
                            manufacturerName: device.hardwareName,
                            modelName: device.subType,
                            version: device.switchType,
                            friendlyName: device.name,
                            friendlyDescription: devType,
                            isReachable: true,
                            actions: [
                                "turnOn",
                                "turnOff"
                            ],
                            additionalApplianceDetails: {
                                switchis: setswitch,
                                WhatAmI: "light"
                            }

                        };
                        appliances.push(appliancename);
                    }
                    else if (devType == 'Temp') {
                        appliancename = {
                            applianceId: device.idx,
                            manufacturerName: device.hardwareName,
                            modelName: device.subType,
                            version: device.idx,
                            friendlyName: device.name,
                            friendlyDescription: devType,
                            isReachable: true,
                            actions: [
                                "setTargetTemperature"
                            ],
                            additionalApplianceDetails: {
                                WhatAmI: "temp"
                            }
                        };
                        appliances.push(appliancename);
                    }
                }
                m--;

                if (m==0) {
                    //log("payload: ", appliances);
                    var payloads = {
                        discoveredAppliances: appliances
                    };
                    var result = {
                        header: headers,
                        payload: payloads
                    };
                    passBack(result);
                }
            });

        }
    });
}
//handles lights

function ctrlLights(switchtype, applianceId, func, sendback) {
  //  console.log(switchtype,applianceId,func);
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

        var plansArray = plans.results;

        x = plansArray.length;
        for(var i = 0; i < plansArray.length; i++) {
            var room = plansArray[i];
            var roomID = room.idx;
            arrRoom.push(roomID);
            x--
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

            //  y = DevsArray.length;
            for (var i = 0; i < DevsArray.length; i++) {
                var device = DevsArray[i];
         //       log("device in room", device);
                var devIDX = device.devidx;

               // DeviceIDs.push(devIDX);
               if (device.type === 1){
                    GroupIDs.push(devIDX)
                }
                else if (device.type === 0){
                    DeviceIDs.push(devIDX);
                }
            }
            k--;

            if (k == 0) {
                returnme(DeviceIDs, GroupIDs);
            }
        })
    }
};

//This is the logger
var log = function(title, msg) {

    console.log('**** ' + title + ': ' + JSON.stringify(msg));

};
