"use strict";

class NetatmoWeatherStation {
    constructor() {
        // Interior
        this.temperature = new Temperature();
        this.hygrometer = new Hygrometer();
        this.barometer = new Barometer();
        this.carboxymeter = new Carboxymeter();
        this.sonometer = new Sonometer();

        // Exterior
        this.extTemperature = new Temperature();
        this.extHygrometer = new Hygrometer();

        // Need to be calculated or get
        this.dewPoint;
        this.prediction;
    }
}

module.exports.NetatmoWeatherStation = NetatmoWeatherStation;