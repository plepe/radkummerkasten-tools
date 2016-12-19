window.Radkummerkasten = require('../src/Radkummerkasten')
window.csvWriter = require('csv-write-stream')
window.concat = require('concat-stream')
window.createCsv = require('../src/createCsv')

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

  var pipe = concat(function (data) {
    var download = document.getElementById('download')
    download.innerHTML = ''

    var a = document.createElement('a')
    a.href= 'data:text/csv;charset=utf-8,' + encodeURI(data)
    a.download = 'radkummerkasten.csv'
    a.appendChild(document.createTextNode('Download'))

    download.appendChild(a)
  })

  var download = document.getElementById('download')
  download.innerHTML = 'Daten werden geladen, bitte warten ...'

  createCsv(filter, pipe)

  return false
}
