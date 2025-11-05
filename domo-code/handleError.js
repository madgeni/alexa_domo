'use strict'

let makeHeader = require('./HeaderGen')

module.exports = function (event, context, name) {
  console.log(name)
  const headers = makeHeader(event, name)

  const payload = {}
  const result = {
    header: headers,
    payload: payload
  }
  context.succeed(result)
}
