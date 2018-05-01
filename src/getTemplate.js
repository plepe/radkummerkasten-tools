var httpGetJSON = require('./httpGetJSON')
var templates = {}

function getTemplate (id, callback) {
  if (id in templates) {
    return callback(null, templates[id])
  }

  httpGetJSON('GET', 'templates/' + id + '.json', null, function (error, result) {
      if (error) {
        return callback(error, null)
      }

      templates[id] = result
      callback(null, result)
    }
  )
}

module.exports = getTemplate
