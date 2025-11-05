'use strict'

let listDevs = require('./get_Devices')

module.exports = function handleDiscovery (event, context) {
  console.log('Discovery: Starting device enumeration')
  listDevs(event.directive || event, context, function (passBack) {
    console.log('Discovery: Found', passBack.event.payload.endpoints.length, 'endpoints')
    context.succeed(passBack)
  })
}
