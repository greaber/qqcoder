'use strict'

var should = require('chai').should()

var qqcoder = require('../qqcoder')

// function parseMachineTypeTransitionSpec(machineTypeTransitionSpec) {

//     var transitions = {'epsilon': {}}
//     var acceptingStates = {}

//     var wordR = /^[A-Za-z0-9$_]+$/;

//     machineTypeTransitionSpec.trim().split(/,|\n/).forEach(function (line) {
//         acceptingStates
//         [
//             line.trim().split(' ').reduce(function (from, to) {
//                 if (!wordR.test(from) || !wordR.test(to)) throw new SyntaxError('invalid machineType spec line: ' + line)
//                 transitions[from][to] = true
//                 return to
//             })
//         ] = true
//     })

//     return {transitions: transitions, acceptingStates: acceptingStates}
// }


describe('_parseMachineTypeTransitionSpec', () => {
    var rejects = [
        ',', ',a', ', a', 'a - b', '* a b', 'a * b', 'a b *', 'a b ,', 'a\n, b', 'a  c'
    ]
    rejects.forEach(function (reject) {
        it('rejects "' + reject + '"', () => {
            (() => qqcoder._parseMachineTypeTransitionSpec(reject)).should.throw(SyntaxError)
        })
    })

    var str = 'a b c d, b c, c e, epsilon q'
    ;[
        str,
        str.replace(',', '\n'),
        str.replace(',', ' , \n '),
        str.replace('c,', 'c\n')
    ].forEach
    (spec =>
     it('correctly handles the legal spec"' + spec + '"', () => {
         qqcoder._parseMachineTypeTransitionSpec(spec).should.deep.equal({
             transitions: {
                 epsilon: {q: true}
                 , a: { b: true }
                 , b: { c: true }
                 , c: { d: true, e: true }
             }
             , acceptingStates: {d: true, c: true, e: true, q: true}
         })
     }))
})
