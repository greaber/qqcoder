/* @flow */
'use strict'

var xx = exports

// This API should be considered very unstable, really just a placeholder.

xx.throwSyntaxError = function (options) {
    throw new SyntaxError('Syntax error at line ' + options.source.substring(0, options.contextStart).split('\n').length
                          + 'of:\n\n"' + options.source.substring(0,70) + '..."\n\nExpected ' + options.expected + '\nGot "' + options.focus + '".')
}

xx.throwTypeError = function (str) {
    throw new TypeError(str)
}
