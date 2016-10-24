"use strict";

var Device = require('../device');

class Sonometer extends Device.Device {
    constructor(value) {
        super();
        this.value = value;
        this.unity = "dB";
    }
}

module.exports.Sonometer = Sonometer;