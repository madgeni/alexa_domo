"use strict";

class Switch extends Device {
    constructor(_device) {
        super(_device);
        this.value = _device.value;
        this.switchType = _device.switchType;
        this.switchTypeVal = _device.switchTypeVal;
    }
}

module.exports.Switch = Switch;