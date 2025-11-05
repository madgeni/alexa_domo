const handleControl = require('./domo-code/Control');

const event = {
  header: {
    namespace: 'Alexa.ConnectedHome.Query',
    name: 'GetTargetTemperatureRequest',
    payloadVersion: '2',
    messageId: 'test-target-temp-id'
  },
  payload: {
    accessToken: 'test-token',
    appliance: {
      applianceId: '918',
      additionalApplianceDetails: {
        WhatAmI: 'temp'
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

console.log('Querying Cooker hood target temperature (device 918)...\n');
handleControl(event, context);
