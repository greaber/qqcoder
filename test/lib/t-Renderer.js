'use strict'

const should = require('chai').should()
const _ = require('lodash')

const fs = require('fs')

const Renderer = require('../../lib/Renderer')
const concreteSyntax = require('../../lib/concrete-syntax.js')
const Language = require('../../lib/Language')

describe('Renderer', () => {

    const correctChunksValue = JSON.parse(fs.readFileSync('test/aux/t1.qq.chunks', {encoding: 'utf8'}))
    const correctRenderedValue = fs.readFileSync('test/aux/t1.qq.rendered', {encoding: 'utf8'})

    describe('.chunksFromString()', () => {

        it('returns the correct value', () => {
            const src = fs.readFileSync('test/aux/t1.qq', {encoding: 'utf8'})

            Renderer.chunksFromString(src, concreteSyntax.findTransitionChunk).should.deep.equal(correctChunksValue)
        })
    })

    describe('#stringsFromChunks()', () => {

        it('returns the correct value', () => {
            const renderer = new Renderer({
                language: new Language({
                    machineTypes: {
                        t1: 'epsilon s1 s2'
                        , a: 'epsilon c f f'
                    }
                })
                , chunkRenderer: Renderer.testRenderer
            })
            const ret = renderer.stringFromChunks(correctChunksValue)
            ret.should.equal(correctRenderedValue)
        })
    })
})
