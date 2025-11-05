'use strict'
let handleControl = require('./domo-code/Control')
let handleDiscovery = require('./domo-code/Discovery')
let handleAcceptGrant = require('./domo-code/AcceptGrant')

// Lambda handler for Alexa Smart Home API v3
let func = function (event, context) {
  console.log('Received event:', JSON.stringify(event, null, 2))
  console.log('Lambda context:', JSON.stringify({
    functionName: context.functionName,
    functionVersion: context.functionVersion,
    invokedFunctionArn: context.invokedFunctionArn,
    requestId: context.requestId
  }, null, 2))
  
  // Normalize event structure - ensure we have directive format for v3
  let normalizedEvent = event
  
  // If event doesn't have directive but has header (v2 format), wrap it
  if (!event.directive && event.header) {
    console.log('Converting v2 event format to v3')
    normalizedEvent = {
      directive: {
        header: event.header,
        endpoint: event.payload && event.payload.appliance ? {
          endpointId: event.payload.appliance.applianceId,
          cookie: event.payload.appliance.additionalApplianceDetails
        } : {},
        payload: event.payload || {}
      }
    }
  }
  
  const header = normalizedEvent.directive ? normalizedEvent.directive.header : normalizedEvent.header
  
  if (!header || !header.namespace) {
    console.log('Error: Invalid event structure')
    context.fail('Invalid request format')
    return
  }
  
  const namespace = header.namespace
  const name = header.name
  console.log('Processing:', namespace, name)
  
  // Handle v3 API
  if (namespace === 'Alexa.Discovery') {
    console.log('Handling discovery request')
    handleDiscovery(normalizedEvent, context)
  } else if (namespace === 'Alexa.Authorization') {
    console.log('Handling authorization request')
    handleAcceptGrant(normalizedEvent, context)
  } else if (namespace.startsWith('Alexa')) {
    console.log('Handling control request')
    // All other Alexa.* namespaces are control/query operations
    handleControl(normalizedEvent, context)
  } 
  // Handle legacy v2 API (for backwards compatibility)
  else if (namespace === 'Alexa.ConnectedHome.Discovery') {
    console.log('Handling v2 discovery request')
    handleDiscovery(normalizedEvent, context)
  } else if (namespace === 'Alexa.ConnectedHome.Control' || namespace === 'Alexa.ConnectedHome.Query') {
    console.log('Handling v2 control request')
    handleControl(normalizedEvent, context)
  } 
  else {
    console.log('Error: Unsupported namespace:', namespace)
    context.fail('Unsupported namespace: ' + namespace)
  }
}

exports.handler = func
