/* -*- coding: utf-8 -*- */

/*
 Copyright 2016-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.

 Licensed under the Amazon Software License (the "License"). You may not use this file except in
 compliance with the License. A copy of the License is located at

 http://aws.amazon.com/asl/

 or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific
 language governing permissions and limitations under the License.
 */

/*
 Alexa Smart Home API Validation Package for Node.js.

 This module is used by Alexa Smart Home API third party (3P) developers to validate their Lambda
 responses before sending them back to Alexa. If an error is found, an exception is thrown so that
 the 3P can catch the error and do something about it, instead of sending it back to Alexa and
 causing an error on the Alexa side.

 The validations are based on the current public Alexa Smart Home API reference:
 https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference
 */

"use strict";

/*
 * Various constants used in validation.
 */

var VALID_DISCOVERY_REQUEST_NAMES = [
    'DiscoverAppliancesRequest'
];
var VALID_CONTROL_REQUEST_NAMES = [
    'TurnOnRequest',
    'TurnOffRequest',
    'SetTargetTemperatureRequest',
    'IncrementTargetTemperatureRequest',
    'DecrementTargetTemperatureRequest',
    'SetPercentageRequest',
    'IncrementPercentageRequest',
    'DecrementPercentageRequest',
    'SetLockStateRequest',
    'SetColorRequest',
    'SetColorTemperatureRequest',
    'IncrementColorTemperatureRequest',
    'DecrementColorTemperatureRequest'
];
var VALID_QUERY_REQUEST_NAMES = [
    'GetLockStateRequest',
    'GetTemperatureReadingRequest',
    'GetTargetTemperatureRequest'
];
var VALID_SYSTEM_REQUEST_NAMES = [
    'HealthCheckRequest'
];
var VALID_REQUEST_NAMES = VALID_DISCOVERY_REQUEST_NAMES
    .concat(VALID_CONTROL_REQUEST_NAMES)
    .concat(VALID_SYSTEM_REQUEST_NAMES)
    .concat(VALID_QUERY_REQUEST_NAMES);

var VALID_DISCOVERY_RESPONSE_NAMES = [
    'DiscoverAppliancesResponse'
];
var VALID_CONTROL_RESPONSE_NAMES = [
    'TurnOnConfirmation',
    'TurnOffConfirmation',
    'SetTargetTemperatureConfirmation',
    'IncrementTargetTemperatureConfirmation',
    'DecrementTargetTemperatureConfirmation',
    'SetPercentageConfirmation',
    'IncrementPercentageConfirmation',
    'DecrementPercentageConfirmation',
    'SetLockStateConfirmation',
    'SetColorConfirmation',
    'SetColorTemperatureConfirmation',
    'IncrementColorTemperatureConfirmation',
    'DecrementColorTemperatureConfirmation'
];
var VALID_QUERY_RESPONSE_NAMES = [
    'GetLockStateResponse',
    'GetTemperatureReadingResponse',
    'GetTargetTemperatureResponse'
];
var VALID_CONTROL_ERROR_RESPONSE_NAMES = [
    'ValueOutOfRangeError',
    'TargetOfflineError',
    'BridgeOfflineError',
    'NoSuchTargetError',
    'DriverInternalError',
    'DependentServiceUnavailableError',
    'TargetConnectivityUnstableError',
    'TargetBridgeConnectivityUnstableError',
    'TargetFirmwareOutdatedError',
    'TargetBridgeFirmwareOutdatedError',
    'TargetHardwareMalfunctionError',
    'TargetBridgeHardwareMalfunctionError',
    'UnableToGetValueError',
    'UnableToSetValueError',
    'UnwillingToSetValueError',
    'RateLimitExceededError',
    'NotSupportedInCurrentModeError',
    'ExpiredAccessTokenError',
    'InvalidAccessTokenError',
    'UnsupportedTargetError',
    'UnsupportedOperationError',
    'UnsupportedTargetSettingError',
    'UnexpectedInformationReceivedError'
];
var VALID_SYSTEM_RESPONSE_NAMES = [
    'HealthCheckResponse'
];
var VALID_RESPONSE_NAMES = VALID_DISCOVERY_RESPONSE_NAMES
    .concat(VALID_CONTROL_RESPONSE_NAMES)
    .concat(VALID_CONTROL_ERROR_RESPONSE_NAMES)
    .concat(VALID_SYSTEM_RESPONSE_NAMES)
    .concat(VALID_QUERY_RESPONSE_NAMES);

