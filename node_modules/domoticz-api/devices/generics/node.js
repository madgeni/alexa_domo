"use strict";

class Node {
    constructor() {
        this.switch = new Switch();
        this.consumption = new Consumption();
        this.power = new Power();
    }
}

module.exports.Node = Node;