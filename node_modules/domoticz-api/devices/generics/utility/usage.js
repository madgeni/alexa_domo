"use strict";

var Device = require('../device');

class Usage extends Device.Device {
    constructor(value) {
        super();
        this.value = value;
        this.unity = "%"
    }
}

module.exports.Usage = Usage;