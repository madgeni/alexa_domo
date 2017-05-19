
var handleControl = require('./domo-code/Control');
var handleDiscovery = require('./domo-code/Discovery');

//This is the heart of the code - takes the request/response headers for Alexa
var func =  function (event, context) {

    switch (event.header.namespace) {

        case 'Alexa.ConnectedHome.Discovery':
            handleDiscovery(event, context);
            break;
        case 'Alexa.ConnectedHome.Control':
        case 'Alexa.ConnectedHome.Query':
            handleControl(event, context);
            break;
        default:
            console.log('Err', 'No supported namespace: ' + event.header.namespace);
            context.fail('Something went wrong');
            break;
    }

};
exports.handler = func;

