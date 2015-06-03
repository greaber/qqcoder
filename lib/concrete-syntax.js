/* @flow */
'use strict'

var qqutil = require('./qqutil')

var xx = exports

// `makeFindTransitionChunk` takes four regular expressions and returns a
// function that can be passed to `Render#chunksFromString`.

// `chunkR` is executed against `src.substring(characterPosition)`. Its
// groups are:

// 1.) prematch (not part of the chunk)
// 2.) chunkText, the entire string representing the chunk

// NB: prematch must match everything from the start of the chunkR
// match to the start of chunkText because its length is used to
// compute where chunkText starts.

// NB: every one of the four regular expressions *except* `chunkR`
// should only ever match at the beginning of a string (which is easy
// to guarantee by making sure it starts with '^').

// NB: chunkR should match a sequence of complete lines. The last line
// can fail to have a newline because `src` might not end in a
// newline. Similarly, each of the remaining three regular expressions
// should match exactly one line, where the end of chunkText counts as
// the end of a line even if the last character of chunkText is not a
// newline.

// The remaining three regular expressions are executed to consume
// chunkText in the following pattern:

// loop(transitionLineR, loop(transitionKeyValueLineR)), loop(chunkKeyValueLineR)

// It is a syntax error if chunkR matches, but the further series of
// matches does not exhaust the input.

// TODO: proper error messages
function makeFindTransitionChunk(chunkR, transitionLineR, transitionKeyValueLineR, chunkKeyValueLineR) {

    return function (src, characterPosition, originStates) {

        function syntaxError(msg) {
            qqutil.throwSyntaxError({source: src
                                     , contextStart: characterPosition + offset
                                     , contextEnd: characterPosition + offset + chunkText.length
                                     , focus: msg
                                     , expected: 'TRANSITION CHUNK'})
        }

        var str = src.substring(characterPosition)

        var match = chunkR.exec(str)

        if (!match) return null
        var prematchLength = match[1].length
        var chunkText = match[2]
        var offset = match.index + prematchLength // offset is index in str of start of chunkText

        var remaining = chunkText
        var transitions = {}
        var keyValuePairs

        while (match = transitionLineR.exec(remaining)) {

            remaining = remaining.substring(match[0].length)

            // In the qq syntax, the logical depth is one less than
            // the number of q's used in the transition line. The
            // significance of logical depth is that all transitions
            // of a machine are required to have the same logical
            // depth.
            var logicalDepth = match[1].length
            var machineType = match[2]
            var machineName = match[3]
            var newState = match[4]

            transitions[machineType] = transitions[machineType] || {}
            if (transitions[machineType][machineName])
                syntaxError('attempt to transition a machine of type ' + machineType + 'named ' + machineName + 'twice in the same chunk')

            keyValuePairs = {}
            while (match = transitionKeyValueLineR.exec(remaining)) {
                keyValuePairs[match[1]] = match[2]
                remaining = remaining.substring(match[0].length)
            }

            var from = (originStates[machineType] && originStates[machineType][machineName])
                ? originStates[machineType][machineName]
                : 'epsilon'

            transitions[machineType][machineName] = {
                machineType: machineType
                , machineName: machineName
                , from: from
                , to: newState
                , keyValuePairs: keyValuePairs
                , logicalDepth: logicalDepth
            }
        }

        keyValuePairs = {}
        while (match = chunkKeyValueLineR.exec(remaining)) {

            keyValuePairs[match[1]] = match[2]
            remaining = remaining.substring(match[0].length)
        }

        if (! (/^\s*$/.test(remaining))) syntaxError(chunkText)

        return {
            type: 'transition'
            , text: chunkText
            , characterPosition: characterPosition + offset
            , transitions: transitions
            , keyValuePairs: keyValuePairs
        }
    }
}

// Utility functions for building up regular expression source strings.
function group(s) {return '(' + s + ')'}
function ngroup(s) {return '(?:' + s + ')'}

// A few strings useful for building up regular expression source strings.
var $BOL = '^|\n' // Beginning of line.  Probably only useful as prematch element of chunkR.
var $id = '[A-Za-z$_][A-Za-z$_0-9]*' // Identifiers (used for various purposes).  For now, we allow ascii javascript identifiers.
var $optHWS = ' *' // Optional horizontal whitespace -- we could modify this to match tabs and funny unicode spaces if necessary.
var $HWS = ' +'


// TODO: possibly implement enhanced versions of these syntaxes that
// support omitting unneccessary components of the transition line and
// combining multiple transitions of the same machine into one line.
// (However, interaction with multiple transitions in a chunk needs to
// be considered.)

// For example:
// `qq name state` or `qq type state` or even `qq state` or even `qq`, and it will use defaults.
// `qq type name state1 state2` (and shortened versions) instead of `qq name state1` followed by `qq name state2`.
// Possibly further, more elaborate, methods to save typing.

// qq syntax

var chunkR = new RegExp(group($BOL) + group('qq[^]*?' + ngroup(ngroup('\\n' + $optHWS + '\\n') + '|$')))
var transitionLineR = new RegExp('^q' + group('q+') + $HWS + group($id) + $HWS + group($id) + $HWS + group($id) + $optHWS + ngroup('\\n|$'))
var transitionKeyValueLineR = new RegExp('^' + $HWS + group($id) + $HWS + group('.*?') + $optHWS + ngroup('\\n|$'))
var chunkKeyValueLineR =  new RegExp('^' + group($id) + $HWS + group('.*?') + $optHWS + ngroup('\\n|$'))

xx.findTransitionChunk = makeFindTransitionChunk(chunkR, transitionLineR, transitionKeyValueLineR, chunkKeyValueLineR)

xx.$id = $id
