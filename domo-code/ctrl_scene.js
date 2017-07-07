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

module.exports = function (idx, func, sendback) {
  let payloads
  api.changeSceneState({
    idx: idx,
    state: func
  }, function (params, device) {
    if (device.status === 'OK') {
      payloads = {}
    }
    else {
      payloads = 'Err'
    }
    sendback(payloads)
  })
}
