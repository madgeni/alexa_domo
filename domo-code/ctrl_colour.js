'use strict'
const Domoticz = require('./domoticz')

module.exports = function (idx, hex, bearerToken, sendback) {
  const api = new Domoticz(bearerToken)
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  console.log(`RGB values: r=${r}, g=${g}, b=${b}`)
  
  api.setColour({
    idx: idx,
    r: r,
    g: g,
    b: b
  }, function (err, device) {
    if (err || device.status === 'Err' || device.status === 'ERROR') {
      hex = {}
    }
    sendback(hex)
  })
}
