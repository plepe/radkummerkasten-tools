window.Radkummerkasten = require('../src/Radkummerkasten')
var createCsv = require('../src/createCsv')
var createGeoJson = require('../src/createGeoJson')
var createHTML = require('../src/createHTML')

var csvWriter = require('csv-write-stream')
var concat = require('concat-stream')
var stream = require('stream')
var twig = require('twig').twig
var hash = require('sheet-router/hash')
var async = require('async')
var loadingIndicator = require('simple-loading-indicator')

var teaserTemplate
var pageOverviewLoaded = false
var popScrollTop = null
var preferredLayer = null
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

function restoreScroll() {
  if (popScrollTop !== null) {
    document.body.scrollTop = popScrollTop
  }

  popScrollTop = null
}

window.onload = function () {
  document.getElementById('version').appendChild(document.createTextNode(Radkummerkasten.version))

  teaserTemplate = twig({
    data: document.getElementById('teaserTemplate').innerHTML
  })

  window.addEventListener('popstate', function (event) {
    if (event.state && 'scrollTop' in event.state) {
      popScrollTop = event.state.scrollTop
    } else {
      popScrollTop = null
    }
  })
  window.addEventListener('scroll', function (event) {
    history.replaceState({ scrollTop: document.body.scrollTop }, '', location.hash)
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
          loaded++
          loadingIndicator.setValue((loaded + 1) / (willLoad + 1))

          if (loaded >= willLoad) {
            loadingIndicator.setInactive()
          }
        })
      }

      var done = step

      if (entries.length <= step) {
        restoreScroll()
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

      restoreScroll()
    }
  )
}

window.openDownload = function () {
  var formDownload = document.getElementById('downloadOptions')
  formDownload.style.display = 'block'
}

window.openShowDownload = function () {
  var formDownload = document.getElementById('showDownloadOptions')
  formDownload.style.display = 'block'
}

function createDownload (downloadDom, fileType, data) {
  downloadDom.innerHTML = ''

  var contentType
  var extension

  if (fileType === 'csv') {
    contentType = 'text/csv'
    extension = 'csv'
  } else if (fileType === 'geojson') {
    contentType = 'application/vnd.geo+json'
    extension = 'geojson'
  } else if (fileType === 'html') {
    contentType = 'text/html'
    extension = 'odt'
  }

  var a = document.createElement('a')
  a.href= 'data:' + contentType + ';charset=utf-8,' + encodeURI(data)
  a.download = 'radkummerkasten.' + extension
  a.appendChild(document.createTextNode('Hier herunterladen'))
  a.onclick = function () {
    document.getElementById('downloadOptions').style.display = 'none'
  }

  downloadDom.appendChild(a)
}

window.submitDownloadForm = function (formDownload) {
  var filter = {}
  var downloadDom = document.getElementById('download')

  if (formDownload.id === 'showDownloadOptions') {
    filter.id = formDownload.elements.filterId.value
    filter.includeDetails = true
    downloadDom = document.getElementById('showDownload')
  } else {
    var form = document.getElementById('form')

    if (form.elements.bezirk.value !== '*') {
      filter.bezirk = [ form.elements.bezirk.value ]
    }
    if (form.elements.category.value !== '*') {
      filter.category = [ form.elements.category.value ]
    }

    if (formDownload.elements.includeDetails.checked) {
      filter.includeDetails = true
    }
  }

  downloadDom.innerHTML = 'Daten werden geladen, bitte warten ...'

  var fileType = formDownload.elements.fileType.value
  if (fileType === 'csv') {
    createCsv(filter, concat(createDownload.bind(this, downloadDom, fileType)))
  } else if (fileType === 'geojson') {
    var downloadStream = concat(createDownload.bind(this, downloadDom, fileType))

    createGeoJson(filter, downloadStream, function () {
      downloadStream.end()
    })
  } else if (fileType === 'html') {
    var downloadStream = concat(createDownload.bind(this, downloadDom, fileType))

    // filter.includeImgs = true
    createHTML(filter, downloadStream, function () {
      downloadStream.end()
    })
  }

  return false
}

window.pageShow = function (id) {
  document.getElementById('pageOverview').style.display = 'none'
  var page = document.getElementById('pageShow')
  page.style.display = 'block'
  var pageContent = document.getElementById('showContent')
  pageContent.innerHTML = ''
  document.getElementById('showDownloadOptions').elements.filterId.value = id

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

      entry.renderHTML({},
        function (err, result) {
          pageContent.innerHTML = result

          if (document.getElementById('map')) {
            var layers = {}

            layers['OSM Default'] =
              L.tileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                  attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
                  maxZoom: 19,
                  maxNativeZoom: 19
              })

            layers['OSM CycleMap'] =
              L.tileLayer('//{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png', {
                  attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors, Tiles: <a href="http://www.thunderforest.com/">Andy Allan</a>',
                  maxZoom: 19,
                  maxNativeZoom: 18
              })

            layers['Radkummerkasten'] =
              L.tileLayer('//radkummerkasten.at/map/{z}/{x}/{y}.png', {
                  attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors, Tiles: <a href="http://radlkarte.at/">radlkarte.at</a>',
                  maxZoom: 19,
                  maxNativeZoom: 18
              })
            if (preferredLayer === null) {
              preferredLayer = 'OSM Default'
            }

            var map = L.map('map', {
              layers: layers[preferredLayer]
            }).setView([ entry.lat, entry.lon ], 17)
            L.control.layers(layers).addTo(map)

            L.marker([ entry.lat, entry.lon ]).addTo(map)

            map.on('baselayerchange', function (event) {
              preferredLayer = event.name
            })
          }
        }
      )
    },
    function (err) {
      restoreScroll()
    }
  )
}

window.pageOverview = function () {
  document.getElementById('pageShow').style.display = 'none'
  document.getElementById('pageOverview').style.display = 'block'

  if (!pageOverviewLoaded) {
    update()
  } else {
    restoreScroll()
  }
}
