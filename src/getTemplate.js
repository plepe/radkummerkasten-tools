var request = require('request-xmlhttprequest')

function getTemplate (id, callback) {
  var prefix = 'file:'
  if (typeof location !== 'undefined') {
    prefix = location.origin + location.pathname
  }
  request.get(prefix + 'src/' + id + '.html',
    function (error, response, body) {
      if (!error && response.statusCode === 200) {
        callback(null, body)
      } else {
        callback(error, null)
      }
    }
  )
}

module.exports = getTemplate
