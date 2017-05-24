/* eslint-disable max-len */
'use strict'

let hsl = require('../node_modules/hsl-to-hex')

// Domoticz controls
let ctrlDev = require('./ctrl_dev')
let ctrltemp = require('./ctrl_temp')
let getDev = require('./get_dev')
let ctrlScene = require('./ctrl_scene')
let ctrlColour = require('./ctrl_colour')
let ctrlKelvin = require('./ctrl_kelvin')

const makeHeader = require('./HeaderGen')
let log = require('./logger')
var payload

// This handles the Control requests
module.exports = function (event, context) {
  let what = event.payload.appliance.additionalApplianceDetails.WhatAmI
  let switchtype = event.payload.appliance.additionalApplianceDetails.switchis
  let applianceId = event.payload.appliance.applianceId
  let maxDimLevel
  maxDimLevel = event.payload.appliance.additionalApplianceDetails.maxDimLevel

  let funcName
  let strHeader = event.header.name

  let strConf = strHeader.replace('Request', 'Confirmation')
  var headers = makeHeader(event, strConf)
        //   log("header is ", strHeader)
        //   log("event is: ", event)

  switch (what) {
    case 'blind':
    case 'light':
      switchtype = 'switch'
      if (strHeader === 'TurnOnRequest') {
        funcName = 'On'
      } else if (strHeader === 'TurnOffRequest') {
        funcName = 'Off'
      } else if (strHeader === 'SetColorTemperatureRequest') {
        let kelvin = event.payload.colorTemperature.value
      //  let headers = makeHeader(event, strConf)
        ctrlKelvin(applianceId, kelvin, function (callback) {
          if (callback === 'Err') {
            headers.name = 'TargetOfflineError'
            payload = {}
          }
          payload = callback
          let result = {
            header: headers,
            payload: payload
          }
          context.succeed(result)
        })
        break
      } else if (strHeader === 'SetColorRequest') {
        let intHue = event.payload.color.hue
        let intBright = event.payload.color.brightness
        let intSat = event.payload.color.saturation
        let hex = hsl(intHue, intSat, intBright)
        hex = hex.replace(/^#/, '')

        ctrlColour(applianceId, hex, intBright, function (callback) {
          let payLoad = {
            achievedState: {
              color: {
                hue: callback
              },
              saturation: intSat,
              brightness: intBright
            }
          }
          if (callback === 'Err') {
            headers.name = 'TargetOfflineError'
            payload = {}
          }
          payload = callback
          let result = {
            header: headers,
            payload: payload
          }
          context.succeed(result)
        })
        break
      } else if (strHeader === 'SetPercentageRequest') {
        let dimLevel = event.payload.percentageState.value / (100 / maxDimLevel)
        switchtype = 'dimmable'
        funcName = dimLevel
      } else if (strHeader.includes('Increment') || strHeader.includes('Decrement')) {
        let incLvl = event.payload.deltaPercentage.value

        switchtype = 'dimmable'

        getDev(applianceId, what, function (returnme) {
          let intRet = parseInt(returnme)
          if (strConf.charAt(0) === 'I') {
            funcName = intRet + (intRet / 100 * incLvl)
          } else {
            funcName = intRet - (intRet / 100 * incLvl)
          }
          ctrlDev(switchtype, applianceId, funcName, function (callback){
            if (callback === 'Err') {
              headers.name = 'TargetOfflineError'
              payload = {}
            }
            payload = callback
            let result = {
              header: headers,
              payload: payload
            }
            context.succeed(result)
          })
        })
        break
      }

      ctrlDev(switchtype, applianceId, funcName, function (callback) {
        let payload
        payload = callback
        if (callback === 'Err') {
          headers.name = 'TargetOfflineError'
          payload = {}
        }
        let result = {
          header: headers,
          payload: payload
        }
        context.succeed(result)
      })
      break
    case 'lock':
      let lockstate = event.payload.lockState
      if (strHeader === 'GetLockStateRequest') {
        getDev(applianceId, what, function (callback) {
          let GetPayload = {
            lockState: 'LOCKED'
          }
          headers = makeHeader(event, strConf)
          if (callback === 'Err') {
            headers.name = 'TargetOfflineError'
            payload = {}
          }
          payload = callback
          let result = {
            header: headers,
            payload: payload
          }
          context.succeed(result)
        })
        break
      }
      if (strHeader === 'SetLockStateRequest') {
        if (lockstate === 'LOCKED') {
          funcName = 'On'
        } else {
          funcName = 'Off'
        }
        headers = makeHeader(event, strConf)

        ctrlDev(switchtype, applianceId, funcName, function (callback) {
          let payload = {
            lockState: lockstate
          }

          if (callback === 'Err') {
            headers.name = 'TargetOfflineError'
            payload = {}
          }
          let result = {
            header: headers,
            payload: payload
          }
          context.succeed(result)
        })
        break
      }
      break
    case 'scene':

      let AppID = parseInt(event.payload.appliance.additionalApplianceDetails.SceneIDX) - 200

      if (strHeader === 'TurnOnRequest') {
        funcName = 'On'
      } else if (strHeader === 'TurnOffRequest') {
        funcName = 'Off'
      }

     // var headers = makeHeader(event, strConf)
      ctrlScene(AppID, funcName, function (callback) {
        payload = callback
        if (callback === 'Err') {
          headers.name = 'TargetOfflineError'
          payload = {}
        }

        let result = {
          header: headers,
          payload: payload
        }
        context.succeed(result)
      })
      break
    case 'temp':
      applianceId = event.payload.appliance.applianceId

      if (strHeader.includes('IncrementTargetTemperature') || strHeader.includes('DecrementTargetTemperature')) {
        let incLvl = event.payload.deltaTemperature.value
        let temp
        getDev(applianceId, what, function (returnme) {
          let intRet = parseFloat(returnme)
          if (strConf.charAt(0) === 'I') {
            temp = intRet + incLvl
          } else {
            temp = intRet - incLvl
          }
          log('temperature to set is: ', temp)
//          let headers = makeHeader(event, strConf)

          let TempPayload = {
            targetTemperature: {
              value: temp
            },
            temperatureMode: {
              value: 'HEAT'
            },
            previousState: {
              targetTemperature: {
                value: intRet
              },
              mode: {
                value: 'Heat'
              }
            }
          }
          ctrltemp(applianceId, temp, function (callback) {
            if (callback === 'Err') {
              headers.name = 'TargetOfflineError'
              TempPayload = {}
            }
            let result = {
              header: headers,
              payload: TempPayload
            }
            context.succeed(result)
          })
        })
        break
      } else if (strHeader.includes('SetTargetTemperature')) {
        let temp = event.payload.targetTemperature.value
                    //    log("temp to set is ", temp)
//        let headers = makeHeader(event, strConf)

        let TempPayload
        TempPayload = {
          targetTemperature: {
            value: temp
          },
          temperatureMode: {
            value: 'HEAT'
          },
          previousState: {
            targetTemperature: {
              value: 0
            },
            mode: {
              value: 'Heat'
            }
          }
        }
        ctrltemp(applianceId, temp, function (callback) {
          if (callback === 'Err') {
            headers.name = 'TargetOfflineError'
            TempPayload = {}
          }
          let result = {
            header: headers,
            payload: TempPayload
          }
          context.succeed(result)
        })
        break
      }
                // GetTemp request
      else if ((strHeader === 'GetTemperatureReadingRequest') || (strHeader === 'GetTargetTemperatureRequest')) {
        strConf = strHeader.replace('Request', 'Response')
                    // log("header is ", strHeader)
        getDev(applianceId, what, function (callback) {
          if (strHeader.includes('Target')) {
            var GetPayload

            GetPayload = {
              targetTemperature: {
                value: parseFloat(callback.value1)
              },
              temperatureMode: {
                value: 'CUSTOM',
                friendlyName: callback.value2
              }
            }
          } else if (strHeader.includes('Reading')) {
            GetPayload = {
              temperatureReading: {
                value: parseFloat(callback.value1)
              }
            }
          }
          if (callback === 'Err') {
            headers.name = 'TargetOfflineError'
            GetPayload = {}
          }
          let result
          result = {
            header: headers,
            payload: GetPayload
          }
                        //      log("result is ", result)
          context.succeed(result)
        })
      }
      break
    default:
      log('error ', 'error - not hit a device type')
  }
}
