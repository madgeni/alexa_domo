const handleControl = require('./domo-code/Control');

const event = {
  header: {
    namespace: 'Alexa.ConnectedHome.Query',
    name: 'GetTemperatureReadingRequest',
    payloadVersion: '2',
    messageId: 'test-temp-message-id'
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

console.log('Querying Cooker hood temperature (device 918)...\n');
handleControl(event, context);
