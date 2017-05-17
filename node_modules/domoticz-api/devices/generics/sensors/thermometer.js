"use strict";

var Device = require('../device');

class Thermometer extends Device.Device {
    constructor(value) {
        super();
        this.value = value;
        this.unity = "C";
    }
}

module.exports.Thermometer = Thermometer;