#!/usr/bin/env node
'use strict'

const https = require('https')

// Send a ChangeReport event using user's access token
function sendChangeReport(endpointId, userToken, powerState, callback) {
  const event = {
    event: {
      header: {
        namespace: 'Alexa',
        name: 'ChangeReport',
        messageId: 'test-' + Date.now(),
        payloadVersion: '3'
      },
      endpoint: {
        scope: {
          type: 'BearerToken',
          token: userToken
        },
        endpointId: endpointId
      },
      payload: {
        change: {
          cause: {
            type: 'PHYSICAL_INTERACTION'
          },
          properties: [
            {
              namespace: 'Alexa.PowerController',
              name: 'powerState',
              value: powerState,
              timeOfSample: new Date().toISOString(),
              uncertaintyInMilliseconds: 500
            }
          ]
        }
      }
    },
    context: {
      properties: [
        {
          namespace: 'Alexa.PowerController',
          name: 'powerState',
          value: powerState,
          timeOfSample: new Date().toISOString(),
          uncertaintyInMilliseconds: 500
        }
      ]
    }
  }
  
  const postData = JSON.stringify(event)
  
  const options = {
    hostname: 'api.eu.amazonalexa.com',
    port: 443,
    path: '/v3/events',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length
    }
  }
  
  console.log('Sending ChangeReport event to:', options.hostname + options.path)
  console.log('Using user token in endpoint scope (no Authorization header)')
  console.log('Note: For development skills, this may not work until skill is published')
  console.log('Event:', JSON.stringify(event, null, 2))
  
  const req = https.request(options, (res) => {
    let data = ''
    res.on('data', (chunk) => { data += chunk })
    res.on('end', () => {
      console.log('Response status:', res.statusCode)
      console.log('Response:', data)
      if (res.statusCode === 202) {
        console.log('Event accepted!')
        callback(null)
      } else {
        callback(new Error('Event rejected'))
      }
    })
  })
  
  req.on('error', (e) => {
    console.error('Event request error:', e)
    callback(e)
  })
  
  req.write(postData)
  req.end()
}

// Main
const endpointId = process.argv[2]
const userToken = process.argv[3]
const powerState = process.argv[4] || 'ON'

if (!endpointId || !userToken) {
  console.error('Usage: node test-alexa-event.js <endpointId> <userToken> [powerState]')
  console.error('Example: node test-alexa-event.js 109 eyJ... OFF')
  console.error('')
  console.error('Get the user token from CloudWatch logs after triggering a device action.')
  console.error('After updating proactivelyReported to true, rediscover devices in Alexa app first.')
  console.error('powerState can be ON or OFF (default: ON)')
  process.exit(1)
}

sendChangeReport(endpointId, userToken, powerState, (err) => {
  if (err) {
    console.error('Failed to send event')
    process.exit(1)
  }
  console.log('Success!')
})
