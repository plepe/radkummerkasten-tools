var parseDate = require('../src/parseDate')
var assert = require('assert')

describe('parseDate', function () {
  var dates = [
    [ ' 1. Jänner 2017', '2017-01-01' ],
    [ '24. Dezember 2016', '2016-12-24' ],
    [ ' 8. März 2016', '2016-03-08' ],
    [ ' 8. Dezember 2016', '2016-12-08' ]
  ]

  it('parse dates', function () {
    for (var i = 0; i < dates.length; i++) {
      assert.equal(parseDate(dates[i][0]), dates[i][1], dates[i][0] + ' should parse to ' + dates[i][1])
    }

    return true
  })
})
