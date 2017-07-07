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

module.exports = function (switchtype, applianceId, func, sendback) {
  let payload
  api.changeSwitchState({
    type: switchtype,
    idx: applianceId,
    state: func
  }, function (params, device) {
    console.log(device)
    if (device.status === 'OK') {
      payload = {}
    }
    else {
      payload = 'Err'
    }
    sendback(payload)
  })
}
