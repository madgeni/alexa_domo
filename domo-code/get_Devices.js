/* eslint-disable max-len */
'use strict'

const Domoticz = require('../node_modules/domoticz-api/api/domoticz')

const conf = require('../conf.json')
const api = new Domoticz({
  protocol: conf.protocol,
  host: conf.host,
  port: conf.port,
  username: conf.username,
  password: conf.password
})
let log = require('./logger')
const makeHeader = require('./HeaderGen')
const handleError = require('./handleError')
const appliances = []

module.exports = function (event, context, passBack) {
  const responseName = 'DiscoverAppliancesResponse'
  const headers = makeHeader(event, responseName)
//  lets get the devices from Domoticz:
  api.getDevices({}, function (error, devices) {
    if (error) {
      log('error:', error)
      handleError(event, context, 'TargetBridgeConnectivityUnstableError')
      return
    }
    const devArray = devices.results
    if (devArray) {
      for (let i = 0; i < devArray.length; i++) {
        const device = devArray[i]
      //  log('device detail is: ', device)
                // Omit devices which aren't in a room plan
        if (device.planID === '0') { continue }

        const devType = device.type

        let setSwitch

        if (device.switchType !== null){
          setSwitch = device.switchType
        }

       // console.log(setSwitch)
        let devName = device.name

        if (device.description !== '') {
          //  Search for Alexa_Name string, ignore casesensitive and whitespaces

          const regex = /Alexa_Name:\s*(.+)/im
          const match = regex.exec(device.description)
          if (match !== null) {
            devName = match[1].trim()
          }
        }
        // let msg = ("device is - ", device.name, " & description", devName);
          // log("device info", msg);
        let appliancename = {
          applianceId: device.idx,
          manufacturerName: device.hardwareName,
          modelName: device.subType,
          version: device.switchType,
          friendlyName: devName,
          friendlyDescription: devType,
          isReachable: true
        }

        if (devType.startsWith('Scene') || devType.startsWith('Group')) {
          appliancename.manufacturerName = device.name,
          appliancename.modelName = device.name,
          appliancename.version = device.idx,
          appliancename.applianceId = parseInt(device.idx) + 200
          appliancename.actions = ([
            'turnOn',
            'turnOff'
          ])
          appliancename.additionalApplianceDetails = ({
            WhatAmI: 'scene',
            SceneIDX: appliancename.applianceId
          })
            console.log(appliancename)
          appliances.push(appliancename)
        } else if (devType.startsWith('Light')) {
          appliancename.actions = ([
            'incrementPercentage',
            'decrementPercentage',
            'setPercentage',
            'turnOn',
            'turnOff',
            'setColor',
            'setColorTemperature'
          ])
          appliancename.additionalApplianceDetails = ({
            maxDimLevel: device.maxDimLevel,
            switchis: setSwitch,
            WhatAmI: 'light'
          })
          appliances.push(appliancename)
        } else if (devType.startsWith('Blind') || devType.startsWith('RFY')) {
          appliancename.actions = ([
            'turnOn',
            'turnOff'
          ])
          appliancename.additionalApplianceDetails = ({
            switchis: setSwitch,
            WhatAmI: 'blind'
          })
          appliances.push(appliancename)
        } else if (devType.startsWith('Lock') || devType.startsWith('Contact')) {
          appliancename.actions = ([
            'getLockState',
            'setLockState'
          ])
          appliancename.additionalApplianceDetails = ({
            switchis: setSwitch,
            WhatAmI: 'lock'
          })
          appliances.push(appliancename)
        } else if (devType.startsWith('Temp') || devType.startsWith('Therm')) {
          appliancename.version = 'temp'
          appliancename.actions = ([
            'getTargetTemperature',
            'getTemperatureReading',
            'incrementTargetTemperature',
            'decrementTargetTemperature',
            'setTargetTemperature'
          ])
          appliancename.additionalApplianceDetails = ({
            WhatAmI: 'temp'
          })
          appliances.push(appliancename)
        }
      }
    }
    //  log('payload: ', appliances)
    const payloads = {
      discoveredAppliances: appliances
    }
    const result = {
      header: headers,
      payload: payloads
    }
    passBack(result)
  })
}
