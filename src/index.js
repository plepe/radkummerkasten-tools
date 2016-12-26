window.Radkummerkasten = require('../src/Radkummerkasten')
var createCsv = require('../src/createCsv')
var createGeoJson = require('../src/createGeoJson')

var csvWriter = require('csv-write-stream')
var concat = require('concat-stream')
var stream = require('stream')
var twig = require('twig').twig
var hash = require('sheet-router/hash')
var async = require('async')
var loadingIndicator = require('simple-loading-indicator')

var teaserTemplate
var showTemplate
var pageOverviewLoaded = false
window.knownEntries = {}
const step = 20

function showEntry(entry, div, callback) {
  entry.getDetails({}, function (err) {
    div.innerHTML = teaserTemplate.render(entry)

    if (callback) {
      callback(err)
    }
  })
}

window.onload = function () {
  teaserTemplate = twig({
    data: document.getElementById('teaserTemplate').innerHTML
  })
  showTemplate = twig({
    data: document.getElementById('showTemplate').innerHTML
  })

  loadingIndicator.setActive()

  async.series([
    function (callback) {
      Radkummerkasten.loadBezirksgrenzen(function (err, bezirke) {
        if (err) {
          alert('Kann Bezirksgrenzen nicht laden! ' + err)
          return
        }

        loadingIndicator.setValue(0.5)

        var select = document.getElementById('form').elements.bezirk

        bezirke.forEach(function (bezirk) {
          var option = document.createElement('option')
          option.value = bezirk.properties.BEZNR
          option.appendChild(document.createTextNode(bezirk.properties.NAMEK_NUM))
          select.appendChild(option)
        })

        var option = document.createElement('option')
        option.value = 0
        option.appendChild(document.createTextNode('außerhalb Wien'))
        select.appendChild(option)

        callback()
      })
    },
    function (callback) {
      Radkummerkasten.categories(function (err, categories) {
        if (err) {
          alert('Kann Kategorien nicht laden! ' + err)
          return
        }

        loadingIndicator.setValue(1)

        var select = document.getElementById('form').elements.category

        categories.forEach(function (category) {
          var option = document.createElement('option')
          option.value = category.id
          option.appendChild(document.createTextNode(category.name))
          select.appendChild(option)
        })

        callback()
      })
    },
    function (callback) {
      loadingIndicator.setInactive()

      hash(function (loc) {
        if (loc.match(/^#[0-9]+$/)) {
          pageShow(loc.substr(1))
        } else {
          pageOverview()
        }
      })

      if (location.hash.match(/^#[0-9]+$/)) {
        pageShow(location.hash.substr(1))
      } else {
        update()
      }
    }
  ])
}

window.update = function (reloadAll) {
  var entries = []
  var content = document.getElementById('content')
  var form = document.getElementById('form')
  pageOverviewLoaded = true

  var filter = {}
  if (form.elements.bezirk.value !== '*') {
    filter.bezirk = [ form.elements.bezirk.value ]
  }
  if (form.elements.category.value !== '*') {
    filter.category = [ form.elements.category.value ]
  }

  if (reloadAll) {
    knownEntries = {}
    content.innerHTML = ''
  } else {
    filter.force = true
  }

  loadingIndicator.setActive()

  Radkummerkasten.getEntries(
    filter,
    function (err, entry) {
      if (!(entry.id in knownEntries)) {
        entries.push(entry)
        knownEntries[entry.id] = true
      }
    },
    function (err) {
      var willLoad = Math.min(entries.length, step)
      var loaded = 0
      loadingIndicator.setValue(1 / (willLoad + 1))

      if (willLoad === 0) {
        loadingIndicator.setInactive()
      }

      for (var i = Math.max(entries.length - step, 0); i < entries.length; i++) {
        var div = document.createElement('div')
        div.className = 'entry'
        content.insertBefore(div, content.firstChild)

        showEntry(entries[i], div, function (err, result) {
          if (err) {
            alert('Error occured loading entry ' + entries[i].id + ': ' + err)
          }

          loaded++
          loadingIndicator.setValue((loaded + 1) / (willLoad + 1))

          if (loaded >= willLoad) {
            loadingIndicator.setInactive()
          }
        })
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
  a.appendChild(document.createTextNode('Hier herunterladen'))
  a.onclick = function () {
    document.getElementById('downloadOptions').style.display = 'none'
  }

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

  loadingIndicator.setActive()

  Radkummerkasten.getEntries(
    {
      id: [ '' + id ],
      includeDetails: true,
      forceDetails: true
    },
    function (err, entry) {
      loadingIndicator.setInactive()

      if (err) {
        alert(err)
        return
      }

      page.innerHTML = showTemplate.render(entry)

      if (document.getElementById('map')) {
        var map = L.map('map').setView([ entry.lat, entry.lon ], 17)

	L.tileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
	}).addTo(map)

	L.marker([ entry.lat, entry.lon ]).addTo(map)
      }
    },
    function (err) {}
  )
}

window.pageOverview = function () {
  document.getElementById('pageShow').style.display = 'none'
  document.getElementById('pageOverview').style.display = 'block'

  if (!pageOverviewLoaded) {
    update()
  }
}
