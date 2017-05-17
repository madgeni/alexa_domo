"use strict";

var Device = require('../device');

class Carboxymeter extends Device.Device {
    constructor(value) {
        super();
        this.value = value;
        this.unity = "co2";
    }
}

module.exports.Carboxymeter = Carboxymeter;