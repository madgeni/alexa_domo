
var Domoticz = require('../node_modules/domoticz-api/api/domoticz');

var conf = require('../conf.json');
var api = new Domoticz({
    protocol: conf.protocol,
    host: conf.host,
    port: conf.port,
    username: conf.username,
    password: conf.password
});

var hsl = require('../node_modules/hsl-to-hex');

//Domoticz controls
var ctrlDev = require('./ctrl_dev');
var ctrltemp = require('./ctrl_temp');
var getDev = require('./get_dev');
var ctrlScene = require('./ctrl_scene');
var ctrlColour = require('./ctrl_colour');
var ctrlKelvin = require('./ctrl_kelvin');
var listDevs = require('./get_Devices');

var makeHeader = require('./HeaderGen');
var log = require('./logger');

//This handles the Control requests - based on the discovery, which should designate whether it's a switch/temp/group
module.exports = function (event, context) {
        var state;
        var idx;
        var what = event.payload.appliance.additionalApplianceDetails.WhatAmI;
        var message_id = event.header.messageId;
        var switchtype = event.payload.appliance.additionalApplianceDetails.switchis;
        var applianceId = event.payload.appliance.applianceId;
        var maxDimLevel = event.payload.appliance.additionalApplianceDetails.maxDimLevel;

        var funcName;
        var strHeader = event.header.name;

        var strConf = strHeader.replace('Request', 'Confirmation');
        //   log("header is ", strHeader)
        //   log("event is: ", event)
        switch (what) {
            case "blind":
            case "light":
                switchtype = "switch";
                if (strHeader === "TurnOnRequest") {
                    funcName = "On";
                }
                else if (strHeader === "TurnOffRequest") {
                    funcName = "Off";
                }
                else if (strHeader === "SetColorTemperatureRequest"){
                    var kelvin =  event.payload.colorTemperature.value;
                    headers = makeHeader(event,strConf);
                    ctrlKelvin(applianceId,kelvin,function(callback){

                        var result = {
                            header: headers,
                            payload: callback
                        };
                        context.succeed(result);
                    });
                    break;
                }
                else if (strHeader === "SetColorRequest"){
                    var intHue = event.payload.color.hue;
                    var intBright = event.payload.color.brightness;
                    var intSat = event.payload.color.saturation;
               //     log("Hue", intHue)
                    var hex = hsl(intHue, intSat, intBright);
                    hex = hex.replace(/^#/, "");
                    //log("hex is - ", hex)
                    headers = makeHeader(event,strConf);

                    ctrlColour(applianceId,hex,intBright, function(callback){
                        var payLoad = {
                            achievedState: {
                                color: {
                                    hue: callback
                                },
                                saturation: intSat,
                                brightness: intBright,
                            }
                        };
                        var result = {
                            header: headers,
                            payload: payLoad
                        };
                        context.succeed(result);
                    });
                    break;
                }
                else if (strHeader === "SetPercentageRequest") {
                    dimLevel = event.payload.percentageState.value / ( 100 / maxDimLevel);
                    switchtype = 'dimmable';
                    funcName = dimLevel;
                }
                else if (strHeader.includes("IncrementPercent") || strHeader.includes("DecrementPercent")) {

                    var incLvl = event.payload.deltaPercentage.value;

                    switchtype = 'dimmable';

                    getDev(applianceId, what, function (returnme) {
                        var intRet = parseInt(returnme);
                        if (strConf.charAt(0) === 'I') {
                            funcName = intRet + (intRet / 100 * incLvl);
                        } else {
                            funcName = intRet - (intRet / 100 * incLvl);
                        }
                        headers = makeHeader(event,strConf);

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

                headers = makeHeader(event,strConf);

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
                    getDev(applianceId, what, function (callback) {
                        var GetPayload = {
                            lockState:"LOCKED"
                        }
                        var headers = makeHeader(event,strConf);
                        var result = {
                            header: headers,
                            payload: GetPayload
                        };
                        context.succeed(result);
                    });
                    break;
                }
                if (strHeader === "SetLockStateRequest"){
                    if (lockstate === "LOCKED"){
                        funcName = "On"
                    } else {
                        funcName = "Off"
                    }
                    headers = makeHeader(event,strConf);

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
                    funcName = "On";
                }
                else if (strHeader === "TurnOffRequest") {
                    funcName = "Off";
                }

                headers = makeHeader(event,strConf);
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
                    incLvl = event.payload.deltaTemperature.value;
                    getDev(applianceId, what, function (returnme) {
                        var intRet = parseFloat(returnme);
                        if (strConf.charAt(0) === 'I') {
                            temp = intRet + incLvl;
                        } else {
                            temp = intRet - incLvl
                        }
                        log("temperature to set is: ", temp);
                        var headers = makeHeader(event,strConf);

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
                    var temp = event.payload.targetTemperature.value;
                    //    log("temp to set is ", temp)
                    var headers = makeHeader(event,strConf);

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
                        var headers = makeHeader(event,strConf);
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
    };