/* @flow */
'use strict'

var fs = require('fs')
var assert = require('assert')
var _ = require('lodash')

function _parseMachineTypeTransitionSpec(machineTypeTransitionSpec) {

    var transitions = {'epsilon': {}}
    var acceptingStates = {}

    var wordR = /^[A-Za-z0-9$_]+$/;

    machineTypeTransitionSpec.trim().split(/(?: *, *\n? *)|(?: *\n *)/).forEach(function (line) {console.log(line)
        var lastWordOfLine =
            line.trim().split(' ').reduce(
                function (from, to) {
                    if (!wordR.test(from)) throw new SyntaxError('invalid machine type transition spec line: ' + line)
                    transitions[from] = transitions[from] || {}
                    transitions[from][to] = true
                    return to
                })
        if (!wordR.test(lastWordOfLine)) throw new SyntaxError('invalid machine type transition spec line: ' + line) //
        acceptingStates[lastWordOfLine] = true
    })

    return {transitions: transitions, acceptingStates: acceptingStates}
}

function machineTypeFromSpec(machineTypeTransitionSpec, machineTypeName) {

    return function (name) {
        this.name = name
        this.type = machineTypeName
        this.state = 'epsilon'

        var ret = _parseMachineTypeTransitionSpec(machineTypeTransitionSpec)

        this.transitions = ret.transitions
        this.acceptingStates = ret.acceptingStates

        this.prototype.transition = function (newState) {
            if (this.transitions[this.state][newState])
                this.state = newState
            else throw new SyntaxError('invalid transition')
        }

        this.prototype.okToEndHere = function () {
            return !! this.acceptingStates[this.state]
        }
    }
}

function Language(options) {
    this.machineTypes = _.mapValues(options.machineTypes, function (value, key) {return new machineTypeFromSpec(value, key)})
}

function Renderer(options) {
    assert.ok(this.language = options.language)
    assert.ok(this.chunkRenderer = options.chunkRenderer)
    this.machinesByType = _.mapValues(this.language.machineTypes, function () {return {}})
}

Renderer.testRenderer = function (chunks, idx) {
    var t = chunks[idx].transition
    return {
        text: '[[' + t.machineType + '(' + t.machineName + ')->' + t.to + '||' + chunks[idx].match + ']]'

    }
}

Renderer.prototype.renderFileSync = function(options) {
    fs.writeFileSync(options.dst, this.stringFromChunks(chunksFromString(fs.readFileSync(options.src)), {encoding: 'utf8'}))
}

Renderer.prototype.stringFromChunks = function (chunks) {
    return this.render(chunks).join('')
}

Renderer.prototype.stringsFromChunks = function (chunks) {

    var strings = []
    var machineType

    assert.ok(chunks.length % 2 === 1)

    if (chunks.length === 1) {
        for (machineType in this.transitions)
            if (! this.language.machineTypes[machineType].acceptingStates.epsilon)
                throw new SyntaxError('Machine of type ' + machineType + ' cannot finish in state epsilon.')
        return chunks[0].match
    }

    for (var i = 1; i < chunks.length; i += 2) {

        assert.ok(chunks[i-1].type === 'plain')
        assert.ok(chunks[i].type === 'fancy')

        var t = chunks[i].transition

        if (! this.machines[t.machineType]) throw new SyntaxError('attempt to transition a machine of unknown type')
        if (! this.machines[t.machineType][t.machineName]) {
            this.machines[t.machineType][t.machineName] = new this.language.machineTypes[t.machineType](t.machineName)
            this.machines[t.machineType][t.machineName].transition(t.to)
        }

        var renderedChunk = this.chunkRenderer(chunks, i)
        if (!strings[i-1]) strings[i-1] = renderedChunk.suppressPrevious ? '' : chunks[i-1].match
        strings[i] = renderedChunk.text
        if (renderedChunk.suppressNext) strings[i+1] = ''
    }
    if (!strings[i-1]) strings[i-1] = chunks[i-1].match

    for (machineType in this.machinesByType) {
        for (var machine in this.machinesByType[machineType]) {
            var m = this.machinesByType[machineType][machine]
            if (!m.okToEndHere) throw new SyntaxError('attempt to finish with machine ' + m.type + '(' + m.name + ') in state ' + m.state)
        }
    }

    return strings
}



// Returns an array of "chunks" representing the input string `src`.

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

// If two statements in the markup language are adjacent to one
// another, a plain chunk representing an empty substring of `src`
// separates them. If a statement of the markup language is a final
// substring of `src`, the final element of the chunk array represents
// an empty substring of `src`. f `src` is empty, the unique element
// of the chunk array is a plain chunk representing it. In all other
// cases, plain chunks represent non-empty substrings of `src`.
function chunksFromString(src) {

    var match, tMatch, kvMatch, keyValuePairs
    var chunks = []

    // Matches anything up to a line beginning with '*' or the end of `src`.
    var plainR = /.*?(?=$|^\*)/g;

    // Matches a line beginning with '*' plus any following lines
    // until there is a blank line or the end of `src`.
    var fancyR = /(\*[^\n]*?)(?:$|\n)(.*?)($|\n\s*?\n)/g;

    // Matches lines like '*foo(bar)->baz', where `foo`, `bar`,
    // and `baz` are sequences of letters, numbers, '_', and '$'. If
    // `bar` is empty, the parentheses can be left out. `baz` cannot
    // be empty.
    var fancy$transitionR = /^\*([A-Za-z0-9$_]*)(:\(([A-Za-z0-9$_]*)\))?->([A-Za-z0-9$_]+)\n?/;

    // Matches lines like 'baz spaz' where `baz` is as above but
    // `spaz` is arbitrary except that it cannot contain newlines.
    var fancy$keyValueR = /([A-Za-z0-9$_]+) ([^\n]*)\n?/g;


    // Push a plain chunk.

    match = plainR.exec(src)
    chunks.push({
        type: 'plain'
        , match: match[0]
        , start: match.index
        , end: match.index + match[0].length
    })

    while (plainR.lastIndex < src.length) {

        // Push a fancy chunk.

        fancyR.lastIndex = plainR.lastIndex

        assert.ok(match = fancyR.exec(src))
        assert.ok(tMatch = fancy$transitionR.exec(match[1]))

        keyValuePairs = {}
        while (kvMatch = fancy$keyValueR.exec(match[2]))
            keyValuePairs[kvMatch[1]] = kvMatch[2]

        chunks.push({
            type: 'fancy'
            , match: match[0]
            , start: match.index
            , end: match.index + match[0].length

            , transition: {
                machineType: tMatch[1]
                , machineName: tMatch[2]
                , from: (chunks.length === 1) ? 'epsilon' : chunks[chunks.length-2].transition.to
                , to: tMatch[3]
                , keyValuePairs: keyValuePairs
            }
        })

        // Push a plain chunk.

        plainR.lastIndex = fancyR.lastIndex

        match = plainR.exec(src)
        chunks.push({
            type: 'plain'
            , match: match[0]
            , start: match.index
            , end: match.index + match[0].length
        })

    }

    if (process.env.NODE_ENV !== 'production') {
        assert.ok(chunks[0].start === 0)
        for (var i = 0; i < chunks.length; i++) {
            assert.ok(chunks[i].end === chunks[i+1].start)
            assert.ok(chunks[i].match === src.substring(chunks[i].start, chunks[i].end))
        }
        assert.ok(chunks[i].end === src.length)
    }

    return chunks
}

module.exports = {
    Language: Language
    , Renderer: Renderer
    , _parseMachineTypeTransitionSpec: _parseMachineTypeTransitionSpec
}
