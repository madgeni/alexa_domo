'use strict'

let Domoticz = require('../node_modules/domoticz-api/api/domoticz')

let conf = require('../conf.json')
let api = new Domoticz({
  protocol: conf.protocol,
  host: conf.host,
  port: conf.port,
  username: conf.username,
  password: conf.password
})

module.exports = function (idx, kelvin, sendback) {
  api.Kelvin({
    idx: idx,
    kelvin: kelvin
  }, function (params) {
    let payload = {
      achievedState: {
        colorTemperature: {
          value: kelvin
        }
      }
    }
    sendback(payload)
  })
}
