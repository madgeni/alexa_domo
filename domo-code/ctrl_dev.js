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

module.exports = function (switchtype, applianceId, func, sendback) {
  api.changeSwitchState({
    type: switchtype,
    idx: applianceId,
    state: func
  }, function (params) {
    let payloads = {}
    sendback(payloads)
  })
}
