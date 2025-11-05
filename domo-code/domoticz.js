'use strict'
const https = require('https')
const http = require('http')

class Domoticz {
  constructor(bearerToken, config) {
    // If no config provided, load from config module
    if (!config) {
      config = require('./config')
    }
    
    this.config = config
    this.bearerToken = bearerToken
    
    // If we have a JWT token, try to extract hostname from it
    if (bearerToken && bearerToken.startsWith('eyJ')) {
      try {
        // Decode JWT payload (second part)
        const payload = JSON.parse(Buffer.from(bearerToken.split('.')[1], 'base64').toString())
        
        // Log token lifetime
        if (payload.exp) {
          const now = Math.floor(Date.now() / 1000)
          const remaining = payload.exp - now
          console.log(`JWT token expires in ${remaining} seconds (${Math.floor(remaining / 60)} minutes)`)
        }
        
        if (payload.iss) {
          // Extract hostname and port from issuer URL
          const url = new URL(payload.iss)
          // Skip if hostname is domoticz.local (use conf.json instead)
          if (url.hostname !== 'domoticz.local') {
            this.config = {
              ...config,
              protocol: url.protocol.replace(':', ''),
              host: url.hostname,
              port: url.port || (url.protocol === 'https:' ? 443 : 80)
            }
            console.log(`Using Domoticz host from JWT: ${url.hostname}:${this.config.port}`)
          }
        }
      } catch (e) {
        console.log('Failed to decode JWT:', e.message)
      }
    }
    
    this.client = this.config.protocol === 'https' ? https : http
  }

  request(path, callback) {
    const options = {
      hostname: this.config.host,
      port: this.config.port,
      path: path,
      headers: {}
    }

    console.log(`Request: ${this.config.protocol}://${this.config.host}:${this.config.port}${path}`)

    // Use bearer token if it's a JWT from Domoticz, otherwise use Basic Auth
    if (this.bearerToken && this.bearerToken.startsWith('eyJ')) {
      options.headers['Authorization'] = `Bearer ${this.bearerToken}`
      console.log(`Using Bearer token authentication`)
    } else {
      options.auth = `${this.config.username}:${this.config.password}`
      console.log(`Using Basic authentication`)
    }

    this.client.get(options, (res) => {
      console.log(`Response status: ${res.statusCode}`)
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.log(`Non-200 response: ${data.substring(0, 200)}`)
          callback(new Error(`HTTP ${res.statusCode}`))
          return
        }
        try {
          callback(null, JSON.parse(data))
        } catch (e) {
          console.log(`Failed to parse JSON. Data length: ${data.length}, First 200 chars: ${data.substring(0, 200)}`)
          callback(e)
        }
      })
    }).on('error', (err) => {
      console.log(`Request error: ${err.message}`)
      callback(err)
    })
  }

  getDevice(params, callback) {
    this.request(`/json.htm?type=command&param=getdevices&rid=${params.idx}`, callback)
  }

  getScene(params, callback) {
    this.request(`/json.htm?type=command&param=getscenes`, (err, data) => {
      if (err) return callback(err)
      // Filter to find the specific scene by idx
      if (data.result) {
        const scene = data.result.find(s => s.idx === params.idx)
        if (scene) {
          callback(null, { result: [scene] })
        } else {
          callback(new Error('Scene not found'))
        }
      } else {
        callback(new Error('No scenes returned'))
      }
    })
  }

  getDevices(params, callback) {
    this.request('/json.htm?type=command&param=getdevices&filter=all&used=true', callback)
  }

  changeSwitchState(params, callback) {
    let path = `/json.htm?type=command&idx=${params.idx}`
    
    if (params.type === 'dimmable') {
      path += `&level=${Math.round(params.state)}&switchcmd=${encodeURIComponent('Set Level')}&param=switchlight`
    } else {
      if (params.type === 'switch') path += '&param=switchlight'
      const state = params.state === 'toggle' ? 'Toggle' : 
                    params.state === 'on' ? 'On' : 
                    params.state === 'off' ? 'Off' : params.state
      path += `&switchcmd=${encodeURIComponent(state)}`
    }
    
    this.request(path, callback)
  }

  changeSceneState(params, callback) {
    const state = params.state.toLowerCase() === 'on' ? 'On' : 'Off'
    this.request(`/json.htm?type=command&param=switchscene&idx=${params.idx}&switchcmd=${state}`, callback)
  }

  uTemp(params, callback) {
    this.request(`/json.htm?type=command&param=udevice&idx=${params.idx}&nvalue=0&svalue=${params.value}`, callback)
  }

  Kelvin(params, callback) {
    this.request(`/json.htm?type=command&param=setkelvinlevel&idx=${params.idx}&kelvin=${params.kelvin}`, callback)
  }

  setColour(params, callback) {
    // Convert hex color to RGB JSON format for newer Domoticz API
    const color = JSON.stringify({
      m: 3,
      t: 0,
      r: params.r || 0,
      g: params.g || 0,
      b: params.b || 0,
      cw: 0,
      ww: 0
    })
    // Don't encode the color parameter - Domoticz expects unencoded JSON
    // Omit brightness to preserve device's current brightness
    this.request(`/json.htm?type=command&param=setcolbrightnessvalue&idx=${params.idx}&color=${color}`, callback)
  }
}

module.exports = Domoticz
