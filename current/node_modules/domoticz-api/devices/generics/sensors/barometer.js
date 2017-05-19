"use strict";

var Device = require('../device');

class Barometer extends Device.Device {
    constructor(value) {
        super();
        this.value = value;
        this.unity = "mb";
    }
}

module.exports.Barometer = Barometer;