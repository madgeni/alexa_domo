'use strict'

module.exports = function (request, responseName, namespace) {
  return {
    namespace: namespace || request.header.namespace,
    name: responseName,
    payloadVersion: '3',
    messageId: request.header.messageId,
    correlationToken: request.header.correlationToken
  }
}
