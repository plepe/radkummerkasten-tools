// source: http://stackoverflow.com/a/20285053
function toDataUrl(url, callback) {
  var xhr = new XMLHttpRequest()
  xhr.responseType = 'blob'
  xhr.onload = function() {
    if (xhr.response.constructor.name === 'ArrayBuffer') {
      // the NodeJS module 'w3c-xmlhttprequest' returns an ArrayBuffer if
      // repsonseType is set to 'blob'. Use the following code as alternative
      // to the "correct" version below.
      var b64 = new Buffer(xhr.response).toString('base64')
      var contentType = xhr.getResponseHeader('content-type')
      callback(null, 'data:' + contentType + ';base64,' + b64)

    } else {
      // "correct" version
      var reader = new FileReader()
      reader.onloadend = function() {
        callback(null, reader.result)
      }
      reader.readAsDataURL(xhr.response)
    }
  }
  xhr.open('GET', url)
  xhr.send()
}

module.exports = toDataUrl
