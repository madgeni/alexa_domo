var Domoticz = require('./api/domoticz');

var _ = require('lodash');
var assert = require('assert');

var api = new Domoticz({host: '192.168.0.21', port: 8087});

api.getSunriseSunset(function (error, data) {
    assert.equal(_.isObject(data), _.isObject({}), 'Test failed');
});

api.getScenesGroups(function (error, data) {
    assert.equal(_.isObject(data), _.isObject({}), 'Test failed');
});

api.getDevices({
    filter: 'all',
    used: 'true',
    order: 'Name'
}, function (error, data) {
    assert.equal(_.isObject(data), _.isObject({}), 'Test failed');
    api.getDevice({
        idx: data.results[0].idx
    }, function (error, device) {
        assert.equal(_.isObject(device), _.isObject({}), 'Test failed');
    });
    data.results.map(function (device) {
        var type = api.getGenericType(device);
        assert.equal(_.isArray(type), _.isArray([]), 'Test failed');
    })

    data.results.map(function (device) {
        api.getNumberSiblings(device, function (count) {
            assert.equal(_.isNumber(count), _.isNumber(0), 'Test failed');
        });
    });
});