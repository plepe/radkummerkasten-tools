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
var FileSaver = require('file-saver');

var teaserTemplate
var pageOverviewLoaded = false
var popScrollTop = null
var preferredLayer = null
var entryOptions = {}
var currentPage = 'Overview'
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

        var select = document.getElementById('filterOverview').elements.bezirk

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

        var select = document.getElementById('filterOverview').elements.category

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
  var content = document.getElementById('pageOverview')
  var form = document.getElementById('filterOverview')
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
    extension = 'html'
  } else if (fileType === 'office') {
    contentType = 'text/html'
    extension = 'odt'
  }

  var blob = new Blob([ data ], { type: contentType + ";charset=utf-8" })
  FileSaver.saveAs(blob, 'radkummerkasten.' + extension)
  document.getElementById('downloadOptions').style.display = 'none'
}

window.submitDownloadForm = function () {
  var filter = {}
  var downloadDom = document.getElementById('download')

  var formDownload = document.getElementById('downloadOptions')
  var formFilter = document.getElementById('filter' + currentPage)

  if ('filterId' in formFilter.elements) {
    filter.id = formFilter.elements.filterId.value
  }
  if ('bezirk' in formFilter.elements && formFilter.elements.bezirk.value !== '*') {
    filter.bezirk = [ formFilter.elements.bezirk.value ]
  }
  if ('category' in formFilter.elements && formFilter.elements.category.value !== '*') {
    filter.category = [ formFilter.elements.category.value ]
  }
  if (formDownload.elements.includeDetails.checked) {
    filter.includeDetails = true
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

    // filter.embedImgs = true
    createHTML(filter, downloadStream, function () {
      downloadStream.end()
    })
  } else if (fileType === 'office') {
    var downloadStream = concat(createDownload.bind(this, downloadDom, fileType))

    filter.template = 'officeTemplate'
    createHTML(filter, downloadStream, function () {
      downloadStream.end()
    })
  }

  return false
}

window.pageShow = function (id) {
  currentPage = 'Show'
  document.getElementById('menuOverview').style.display = 'none'
  document.getElementById('pageOverview').style.display = 'none'
  var menu = document.getElementById('menuShow')
  menu.style.display = 'block'
  var page = document.getElementById('pageShow')
  page.style.display = 'block'
  page.innerHTML = ''
  document.getElementById('filterShow').elements.filterId.value = id

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

      entry.showHTML(
        page,
        entryOptions,
        function (err, page) {
        }
      )
    },
    function (err) {
      restoreScroll()
    }
  )
}

window.pageOverview = function () {
  currentPage = 'Overview'
  document.getElementById('pageOverview').style.display = 'block'
  document.getElementById('menuOverview').style.display = 'block'
  document.getElementById('pageShow').style.display = 'none'
  document.getElementById('menuShow').style.display = 'none'

  if (!pageOverviewLoaded) {
    update()
  } else {
    restoreScroll()
  }
}
