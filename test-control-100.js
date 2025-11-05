const handleControl = require('./domo-code/Control');

const event = {
  header: {
    namespace: 'Alexa.ConnectedHome.Control',
    name: 'SetPercentageRequest',
    payloadVersion: '2',
    messageId: 'test-message-id'
  },
  payload: {
    accessToken: 'test-token',
    appliance: {
      applianceId: '770',
      additionalApplianceDetails: {
        maxDimLevel: 100,
        switchis: 'Dimmer',
        WhatAmI: 'light'
      }
    },
    percentageState: {
      value: 100
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