var VALID_NON_EMPTY_PAYLOAD_RESPONSE_NAMES = [
    'SetColorConfirmation',
    'SetColorTemperatureConfirmation',
    'IncrementColorTemperatureConfirmation',
    'DecrementColorTemperatureConfirmation',
    'SetTargetTemperatureConfirmation',
    'IncrementTargetTemperatureConfirmation',
    'DecrementTargetTemperatureConfirmation',
    'GetTemperatureReadingResponse',
    'GetTargetTemperatureResponse',
    'SetLockStateConfirmation',
    'GetLockStateResponse',
    'ValueOutOfRangeError',
    'DependentServiceUnavailableError',
    'TargetFirmwareOutdatedError',
    'TargetBridgeFirmwareOutdatedError',
    'UnableToGetValueError',
    'UnableToSetValueError',
    'UnwillingToSetValueError',
    'RateLimitExceededError',
    'NotSupportedInCurrentModeError',
    'UnexpectedInformationReceivedError'
];
var VALID_ACTIONS = [
    'decrementColorTemperature',
    'decrementPercentage',
    'decrementTargetTemperature',
    'getTargetTemperature',
    'getTemperatureReading',
    'getLockState',
    'incrementColorTemperature',
    'incrementPercentage',
    'incrementTargetTemperature',
    'setColor',
    'setColorTemperature',
    'setLockState',
    'setPercentage',
    'setTargetTemperature',
    'turnOff',
    'turnOn'
];
var VALID_TEMPERATURE_MODES = [
    'HEAT',
    'COOL',
    'AUTO',
    'ECO',
    'OFF',
    'CUSTOM'
];
var VALID_CURRENT_DEVICE_MODES = [
    'HEAT',
    'COOL',
    'AUTO',
    'AWAY',
    'OTHER',
    'COLOR'
]
var VALID_LOCK_STATES = [
    'LOCKED',
    'UNLOCKED'
];
var VALID_UNWILLING_ERROR_INFO_CODES = [
    'ThermostatIsOff'
];
var VALID_UNABLE_ERROR_INFO_CODES = [
    'DEVICE_AJAR',
    'DEVICE_BUSY',
    'DEVICE_JAMMED',
    'DEVICE_OVERHEATED',
    'HARDWARE_FAILURE',
    'LOW_BATTERY',
    'NOT_CALIBRATED'
];
var VALID_TIME_UNITS = [
    'MINUTE',
    'HOUR',
    'DAY'
];
var REQUIRED_RESPONSE_KEYS = [
    'header',
    'payload'
];
var REQUIRED_HEADER_KEYS = [
    'namespace',
    'name',
    'payloadVersion',
    'messageId'
];
var REQUIRED_DISCOVERED_APPLIANCE_KEYS = [
    'applianceId',
    'manufacturerName',
    'modelName',
    'version',
    'friendlyName',
    'friendlyDescription',
    'isReachable',
    'actions',
    'additionalApplianceDetails'
];
var MAX_DISCOVERED_APPLIANCES = 300;

function validateContext(context){
    /*Validate the Lambda context.

     Currently, this method just checks to ensure that the Lambda timeout is set to 7 seconds or less.
     This is to ensure that your Lambda times out and errors before Alexa times out (8 seconds),
     allowing you to see the timeout error. Otherwise, you could take > 8 seconds to respond and even
     though you think you have responded properly and without error, Alexa actually timed out resulting
     in an error to the user.

     NOTE: if your skill handles locks, then set the timeout here to 60 seconds or less, as is required
     by the locks portion of the Smart Home Skill API.
     */
   /* if(context.getRemainingTimeInMillis() > 7000){
        throw new Error(generateErrorMessage('Lambda', 'timeout must be 7 seconds or less (if your skill handles locks, change timeout validation to 60 seconds or less)', context));
    }*/
}

function validateResponse(request, response){
    /*Validate the response to a request.

     This is the main validation method to be called in your Lambda handler, just before you return
     the response to Alexa. This method validates the request to ensure it is valid, and then dispatches
     to specific response validation methods depending on the request namespace.
     */

    // Validate request
    if (!request){
        throw new Error(generateErrorMessage('Request', 'request is missing', request));
    }
    if (isEmpty(request)){
        throw new Error(generateErrorMessage('Request', 'request must not be empty', request));
    }
    try{
        var requestNamespace = request.header.namespace;
    }
    catch(err){
        throw new Error(generateErrorMessage('Request','request is invalid',request));
    }

    // Validate response
    if (!response){
        throw new Error(generateErrorMessage('Response', 'response is missing', response));
    }
    if (isEmpty(response)){
        throw new Error(generateErrorMessage('Response', 'response must not be empty', response));
    }
    REQUIRED_RESPONSE_KEYS.forEach( function(required_key){
        if(!(required_key in response)){
            throw new Error(generateErrorMessage('Response', required_key + ' is missing', response));
        }
    });

    if(request.header.namespace === 'Alexa.ConnectedHome.Discovery'){
        validateDiscoveryResponse(request, response);
    }
    else if (request.header.namespace === 'Alexa.ConnectedHome.Control'){
        validateControlResponse(request, response);
    }
    else if (request.header.namespace === 'Alexa.ConnectedHome.Query'){
        validateQueryResponse(request, response);
    }
    else if (request.header.namespace === 'Alexa.ConnectedHome.System'){
        validateSystemResponse(request,response);
    }
    else{
        throw new Error(generateErrorMessage('Request', 'request is invalid', request));
    }
}

