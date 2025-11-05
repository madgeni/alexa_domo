/* eslint-disable max-len */
'use strict'

let hsl = require('../node_modules/hsl-to-hex')
let ctrlTemp = require('./ctrl_temp')
let ctrlDev = require('./ctrl_dev')
let getDev = require('./get_dev')
let ctrlScene = require('./ctrl_scene')
let ctrlColour = require('./ctrl_colour')
let ctrlKelvin = require('./ctrl_kelvin')
const makeHeader = require('./HeaderGen')
let log = require('./logger')

module.exports = function (event, context) {
  const directive = event.directive
  const header = directive.header
  const endpoint = directive.endpoint
  const payload = directive.payload
  
  if (!endpoint) {
    console.log('Error: No endpoint in directive')
    context.fail('No endpoint specified')
    return
  }
  
  // Extract bearer token from endpoint scope
  const bearerToken = endpoint.scope?.token
  
  const endpointId = endpoint.endpointId
  const cookie = endpoint.cookie || {}
  const what = cookie.WhatAmI
  const switchtype = cookie.switchis
  const maxDimLevel = cookie.maxDimLevel
  
  // Strip prefix for actual device ID
  const deviceId = endpointId.replace(/^(selector_|scene_)/, '')

  const namespace = header.namespace
  const name = header.name

  const responseHeader = makeHeader(directive, 'Response', 'Alexa')
  
  const buildResponse = (properties = []) => {
    return {
      event: {
        header: responseHeader,
        endpoint: {
          endpointId: endpointId
        },
        payload: {}
      },
      context: {
        properties: properties
      }
    }
  }

  const buildErrorResponse = (type, message) => {
    const errorHeader = makeHeader(directive, type, 'Alexa')
    return {
      event: {
        header: errorHeader,
        endpoint: {
          endpointId: endpointId
        },
        payload: {
          message: message
        }
      }
    }
  }

  switch (namespace) {
    case 'Alexa.PowerController':
      let funcName = name === 'TurnOn' ? 'On' : 'Off'
      // Check if this is a blind - use Stop command
      if (what === 'blind') {
        ctrlDev('switch', deviceId, 'Stop', bearerToken, function (callback) {
          if (callback === 'Err') {
            context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
            return
          }
          // Return current position after stop
          getDev(deviceId, 'light', bearerToken, function (data) {
            const properties = []
            if (data !== 'Err') {
              const level = parseInt(data)
              properties.push({
                namespace: 'Alexa.RangeController',
                instance: 'Blind.Lift',
                name: 'rangeValue',
                value: level,
                timeOfSample: new Date().toISOString(),
                uncertaintyInMilliseconds: 500
              })
            }
            context.succeed(buildResponse(properties))
          })
        })
      } else if (what === 'scene') {
        let sceneIdx = cookie.SceneIDX
        ctrlScene(sceneIdx, funcName, bearerToken, function (callback) {
          if (callback === 'Err') {
            context.succeed(buildErrorResponse('ErrorResponse', 'Scene control failed'))
            return
          }
          const properties = [{
            namespace: 'Alexa.PowerController',
            name: 'powerState',
            value: name === 'TurnOn' ? 'ON' : 'OFF',
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 500
          }]
          context.succeed(buildResponse(properties))
        })
      } else {
        ctrlDev('switch', deviceId, funcName, bearerToken, function (callback) {
          if (callback === 'Err') {
            context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
            return
          }
          const properties = [{
            namespace: 'Alexa.PowerController',
            name: 'powerState',
            value: name === 'TurnOn' ? 'ON' : 'OFF',
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 500
          }]
          context.succeed(buildResponse(properties))
        })
      }
      break

    case 'Alexa.BrightnessController':
      if (name === 'SetBrightness') {
        let brightness = payload.brightness
        let dimLevel = brightness / (100 / maxDimLevel)
        ctrlDev('dimmable', deviceId, dimLevel, bearerToken, function (callback) {
          if (callback === 'Err') {
            context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
            return
          }
          const properties = [{
            namespace: 'Alexa.BrightnessController',
            name: 'brightness',
            value: brightness,
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 500
          }]
          context.succeed(buildResponse(properties))
        })
      } else if (name === 'AdjustBrightness') {
        let delta = payload.brightnessDelta
        getDev(deviceId, what, bearerToken, function (returnme) {
          let current = parseInt(returnme)
          let newBrightness = Math.max(0, Math.min(100, current + delta))
          let dimLevel = newBrightness / (100 / maxDimLevel)
          ctrlDev('dimmable', deviceId, dimLevel, bearerToken, function (callback) {
            if (callback === 'Err') {
              context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
              return
            }
            const properties = [{
              namespace: 'Alexa.BrightnessController',
              name: 'brightness',
              value: newBrightness,
              timeOfSample: new Date().toISOString(),
              uncertaintyInMilliseconds: 500
            }]
            context.succeed(buildResponse(properties))
          })
        })
      }
      break

    case 'Alexa.PercentageController':
      if (name === 'SetPercentage') {
        let percentage = payload.percentage
        let dimLevel = percentage / (100 / maxDimLevel)
        ctrlDev('dimmable', deviceId, dimLevel, bearerToken, function (callback) {
          if (callback === 'Err') {
            context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
            return
          }
          const properties = [{
            namespace: 'Alexa.PercentageController',
            name: 'percentage',
            value: percentage,
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 500
          }]
          context.succeed(buildResponse(properties))
        })
      } else if (name === 'AdjustPercentage') {
        let delta = payload.percentageDelta
        getDev(deviceId, what, bearerToken, function (returnme) {
          let current = parseInt(returnme)
          let newPercentage = Math.max(0, Math.min(100, current + delta))
          let dimLevel = newPercentage / (100 / maxDimLevel)
          ctrlDev('dimmable', deviceId, dimLevel, bearerToken, function (callback) {
            if (callback === 'Err') {
              context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
              return
            }
            const properties = [{
              namespace: 'Alexa.PercentageController',
              name: 'percentage',
              value: newPercentage,
              timeOfSample: new Date().toISOString(),
              uncertaintyInMilliseconds: 500
            }]
            context.succeed(buildResponse(properties))
          })
        })
      }
      break

    case 'Alexa.ColorController':
      let hue = payload.color.hue
      let saturation = payload.color.saturation
      let brightness = payload.color.brightness
      console.log(`Color request - HSL: hue=${hue}, saturation=${saturation}, brightness=${brightness}`)
      // hsl-to-hex expects saturation and lightness as percentages (0-100)
      // Use 50% lightness to get pure colors (100% would be white, 0% would be black)
      let hex = hsl(hue, saturation * 100, 50).replace(/^#/, '')
      console.log(`Converted to hex: ${hex}`)
      
      ctrlColour(endpointId, hex, bearerToken, function (callback) {
        if (callback === 'Err') {
          context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
          return
        }
        const properties = [{
          namespace: 'Alexa.ColorController',
          name: 'color',
          value: { hue, saturation, brightness },
          timeOfSample: new Date().toISOString(),
          uncertaintyInMilliseconds: 500
        }]
        context.succeed(buildResponse(properties))
      })
      break

    case 'Alexa.ColorTemperatureController':
      if (name === 'SetColorTemperature') {
        let kelvin = payload.colorTemperatureInKelvin
        ctrlKelvin(endpointId, kelvin, bearerToken, function (callback) {
          if (callback === 'Err') {
            context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
            return
          }
          const properties = [{
            namespace: 'Alexa.ColorTemperatureController',
            name: 'colorTemperatureInKelvin',
            value: kelvin,
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 500
          }]
          context.succeed(buildResponse(properties))
        })
      }
      break

    case 'Alexa.SceneController':
      let sceneIdx = cookie.SceneIDX
      ctrlScene(sceneIdx, 'On', bearerToken, function (callback) {
        if (callback === 'Err') {
          context.succeed(buildErrorResponse('ErrorResponse', 'Scene activation failed'))
          return
        }
        const activationHeader = makeHeader(directive, 'ActivationStarted', 'Alexa.SceneController')
        context.succeed({
          event: {
            header: activationHeader,
            endpoint: {
              endpointId: endpointId
            },
            payload: {
              cause: { type: 'VOICE_INTERACTION' },
              timestamp: new Date().toISOString()
            }
          }
        })
      })
      break

    case 'Alexa.LockController':
      if (name === 'Lock' || name === 'Unlock') {
        let lockFunc = name === 'Lock' ? 'On' : 'Off'
        ctrlDev(switchtype, deviceId, lockFunc, bearerToken, function (callback) {
          if (callback === 'Err') {
            context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
            return
          }
          const properties = [{
            namespace: 'Alexa.LockController',
            name: 'lockState',
            value: name === 'Lock' ? 'LOCKED' : 'UNLOCKED',
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 500
          }]
          context.succeed(buildResponse(properties))
        })
      }
      break

    case 'Alexa.ThermostatController':
      if (name === 'SetTargetTemperature') {
        let temp = payload.targetSetpoint.value
        const targetIdx = cookie.setpointDeviceIdx || endpointId
        ctrlTemp(targetIdx, temp, bearerToken, function (callback) {
          if (callback === 'Err') {
            context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
            return
          }
          const properties = [{
            namespace: 'Alexa.ThermostatController',
            name: 'targetSetpoint',
            value: { value: temp, scale: 'CELSIUS' },
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 500
          }]
          context.succeed(buildResponse(properties))
        })
      } else if (name === 'AdjustTargetTemperature') {
        let delta = payload.targetSetpointDelta.value
        const targetIdx = cookie.setpointDeviceIdx || endpointId
        getDev(targetIdx, 'temp', bearerToken, function (returnme) {
          let current = parseFloat(returnme.value1)
          let newTemp = current + delta
          ctrlTemp(targetIdx, newTemp, bearerToken, function (callback) {
            if (callback === 'Err') {
              context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
              return
            }
            const properties = [{
              namespace: 'Alexa.ThermostatController',
              name: 'targetSetpoint',
              value: { value: newTemp, scale: 'CELSIUS' },
              timeOfSample: new Date().toISOString(),
              uncertaintyInMilliseconds: 500
            }]
            context.succeed(buildResponse(properties))
          })
        })
      }
      break

    case 'Alexa.ModeController':
      if (name === 'SetMode') {
        const modeValue = payload.mode
        
        // Extract level from value (e.g., "Level.20" -> 20)
        const level = parseInt(modeValue.replace('Level.', ''))
        
        if (isNaN(level)) {
          context.succeed(buildErrorResponse('ErrorResponse', 'Invalid mode'))
          return
        }
        
        ctrlDev('dimmable', deviceId, level, bearerToken, function (callback) {
          if (callback === 'Err') {
            context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
            return
          }
          const properties = [{
            namespace: 'Alexa.ModeController',
            instance: 'Input.Source',
            name: 'mode',
            value: modeValue,
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 500
          }]
          context.succeed(buildResponse(properties))
        })
      } else if (name === 'AdjustMode') {
        
        getDev(deviceId, 'light', bearerToken, function (currentLevel) {
          const currentIndex = Math.round(parseInt(currentLevel) / 10)
          let newIndex = currentIndex + modeDelta
          
          // Wrap around
          if (newIndex < 0) newIndex = modes.length - 1
          if (newIndex >= modes.length) newIndex = 0
          
          const level = newIndex * 10
          ctrlDev('dimmable', deviceId, level, bearerToken, function (callback) {
            if (callback === 'Err') {
              context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
              return
            }
            const modeValue = 'Input.' + modes[newIndex].replace(/[^a-zA-Z0-9]/g, '_')
            const properties = [{
              namespace: 'Alexa.ModeController',
              instance: 'Input.Source',
              name: 'mode',
              value: modeValue,
              timeOfSample: new Date().toISOString(),
              uncertaintyInMilliseconds: 500
            }]
            context.succeed(buildResponse(properties))
          })
        })
      }
      break

    case 'Alexa':
      if (name === 'ReportState') {
        // Query current state of device
        const properties = []
        
        // Build response - mirror endpoint from request like Home Assistant does
        const buildReportStateResponse = (props) => {
          // Always include EndpointHealth
          const allProps = props.concat([{
            namespace: 'Alexa.EndpointHealth',
            name: 'connectivity',
            value: { value: 'OK' },
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 0
          }])
          return {
            event: {
              header: makeHeader(directive, 'StateReport', 'Alexa'),
              endpoint: {
                endpointId: endpointId,
                cookie: cookie
              },
              payload: {}
            },
            context: {
              properties: allProps
            }
          }
        }
        
        // Check what capabilities this device has based on cookie
        if (what === 'temp') {
          // Check if this is a temperature device with linked setpoint or a standalone thermostat
          const setpointIdx = cookie.setpointDeviceIdx || endpointId
          const tempIdx = cookie.tempDeviceIdx || endpointId
          
          // Get setpoint if device has thermostat capability
          if (cookie.setpointDeviceIdx || cookie.tempDeviceIdx) {
            getDev(setpointIdx, 'temp', bearerToken, function (setpointData) {
              if (setpointData !== 'Err' && setpointData.value1 !== undefined) {
                properties.push({
                  namespace: 'Alexa.ThermostatController',
                  name: 'targetSetpoint',
                  value: { value: parseFloat(setpointData.value1), scale: 'CELSIUS' },
                  timeOfSample: new Date().toISOString(),
                  uncertaintyInMilliseconds: 500
                })
                // Add thermostatMode - required for thermostat state reporting
                properties.push({
                  namespace: 'Alexa.ThermostatController',
                  name: 'thermostatMode',
                  value: 'HEAT',
                  timeOfSample: new Date().toISOString(),
                  uncertaintyInMilliseconds: 500
                })
              }
              
              // Get temperature reading
              getDev(tempIdx, 'temp', bearerToken, function (tempData) {
                if (tempData !== 'Err' && tempData.value1 !== undefined) {
                  properties.push({
                    namespace: 'Alexa.TemperatureSensor',
                    name: 'temperature',
                    value: { value: parseFloat(tempData.value1), scale: 'CELSIUS' },
                    timeOfSample: new Date().toISOString(),
                    uncertaintyInMilliseconds: 500
                  })
                }
                context.succeed(buildReportStateResponse(properties))
              })
            })
          } else {
            // Standalone temperature sensor
            getDev(deviceId, 'temp', bearerToken, function (tempData) {
              if (tempData !== 'Err' && tempData.value1 !== undefined) {
                properties.push({
                  namespace: 'Alexa.TemperatureSensor',
                  name: 'temperature',
                  value: { value: parseFloat(tempData.value1), scale: 'CELSIUS' },
                  timeOfSample: new Date().toISOString(),
                  uncertaintyInMilliseconds: 500
                })
              }
              context.succeed(buildReportStateResponse(properties))
            })
          }
        } else if (what === 'humidity') {
          // Get temperature and/or humidity
          getDev(deviceId, what, bearerToken, function (data) {
            if (data !== 'Err' && data.value1) {
              properties.push({
                namespace: 'Alexa.TemperatureSensor',
                name: 'temperature',
                value: { value: parseFloat(data.value1), scale: 'CELSIUS' },
                timeOfSample: new Date().toISOString(),
                uncertaintyInMilliseconds: 500
              })
            }
            if (data !== 'Err' && data.value2) {
              properties.push({
                namespace: 'Alexa.HumiditySensor',
                name: 'humidity',
                value: parseInt(data.value2),
                timeOfSample: new Date().toISOString(),
                uncertaintyInMilliseconds: 500
              })
            }
            context.succeed(buildReportStateResponse(properties))
          })
        } else if (what === 'light') {
          // Get power state and brightness
          getDev(deviceId, what, bearerToken, function (data) {
            if (data !== 'Err') {
              const level = parseInt(data)
              properties.push({
                namespace: 'Alexa.PowerController',
                name: 'powerState',
                value: level > 0 ? 'ON' : 'OFF',
                timeOfSample: new Date().toISOString(),
                uncertaintyInMilliseconds: 500
              })
              if (switchtype === 'Dimmer') {
                properties.push({
                  namespace: 'Alexa.BrightnessController',
                  name: 'brightness',
                  value: level,
                  timeOfSample: new Date().toISOString(),
                  uncertaintyInMilliseconds: 500
                })
              }
            }
            context.succeed(buildReportStateResponse(properties))
          })
        } else if (what === 'blind') {
          getDev(deviceId, 'light', bearerToken, function (data) {
            if (data !== 'Err') {
              const level = parseInt(data)
              properties.push({
                namespace: 'Alexa.RangeController',
                instance: 'Blind.Lift',
                name: 'rangeValue',
                value: level,
                timeOfSample: new Date().toISOString(),
                uncertaintyInMilliseconds: 500
              })
            }
            context.succeed(buildReportStateResponse(properties))
          })
        } else if (what === 'selector') {
          // Get current mode
          getDev(deviceId, 'light', bearerToken, function (data) {
            if (data !== 'Err') {
              const level = parseInt(data)
              const deviceName = cookie.deviceName || 'Device'
              const instance = deviceName.replace(/[^a-zA-Z0-9]/g, '') + '.Mode'
              properties.push({
                namespace: 'Alexa.ModeController',
                instance: instance,
                name: 'mode',
                value: 'Level.' + level,
                timeOfSample: new Date().toISOString(),
                uncertaintyInMilliseconds: 500
              })
              const response = buildReportStateResponse(properties)
              console.log('StateReport response:', JSON.stringify(response, null, 2))
              context.succeed(response)
            } else {
              context.succeed(buildReportStateResponse(properties))
            }
          })
        } else if (what === 'weight') {
          // Get weight reading
          getDev(deviceId, what, bearerToken, function (data) {
            if (data !== 'Err') {
              properties.push({
                namespace: 'Alexa.RangeController',
                instance: 'Weight.Weight',
                name: 'rangeValue',
                value: parseFloat(data),
                timeOfSample: new Date().toISOString(),
                uncertaintyInMilliseconds: 500
              })
            }
            context.succeed(buildReportStateResponse(properties))
          })
        } else if (what === 'general') {
          // Get general sensor reading
          getDev(deviceId, what, bearerToken, function (data) {
            if (data !== 'Err') {
              const value = parseFloat(data)
              
              if (cookie.unit === 'percentage') {
                properties.push({
                  namespace: 'Alexa.PercentageController',
                  name: 'percentage',
                  value: value,
                  timeOfSample: new Date().toISOString(),
                  uncertaintyInMilliseconds: 500
                })
              } else if (cookie.unit === 'pH') {
                properties.push({
                  namespace: 'Alexa.RangeController',
                  instance: 'Sensor.pH',
                  name: 'rangeValue',
                  value: value,
                  timeOfSample: new Date().toISOString(),
                  uncertaintyInMilliseconds: 500
                })
              } else if (cookie.unit === 'g/m³') {
                properties.push({
                  namespace: 'Alexa.RangeController',
                  instance: 'Sensor.AbsoluteHumidity',
                  name: 'rangeValue',
                  value: value,
                  timeOfSample: new Date().toISOString(),
                  uncertaintyInMilliseconds: 500
                })
              }
            }
            context.succeed(buildReportStateResponse(properties))
          })
        } else if (what === 'scene') {
          // Groups support state reporting, scenes don't
          getDev(deviceId, 'scene', bearerToken, function (data) {
            if (data !== 'Err' && data.Type === 'Group') {
              // Groups can report their power state
              const status = data.Status || 'Off'
              properties.push({
                namespace: 'Alexa.PowerController',
                name: 'powerState',
                value: status === 'Off' ? 'OFF' : 'ON',
                timeOfSample: new Date().toISOString(),
                uncertaintyInMilliseconds: 500
              })
              context.succeed(buildReportStateResponse(properties))
            } else {
              // Scenes don't support state reporting
              context.succeed(buildErrorResponse('ErrorResponse', 'State report not supported for this device'))
            }
          })
        } else {
          context.succeed(buildErrorResponse('ErrorResponse', 'State report not supported for this device'))
        }
      }
      break

    case 'Alexa.RangeController':
      if (what === 'blind') {
        if (name === 'SetRangeValue') {
          const rangeValue = payload.rangeValue
          const dimLevel = rangeValue / (100 / maxDimLevel)
          ctrlDev('dimmable', deviceId, dimLevel, bearerToken, function (callback) {
            if (callback === 'Err') {
              context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
              return
            }
            const properties = [{
              namespace: 'Alexa.RangeController',
              instance: 'Blind.Lift',
              name: 'rangeValue',
              value: rangeValue,
              timeOfSample: new Date().toISOString(),
              uncertaintyInMilliseconds: 500
            }]
            context.succeed(buildResponse(properties))
          })
        } else if (name === 'AdjustRangeValue') {
          const delta = payload.rangeValueDelta
          getDev(deviceId, 'light', bearerToken, function (returnme) {
            const current = parseInt(returnme)
            const newValue = Math.max(0, Math.min(100, current + delta))
            const dimLevel = newValue / (100 / maxDimLevel)
            ctrlDev('dimmable', deviceId, dimLevel, bearerToken, function (callback) {
              if (callback === 'Err') {
                context.succeed(buildErrorResponse('ErrorResponse', 'Device offline'))
                return
              }
              const properties = [{
                namespace: 'Alexa.RangeController',
                instance: 'Blind.Lift',
                name: 'rangeValue',
                value: newValue,
                timeOfSample: new Date().toISOString(),
                uncertaintyInMilliseconds: 500
              }]
              context.succeed(buildResponse(properties))
            })
          })
        }
      }
      break

    default:
      context.succeed(buildErrorResponse('ErrorResponse', 'Unsupported directive'))
  }
}
