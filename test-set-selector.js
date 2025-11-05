const handleControl = require('./domo-code/Control');

const event = {
  directive: {
    header: {
      namespace: 'Alexa.ModeController',
      name: 'SetMode',
      payloadVersion: '3',
      messageId: 'test-message-id',
      correlationToken: 'test-correlation-token'
    },
    endpoint: {
      endpointId: '341',
      cookie: {
        WhatAmI: 'selector',
        modes: ['Off', 'Bluray', 'Sky+ HD', 'Wii', 'Ext cable', 'Aux DVI', 'AM', 'FM', 'TV/CD', 'HDMI cable', 'NET', 'USB', 'BLUETOOTH', 'TV', 'Chromecast']
      }
    },
    payload: {
      mode: 'Input.Bluray'
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
