const handleControl = require('./domo-code/Control');

const event = {
  directive: {
    header: {
      namespace: 'Alexa.ThermostatController',
      name: 'SetTargetTemperature',
      payloadVersion: '3',
      messageId: 'test-message-id',
      correlationToken: 'test-correlation-token'
    },
    endpoint: {
      endpointId: '917',
      cookie: {
        WhatAmI: 'temp',
        setpointDeviceIdx: '915'
      }
    },
    payload: {
      targetSetpoint: {
        value: 20,
        scale: 'CELSIUS'
      }
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
