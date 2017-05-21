'use strict'

let listDevs = require('./get_Devices')

module.exports = // This handles the Discovery
    function handleDiscovery (event, context) {
      listDevs(event, context, function (passBack) {
        context.succeed(passBack)
           // return(passBack);
        //  let appliances = []
      })
    }
