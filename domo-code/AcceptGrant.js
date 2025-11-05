'use strict'

const https = require('https')
const fs = require('fs')

// Alexa Event Gateway credentials (from "Send Alexa Events" permission)
// TODO: Replace with your actual Client ID and Client Secret from Alexa Developer Console
const CLIENT_ID = process.env.ALEXA_CLIENT_ID || 'YOUR_CLIENT_ID'
const CLIENT_SECRET = process.env.ALEXA_CLIENT_SECRET || 'YOUR_CLIENT_SECRET'

// Store tokens in /tmp (Lambda's writable directory)
const TOKEN_FILE = '/tmp/alexa-tokens.json'

module.exports = function (event, context) {
  const directive = event.directive
  const payload = directive.payload
  
  console.log('AcceptGrant received')
  
  if (!payload.grant || !payload.grant.code) {
    console.error('No authorization code in AcceptGrant directive')
    // Send success anyway to not block skill enablement
    const response = {
      event: {
        header: {
          namespace: 'Alexa.Authorization',
          name: 'AcceptGrant.Response',
          messageId: directive.header.messageId,
          payloadVersion: '3'
        },
        payload: {}
      }
    }
    context.succeed(response)
    return
  }
  
  const authCode = payload.grant.code
  console.log('Authorization code:', authCode)
  
  // Check if credentials are configured
  if (!CLIENT_ID || CLIENT_ID === 'YOUR_CLIENT_ID' || !CLIENT_SECRET || CLIENT_SECRET === 'YOUR_CLIENT_SECRET') {
    console.log('Client credentials not configured - skipping token exchange')
    console.log('To enable proactive events, set ALEXA_CLIENT_ID and ALEXA_CLIENT_SECRET environment variables')
    
    // Send success response anyway
    const response = {
      event: {
        header: {
          namespace: 'Alexa.Authorization',
          name: 'AcceptGrant.Response',
          messageId: directive.header.messageId,
          payloadVersion: '3'
        },
        payload: {}
      }
    }
    context.succeed(response)
    return
  }
  
  // Exchange authorization code for access token and refresh token
  const postData = `grant_type=authorization_code&code=${authCode}&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`
  
  const options = {
    hostname: 'api.amazon.com',
    port: 443,
    path: '/auth/o2/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length
    }
  }
  
  console.log('Exchanging authorization code with LWA...')
  
  const req = https.request(options, (res) => {
    let data = ''
    res.on('data', (chunk) => { data += chunk })
    res.on('end', () => {
      if (res.statusCode === 200) {
        const tokens = JSON.parse(data)
        console.log('Successfully obtained tokens from LWA')
        console.log('Access token:', tokens.access_token)
        console.log('Access token expires in:', tokens.expires_in, 'seconds')
        console.log('Refresh token:', tokens.refresh_token)
        console.log('Token type:', tokens.token_type)
        
        // Store the tokens
        const tokenInfo = {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresIn: tokens.expires_in,
          tokenType: tokens.token_type,
          receivedAt: Date.now()
        }
        
        try {
          fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenInfo, null, 2))
          console.log('Stored tokens to', TOKEN_FILE)
        } catch (e) {
          console.error('Failed to store tokens:', e.message)
        }
        
        // Send success response
        const response = {
          event: {
            header: {
              namespace: 'Alexa.Authorization',
              name: 'AcceptGrant.Response',
              messageId: directive.header.messageId,
              payloadVersion: '3'
            },
            payload: {}
          }
        }
        
        console.log('Sending AcceptGrant.Response (success)')
        context.succeed(response)
      } else {
        console.error('Token exchange failed:', res.statusCode, data)
        
        // Send success response anyway to not block skill enablement
        const response = {
          event: {
            header: {
              namespace: 'Alexa.Authorization',
              name: 'AcceptGrant.Response',
              messageId: directive.header.messageId,
              payloadVersion: '3'
            },
            payload: {}
          }
        }
        console.log('Sending AcceptGrant.Response (success despite token exchange failure)')
        context.succeed(response)
      }
    })
  })
  
  req.on('error', (e) => {
    console.error('Token exchange error:', e)
    
    // Send success response anyway to not block skill enablement
    const response = {
      event: {
        header: {
          namespace: 'Alexa.Authorization',
          name: 'AcceptGrant.Response',
          messageId: directive.header.messageId,
          payloadVersion: '3'
        },
        payload: {}
      }
    }
    console.log('Sending AcceptGrant.Response (success despite network error)')
    context.succeed(response)
  })
  
  req.write(postData)
  req.end()
}
