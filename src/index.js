window.Radkummerkasten = require('../src/Radkummerkasten')
var createCsv = require('../src/createCsv')
var createGeoJson = require('../src/createGeoJson')

var csvWriter = require('csv-write-stream')
var concat = require('concat-stream')
var stream = require('stream')
var twig = require('twig').twig

var teaserTemplate
var showTemplate
const step = 20

function showEntry(entry, div) {
  entry.getDetails(function () {
    div.innerHTML = teaserTemplate.render(entry)
  })
}

window.onload = function () {
  teaserTemplate = twig({
    data: document.getElementById('teaserTemplate').innerHTML
  })
  showTemplate = twig({
    data: document.getElementById('showTemplate').innerHTML
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

window.pageShow = function (id) {
  document.getElementById('pageOverview').style.display = 'none'
  var page = document.getElementById('pageShow')
  page.innerHTML = ''
  page.style.display = 'block'

  Radkummerkasten.getEntries(
    {
      id: [ '' + id ],
      includeDetails: true
    },
    function (err, entry) {
      if (err) {
        alert(err)
        return
      }

      page.innerHTML = showTemplate.render(entry)
    },
    function (err) {}
  )
}

window.pageOverview = function () {
  document.getElementById('pageShow').style.display = 'none'
  document.getElementById('pageOverview').style.display = 'block'
}
