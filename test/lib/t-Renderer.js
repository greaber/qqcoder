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

        it('can make a one chunk chunk array', () => {
            Renderer.chunksFromString('qq a b c', concreteSyntax.findTransitionChunk).length.should.equal(1)
        })

        it('can make a zero chunk chunk array', () => {
            Renderer.chunksFromString('', concreteSyntax.findTransitionChunk).length.should.equal(0)
        })
    })

    describe('#stringsFromChunks()', () => {

        let correctRenderer, flippedTransitionDirectionRenderer, missingMachineTypeRenderer, lessAcceptingRenderer

        beforeEach(() => {
            correctRenderer = new Renderer({
                language: new Language({
                    machineTypes: {
                        t1: 'epsilon s1 s2, s1'
                        , a: 'epsilon c f f'
                    }
                })
                , chunkRenderer: Renderer.testRenderer
            })

            flippedTransitionDirectionRenderer = new Renderer({
                language: new Language({
                    machineTypes: {
                        t1: 'epsilon s2 s1'
                        , a: 'epsilon c f f'
                    }
                })
                , chunkRenderer: Renderer.testRenderer
            })

            missingMachineTypeRenderer = new Renderer({
                language: new Language({
                    machineTypes: {
                        t1: 'epsilon s1 s2, s1'
                    }
                })
                , chunkRenderer: Renderer.testRenderer
            })

            lessAcceptingRenderer = new Renderer({
                language: new Language({
                    machineTypes: {
                        t1: 'epsilon s1 s2 s3'
                        , a: 'epsilon c f f'
                    }
                })
                , chunkRenderer: Renderer.testRenderer
            })
        })


        it('returns the correct value', () => {

            const ret = correctRenderer.stringFromChunks(correctChunksValue)
            ret.should.equal(correctRenderedValue)
        })


        describe('reports erroneous transitions correctly: ', () => {
            it('detects transitions not allowed by the language', () => {
                should.Throw(() => flippedTransitionDirectionRenderer.stringFromChunks(correctChunksValue),
                             'invalid transition in machine "n1" of type t1: epsilon->s1')
            })

            it('detects attempts to transition a machine of unknown type', () => {
                should.Throw(() => missingMachineTypeRenderer.stringFromChunks(correctChunksValue),
                             'attempt to transition a machine of unknown type "a"')
            })

            it('detects transitions from the wrong state', () => {
                let chunks = _.map(correctChunksValue, _.clone)
                chunks[6].transitions.a.b.from = "f"
                should.Throw(() => correctRenderer.stringFromChunks(chunks),
                             'attempt to transition machine "b" of type a from state f to state f, but machine is in state c, not f')
            })
        })

        it('detects attempts to finish with a machine not in an accepting state', () => {
            should.Throw(() => lessAcceptingRenderer.stringFromChunks(correctChunksValue),
                         'attempt to finish with machine "n1" of type t1 in state s2')
        })

        describe('renderFileSync', () => {
            it('does its job', () => {
                try {
                    fs.unlinkSync('test/aux/t1.qq.rendered-sync')
                } catch (e) {}
                correctRenderer.renderFileSync({inputFilename: 'test/aux/t1.qq', outputFilename: 'test/aux/t1.qq.rendered-sync'})
                const ourVersion = fs.readFileSync('test/aux/t1.qq.rendered-sync', {encoding: 'utf8'})
                const correctVersion = fs.readFileSync('test/aux/t1.qq.rendered', {encoding: 'utf8'})
                ourVersion.should.equal(correctVersion)

            })
        })

    })
})
