'use strict'

let conf = {}
try {
  conf = require('../conf.json')
} catch (e) {
  console.log('conf.json not found, using defaults')
}

module.exports = {
  protocol: conf.protocol || 'https',
  host: conf.host || 'localhost',
  port: conf.port || 443,
  username: conf.username || '',
  password: conf.password || ''
}
