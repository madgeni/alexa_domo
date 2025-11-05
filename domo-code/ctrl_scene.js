'use strict'

let Domoticz = require('./domoticz')

module.exports = function (idx, func, bearerToken, sendback) {
  let api = new Domoticz(bearerToken)
  
  let payloads
  api.changeSceneState({
    idx: idx,
    state: func
  }, function (err, device) {
    if (!err && device.status === 'OK') {
      payloads = {}
    }
    else {
      payloads = 'Err'
    }
    sendback(payloads)
  })
}
