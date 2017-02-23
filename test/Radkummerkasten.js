var Radkummerkasten = require('../src/Radkummerkasten')
Radkummerkasten.init()
if (typeof window !== 'undefined') {
  Radkummerkasten.options.baseUrl = location.origin + location.pathname.replace(/\\/g,'/').replace(/\/[^\/]*$/, '') + '/test/data/'
} else {
  Radkummerkasten.options.baseUrl = 'file:test/data/'
}
Radkummerkasten.options.urlBezirksgrenzen = 'data.wien.gv.at_bezirksgrenzen.json'
Radkummerkasten.options.urlMapMarkers = 'mapMarkers.json'
Radkummerkasten.options.urlMapEntry = '{id}.json'
var assert = require('assert')

describe('Radkummerkasten', function () {
  describe('getEntries()', function () {
    it('{id: 1}', function (done) {
      var results = []

      Radkummerkasten.clearCache()
      Radkummerkasten.getEntries(
        {
          id: '1'
        },
        function (err, entry) {
          assert.equal(err, null, 'Error on featureCallback!')
          results.push(entry.id)
        },
        function (err) {
          assert.deepEqual(results, [ 1 ], 'Wrong count of results') 
          done(err)
        }
      )
    })

    it('{id: 1} (numeric)', function (done) {
      var results = []

      Radkummerkasten.clearCache()
      Radkummerkasten.getEntries(
        {
          id: 1
        },
        function (err, entry) {
          assert.equal(err, null, 'Error on featureCallback!')
          results.push(entry.id)
        },
        function (err) {
          assert.deepEqual(results, [ 1 ], 'Wrong count of results') 
          done(err)
        }
      )
    })

    it('{id: [1]} (string)', function (done) {
      var results = []

      Radkummerkasten.clearCache()
      Radkummerkasten.getEntries(
        {
          id: 1
        },
        function (err, entry) {
          assert.equal(err, null, 'Error on featureCallback!')
          results.push(entry.id)
        },
        function (err) {
          assert.deepEqual(results, [ 1 ], 'Wrong count of results') 
          done(err)
        }
      )
    })

    it('{id: [1]} (numeric)', function (done) {
      var results = []

      Radkummerkasten.clearCache()
      Radkummerkasten.getEntries(
        {
          id: 1
        },
        function (err, entry) {
          assert.equal(err, null, 'Error on featureCallback!')
          results.push(entry.id)
        },
        function (err) {
          assert.deepEqual(results, [ 1 ], 'Wrong count of results') 
          done(err)
        }
      )
    })

    it('{id: 1} (string) (cached)', function (done) {
      var results = []

      Radkummerkasten.getEntries(
        {
          id: '1'
        },
        function (err, entry) {
          assert.equal(err, null, 'Error on featureCallback!')
          results.push(entry.id)
        },
        function (err) {
          assert.deepEqual(results, [ 1 ], 'Wrong count of results') 
          done(err)
        }
      )
    })

    it('{id: 1, includeDetails: true}', function (done) {
      var results = []

      Radkummerkasten.clearCache()
      Radkummerkasten.getEntries(
        {
          id: '1',
          includeDetails: true
        },
        function (err, entry) {
          assert.equal(err, null, 'Error on featureCallback!')
          results.push(entry.id)
        },
        function (err) {
          assert.deepEqual(results, [ 1 ], 'Wrong count of results') 
          done(err)
        }
      )
    })

    it('{id: 2}', function (done) {
      var results = []

      Radkummerkasten.clearCache()
      Radkummerkasten.getEntries(
        {
          id: '2'
        },
        function (err, entry) {
          assert.equal(err, null, 'Error on featureCallback!')
          results.push(entry.id)
          assert.equal(entry.properties.bezirk, 15, 'Falscher Bezirk')
        },
        function (err) {
          assert.deepEqual(results, [ 2 ], 'Wrong count of results') 
          done(err)
        }
      )
    })

    it('{id: 3, includeDetails: true}', function (done) {
      var results = []

      Radkummerkasten.clearCache()
      Radkummerkasten.getEntries(
        {
          id: [ '3' ],
          includeDetails: true
        },
        function (err, entry) {
          assert.equal(err, null, 'Error on featureCallback!')
          results.push(entry.id)
          assert.equal(entry.properties.comments.length, 1, 'Wrong count of comments')
          assert.equal(entry.properties.comments[0].attachments.length, 2, 'Comment should have two attachments')
        },
        function (err) {
          assert.deepEqual(results, [ 3 ], 'Wrong count of results')
          done(err)
        }
      )
    })

    it('{id: 4, includeDetails: true}', function (done) {
      var results = []

      Radkummerkasten.clearCache()
      Radkummerkasten.getEntries(
        {
          id: [ '4' ],
          includeDetails: true
        },
        function (err, entry) {
          assert.equal(err, null, 'Error on featureCallback!')
          results.push(entry.id)
          assert.equal(entry.properties.comments.length, 0, 'Wrong count of comments')
          assert.equal(entry.properties.attachments.length, 3, 'Comment should have three attachments')
        },
        function (err) {
          assert.deepEqual(results, [ 4 ], 'Wrong count of results')
          done(err)
        }
      )
    })

    it('{includeDetails: true}', function (done) {
      var results = []

      Radkummerkasten.clearCache()
      Radkummerkasten.getEntries(
        {
          includeDetails: true
        },
        function (err, entry) {
          assert.equal(err, null, 'Error on featureCallback!')
          results.push(entry.id)
        },
        function (err) {
          results.sort()
          assert.deepEqual(results, [ 1, 2, 3, 4 ], 'Wrong count of results')
          done(err)
        }
      )
    })

    it('{bezirk: 15, includeDetails: true}', function (done) {
      var results = []

      Radkummerkasten.clearCache()
      Radkummerkasten.getEntries(
        {
          bezirk: 15,
          includeDetails: true
        },
        function (err, entry) {
          assert.equal(err, null, 'Error on featureCallback!')
          results.push(entry.id)
        },
        function (err) {
          assert.deepEqual(results, [ 2 ], 'Wrong count of results')
          done(err)
        }
      )
    })
  })
})