function validateSystemResponse(request,response){
    /*Validate the response to a Health Check request.

     This method validates the response to a Health Check request, based on the API reference:
     https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#health-check-messages
     */

    //Validate header
    validateResponseHeader(request,response);
    var response_name = response.header.name;

    // Validate response payload
    try{
        payload = response.payload;
    }
    catch (err){
        throw new Error(generateErrorMessage(response.header.name, 'payload is missing', payload));
    }
    if (!payload){
        throw new Error(generateErrorMessage(response.header.name, 'payload is missing', payload));
    }

    ['description','isHealthy'].forEach( function(required_key){
        if (!(required_key in payload)){
            throw new Error(generateErrorMessage(response_name,'payload.' + required_key + ' is missing',payload));
        }
    });
    if (isEmpty(payload.description)){
        throw new Error(generateErrorMessage(response_name,'payload.description must not be empty',payload));
    }
    if (!(payload.isHealthy instanceof boolean)){
        throw new Error(generateErrorMessage(response_name,'payload.isHealthy must be a boolean',payload));
    }
}

function validateDiscoveryResponse(request, response){
    /*Validate the response to a DiscoverApplianceRequest request.

     This method validates the response to a DiscoverApplianceRequest request, based on the API reference:
     https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#discoverappliancesresponse
     */

    // Validate header
    validateResponseHeader(request, response);

    var payload = response.payload;
    var response_name = response.header.name;

    // Validate response payload
    if (!payload){
        throw new Error(generateErrorMessage(response.header.name, 'payload is missing', payload));
    }
    if (isEmpty(payload)){
        throw new Error(generateErrorMessage(response.header.name, 'payload must not be empty', payload));
    }
    if (!(payload instanceof Object)){
        throw new Error(generateErrorMessage('Response','request must be a Array',request));
    }
    if (!('discoveredAppliances' in payload)){
        throw new Error(generateErrorMessage(response_name, 'payload.discoveredAppliances is missing', payload));
    }
    if (!Array.isArray(payload.discoveredAppliances)){
        throw new Error(generateErrorMessage(response_name, 'payload.discoveredAppliances must be an Array, can be empty', payload));
    }
    if (payload.discoveredAppliances.length > MAX_DISCOVERED_APPLIANCES){
        throw new Error(generateErrorMessage(response_name,'payload.discoveredAppliances must not contain more than 300 appliances', payload));
    }

    // loop through discovered appliances
    payload.discoveredAppliances.forEach( function(appliance){
        // check required appliance keys
        REQUIRED_DISCOVERED_APPLIANCE_KEYS.forEach( function(key){
            if (!(key in appliance)){
                throw new Error(generateErrorMessage(response_name, key + ' is missing', appliance));
            }
        });
        if (isEmpty(appliance.applianceId)){
            throw new Error(generateErrorMessage(response_name, 'applianceId must not be empty', appliance));
        }
        if (appliance.applianceId.length > 256){
            throw new Error(generateErrorMessage(response_name, 'applianceId cannot be exceed 256 characters', appliance));
        }
        if (!appliance.applianceId.match("^[a-zA-Z0-9_\\-=;:?@&]*$")){
            throw new Error(generateErrorMessage(response_name, 'applianceId must be alphanumeric ' + 'or the following special characters: _-=;:?@&', appliance));
        }
        if (isEmpty(appliance.manufacturerName)){
            throw new Error(generateErrorMessage(response_name, 'manufacturerName must not be empty', appliance));
        }
        if (appliance.manufacturerName.length > 128){
            throw new Error(generateErrorMessage(response_name, 'manufacturerName cannot exceed 128 characters', appliance));
        }
        if (isEmpty(appliance.modelName)){
            throw new Error(generateErrorMessage(response_name, 'modelName cannot be empty', appliance));
        }
        if (appliance.modelName.length > 128){
            throw new Error(generateErrorMessage(response_name, 'modelName cannot exceed 128 characters', appliance));
        }
        if (isEmpty(appliance.version)){
            throw new Error(generateErrorMessage(response_name, 'version cannot be empty', appliance));
        }
        if (appliance.version.length > 128){
            throw new Error(generateErrorMessage(response_name, 'version cannot exceed 128 characters', appliance));
        }
        if (isEmpty(appliance.friendlyName)){
            throw new Error(generateErrorMessage(response_name, 'friendlyName cannot be empty', appliance));
        }
        if (appliance.friendlyName.length > 128){
            throw new Error(generateErrorMessage(response_name, 'friendlyName cannot exceed 128 characters', appliance));
        }
        if (!appliance.friendlyName.match("^[a-zA-Z0-9äüöÄÜÖß ]*$")){
            throw new Error(generateErrorMessage(response_name, 'friendlyName cannot contain punctuation or special characters', appliance));
        }
        if (isEmpty(appliance.friendlyDescription)){
            throw new Error(generateErrorMessage(response_name, 'friendlyDescription cannot be empty', appliance));
        }
        if (appliance.friendlyDescription.length > 128){
            throw new Error(generateErrorMessage(response_name, 'friendlyDescription cannot exceed 128 characters', appliance));
        }
        if (!(appliance.isReachable instanceof Boolean || typeof appliance.isReachable === 'boolean')){
            throw new Error(generateErrorMessage(response_name, 'isReachable must be a boolean', appliance));
        }
        if (!(appliance.actions instanceof Array)){
            throw new Error(generateErrorMessage(response_name, 'actions must be a list', appliance));
        }
        if (isEmpty(appliance.actions)){
            throw new Error(generateErrorMessage(response_name, 'actions cannot be empty', appliance));
        }
        appliance.actions.forEach( function(action){
            if(!(isInArray(VALID_ACTIONS, action))){
                throw new Error(generateErrorMessage(response_name, JSON.stringify(action) + ' is not an allowed action', appliance));
            }
        });
        if (appliance.additionalApplianceDetails != null){
            if (Buffer.byteLength(JSON.stringify(appliance.additionalApplianceDetails), 'utf8') > 5000){
                throw new Error(generateErrorMessage(response_name,'additionalApplianceDetails must not exceed 5000 bytes', appliance));
            }
        }
    });
}

