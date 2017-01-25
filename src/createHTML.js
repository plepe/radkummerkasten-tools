var Radkummerkasten = require('./Radkummerkasten')
var getTemplate = require('./getTemplate')
var async = require('async')

function process (filter, pipe, callback) {
  var entries = []
  var renderParam = {
     embedImgs: true
  }

  Radkummerkasten.getEntries(
    filter,
    function (err, entry) {
      if (err) {
        throw (err)
      }

      entries.push(entry)
    },
    function (err) {
      if (err) {
        throw (err)
      }

      async.each(
        entries,
        function (entry, callback) {
          entry.renderHTML(renderParam, function (err, result) {
            pipe.write(result)

            callback()
          })
        },
        function (err) {
          callback()
        }
      )
    }
  )
}

module.exports = function (filter, pipe, callback) {

  async.series([
    function (callback) {
      getTemplate('showTemplateHeader', function (err, result) {
        pipe.write(result)
        callback(err)
      })
    },
    function (callback) {
      process(filter, pipe, callback)
    },
    function (callback) {
      getTemplate('showTemplateFooter', function (err, result) {
        pipe.write(result)
        callback(err)
      })
    }
  ], function (err) {
    callback(err)
  })
}
