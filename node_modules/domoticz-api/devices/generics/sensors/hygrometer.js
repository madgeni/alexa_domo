"use strict";

var Device = require('../device');

class Hygrometer extends Device.Device {
    constructor(value) {
        super();
        this.value = value;
        this.unity = "%";
    }
}

module.exports.Hygrometer = Hygrometer;