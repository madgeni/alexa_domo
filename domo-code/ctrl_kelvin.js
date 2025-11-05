'use strict'

let Domoticz = require('./domoticz')

module.exports = function (idx, kelvin, bearerToken, sendback) {
  let api = new Domoticz(bearerToken)
  
  api.Kelvin({
    idx: idx,
    kelvin: kelvin
  }, function (err, device) {
    let payload
    if (!err && device.status === 'OK') {
      let payload = {
        achievedState: {
          colorTemperature: {
            value: kelvin
          }
        }
      }
    }
    else {
      payload = 'Err'
    }

    sendback(payload)
  })
}
