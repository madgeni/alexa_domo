'use strict'

let Domoticz = require('../node_modules/domoticz-api/api/domoticz')

let conf = require('../conf.json')
let api = new Domoticz({
  authentication: conf.authentication,
  protocol: conf.protocol,
  host: conf.host,
  port: conf.port,
  directory: conf.directory,
  username: conf.username,
  password: conf.password
})
let log = require('./logger')

module.exports = function (idx, devType, sendback) {
  let intRet
  api.getDevice({
    idx: idx
  }, function (params, callback) {
    let devArray = callback.results
    if (devArray) {
            // turn this on to check the list of values the device returns
   //    console.log("device list", devArray)
      for (let i = 0; i < devArray.length; i++) {
        let device = devArray[i]
        let devName = device.name
        if (device.description !== '') {
          let regex = /Alexa_Name:\s*(.+)/im
          let match = regex.exec(device.description)
          if (match !== null) {
            devName = match[1].trim()
          }
        }
        let callBackString = {}
        if (devType === 'temp') {
          if (device.subType === 'SetPoint') {
            intRet = device.setPoint
          } else {
            intRet = device.temp
          }
          callBackString.value1 = intRet
          callBackString.value2 = devName
        } else if (devType === 'light') {
          callBackString = device.level
        } else if (devType === 'lock') {
          callBackString = device.state
        }
        sendback(callBackString)
      }
    }
  })
}
