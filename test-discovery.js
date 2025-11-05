const handleDiscovery = require('./domo-code/Discovery');

const event = {
  directive: {
    header: {
      namespace: 'Alexa.Discovery',
      name: 'Discover',
      payloadVersion: '3',
      messageId: 'test-message-id'
    },
    payload: {
      scope: {
        type: 'BearerToken',
        token: 'test-token'
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

handleDiscovery(event, context);
