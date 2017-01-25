var Radkummerkasten = require('./Radkummerkasten')
var getTemplate = require('./getTemplate')
var async = require('async')

function process (filter, pipe, callback) {
  var entries = []
  var renderParam = {
     embedImgs: true,
     embedMapAsImg: true,
     mapWidth: 400,
     mapHeight: 300
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

      var fakelayer = document.createElement('div')
      fakelayer.style = {
        position: 'absolute',
        width: 0,
        height: 0
      }
      document.body.appendChild(fakelayer)

      async.each(
        entries,
        function (entry, callback) {
          var dom = document.createElement('div')
          fakelayer.appendChild(dom)

          entry.showHTML(dom, renderParam, function (err, dom) {
            pipe.write(dom.innerHTML)

            callback()
          })
        },
        function (err) {
          document.body.removeChild(fakelayer)
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
