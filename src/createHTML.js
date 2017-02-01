var Radkummerkasten = require('./Radkummerkasten')
var getTemplate = require('./getTemplate')
var async = require('async')
var twig = require('twig').twig

/**
 * @param object filter
 * @param boolean [filter.embedImgs=false] shall images be embeded?
 * @param {boolean} [options.noMap=false] Don't embed a map.
 */
function process (filter, pipe, callback) {
  var entries = []
  var renderParam = {
     embedImgs: 'embedImgs' in filter ? filter.embedImgs : false,
     embedMapAsImg: true,
     noMap: 'noMap' in filter ? filter.noMap : false,
     mapWidth: 400,
     mapHeight: 300
  }
  if (filter.template) {
    renderParam.template = filter.template
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
  var template = 'showTemplate'
  if (filter.template) {
    template = filter.template
  }
  var templateData = {
    version: "__GIT_MY_VERSION__"
  }

  async.series([
    function (callback) {
      getTemplate(template + 'Header', function (err, result) {
        var template = twig({
          data: result
        })
        pipe.write(template.render(templateData))

        callback(err)
      })
    },
    function (callback) {
      process(filter, pipe, callback)
    },
    function (callback) {
      getTemplate(template + 'Footer', function (err, result) {
        var template = twig({
          data: result
        })
        pipe.write(template.render(templateData))

        callback(err)
      })
    }
  ], function (err) {
    callback(err)
  })
}
