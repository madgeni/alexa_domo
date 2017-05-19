"use strict";

var Device = require('../device');

class Luxometer extends Device.Device {
    constructor(value) {
        super();
        this.value = value;
        this.unity = "lx";
    }
}

module.exports.Luxometer = Luxometer;