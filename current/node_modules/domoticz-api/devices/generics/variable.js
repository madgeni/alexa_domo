"use strict";

class Variable {
    constructor(name, value) {
        this.name = name;
        this.value = value;
    }

    toString() {
        return `${this.name} ${this.value}`;
    }
}

module.exports.Variable = Variable;