function validateControlResponse(request, response){
    /*Validate the response to a Control request.

     This method validates the response to a Control (e.g. turn on/off, set temperatures, etc.) request, based on the API reference (starting from):
     https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#onoff-messages
     */

    // Validate header
    validateResponseHeader(request, response);

    var payload;
    var request_name = request.header.name;
    var response_name = response.header.name;

    try{
        payload = response.payload;
    } catch (err){
        throw new Error(generateErrorMessage(response_name, 'payload is missing', payload));
    }
    // Validate response payload
    if (!payload){
        throw new Error(generateErrorMessage(response_name, 'payload is missing', payload));
    }
    if (!(payload instanceof Object)){
        throw new Error(generateErrorMessage(response_name, 'payload must be an Object', payload));
    }
    // Validate non-empty control response payload
    if (isInArray(VALID_NON_EMPTY_PAYLOAD_RESPONSE_NAMES,response_name)){
        if (isEmpty(payload)){
            throw new Error(generateErrorMessage(response_name, 'payload cannot be empty', payload))
        }
    }
    else{
        if (!isEmpty(payload)){
            throw new Error(generateErrorMessage(response_name, 'payload must be empty', payload))
        }
    }
    // Validate color and color temperature control response payload
    if (isInArray(['SetColorConfirmation','SetColorTemperatureConfirmation','IncrementColorTemperatureConfirmation','DecrementColorTemperatureConfirmation'], response_name)){
        // Validate payload
        if (!('achievedState' in payload)){
            throw new Error(generateErrorMessage(response_name, 'payload.achievedState is missing', payload));
        }

        if(isInArray(['SetColorConfirmation'], response_name)){
            if (!('color' in payload.achievedState)){
                throw new Error(generateErrorMessage(response_name, 'payload.achievedState.color is missing', payload));
            }
            ['hue','saturation','brightness'].forEach( function(key){
                if (!(key in payload.achievedState.color)){
                    throw new Error(generateErrorMessage(response_name, 'payload.achievedState.color.' + key + ' is missing', payload));
                }
                if (typeof payload.achievedState.color[key] != 'number'){
                    throw new Error(generateErrorMessage(response_name,'payload.achievedState.color.' + key + '.value must be a number',payload));
                }
            });
            if (payload.achievedState.color.hue < 0 || payload.achievedState.color.hue > 360){
                throw new Error(generateErrorMessage(response_name, 'payload.achievedState.color.hue must be between 0.00 and 360.00 inclusive', payload));
            }
            if (payload.achievedState.color.saturation < 0 || payload.achievedState.color.saturation > 1){
                throw new Error(generateErrorMessage(response_name, 'payload.achievedState.color.saturation must be between 0.0000 and 1.0000 inclusive', payload));
            }
            if (payload.achievedState.color.brightness < 0 || payload.achievedState.color.brightness > 1){
                throw new Error(generateErrorMessage(response_name, 'payload.achievedState.color.brightness must be between 0.0000 and 1.0000 inclusive', payload));
            }
        }

        if(isInArray(['SetColorTemperatureConfirmation','IncrementColorTemperatureConfirmation','DecrementColorTemperatureConfirmation'], response_name)){
            if (!('colorTemperature' in payload.achievedState)){
                throw new Error(generateErrorMessage(response_name, 'payload.achievedState.colorTemperature is missing', payload));
            }
            if (!('value' in payload.achievedState.colorTemperature)){
                throw new Error(generateErrorMessage(response_name, 'payload.achievedState.colorTemperature.value is missing', payload));
            }
            if (typeof payload.achievedState.colorTemperature.value != 'number'){
                throw new Error(generateErrorMessage(response_name,'payload.achievedState.colorTemperature.value must be an integer',payload));
            }
            if (payload.achievedState.colorTemperature.value < 1000 || payload.achievedState.colorTemperature.value > 10000){
                throw new Error(generateErrorMessage(response_name, 'payload.achievedState.colorTemperature.value must be between 1000 and 10000 inclusive', payload));
            }
        }
    }
    // Validate thermostat control response payload
    if (isInArray(['SetTargetTemperatureConfirmation','IncrementTargetTemperatureConfirmation','DecrementTargetTemperatureConfirmation'], response_name)){
        // Validate payload
        ['targetTemperature','temperatureMode','previousState'].forEach( function(key){
            if (!(key in payload)){
                throw new Error(generateErrorMessage(response_name, 'payload.' + key + ' is missing', payload));
            }
            if (!('value' in payload.targetTemperature)){
                throw new Error(generateErrorMessage(response_name, 'payload.targetTemperature.value is missing', payload));
            }
            if (typeof payload.targetTemperature.value != "number"){
                throw new Error(generateErrorMessage(response_name,'payload.targetTemperature.value must be a number', payload));
            }
            if (!('value' in payload.temperatureMode)){
                throw new Error(generateErrorMessage(response_name, 'payload.temperatureMode.value is missing', payload));
            }
            if (!(isInArray(VALID_TEMPERATURE_MODES, payload.temperatureMode.value))){
                throw new Error(generateErrorMessage(response_name,'payload.temperatureMode.value is invalid', payload));
            }

            // Validate payload.previousState
            ['targetTemperature','temperatureMode'].forEach( function(key){
                if (!(key in payload.previousState)){
                    throw new Error(generateErrorMessage(response_name, 'payload.previousState.' + key + ' is missing', payload));
                }
            });
            if (!('value' in payload.previousState.targetTemperature)){
                throw new Error(generateErrorMessage(response_name, 'payload.previousState.targetTemperature.value is missing', payload));
            }
            if (typeof payload.previousState.targetTemperature.value != "number"){
                throw new Error(generateErrorMessage(response_name, 'payload.previousState.targetTemperature.value must be a number', payload));
            }
            if (!('value' in payload.previousState.temperatureMode)){
                throw new Error(generateErrorMessage(response_name, 'payload.previousState.temperatureMode.value is missing', payload));
            }
            if (!(isInArray(VALID_TEMPERATURE_MODES, payload.previousState.temperatureMode.value))){
                throw new Error(generateErrorMessage(response_name, 'payload.previousState.temperatureMode.value is invalid', payload));
            }
        });
    }
    // Validate lock control response payload
    if(response_name in ['SetLockStateResponse']){
        if (!('lockState' in payload)){
            throw new Error(generateErrorMessage(response_name,'payload.lockState is missing', payload));
        }
        if (!(payload['lockState'] in VALID_LOCK_STATES)){
            throw new Error(generateErrorMessage(response_name,'payload.lockState is invalid',payload));
        }
    }
    // Validate control error response payload
    if (response_name === 'ValueOutOfRangeError'){
        ['minimumValue','maximumValue'].forEach(function(key){
            if (!(key in payload)){
                throw new Error(generateErrorMessage(response_name, 'payload.' + key + ' is missing', payload));
            }
            if (typeof payload[key] != "number"){
                throw new Error(generateErrorMessage(response_name, 'payload.' + key + ' must be a number', payload));
            }
        });
    }
    if (response_name === 'DependentServiceUnavailableError'){
        if (!('dependentServiceName' in payload)){
            throw new Error(generateErrorMessage(response_name, 'payload.dependentServiceName is missing', payload));
        }
        if (!payload.dependentServiceName.match('^[a-zA-Z0-9 ]*$')){
            throw new Error(generateErrorMessage(response_name, 'payload.dependentServiceName must be specifed in alphanumeric characters and spaces', payload));
        }
    }
    if ( isInArray(['TargetFirmwareOutdatedError','TargetBridgeFirmwareOutdatedError'], response_name)){
        ['minimumFirmwareVersion','currentFirmwareVersion'].forEach( function(key){
            if (!(key in payload)){
                throw new Error(generateErrorMessage(response_name, 'payload.' + key + ' is missing', payload));
            }
            if (isEmpty(payload[key])){
                throw new Error(generateErrorMessage(response_name, 'payload.' + key + ' must not be empty', payload));
            }
            if (!(payload[key].match('^[a-zA-Z0-9äüöÄÜÖß]*$'))){
                throw new Error(generateErrorMessage(response_name, 'payload.' + key + ' must be specifed in alphanumeric characters and spaces', payload));

            }
        });
    }
    if (response_name === 'UnableToSetValueError'){
        if (!('errorInfo' in payload)){
            throw new Error(generateErrorMessage(response_name, 'payload.errorInfo is missing', payload));
        }
        ['code','description'].forEach( function(key){
            if (!(key in payload.errorInfo)){
                throw new Error(generateErrorMessage(response_name, 'payload.errorInfo.' + key + ' is missing', payload));
            }
        });
        if (!isInArray(VALID_UNABLE_ERROR_INFO_CODES,payload.errorInfo.code)){
            throw new Error(generateErrorMessage(response_name,'payload.errorInfo.code is invalid',payload));
        }
    }
    if (response_name === 'UnableToGetValueError'){
        validateQueryResponse(request,response);
    }
    if (response_name === 'UnwillingToSetValueError'){
        if (!('errorInfo' in payload)){
            throw new Error(generateErrorMessage(response_name, 'payload.errorInfo is missing', payload));
        }
        ['code','description'].forEach( function(key){
            if (!(key in payload.errorInfo)){
                throw new Error(generateErrorMessage(response_name, 'payload.errorInfo.' + key + ' is missing', payload));
            }
        });
        if (!(isInArray(VALID_UNWILLING_ERROR_INFO_CODES, payload.errorInfo.code))){
            throw new Error(generateErrorMessage(response_name, 'payload.errorInfo.code is invalid', payload));
        }
    }
    if (response_name === 'RateLimitExceededError'){
        ['rateLimit','timeUnit'].forEach( function(key){
            if (!(key in payload)){
                throw new Error(generateErrorMessage(response_name, 'payload.' + key + ' is missing', payload));
            }
        });
        if (payload.rateLimit <= 0){
            throw new Error(generateErrorMessage(response_name, 'payload.rateLimit must be a positive integer', payload));
        }
        if (!(isInArray(VALID_TIME_UNITS, payload.timeUnit))){
            throw new Error(generateErrorMessage(response_name, 'payload.timeUnit is invalid', payload));
        }
    }

    if (response_name === 'NotSupportedInCurrentModeError'){
        if (!('currentDeviceMode' in payload)){
            throw new Error(generateErrorMessage(response_name, 'payload.currentDeviceMode is missing', payload));
        }
        if (!(isInArray(VALID_CURRENT_DEVICE_MODES, payload.currentDeviceMode))){
            throw new Error(generateErrorMessage(response_name, 'payload.currentDeviceMode is invalid', payload));
        }
    }

    if (response_name === 'UnexpectedInformationReceivedError'){
        if (!('faultingParameter' in payload)){
            throw new Error(generateErrorMessage(response_name, 'payload.faultingParameter is missing', payload));
        }
        if (isEmpty(payload.faultingParameter)){
            throw new Error(generateErrorMessage(response_name, 'payload.faultingParameter must not be empty', payload));
        }
    }
}
function validateQueryResponse(request,response){
    /*"""Validate the response to a Query request.

     This method validates the response to a Query (e.g. ambient temperature, lock state, etc.) request, based on the API reference (starting from):
     https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#onoff-messages
     """
     */
    // Validate header
    validateResponseHeader(request,response);
    response_name = response.header.name

    // Validate response payload
    try{
        payload = response.payload;
    }
    catch(err){
        throw new Error(generateErrorMessage(response_name,'payload is missing',response));
    }
    if (!payload){
        throw new Error(generateErrorMessage(response_name,'payload is missing',payload));
    }
    if (!payload instanceof Object){
        throw new Error(generateErrorMessage(response_name,'payload must be an Array',payload));
    }
    // Validate non-empty control response payload
    if (isInArray(VALID_NON_EMPTY_PAYLOAD_RESPONSE_NAMES, response_name)){
        if (isEmpty(payload)){
            throw new Error(generateErrorMessage(response_name,'payload must not be empty',payload));
        }
    }
    else{
        if (!isEmpty(payload)){
            throw new Error(generateErrorMessage(response_name,'payload must be empty',payload));
        }
    }
    // Validate thermostat query response payload
    if (response_name === 'GetTemperatureReadingResponse'){
        if (!payload.temperatureReading){
            throw new Error(generateErrorMessage(response_name,'payload.temperatureReading is missing',payload));
        }
        if(!payload.temperatureReading.value){
            throw new Error(generateErrorMessage(response_name,'payload.temperatureReading.value is missing',payload));
        }
        if (typeof payload.temperatureReading.value != "number"){
            throw new Error(generateErrorMessage(response_name,'payload.temperatureReading.value must be a number',payload));
        }
    }
    if (response_name === 'GetTargetTemperatureResponse'){
        if (!payload.temperatureMode){
            throw new Error(generateErrorMessage(response_name,'payload.temperatureMode is missing',payload));
        }
        if(!payload.temperatureMode.value){
            throw new Error(generateErrorMessage(response_name,'payload.temperatureMode.value is missing',payload));
        }
        if (!(isInArray(VALID_TEMPERATURE_MODES, payload.temperatureMode.value))){
            throw new Error(generateErrorMessage(response_name,'payload.temperatureMode.value is invalid',payload));
        }
        mode = payload.temperatureMode.value;

        ['targetTemperature','coolingTargetTemperature','heatingTargetTemperature'].forEach(function(optional_key){
            if (optional_key in payload){
                if (!payload[optional_key].value){
                    throw new Error(generateErrorMessage(response_name,'payload.' + optional_key + '.value is missing',payload));
                }
                if (typeof payload[optional_key].value != 'number'){
                    throw new Error(generateErrorMessage(response_name,'payload.' + optional_key + '.value must be a number',payload));
                }
            }
        });
        if (mode === 'CUSTOM'){
            if (!payload.temperatureMode.friendlyName){
                throw new Error(generateErrorMessage(esponse_name,'payload.temperatureMode.friendlyName is missing',payload));
            }
            if (isEmpty(payload.temperatureMode.friendlyName)){
                throw new Error(generateErrorMessage(response_name,'payload.temperatureMode.friendlyName must not be empty',payload));
            }
        }
    }
    // Validate lock query response payload
    if (response_name === 'GetLockStateResponse'){
        if (!payload.lockState){
            throw new Error(generateErrorMessage(response_name,'payload.lockState is missing',payload));
        }
        if (!isInArray(VALID_LOCK_STATES, payload.lockState)){
            throw new Error(generateErrorMessage(response_name,'payload.lockState is invalid',payload));
        }
    }
    // Validate query error response payload
    if (response_name === 'UnableToGetValueError'){
        if (!payload.errorInfo){
            throw new Error(generateErrorMessage(response_name,'payload.errorInfo is missing',payload));
        }
        ['code','description'].forEach( function(required_key){
            if (!(required_key in payload.errorInfo)){
                throw new Error(generateErrorMessage(response_name,'payload.errorInfo' + required_key + ' is missing',payload));
            }
        });
        if (!isInArray(VALID_UNABLE_ERROR_INFO_CODES,payload.errorInfo.code)){
            throw new Error(generateErrorMessage(response_name,'payload.errorInfo.code is invalid',payload));
        }
    }
}
function validateResponseHeader(request, response){
    /*Validate the response header.

     This method validates the header of the responses, based on the API reference:
     https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#skill-adapter-directives
     */

    var request_name = request.header.name;
    var header = response.header;

    // Validate if request_name is valid
    if (!isInArray(VALID_REQUEST_NAMES,request_name)){
        throw new Error(generateErrorMessage('Request', 'request name is invalid', request));
    }

    // Validate if header exists
    if (isEmpty(header)){
        throw new Error(generateErrorMessage('Response', 'header is missing', response));
    }

    // Validate header required params
    REQUIRED_HEADER_KEYS.forEach( function(required_header_key){
        if (!(required_header_key in header)){
            throw new Error(generateErrorMessage('Response', 'header.' + required_header_key + ' is required', header));
        }
    });

    // Validate header namespace and name
    if (isInArray(VALID_DISCOVERY_REQUEST_NAMES,request_name)){
        if (!(header.namespace === 'Alexa.ConnectedHome.Discovery')){
            throw new Error(generateErrorMessage('Discovery Response', 'header.namespace must be Alexa.ConnectedHome.Discovery', header));
        }
        if (!isInArray(VALID_DISCOVERY_RESPONSE_NAMES,header.name)){
            throw new Error(generateErrorMessage('Discovery Response', 'header.name is invalid', header));
        }
    }
    if (isInArray(VALID_CONTROL_REQUEST_NAMES,request_name)){
        if (['Alexa.ConnectedHome.Control', 'Alexa.ConnectedHome.Query'].indexOf(header.namespace) == -1){
            throw new Error(generateErrorMessage('Control Response', 'header.namespace must be Alexa.ConnectedHome.Control or Alexa.ConnectedHome.Query', header));
        }
        if (!isInArray(VALID_CONTROL_RESPONSE_NAMES.concat(VALID_CONTROL_ERROR_RESPONSE_NAMES),header.name)){
            throw new Error(generateErrorMessage('Control Response', 'header.name is invalid' ,header));
        }
        if (!isInArray(VALID_CONTROL_ERROR_RESPONSE_NAMES,header.name)){
            var correct_response_name = request_name.replace('Request','Confirmation');
            if (!(correct_response_name === header.name)){
                throw new Error(generateErrorMessage('Control Response','header.name must be an error response name or ' + correct_response_name + ' for ' + request_name,header));
            }
        }
    }
    if (isInArray(VALID_QUERY_REQUEST_NAMES,request_name)){
        if (!(isInArray(['Alexa.ConnectedHome.Control', 'Alexa.ConnectedHome.Query'], header.namespace))){
            throw new Error(generateErrorMessage('Query Response', 'header.namespace must be Alexa.ConnectedHome.Query or Alexa.ConnectedHome.Control', header));
        }
        if (!isInArray(VALID_QUERY_RESPONSE_NAMES.concat(VALID_CONTROL_ERROR_RESPONSE_NAMES),header.name)){
            throw new Error(generateErrorMessage('Control Response', 'header.name is invalid' ,header));
        }
        if (!isInArray(VALID_CONTROL_ERROR_RESPONSE_NAMES,header.name)){
            var correct_response_name = request_name.replace('Request','Response');
            if (!(correct_response_name === header.name)){
                throw new Error(generateErrorMessage('Query Response','header.name must be an error response name or ' + correct_response_name + ' for ' + request_name,header));
            }
        }
    }
    if (isInArray(VALID_SYSTEM_REQUEST_NAMES, request_name)){
        if (header.namespace != 'Alexa.ConnectedHome.System'){
            throw new Error(generateErrorMessage('System Response','header.namespace must be Alexa.ConnectedHome.System',header));
        }
        if (!isInArray(VALID_SYSTEM_RESPONSE_NAMES,header.name)){
            throw new Error(generateErrorMessage('System Response','header.name is invalid',header));
        }
        correct_response_name = request_name.replace('Request','Response')
        if (header.name != correct_response_name){
            throw new Error(generateErrorMessage('System Response','header.name must be ' + correct_response_name + ' for ' + request_name,header));
        }
    }

    // Validate common header constraints
    if (!(header.payloadVersion === "2")){
        throw new Error(generateErrorMessage(header.name, 'header.payloadVersion must be "2"', header));
    }
    if (header.messageId.search("^[a-zA-Z0-9\-]*$") == -1){
        throw new Error(generateErrorMessage(header.name, 'header.messageId must be specified in alphanumeric characters or - ', header));
    }
    if (isEmpty(header.messageId)){
        throw new Error(generateErrorMessage(header.name, 'header.messageId must not be empty', header));
    }
    if (header.messageId.length > 127){
        throw new Error(generateErrorMessage(header.name,'header.messageId must not exceed 128 characters', header));
    }
}

/*
 * Utility functions.
 */

function generateErrorMessage(title, message, data){
    return title + ' :: ' + message + ': ' + JSON.stringify(data);
}

function isEmpty(obj) {
    // null and undefined are "empty"
    if (obj == null) return true;

    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;

    // If it isn't an object at this point
    // it is empty, but it can't be anything *but* empty
    // Is it empty?  Depends on your application.
    if (typeof obj !== "object") return true;

    // Otherwise, does it have any properties of its own?
    // Note that this doesn't handle
    // toString and valueOf enumeration bugs in IE < 9
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
    }
    return true;
}
function isInArray(array, object) {
    if (isEmpty(array)){
        return false;
    }
    if (isEmpty(object)){
        return false;
    }
    return array.indexOf(object) > -1;
}
exports.validateContext = validateContext;
exports.validateResponse = validateResponse;