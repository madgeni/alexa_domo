'use strict'

let Domoticz = require('./domoticz')

module.exports = function (switchtype, applianceId, func, bearerToken, sendback) {
  let api = new Domoticz(bearerToken)
  
  let payload
  api.changeSwitchState({
    type: switchtype,
    idx: applianceId,
    state: func
  }, function (err, device) {
    console.log(device)
    if (!err && device.status === 'OK') {
      payload = {}
    }
    else {
      payload = 'Err'
    }
    sendback(payload)
  })
}
