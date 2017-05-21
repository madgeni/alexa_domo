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

module.exports = function (idx, temp, sendback) {
  api.uTemp({
    idx: idx,
    value: temp
  }, function (params, callback) {
    let payloads = {}
    sendback(payloads)
  })
}
