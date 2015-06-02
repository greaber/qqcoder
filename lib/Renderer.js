/* @flow */
'use strict'

var assert = require('assert')
var fs = require('fs')
var _ = require('lodash')

var machines = require('./machines')
var concreteSyntax = require('./concreteSyntax')
var qqutil = require('./qqutil')

var Renderer = module.exports = function Renderer (options) {
    assert.ok(this.language = options.language)
    assert.ok(this.chunkRenderer = options.chunkRenderer)
    this.findFancyChunk = options.findFancyChunk || concreteSyntax.qq$findFancyChunk
    this.machinesByType = _.mapValues(this.language.machineTypes, function () {return {}})
}

Renderer.testRenderer = function (chunks, idx) {
    var t = chunks[idx].transition
    return {
        text: '[[' + t.machineType + '(' + t.machineName + ')->' + t.to + '||' + chunks[idx].text + ']]'
    }
}

Renderer.prototype.renderFileSync = function(options) {
    fs.writeFileSync(options.outputFilename
                     , this.stringFromChunks(Renderer.chunksFromString(options.findFancyChunk || this.findFancyChunk
                                                                       , fs.readFileSync(options.inputFilename))
                                             , {encoding: options.encoding || 'utf8'})

                     , {encoding: options.encoding || 'utf8'})
}

Renderer.prototype.stringFromChunks = function (chunks) {
    return this.render(chunks).join('')
}

Renderer.prototype.stringsFromChunks = function (chunks) {

    var strings = []
    var chunk
    var suppressedChunks // The chunk suppression mechanism might eventually be replaced with something more general.
    var i
    for (i = 0; i < chunks.length; i++) {

        chunk = chunks[i]

        if (chunk.type === 'plain') {
            strings[i] = suppressedChunks[i] ? '' : chunk.text
            continue
        }

        assert.ok(chunk.type === 'fancy')

        var t = chunks[i].transition

        if (! this.machines[t.machineType]) qqutil.throwTypeError('attempt to transition a machine of unknown type')
        if (! this.machines[t.machineType][t.machineName]) {
            this.machines[t.machineType][t.machineName] = new this.language.machineTypes[t.machineType](t.machineName)
            this.machines[t.machineType][t.machineName].transition(t.to)
        }

        var renderedChunk = this.chunkRenderer(chunks, i)

        if (renderedChunk.suppressPrevious) {
            strings[i-1] = ''
            suppressedChunks[i-1] = true // This line has no effect since strings[i-1] is not touched again.
        }

        if (renderedChunk.suppressNext) {
            suppressedChunks[i+1] = true
        }

        strings[i] = renderedChunk.text
    }

    var machineType
    for (machineType in this.machinesByType) {
        for (var machine in this.machinesByType[machineType]) {
            var m = this.machinesByType[machineType][machine]
            if (!m.okToEndHere) qqutil.throwTypeError('attempt to finish with machine'
                                                      + machines.formatMachine(m) + ' in state ' + m.state)
        }
    }

    return strings
}

// Returns an array of "chunks" representing the input string `src`.
// The concrete syntax depends on `findFancyChunk`. See
// concreteSyntax.js for details example values of `findFancyChunk`
// and for the format of fancy chunks.

// Each chunk in the chunk array represents a substring of `src`. The
// first chunk in the chunk array represents an initial substring of
// `src`. The last chunk in the chunk array represents a final
// substring of `src`. Adjacent chunks in the chunk array represent
// adjacent substrings of `src`.

// There are two types of chunks, "plain" and "fancy". Fancy chunks
// represent statements in the markup language. Plain chunks represent
// regions without markup. The chunks in the chunk array alternate in
// type: plain, fancy, plain, fancy, ..., fancy, plain. The length of
// the chunk array is thus always odd.

// Plain chunks normally represent non-empty strings, with the
// following exceptions:

// 1.) The last plain chunk represents the empty string if the source
// is empty or ends with a fancy chunk.

// 2.) If two fancy chunks would otherwise follow in succession, a
// plain chunk representing the empty string is intercalated. In a
// future version, it might be interesting to allow fancy chunks (but
// not plain chunks) to follow one another and to let the semantics be
// that fancy chunks that occur together transition "in parallel".
Renderer.chunksFromString = function (findFancyChunk, src) {

    function makePlainChunk(text, characterPosition) {
        return {
            type: 'plain'
            , text: text
            , characterPosition: characterPosition
        }
    }

    var chunks = []

    var characterPosition = 0
    var originState = 'epsilon'

    var chunk
    while (chunk = findFancyChunk(src, characterPosition, originState)) {

        chunks.push(makePlainChunk(src.substring(characterPosition, chunk.characterPosition), characterPosition))
        chunks.push(chunk)
        characterPosition = chunk.characterPosition + chunk.text.length
        originState = chunk.to
    }

    chunks.push(makePlainChunk(src.substring(characterPosition), characterPosition))

    return chunks
}
