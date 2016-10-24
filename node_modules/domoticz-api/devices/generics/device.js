"use strict";

class Device {
    constructor(_device) {
        this.idx = _device.idx;
            this.id = _device.id;
            this.name = _device.name;
            this.room = _device.room;
            this.lastUpdate = _device.lastUpdate;
            this.type = _device.type;
            this.subType = _device.subType;
            this.batteryLevel = _device.batteryLevel;
            this.signalLevel = _device.signalLevel;
    };
};

module.exports.Device = Device;