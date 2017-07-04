'use strict'
const Domoticz = require('../node_modules/domoticz-api/api/domoticz')

const conf = require('../conf.json')
const api = new Domoticz({
  authentication: conf.authentication,
  protocol: conf.protocol,
  host: conf.host,
  port: conf.port,
  directory: conf.directory,
  username: conf.username,
  password: conf.password
})

module.exports = function (idx, hue, brightness, sendback) {
  api.setColour({
    idx: idx,
    hue: hue,
    brightness: brightness
  }, function (params, device) {
    if (device.status === 'Err') {
      hue = {}
    }
    sendback(hue)
  })
}
