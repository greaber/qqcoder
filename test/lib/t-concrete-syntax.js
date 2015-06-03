'use strict'

const should = require('chai').should()
const rewire = require('rewire')

const fs = require('fs')

const cS = rewire('../../lib/concrete-syntax')

const chunkR = cS.__get__('chunkR')
const transitionLineR = cS.__get__('transitionLineR')

describe('$id', () => {
    const goodIds = ['alpHa', 'A3', '_3_', '$3$']
    const badIds = ['3', '3a'] // could test some more exotic stuff here...
    const idR = new RegExp('^' + cS.$id + '$')
    goodIds.forEach(id => it(`allows ${id} as an id`, () => idR.test(id).should.equal(true)))
    badIds.forEach(id => it(`doesn\'t allow ${id} as an id`, () => idR.test(id).should.equal(false)))
})

function iterateOverChunksInFile(filename, fn)
{
    fs.readFileSync(filename, {encoding: 'utf8'})
        .split('==========\n')
        .slice(1,-1)
        .forEach(fn)
}

describe('chunkR', () => {

    iterateOverChunksInFile('test/aux/chunkR-good', testCase => {

        const [source, prematch, chunkText] = testCase.split('====\n')

        it(`should understand valid chunk starting ${chunkText.substring(0, 60).replace(/\n/g, '\\n')}`, () => {
            const match = chunkR.exec(source)
            should.exist(match, testCase)
            should.exist(match[1], 'prematch existence')
            should.exist(match[2], 'chunkText existence')
            match[1].should.equal(prematch, 'prematch correctness')
            match[2].should.equal(chunkText, 'chunkText correctness')
        })
    })
})

describe('transitionLineR', () => {

    iterateOverChunksInFile('test/aux/transitionLineR-good', testCase => {

        const a = testCase.split('====\n')

        it(`should understand valid transition line ${testCase}`, () => {
            const match = transitionLineR.exec(a[0])
            match[1].should.equal(a[1])
            match.slice(2,5).should.deep.equal(a.slice(2,5))
        })
    })
})


describe('findTransitionChunk-good', () => {

    iterateOverChunksInFile('test/aux/findTransitionChunk-good', testCase => {

        const [source, characterPositionSource, originStatesSource, resultSource] = testCase.split('====\n')
        const characterPosition = parseInt(characterPositionSource)
        const originStates = JSON.parse(originStatesSource)
        const chunk = cS.findTransitionChunk(source, characterPosition, originStates)
        chunk.should.deep.equal(JSON.parse(resultSource))
    })
 })
