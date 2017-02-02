var request = require('request-xmlhttprequest')
var templates = {}

function getTemplate (id, callback) {
  if (id in templates) {
    return callback(null, templates[id])
  }

  var prefix = 'file:'
  if (typeof location !== 'undefined') {
    prefix = location.origin + location.pathname
  }
  request.get(prefix + 'templates/' + id + '.html',
    function (error, response, body) {
      if (!error && response.statusCode === 200) {
        templates[id] = body
        callback(null, body)
      } else {
        callback(error, null)
      }
    }
  )
}

module.exports = getTemplate
