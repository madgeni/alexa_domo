'use strict'

let header

module.exports = function (request, response_name) {
  header = {
    'namespace': request.header.namespace,
    'name': response_name,
    'payloadVersion': '2',
    'messageId': request.header.messageId
  }
  return header
}
