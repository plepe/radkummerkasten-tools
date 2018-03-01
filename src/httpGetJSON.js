function httpGetJSON (method, url, data, callback) {
  var xhr = new XMLHttpRequest()
  xhr.onload = function() {
    let err, data

    if (xhr.status === 200) {
      data = JSON.parse(xhr.response)
    } else {
      err = 'Status ' + xhr.status
    }

    callback(err, data)
  }
  xhr.open(method, url)
  xhr.send(data)
}

module.exports = httpGetJSON
