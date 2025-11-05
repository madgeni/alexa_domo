#!/usr/bin/env node
const Control = require('./domo-code/Control')

const event = {
  directive: {
    header: {
      namespace: 'Alexa.RangeController',
      name: 'SetRangeValue',
      messageId: 'test-message-id',
      correlationToken: 'test-correlation-token',
      payloadVersion: '3'
    },
    endpoint: {
      endpointId: '123',
      cookie: {
        WhatAmI: 'blind',
        maxDimLevel: 100
      },
      scope: {
        type: 'BearerToken',
        token: require('./conf.json').bearerToken
      }
    },
    payload: {
      rangeValue: 50
    }
  }
}

const context = {
  succeed: (response) => {
    console.log(JSON.stringify(response, null, 2))
    process.exit(0)
  },
  fail: (error) => {
    console.error('Error:', error)
    process.exit(1)
  }
}

Control(event, context)
