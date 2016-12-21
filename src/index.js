window.Radkummerkasten = require('../src/Radkummerkasten')
window.csvWriter = require('csv-write-stream')
window.concat = require('concat-stream')
window.createCsv = require('../src/createCsv')
window.createGeoJson = require('../src/createGeoJson')
window.stream = require('stream')

var twig = require('twig').twig
var teaserTemplate

const step = 20

function showEntry(entry, div) {
  entry.getDetails(function () {
    div.innerHTML = teaserTemplate.render(entry)
  })
}

window.onload = function () {
  teaserTemplate = twig({
    data: '<h3>#{{ id }} {{ categoryName }}: {{ title }}</h3>\n' +
      '{% if attachments and attachments|length > 0 %}\n' +
      '<img src="{{ attachments[0].url }}">\n' +
      '{% endif %}\n' +
      '{% if text|length > 200 %}{{ text|slice(0, 200)|nl2br }}...{% else %}{{ text|nl2br }}{% endif %}\n' +
      '<br><a target="radkummerkasten" href="https://www.radkummerkasten.at/#marker-{{ id }}">{{ date }} von {{ user }}</a>, {{ likes }} Unterstützung(en), {{ comments|length}} Kommentar(e) '
  })

  update()
}

window.update = function () {
  var entries = []
  var content = document.getElementById('content')
  var form = document.getElementById('form')

  var filter = {}
  if (form.elements.bezirk.value !== '*') {
    filter.bezirk = [ form.elements.bezirk.value ]
  }
  if (form.elements.category.value !== '*') {
    filter.category = [ form.elements.category.value ]
  }

  Radkummerkasten.getEntries(
    filter,
    function (err, entry) {
      entries.push(entry)
    },
    function (err) {
      content.innerHTML = ''

      for (var i = Math.max(entries.length - step, 0); i < entries.length; i++) {
        var div = document.createElement('div')
        div.className = 'entry'
        content.insertBefore(div, content.firstChild)

        showEntry(entries[i], div)
      }

      var done = step

      if (entries.length <= step) {
        return
      }

      var divLoadMore = document.createElement('div')
      divLoadMore.className = 'loadMore'

      var a = document.createElement('a')
      a.appendChild(document.createTextNode('lade mehr Einträge'))
      a.href = '#'
      a.onclick = function () {
        for (var i = entries.length - done - 1; i >= Math.max(entries.length - done - step, 0); i--) {
          var div = document.createElement('div')
          div.className = 'entry'
          content.insertBefore(div, divLoadMore)

          showEntry(entries[i], div)
        }

        done += step

        if (entries.length <= done) {
          content.removeChild(divLoadMore)
        }

        return false
      }

      divLoadMore.appendChild(a)
      content.appendChild(divLoadMore)
    }
  )
}

window.openDownload = function () {
  var formDownload = document.getElementById('downloadOptions')
  formDownload.style.display = 'block'
}

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

window.submitDownloadForm = function () {
  var form = document.getElementById('form')
  var formDownload = document.getElementById('downloadOptions')
  var filter = {}

  if (form.elements.bezirk.value !== '*') {
    filter.bezirk = [ form.elements.bezirk.value ]
  }
  if (form.elements.category.value !== '*') {
    filter.category = [ form.elements.category.value ]
  }

  if (formDownload.elements.includeDetails.checked) {
    filter.includeDetails = true
  }

  var download = document.getElementById('download')
  download.innerHTML = 'Daten werden geladen, bitte warten ...'

  var fileType = formDownload.elements.fileType.value
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
