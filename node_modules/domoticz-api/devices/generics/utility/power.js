"use strict";

var Device = require('../device');

class Power extends Device.Device {
    constructor(value) {
        super();
        this.value = value;
        this.unity = "Watt"
    }
}

module.exports.Power = Power;