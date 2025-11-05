/* eslint-disable max-len */
'use strict'

const Domoticz = require('./domoticz')
let log = require('./logger')
const makeHeader = require('./HeaderGen')
const handleError = require('./handleError')

module.exports = function (event, context, passBack) {
  const endpoints = []
  const headers = makeHeader(event, 'Discover.Response', 'Alexa.Discovery')
  
  // Extract bearer token from event
  const bearerToken = event.payload?.scope?.token
  
  // Create Domoticz instance with bearer token
  const api = new Domoticz(bearerToken)
  
  api.getDevices({}, function (err, devices) {
    if (err) {
      console.log('Error fetching devices from Domoticz:', err)
      log('error:', err)
      handleError(event, context, 'TargetBridgeConnectivityUnstableError')
      return
    }
    const devArray = devices.result || []
    console.log('Fetched', devArray.length, 'devices from Domoticz')
    
    // Parse Domoticz version
    const appVersion = devices.app_version || ''
    const versionMatch = appVersion.match(/(\d+)\.(\d+)/)
    let isOldVersion = false
    if (versionMatch) {
      const year = parseInt(versionMatch[1])
      const minor = parseInt(versionMatch[2])
      console.log(`Domoticz version: ${appVersion}`)
      
      // Versions before 2025.2 had percentage support for "Blinds + Stop"
      if (year < 2025 || (year === 2025 && minor < 2)) {
        isOldVersion = true
      } else if (year === 2025 && minor === 2) {
        // For 2025.2, check build number if present
        const buildMatch = appVersion.match(/build (\d+)/)
        if (buildMatch) {
          const build = parseInt(buildMatch[1])
          isOldVersion = build < 16813
        }
        // If no build number, it's a release version (>= 16813)
      }
      console.log(`Domoticz blind behavior: ${isOldVersion ? 'old (Blinds + Stop has percentage)' : 'new (Blinds + Stop no percentage)'}`)
    }
    
    const linkedDevices = new Set() // Track devices that are linked and should be hidden
    
    // First pass: find linked setpoint/temperature pairs
    const setpointLinks = new Map()
    if (devArray.length > 0) {
      devArray.forEach(device => {
        if (device.Type === 'Thermostat' && (device.PlanID !== '0' && device.PlanID !== '')) {
          const baseName = device.Name.replace(/\s+(Setpoint|SetPoint)$/i, '')
          const tempDevice = devArray.find(d => 
            d.Name === baseName + ' Temperature' && 
            d.Type.startsWith('Temp') &&
            d.PlanID !== '0' && d.PlanID !== ''
          )
          if (tempDevice) {
            setpointLinks.set(tempDevice.idx, device.idx)
            linkedDevices.add(device.idx) // Hide the setpoint device
          }
        }
      })
    }
    
    if (devArray) {
      for (let i = 0; i < devArray.length; i++) {
        const device = devArray[i]
        
        if (device.PlanID === '0' || device.PlanID === '') { continue }
        if (linkedDevices.has(device.idx)) { continue } // Skip linked setpoint devices

        const devType = device.Type
        let setSwitch = device.SwitchType || null

        let devName = device.Name
        if (device.Description !== '') {
          const regex = /Alexa_Name:\s*(.+)/im
          const match = regex.exec(device.Description)
          if (match !== null) {
            devName = match[1].trim()
          }
        }

        let endpoint = {
          endpointId: device.idx,
          manufacturerName: device.HardwareName || 'Domoticz',
          friendlyName: devName,
          description: devType,
          displayCategories: [],
          capabilities: []
        }

        if (devType.startsWith('Scene') || devType.startsWith('Group')) {
          endpoint.endpointId = 'scene_' + device.idx
          endpoint.manufacturerName = 'Domoticz'
          
          if (devType.startsWith('Scene')) {
            // Scenes can only be activated, not deactivated
            endpoint.displayCategories = ['SCENE_TRIGGER']
            endpoint.capabilities = [
              {
                type: 'AlexaInterface',
                interface: 'Alexa.SceneController',
                version: '3',
                supportsDeactivation: false
              },
              {
                type: 'AlexaInterface',
                interface: 'Alexa',
                version: '3'
              }
            ]
          } else {
            // Groups can be turned on and off
            endpoint.displayCategories = ['SWITCH']
            endpoint.capabilities = [
              {
                type: 'AlexaInterface',
                interface: 'Alexa.PowerController',
                version: '3',
                properties: {
                  supported: [
                    {
                      name: 'powerState'
                    }
                  ],
                  proactivelyReported: false,
                  retrievable: true
                }
              },
              {
                type: 'AlexaInterface',
                interface: 'Alexa',
                version: '3'
              }
            ]
          }
          
          endpoint.cookie = {
            WhatAmI: 'scene',
            SceneIDX: device.idx
          }
          endpoints.push(endpoint)
        } else if (devType.startsWith('Light') || devType.startsWith('Color Switch')) {
          // Check if this is actually a blind (some blinds report as Light/Switch)
          if (setSwitch && (setSwitch.includes('Blind') || setSwitch === 'Venetian Blinds EU' || setSwitch === 'Venetian Blinds US')) {
            endpoint.displayCategories = ['INTERIOR_BLIND']
            const hasStop = setSwitch.includes('Stop')
            let hasPercentage = setSwitch.includes('Percentage') || setSwitch.includes('%')
            // Before 2025.2 (build 16813), "Blinds + Stop" also had percentage support
            if (!hasPercentage && setSwitch === 'Blinds + Stop' && isOldVersion) {
              hasPercentage = true
            }
            
            endpoint.capabilities = [
              {
                type: 'AlexaInterface',
                interface: 'Alexa.RangeController',
                version: '3',
                instance: 'Blind.Lift',
                capabilityResources: {
                  friendlyNames: [
                    { '@type': 'asset', value: { assetId: 'Alexa.Setting.Opening' } },
                    { '@type': 'text', value: { text: 'Position', locale: 'en-US' } }
                  ]
                },
                properties: {
                  supported: [{ name: 'rangeValue' }],
                  proactivelyReported: false,
                  retrievable: hasPercentage
                },
                configuration: {
                  supportedRange: { minimumValue: 0, maximumValue: 100, precision: 1 },
                  presets: [
                    {
                      rangeValue: 0,
                      presetResources: {
                        friendlyNames: [
                          { '@type': 'asset', value: { assetId: 'Alexa.Value.Close' } },
                          { '@type': 'text', value: { text: 'Closed', locale: 'en-US' } }
                        ]
                      }
                    },
                    {
                      rangeValue: 100,
                      presetResources: {
                        friendlyNames: [
                          { '@type': 'asset', value: { assetId: 'Alexa.Value.Open' } },
                          { '@type': 'text', value: { text: 'Open', locale: 'en-US' } }
                        ]
                      }
                    }
                  ]
                },
                semantics: {
                  actionMappings: [
                    { '@type': 'ActionsToDirective', actions: ['Alexa.Actions.Close'], directive: { name: 'SetRangeValue', payload: { rangeValue: 0 } } },
                    { '@type': 'ActionsToDirective', actions: ['Alexa.Actions.Open'], directive: { name: 'SetRangeValue', payload: { rangeValue: 100 } } },
                    { '@type': 'ActionsToDirective', actions: ['Alexa.Actions.Lower'], directive: { name: 'AdjustRangeValue', payload: { rangeValueDelta: -10, rangeValueDeltaDefault: false } } },
                    { '@type': 'ActionsToDirective', actions: ['Alexa.Actions.Raise'], directive: { name: 'AdjustRangeValue', payload: { rangeValueDelta: 10, rangeValueDeltaDefault: false } } }
                  ],
                  stateMappings: [
                    { '@type': 'StatesToValue', states: ['Alexa.States.Closed'], value: 0 },
                    { '@type': 'StatesToRange', states: ['Alexa.States.Open'], range: { minimumValue: 1, maximumValue: 100 } }
                  ]
                }
              }
            ]
            
            if (hasStop) {
              endpoint.capabilities.push({
                type: 'AlexaInterface',
                interface: 'Alexa.PowerController',
                version: '3',
                properties: {
                  supported: [{ name: 'powerState' }],
                  proactivelyReported: false,
                  retrievable: false
                }
              })
            }
            
            endpoint.capabilities.push({
              type: 'AlexaInterface',
              interface: 'Alexa',
              version: '3'
            })
            endpoint.cookie = {
              maxDimLevel: device.MaxDimLevel,
              switchis: setSwitch,
              WhatAmI: 'blind'
            }
            endpoints.push(endpoint)
          } else if (setSwitch === 'Selector' && device.LevelNames) {
            // Decode level names from base64
            const levelNamesDecoded = Buffer.from(device.LevelNames, 'base64').toString('utf-8')
            const modes = levelNamesDecoded.split('|')
            
            // Use unique prefix to avoid ID conflicts
            endpoint.endpointId = 'selector_' + device.idx
            endpoint.displayCategories = ['OTHER']
            endpoint.capabilities = [
              {
                type: 'AlexaInterface',
                interface: 'Alexa.ModeController',
                version: '3',
                instance: device.Name.replace(/[^a-zA-Z0-9]/g, '') + '.Mode',
                capabilityResources: {
                  friendlyNames: [
                    {
                      '@type': 'text',
                      value: {
                        text: device.Name,
                        locale: 'en-US'
                      }
                    },
                    {
                      '@type': 'text',
                      value: {
                        text: device.Name,
                        locale: 'en-GB'
                      }
                    }
                  ]
                },
                properties: {
                  supported: [{ name: 'mode' }],
                  proactivelyReported: false,
                  retrievable: true
                },
                configuration: {
                  ordered: false,
                  supportedModes: modes.map((mode, index) => {
                    const friendlyNames = [
                      {
                        '@type': 'text',
                        value: {
                          text: mode,
                          locale: 'en-US'
                        }
                      },
                      {
                        '@type': 'text',
                        value: {
                          text: mode,
                          locale: 'en-GB'
                        }
                      }
                    ]
                    
                    // Add homophone alias for better voice recognition
                    if (mode === 'Allowed out') {
                      friendlyNames.push({
                        '@type': 'text',
                        value: {
                          text: 'Aloud out',
                          locale: 'en-US'
                        }
                      })
                      friendlyNames.push({
                        '@type': 'text',
                        value: {
                          text: 'Aloud out',
                          locale: 'en-GB'
                        }
                      })
                    }
                    
                    return {
                      value: 'Level.' + (index * 10),
                      modeResources: {
                        friendlyNames: friendlyNames
                      }
                    }
                  })
                }
              },
              {
                type: 'AlexaInterface',
                interface: 'Alexa',
                version: '3'
              }
            ]
            endpoint.cookie = {
              WhatAmI: 'selector',
              deviceName: device.Name
            }
            endpoints.push(endpoint)
          } else {
            // Regular light
            endpoint.displayCategories = ['LIGHT']
            endpoint.capabilities = [
              {
                type: 'AlexaInterface',
                interface: 'Alexa.PowerController',
                version: '3',
                properties: {
                  supported: [{ name: 'powerState' }],
                  proactivelyReported: false,
                  retrievable: true
                }
              }
            ]
            
            // Only add brightness control for dimmable lights
            if (setSwitch === 'Dimmer') {
              endpoint.capabilities.push({
                type: 'AlexaInterface',
                interface: 'Alexa.BrightnessController',
                version: '3',
                properties: {
                  supported: [{ name: 'brightness' }],
                  proactivelyReported: false,
                  retrievable: true
                }
              })
            }
            
            // Add color control for Color Switch devices
            if (devType.startsWith('Color Switch')) {
              endpoint.capabilities.push({
                type: 'AlexaInterface',
                interface: 'Alexa.ColorController',
                version: '3',
                properties: {
                  supported: [{ name: 'color' }],
                  proactivelyReported: false,
                  retrievable: true
                }
              })
            }
            
            endpoint.capabilities.push({
              type: 'AlexaInterface',
              interface: 'Alexa',
              version: '3'
            })
            
            endpoint.cookie = {
              maxDimLevel: device.MaxDimLevel,
              switchis: setSwitch,
              WhatAmI: 'light'
            }
            endpoints.push(endpoint)
          }
        } else if (devType.startsWith('Blind') || devType.startsWith('RFY') || 
                   (setSwitch && (setSwitch.includes('Blind') || setSwitch === 'Venetian Blinds EU' || setSwitch === 'Venetian Blinds US'))) {
          endpoint.displayCategories = ['INTERIOR_BLIND']
          const hasStop = setSwitch && setSwitch.includes('Stop')
          let hasPercentage = setSwitch && (setSwitch.includes('Percentage') || setSwitch.includes('%'))
          // Before 2025.2 (build 16813), "Blinds + Stop" also had percentage support
          if (!hasPercentage && setSwitch === 'Blinds + Stop' && isOldVersion) {
            hasPercentage = true
          }
          
          endpoint.capabilities = [
            {
              type: 'AlexaInterface',
              interface: 'Alexa.RangeController',
              version: '3',
              instance: 'Blind.Lift',
              capabilityResources: {
                friendlyNames: [
                  { '@type': 'asset', value: { assetId: 'Alexa.Setting.Opening' } },
                  { '@type': 'text', value: { text: 'Position', locale: 'en-US' } }
                ]
              },
              properties: {
                supported: [{ name: 'rangeValue' }],
                proactivelyReported: false,
                retrievable: hasPercentage
              },
              configuration: {
                supportedRange: { minimumValue: 0, maximumValue: 100, precision: 1 },
                presets: [
                  {
                    rangeValue: 0,
                    presetResources: {
                      friendlyNames: [
                        { '@type': 'asset', value: { assetId: 'Alexa.Value.Close' } },
                        { '@type': 'text', value: { text: 'Closed', locale: 'en-US' } }
                      ]
                    }
                  },
                  {
                    rangeValue: 100,
                    presetResources: {
                      friendlyNames: [
                        { '@type': 'asset', value: { assetId: 'Alexa.Value.Open' } },
                        { '@type': 'text', value: { text: 'Open', locale: 'en-US' } }
                      ]
                    }
                  }
                ]
              },
              semantics: {
                actionMappings: [
                  { '@type': 'ActionsToDirective', actions: ['Alexa.Actions.Close'], directive: { name: 'SetRangeValue', payload: { rangeValue: 0 } } },
                  { '@type': 'ActionsToDirective', actions: ['Alexa.Actions.Open'], directive: { name: 'SetRangeValue', payload: { rangeValue: 100 } } },
                  { '@type': 'ActionsToDirective', actions: ['Alexa.Actions.Lower'], directive: { name: 'AdjustRangeValue', payload: { rangeValueDelta: -10, rangeValueDeltaDefault: false } } },
                  { '@type': 'ActionsToDirective', actions: ['Alexa.Actions.Raise'], directive: { name: 'AdjustRangeValue', payload: { rangeValueDelta: 10, rangeValueDeltaDefault: false } } }
                ],
                stateMappings: [
                  { '@type': 'StatesToValue', states: ['Alexa.States.Closed'], value: 0 },
                  { '@type': 'StatesToRange', states: ['Alexa.States.Open'], range: { minimumValue: 1, maximumValue: 100 } }
                ]
              }
            }
          ]
          
          if (hasStop) {
            endpoint.capabilities.push({
              type: 'AlexaInterface',
              interface: 'Alexa.PowerController',
              version: '3',
              properties: {
                supported: [{ name: 'powerState' }],
                proactivelyReported: false,
                retrievable: false
              }
            })
          }
          
          endpoint.capabilities.push({
            type: 'AlexaInterface',
            interface: 'Alexa',
            version: '3'
          })
          
          endpoint.cookie = {
            maxDimLevel: device.MaxDimLevel,
            switchis: setSwitch,
            WhatAmI: 'blind'
          }
          endpoints.push(endpoint)
        } else if (devType.startsWith('Lock') || devType.startsWith('Contact')) {
          endpoint.displayCategories = ['SMARTLOCK']
          endpoint.capabilities = [
            {
              type: 'AlexaInterface',
              interface: 'Alexa.LockController',
              version: '3',
              properties: {
                supported: [{ name: 'lockState' }],
                proactivelyReported: false,
                retrievable: true
              }
            },
            {
              type: 'AlexaInterface',
              interface: 'Alexa',
              version: '3'
            }
          ]
          endpoint.cookie = {
            switchis: setSwitch,
            WhatAmI: 'lock'
          }
          endpoints.push(endpoint)
        } else if (devType.startsWith('Temp + Humidity')) {
          endpoint.displayCategories = ['TEMPERATURE_SENSOR']
          endpoint.capabilities = [
            {
              type: 'AlexaInterface',
              interface: 'Alexa.TemperatureSensor',
              version: '3',
              properties: {
                supported: [{ name: 'temperature' }],
                proactivelyReported: false,
                retrievable: true
              }
            },
            {
              type: 'AlexaInterface',
              interface: 'Alexa.HumiditySensor',
              version: '3',
              properties: {
                supported: [{ name: 'humidity' }],
                proactivelyReported: false,
                retrievable: true
              }
            },
            {
              type: 'AlexaInterface',
              interface: 'Alexa',
              version: '3'
            }
          ]
          endpoint.cookie = {
            WhatAmI: 'humidity'
          }
          endpoints.push(endpoint)
        } else if (devType.startsWith('Humidity')) {
          endpoint.displayCategories = ['OTHER']
          endpoint.capabilities = [
            {
              type: 'AlexaInterface',
              interface: 'Alexa.HumiditySensor',
              version: '3',
              properties: {
                supported: [{ name: 'humidity' }],
                proactivelyReported: false,
                retrievable: true
              }
            },
            {
              type: 'AlexaInterface',
              interface: 'Alexa',
              version: '3'
            }
          ]
          endpoint.cookie = {
            WhatAmI: 'humidity'
          }
          endpoints.push(endpoint)
        } else if (devType === 'Thermostat') {
          endpoint.displayCategories = ['THERMOSTAT']
          endpoint.capabilities = [
            {
              type: 'AlexaInterface',
              interface: 'Alexa.ThermostatController',
              version: '3',
              properties: {
                supported: [
                  { name: 'targetSetpoint' }
                ],
                proactivelyReported: false,
                retrievable: true
              }
            }
          ]
          
          // Check if device has temperature reading or find related temperature device
          let hasTemp = device.Temp !== undefined
          let tempDeviceIdx = null
          
          if (!hasTemp) {
            // Try to find related temperature device by name
            const baseName = device.Name.replace(/\s+(Setpoint|SetPoint)$/i, '')
            const tempDevice = devArray.find(d => 
              d.Name === baseName + ' Temperature' && 
              d.Type.startsWith('Temp') &&
              d.PlanID !== '0' && d.PlanID !== ''
            )
            if (tempDevice) {
              hasTemp = true
              tempDeviceIdx = tempDevice.idx
            }
          }
          
          if (hasTemp) {
            endpoint.capabilities.push({
              type: 'AlexaInterface',
              interface: 'Alexa.TemperatureSensor',
              version: '3',
              properties: {
                supported: [{ name: 'temperature' }],
                proactivelyReported: false,
                retrievable: true
              }
            })
          }
          
          endpoint.capabilities.push({
            type: 'AlexaInterface',
            interface: 'Alexa',
            version: '3'
          })
          
          endpoint.cookie = {
            WhatAmI: 'temp',
            tempDeviceIdx: tempDeviceIdx
          }
          endpoints.push(endpoint)
        } else if (devType.startsWith('Temp')) {
          endpoint.displayCategories = ['TEMPERATURE_SENSOR']
          endpoint.capabilities = [
            {
              type: 'AlexaInterface',
              interface: 'Alexa.TemperatureSensor',
              version: '3',
              properties: {
                supported: [{ name: 'temperature' }],
                proactivelyReported: false,
                retrievable: true
              }
            }
          ]
          
          // Check if this temperature device has a linked setpoint
          const setpointIdx = setpointLinks.get(device.idx)
          if (setpointIdx) {
            // Add thermostat controller capability
            endpoint.displayCategories = ['THERMOSTAT']
            endpoint.capabilities.unshift({
              type: 'AlexaInterface',
              interface: 'Alexa.ThermostatController',
              version: '3',
              properties: {
                supported: [
                  { name: 'targetSetpoint' }
                ],
                proactivelyReported: false,
                retrievable: true
              }
            })
            endpoint.cookie = {
              WhatAmI: 'temp',
              setpointDeviceIdx: setpointIdx
            }
          } else {
            endpoint.cookie = {
              WhatAmI: 'temp'
            }
          }
          
          endpoint.capabilities.push({
            type: 'AlexaInterface',
            interface: 'Alexa',
            version: '3'
          })
          endpoints.push(endpoint)
        } else if (devType === 'Weight') {
          endpoint.displayCategories = ['OTHER']
          endpoint.capabilities = [
            {
              type: 'AlexaInterface',
              interface: 'Alexa.RangeController',
              version: '3',
              instance: 'Weight.Weight',
              capabilityResources: {
                friendlyNames: [
                  {
                    '@type': 'text',
                    value: {
                      text: 'Weight',
                      locale: 'en-US'
                    }
                  }
                ]
              },
              properties: {
                supported: [
                  {
                    name: 'rangeValue'
                  }
                ],
                proactivelyReported: false,
                retrievable: true,
                nonControllable: true
              },
              configuration: {
                supportedRange: {
                  minimumValue: 0,
                  maximumValue: 100,
                  precision: 0.01
                },
                unitOfMeasure: 'Weight.Kilograms'
              }
            },
            {
              type: 'AlexaInterface',
              interface: 'Alexa',
              version: '3'
            }
          ]
          endpoint.cookie = {
            WhatAmI: 'weight'
          }
          endpoints.push(endpoint)
        } else if (devType === 'General') {
          // Determine what type of general sensor based on SubType or Data
          const data = device.Data || ''
          const subType = device.SubType
          
          if (subType === 'Percentage' && device.Name.toLowerCase().includes('battery')) {
            // Battery percentage
            endpoint.displayCategories = ['OTHER']
            endpoint.capabilities = [
              {
                type: 'AlexaInterface',
                interface: 'Alexa.PercentageController',
                version: '3',
                properties: {
                  supported: [{ name: 'percentage' }],
                  proactivelyReported: false,
                  retrievable: true,
                  nonControllable: true
                }
              },
              {
                type: 'AlexaInterface',
                interface: 'Alexa',
                version: '3'
              }
            ]
            endpoint.cookie = {
              WhatAmI: 'general',
              unit: 'percentage'
            }
            endpoints.push(endpoint)
          } else if (data.includes('pH')) {
            // pH sensor
            endpoint.displayCategories = ['OTHER']
            endpoint.capabilities = [
              {
                type: 'AlexaInterface',
                interface: 'Alexa.RangeController',
                version: '3',
                instance: 'Sensor.pH',
                capabilityResources: {
                  friendlyNames: [
                    {
                      '@type': 'text',
                      value: {
                        text: 'pH',
                        locale: 'en-US'
                      }
                    }
                  ]
                },
                properties: {
                  supported: [{ name: 'rangeValue' }],
                  proactivelyReported: false,
                  retrievable: true,
                  nonControllable: true
                },
                configuration: {
                  supportedRange: {
                    minimumValue: 0,
                    maximumValue: 14,
                    precision: 0.1
                  }
                }
              },
              {
                type: 'AlexaInterface',
                interface: 'Alexa',
                version: '3'
              }
            ]
            endpoint.cookie = {
              WhatAmI: 'general',
              unit: 'pH'
            }
            endpoints.push(endpoint)
          } else if (data.includes('g/m³')) {
            // Absolute humidity sensor
            endpoint.displayCategories = ['OTHER']
            endpoint.capabilities = [
              {
                type: 'AlexaInterface',
                interface: 'Alexa.RangeController',
                version: '3',
                instance: 'Sensor.AbsoluteHumidity',
                capabilityResources: {
                  friendlyNames: [
                    {
                      '@type': 'text',
                      value: {
                        text: 'Absolute Humidity',
                        locale: 'en-US'
                      }
                    }
                  ]
                },
                properties: {
                  supported: [{ name: 'rangeValue' }],
                  proactivelyReported: false,
                  retrievable: true,
                  nonControllable: true
                },
                configuration: {
                  supportedRange: {
                    minimumValue: 0,
                    maximumValue: 50,
                    precision: 0.01
                  },
                  unitOfMeasure: 'Alexa.Unit.Density.GramsPerCubicMeter'
                }
              },
              {
                type: 'AlexaInterface',
                interface: 'Alexa',
                version: '3'
              }
            ]
            endpoint.cookie = {
              WhatAmI: 'general',
              unit: 'g/m³'
            }
            endpoints.push(endpoint)
          }
          // Skip kWh and other general sensors
        }
      }
    }
    
    console.log('Discovery complete:', endpoints.length, 'endpoints created')
    
    const result = {
      event: {
        header: headers,
        payload: {
          endpoints: endpoints
        }
      }
    }
    passBack(result)
  })
}
