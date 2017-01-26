// source: http://stackoverflow.com/a/20285053
function toDataUrl(url, callback) {
  var xhr = new XMLHttpRequest()
  xhr.responseType = 'blob'
  xhr.onload = function() {
    var reader = new FileReader()
    reader.onloadend = function() {
      callback(null, reader.result)
    }
    reader.readAsDataURL(xhr.response)
  }
  xhr.open('GET', url)
  xhr.send()
}

module.exports = toDataUrl
