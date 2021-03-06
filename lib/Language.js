/* @flow */
'use strict'

var _ = require('lodash')

var machines = require('./machines')

module.exports = function(options) {
    this.machineTypes = _.mapValues(options.machineTypes, function (value, key) {return new machines.machineTypeFromSpec(value, key)})
}
