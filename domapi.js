
var hsl = require('./node_modules/hsl-to-hex');
var conf = require('./conf.json');

var ctrlDev = require('./ctrl_dev');
var ctrltemp = require('./ctrl_temp');
var getDev = require('./get_dev');
var ctrlScene = require('./ctrl_scene');
var ctrlColour = require('./ctrl_colour');
var listDevs = require('./get_Devices');
var log = require('./logger');
var makeHeader = require('./HeaderGen');

var result;
var payloads;


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
    listDevs(event, context, function (passBack) {
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
 //   log("header is ", strHeader)
 //   log("event is: ", event)
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
            else if (strHeader === "SetColorRequest"){
                confirmation =  "SetColorConfirmation";
                var intHue = event.payload.color.hue;
                var intBright = event.payload.color.brightness;
                var intSat = event.payload.color.saturation;
               // log("Hue", intHue)
                var hex = hsl(intHue, intSat, intBright);
                hex = hex.replace(/^#/, "");

               //log("hex is - ", hex)
                headers = makeHeader(event,confirmation);

                ctrlColour(applianceId,hex,intBright, function(callback){
                    var ColPayload = {
                        achievedState: {
                            color: {
                                hue: intHue
                            },
                            saturation: intSat,
                            brightness: intBright,
                        }
                    };

                    var result = {
                        header: headers,
                        payload: ColPayload
                    };
                    context.succeed(result);
                });
                break;
            }
            else if (strHeader === "SetPercentageRequest") {
                dimLevel = event.payload.percentageState.value / ( 100 / maxDimLevel);
                confirmation = "SetPercentageConfirmation";
                switchtype = 'dimmable';
                funcName = dimLevel;
            }
            else if (strHeader.includes("IncrementPercent") || strHeader.includes("DecrementPercent")) {

                confirmation = strHeader.replace('Request', 'Confirmation');

                var incLvl = event.payload.deltaPercentage.value;

                switchtype = 'dimmable';

                getDev(applianceId, what, function (returnme) {
                    var intRet = parseInt(returnme);
                    if (strConf.charAt(0) === 'I') {
                        funcName = intRet + (intRet / 100 * incLvl);
                    } else {
                        funcName = intRet - (intRet / 100 * incLvl);
                    }
                    headers = makeHeader(event,confirmation);

                    ctrlDev(switchtype, applianceId, funcName, function (callback) {
                        var result = {
                            header: headers,
                            payload: callback
                        };
                        context.succeed(result);
                    });
                });
                break;
            }

            headers = makeHeader(event,confirmation);

            ctrlDev(switchtype, applianceId, funcName, function (callback) {
                var result = {
                    header: headers,
                    payload: callback
                };
                context.succeed(result);
            });
            break;
        case "lock":
            var lockstate = event.payload.lockState;
            if (strHeader === "GetLockStateRequest"){
                confirmation = strConf;
                getDev(applianceId, what, function (callback) {
                    var GetPayload = {
                        lockState:"LOCKED"
                    }
                    var headers = makeHeader(event,confirmation);
                    var result = {
                        header: headers,
                        payload: GetPayload
                    };
                    //      log("result is ", result)
                    context.succeed(result);
                });
                break;
            }
            if (strHeader === "SetLockStateRequest"){
                confirmation = "SetLockStateConfirmation";
                if (lockstate === "LOCKED"){
                    funcName = "On"
                } else {
                    funcName = "Off"
                }
                headers = makeHeader(event,confirmation);

                ctrlDev(switchtype, applianceId, funcName, function() {

                    var Payload = {
                        lockState: lockstate
                    };
                    var result = {
                        header: headers,
                        payload: Payload
                    };
                    context.succeed(result);
                });
                break;
            }
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

            headers = makeHeader(event,confirmation);
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
                getDev(applianceId, what, function (returnme) {
                    var intRet = parseFloat(returnme);
                    if (strConf.charAt(0) === 'I') {
                        temp = intRet + incLvl;
                    } else {
                        temp = intRet - incLvl
                    }
                    log("temperature to set is: ", temp);
                    var headers = makeHeader(event,confirmation);

                    var TempPayload = {
                        targetTemperature: {
                            value: temp
                        },
                        temperatureMode: {
                            value: "HEAT"
                        },
                        previousState: {
                            targetTemperature: {
                                value: intRet
                            },
                            mode: {
                                value: "Heat"
                            }
                        }
                    };
                    ctrltemp(applianceId, temp, function (callback) {
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
                var headers = makeHeader(event,confirmation);

                TempPayload = {
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
                ctrltemp(applianceId, temp, function () {
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
                strConf = strHeader.replace('Request', 'Response');
                // log("header is ", strHeader)
                confirmation = strConf;
                getDev(applianceId, what, function (callback) {
                    if (strHeader.includes("Target")) {
                        var GetPayload = {
                            targetTemperature: {
                                value: parseFloat(callback.value1)
                            },
                            temperatureMode: {
                                value: "CUSTOM",
                                friendlyName: callback.value2
                            }
                        };
                    } else if (strHeader.includes("Reading")){
                         GetPayload = {
                            temperatureReading: {
                                value: parseFloat(callback.value1)
                            }
                        }
                    }
                    var headers = makeHeader(event,confirmation);
                    var result = {
                        header: headers,
                        payload: GetPayload
                    };
                    //      log("result is ", result)
                    context.succeed(result);
                });
            }
            break;
        default:
            log("error ","error - not hit a device type");

    }
}