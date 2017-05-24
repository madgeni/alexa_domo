'use strict'

let header

module.exports = function (request, responseName) {

  header = {
    'namespace': request.header.namespace,
    'name': responseName,
    'payloadVersion': '2',
    'messageId': request.header.messageId
  }
  return header
}
