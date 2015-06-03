'use strict'

var should = require('chai').should()
var _ = require('lodash')

var machines = require('../../lib/machines')



var tspec = 'a b c d, b c, c e, epsilon q'
var tspec_parsed = {
    transitions: {
        epsilon: {q: true}
        , a: { b: true }
        , b: { c: true }
        , c: { d: true, e: true }
        , d: {}
        , e: {}
        , q: {}
    }
    , acceptingStates: {d: true, c: true, e: true, q: true}
}

describe('parseMachineTypeTransitionSpec', () => {
    var rejects = [
        ',', ',a', ', a', 'a - b', '* a b', 'a * b', 'a b *', 'a b ,', 'a\n, b', 'a  c'
    ]
    rejects.forEach(function (reject) {
        it('rejects "' + reject + '"', () => {
            (() => machines.parseMachineTypeTransitionSpec(reject)).should.throw(SyntaxError)
        })
    })


    ;[
        tspec,
        tspec.replace(',', '\n'),
        tspec.replace(',', ' , \n '),
        tspec.replace('c,', 'c\n')
    ].forEach(
        spec =>
            it('correctly handles the legal spec "' + spec + '"', () => {
                machines.parseMachineTypeTransitionSpec(spec).should.deep.equal(tspec_parsed)
            })
    )
})

describe('machineTypeFromSpec', () => {

    describe('(returned class)', () => {

        var nelly1

        var nelly1_expected = {
            name: 'nelly1'
            , type: 'nelly'
            , state: 'epsilon'
            , transitions: {
                epsilon: {q: true}
                , a: {b: true}
                , b: {c: true}
                , c: {d: true, e: true}
                , d: {}
                , e: {}
                , q: {}
            }
            , acceptingStates: {d: true, c: true, e: true, q: true}
        }

        beforeEach(() => nelly1 = new (machines.machineTypeFromSpec(tspec, 'nelly'))('nelly1'))

        it('constructs the right thing', () => {
            ;(_.assign({}, nelly1)).should.deep.equal(nelly1_expected)
        })

        describe('#transition()', () => {

            it('detects illegal transitions', () => {
                nelly1.transition('q')
                ;(() => nelly1.transition('q')).should.throw(SyntaxError)
            })
        })

        describe('#okToEndHere()', () => {

            it('recognizes illegal places to end', () => {
                nelly1.okToEndHere().should.equal(false)
            })

            it('recognizes legal places to end', () => {
                nelly1.transition('q')
                nelly1.okToEndHere().should.equal(true)
            })
        })
    })
})
