/* @flow */
'use strict'

var concreteSyntax = require('./concrete-syntax')

var idR = new RegExp('^' + concreteSyntax.$id + '$')

var xx = exports

// TODO: Use qqutil.throwSyntaxError and produce good error messages.
// Doing this properly requires thinking about how to propagate line
// numbers and so on and will require changes in other modules.

// TODO: Possibly streamline the transition spec syntax so it is
// simpler to explain and remember exactly what is legal.

xx.parseMachineTypeTransitionSpec = function (machineTypeTransitionSpec) {

    var transitions = {'epsilon': {}}
    var acceptingStates = {}

    machineTypeTransitionSpec.trim().split(/(?: *, *\n? *)|(?: *\n *)/).forEach(function (component) {
        var lastWordOfLine =
            component.trim().split(' ').reduce(
                function (from, to) {
                    if (!idR.test(from))
                        throw new SyntaxError('invalid machine type transition spec component: '
                                              + component
                                              + '\nin spec:\n'
                                              + machineTypeTransitionSpec)
                    transitions[from] = transitions[from] || {}
                    transitions[from][to] = true
                    return to
                })
        if (!idR.test(lastWordOfLine))
            throw new SyntaxError('invalid machine type transition spec component: '
                                  + component
                                  + '\nin spec:\n'
                                  + machineTypeTransitionSpec)
        transitions[lastWordOfLine] = transitions[lastWordOfLine] || {}
        acceptingStates[lastWordOfLine] = true
    })

    return {transitions: transitions, acceptingStates: acceptingStates}
}

xx.formatMachine = function(m) {
    return '"' + m.name + '" of type ' + m.type
}

xx.machineTypeFromSpec = function (machineTypeTransitionSpec, machineTypeName) {

    var constructor = function (name) {
        this.name = (name === undefined || name === null) ? '' : name + ''
        this.type = machineTypeName
        this.state = 'epsilon'

        var ret = xx.parseMachineTypeTransitionSpec(machineTypeTransitionSpec)

        this.transitions = ret.transitions
        this.acceptingStates = ret.acceptingStates
    }

    // It would be nice to somehow name the constructor (with the name
    // machineTypeName), but there may be no portable and performant
    // way to do that, and perhaps there would be little true benefit.

    constructor.prototype.transition = function (newState) {
        if (this.transitions[this.state][newState])
            this.state = newState
        else throw new SyntaxError('invalid transition in machine ' + xx.formatMachine(this)
                                   + ': ' + this.state + '->' + newState)
    }

    constructor.prototype.okToEndHere = function () {
        return !! this.acceptingStates[this.state]
    }

    return constructor
}
