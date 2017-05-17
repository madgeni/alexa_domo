"use strict";

var Device = require('../device');
var Power = require('./power');

class Comsumption extends Device.Device {
    constructor(value) {
        super();
        this.value = value;
        this.unity = "kWh";
        this.usage = new Power.Power(this.usage);
    }
}

module.exports.Comsumption = Comsumption;