const handleControl = require('./domo-code/Control');

const event = {
  directive: {
    header: {
      namespace: 'Alexa.SceneController',
      name: 'Activate',
      payloadVersion: '3',
      messageId: 'test-message-id',
      correlationToken: 'test-correlation-token'
    },
    endpoint: {
      endpointId: 'scene_2',
      cookie: {
        WhatAmI: 'scene',
        SceneIDX: 202
      }
    },
    payload: {}
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
