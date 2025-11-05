const handleControl = require('./domo-code/Control');

const event = {
  directive: {
    header: {
      namespace: 'Alexa.BrightnessController',
      name: 'SetBrightness',
      payloadVersion: '3',
      messageId: 'test-message-id',
      correlationToken: 'test-correlation-token'
    },
    endpoint: {
      endpointId: '344',
      cookie: {
        WhatAmI: 'light',
        switchis: 'Dimmer',
        maxDimLevel: 100
      }
    },
    payload: {
      brightness: 50
    }
  }
};

const context = {
  succeed: (response) => {
    console.log(JSON.stringify(response, null, 2));
    process.exit(0);
  },
  fail: (error) => {
    console.error('Error:', error);
    process.exit(1);
  }
};

handleControl(event, context);
