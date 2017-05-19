"use strict";

class FibaroMotionSensor {
    constructor() {
        this.motion = new Switch();
        this.luxometer = new Luxometer();
        this.temperature = new Temperature();
        this.vibration = new Switch();
    }
}

module.exports.FibaroMotionSensor = FibaroMotionSensor;