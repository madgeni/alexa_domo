'use strict'

let Domoticz = require('./domoticz')

module.exports = function (idx, temp, bearerToken, sendback) {
  let api = new Domoticz(bearerToken)
  
  let payload
  api.uTemp({
    idx: idx,
    value: temp
  }, function (err, device) {
    if (!err && device.status === 'OK') {
      payload = {}
    }
    else {
      payload = 'Err'
    }
    sendback(payload)
  })
}
