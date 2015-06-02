/* @flow */
'use strict'

var qqutil = require('./qqutil')

var xx = exports

// `makeFindFancyChunk` takes three regular expressions and returns a
// function that can be passed to `Render#chunksFromString`. It is
// intended to be general enough that it should not be necessary to
// ever pass `Render#chunksFromString` a handmade function.

// Each regular expression should supply values of interest in match
// groups.

// `chunkR` is executed against `src.substring(characterPosition)`. Its
// groups are:

// 1.) prematch (not part of the chunk)
// 2.) chunk text

// `transitionLineR` is executed against the chunk text.  Its groups are:

// 1.) logical depth determiner - its length determines the
//     logicalDepth of the chunk; all transitions of a machine are
//     required to have the same logicalDepth. The minimum possible
//     logical depth should be 1.  (So '***' in star syntax -> depth
//     3, but 'qqq' in qq syntax -> depth 2.)
// 2.) type of transitioning machine
// 3.) name of transitioning machine
// 4.) new state of transitioning machine

// `keyValueLineR` is repeatedly executed against whatever remains
// after matching `keyValueLineR` the last time, using, the first
// time, whatever remains of the chunk text after matching
// `transitionLineR`. Its groups are:

// 1.) key
// 2.) value

// For a chunk to be found, `chunkR` and `transitionLineR` must match,
// and the repeated matching of `keyValueLineR` must entirely consume
// the whatever remains of the chunk text after matching
// `transitionLineR`. It is a syntax error in the source if `chunkR`
// matches but no chunk is found.
function makeFindFancyChunk(chunkR, transitionLineR, keyValueLineR) {

    return function (src, characterPosition, originState) {

        var str = src.substring(characterPosition)

        var match = chunkR.exec(str)
        if (!match) return null
        var prematchLength = match[1].length
        var chunkText = match[2]
        var offset = match.index + prematchLength

        match = transitionLineR.exec(chunkText)
        if (!match) qqutil.throwSyntaxError({source: src
                                             , contextStart: characterPosition + offset
                                             , contextEnd: characterPosition + offset + chunkText.length
                                             , focus: chunkText.match(/[^\n]*/)[0]
                                             , expected: 'state machine transition'})
        var logicalDepth = match[1].length
        var machineType = match[2]
        var machineName = match[3]
        var newState = match[4]
        var keyValueString = chunkText.substring(match[0].length)

        var keyValuePairs = {}
        while (match = keyValueLineR.exec(keyValueString)) {
            keyValuePairs[match[1]] = match[2]
            keyValueString = keyValueString.substring(match[0].length)
        }

        if (keyValueString !== '') qqutil.throwSyntaxError({source: src
                                                            , contextStart: characterPosition + offset
                                                            , contextEnd: characterPosition + offset + chunkText.length
                                                            , focus: keyValueString
                                                            , expected: 'key-value string or end of data'})

        return {
            type: 'fancy'
            , text: str.substring(offset)
            , characterPosition: characterPosition + offset
            , logicalDepth: logicalDepth
            , machineType: machineType
            , machineName: machineName
            , from: originState
            , to: newState
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

var $value = '[^\n]*'

// TODO: implement enhanced versions of these syntaxes that support omitting unneccessary components of the transition line.

// star syntax

var star$chunkR = new RegExp(group($BOL) + group('\\*.*?' + ngroup('$|' + ngroup('\\n' + $optHWS + '\\n'))))
var star$transitionLineR = new RegExp('^' + group('\\*+') + group($id) + '\\(' + group($id) + '\\)->' + group($id) + $optHWS + ngroup('$|\\n'))
var star$keyValueLineR = new RegExp('^' + $optHWS + group($id) + ' ' + group($value) + '$|\\n')

// qq syntax

var qq$chunkR = new RegExp(group($BOL) + group('qq.*?' + ngroup('$|' + ngroup('\\n' + $optHWS + '\\n'))))
var qq$transitionLineR = new RegExp('^q' + group('q+') + $HWS + group($id) + $HWS + group($id) + $HWS + group($id) + ngroup('$|\\n'))
var qq$keyValueLineR = star$keyValueLineR

xx.star$findFancyChunk = makeFindFancyChunk(star$chunkR, star$transitionLineR, star$keyValueLineR)
xx.qq$findFancyChunk = makeFindFancyChunk(qq$chunkR, qq$transitionLineR, qq$keyValueLineR)

xx.idR = new RegExp($id)
