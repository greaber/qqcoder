/* @flow */
'use strict'

var assert = require('assert')
var fs = require('fs')
var _ = require('lodash')

var machines = require('./machines')
var concreteSyntax = require('./concrete-syntax')
var qqutil = require('./qqutil')

var Renderer = module.exports = function Renderer (options) {
    assert.ok(this.language = options.language)
    assert.ok(this.chunkRenderer = options.chunkRenderer)
    this.findTransitionChunk = options.findTransitionChunk || concreteSyntax.qq$findTransitionChunk
    this.machines = _.mapValues(this.language.machineTypes, function () {return {}})
}

Renderer.testRenderer = function (chunks, i) {

    var chunk = chunks[i]
    if (chunk.type === 'text') return chunk.text

    function formatKeyValuePairs(pairs, indentLevel) {
        var s = ''
        for (var k in pairs) {
            s += (new Array(indentLevel+1).join(' ')) + k + ': ' + pairs[k] + '\n'
        }
        return s
    }

    var s = 'AAAAAAAAAA\n'

    for (var t in chunk.transitions) {
        for (var n in chunk.transitions[t]) {
            s += 'TRANSITION ' + t + '(' + n + '): ' + chunk.transitions[t][n].from + ' -> ' + chunk.transitions[t][n].to
            s += '\n    WITH DATA\n' + formatKeyValuePairs(chunk.transitions[t][n].keyValuePairs, 4)
        }
    }
    s += 'WITH DATA\n' + formatKeyValuePairs(chunk.keyValuePairs, 0) + '\nZZZZZZZZZZ'

    return s
}

Renderer.prototype.renderFileSync = function(options) {

    var src = fs.readFileSync(options.inputFilename, {encoding: 'utf8'})
    var chunks = Renderer.chunksFromString(src, options.findTransitionChunk || this.findTransitionChunk)
    var output = this.stringFromChunks(chunks)
    fs.writeFileSync(options.outputFilename, output, {encoding: options.encoding || 'utf8'})
}

Renderer.prototype.stringFromChunks = function (chunks) {
    return this.stringsFromChunks(chunks).join('')
}

Renderer.prototype.stringsFromChunks = function (chunks) {

    var strings = []
    var t, n

    for (var i = 0; i < chunks.length; i++) {

        var chunk = chunks[i]

        if (chunk.type === 'text') {
            strings[i] = this.chunkRenderer(chunks, i)
            continue
        }

        assert.ok(chunk.type === 'transition')

        for (t in chunk.transitions) {

            if (! this.machines[t])
                qqutil.throwTypeError('attempt to transition a machine of unknown type "' + t + '"')

            for (n in chunk.transitions[t]) {

                assert.ok(chunk.transitions[t][n].machineType === t && chunk.transitions[t][n].machineName === n)
                if (! this.machines[t][n])
                    this.machines[t][n] = new this.language.machineTypes[t](n)
                if (this.machines[t][n].state !== chunk.transitions[t][n].from) {
                    qqutil.throwTypeError('attempt to transition machine ' + machines.formatMachine(this.machines[t][n])
                                          + ' from state ' + chunk.transitions[t][n].from
                                          + ' to state ' + chunk.transitions[t][n].to
                                          + ', but machine is in state ' + this.machines[t][n].state + ', not ' + chunk.transitions[t][n].from)
                }
                this.machines[t][n].transition(chunk.transitions[t][n].to)
            }

            strings[i] = this.chunkRenderer(chunks, i)
        }
    }
    for (t in this.machines) {
        for (n in this.machines[t]) {
            var m = this.machines[t][n]
            if (!m.okToEndHere()) qqutil.throwTypeError('attempt to finish with machine '
                                                      + machines.formatMachine(m) + ' in state ' + m.state)
        }
    }
    console.dir(this, {depth: null})
    return strings
}

// Returns an array of "chunks" representing the input string `src`.
// The concrete syntax depends on `findTransitionChunk`. See
// concreteSyntax.js for details example values of `findTransitionChunk`
// and for the format of transition chunks.

// Each chunk in the chunk array represents a substring of `src`. The
// first chunk in the chunk array represents an initial substring of
// `src`. The last chunk in the chunk array represents a final
// substring of `src`. Adjacent chunks in the chunk array represent
// adjacent substrings of `src`. In other words, the chunks induce a
// partition of `src` into substrings, and the order of the chunk array
// agrees with the order of the substrings.

// There are two types of chunks: "text" and "transition". Text chunks
// represent parts of `src` that are not intepreted by qqcoder itself
// (but can be processed by renderers). Transition chunks encode state
// machine transitions. Multiple state machines may transition in a
// given chunk, and data in the form of key-value pairs can be
// associated with each transitioning state machine as well as with
// the whole chunk. One machine cannot transition twice in a single
// chunk.

// Two text chunks cannot follow one another without an intervening
// transition chunk.
Renderer.chunksFromString = function (src, findTransitionChunk) {

    function makeTextChunk(text, characterPosition) {
        return {
            type: 'text'
            , text: text
            , characterPosition: characterPosition
        }
    }

    var chunks = []

    var characterPosition = 0
    var states = {}

    var chunk
    while (chunk = findTransitionChunk(src, characterPosition, states)) {

        if (chunk.characterPosition > characterPosition)
            chunks.push(makeTextChunk(src.substring(characterPosition, chunk.characterPosition), characterPosition))
        chunks.push(chunk)
        characterPosition = chunk.characterPosition + chunk.text.length

        for (var t in chunk.transitions) {
            states[t] = states[t] || {}
            for (var n in chunk.transitions[t]) {
                states[t][n] = chunk.transitions[t][n].to
            }
        }
    }

    if (characterPosition < src.length)
        chunks.push(makeTextChunk(src.substring(characterPosition), characterPosition))

    return chunks
}
