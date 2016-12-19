window.Radkummerkasten = require('../src/Radkummerkasten')
window.csvWriter = require('csv-write-stream')
window.concat = require('concat-stream')
window.createCsv = require('../src/createCsv')
window.createGeoJson = require('../src/createGeoJson')
window.stream = require('stream')

function createDownload (fileType, data) {
  var download = document.getElementById('download')
  download.innerHTML = ''

  var contentType
  var extension

  if (fileType === 'csv') {
    contentType = 'text/csv'
    extension = 'csv'
  } else if (fileType === 'geojson') {
    contentType = 'application/vnd.geo+json'
    extension = 'geojson'
  }

  var a = document.createElement('a')
  a.href= 'data:' + contentType + ';charset=utf-8,' + encodeURI(data)
  a.download = 'radkummerkasten.' + extension
  a.appendChild(document.createTextNode('Download'))

  download.appendChild(a)
}

window.submitRequest = function () {
  var form = document.getElementById('form')
  var filter = {}

  if (form.elements.bezirk.value !== '*') {
    filter.bezirk = [ form.elements.bezirk.value ]
  }
  if (form.elements.category.value !== '*') {
    filter.category = [ form.elements.category.value ]
  }
  if (form.elements.includeDetails.checked) {
    filter.includeDetails = true
  }

  var download = document.getElementById('download')
  download.innerHTML = 'Daten werden geladen, bitte warten ...'

  var fileType = form.elements.fileType.value
  if (fileType === 'csv') {
    createCsv(filter, concat(createDownload.bind(this, fileType)))
  } else if (fileType === 'geojson') {
    var downloadStream = concat(createDownload.bind(this, fileType))

    createGeoJson(filter, downloadStream, function () {
      downloadStream.end()
    })
  }

  return false
}
