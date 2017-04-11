window.Radkummerkasten = require('../src/Radkummerkasten')
var createCsv = require('../src/createCsv')
var createGeoJson = require('../src/createGeoJson')
var createHTML = require('../src/createHTML')
var getTemplate = require('../src/getTemplate')

var csvWriter = require('csv-write-stream')
var concat = require('concat-stream')
var stream = require('stream')
var twig = require('twig').twig
var hash = require('sheet-router/hash')
var async = require('async')
var loadingIndicator = require('simple-loading-indicator')
var FileSaver = require('file-saver');
var querystring = require('querystring')
var moment = require('moment')
var scrollingElement = require('scrollingelement')
require('moment/locale/de')

var config = require('../src/loadConfig')
Radkummerkasten.setConfig(config)

var teaserTemplate
var pageOverviewLoaded = false
var popScrollTop = null
var preferredLayer = null
var entryOptions = {}
var currentPage = 'Overview'
var filterOverview = null
window.knownEntries = {}
const step = 20

function showEntry(entry, div, callback) {
  var data = JSON.parse(JSON.stringify(entry.properties))
  data.options = Radkummerkasten.options

  div.innerHTML = teaserTemplate.render(data)

  if (callback) {
    callback()
  }
}

function restoreScroll() {
  if (popScrollTop !== null) {
    document.scrollingElement.scrollTop = popScrollTop
  }

  popScrollTop = null
}

window.onload = function () {
  var bezirkValues = {}
  var categoryValues = {}

  document.getElementById('version').appendChild(document.createTextNode(Radkummerkasten.version))

  window.addEventListener('popstate', function (event) {
    if (event.state && 'scrollTop' in event.state) {
      popScrollTop = event.state.scrollTop
    } else {
      popScrollTop = null
    }
  })
  window.addEventListener('scroll', function (event) {
    history.replaceState({ scrollTop: document.scrollingElement.scrollTop }, '', location.hash)
  })

  loadingIndicator.setActive()

  async.series([
    function (callback) {
      getTemplate('teaserBody', function (err, result) {
        if (err) {
          alert('Kann Template "teaser" nicht laden! ' + err)
          return
        }

        loadingIndicator.setValue(0.25)

        teaserTemplate = twig({
          data: result
        })

        callback()
      })
    },
    function (callback) {
      Radkummerkasten.loadBezirksgrenzen(function (err, bezirke) {
        if (err) {
          alert('Kann Bezirksgrenzen nicht laden! ' + err)
          return
        }

        bezirke.forEach(function (bezirk) {
          bezirkValues[bezirk.properties.BEZNR] = bezirk.properties.NAMEK_NUM
        })
        bezirkValues[0] = 'außerhalb Wien'
        console.log(bezirkValues)


        loadingIndicator.setValue(0.5)

        callback()
      })
    },
    function (callback) {
      Radkummerkasten.categories(function (err, categories) {
        if (err) {
          alert('Kann Kategorien nicht laden! ' + err)
          return
        }

        loadingIndicator.setValue(0.75)

        categories.forEach(function (category) {
          categoryValues[category.id] = category.title
        })

        callback()
      })
    },
    function (callback) {
      Radkummerkasten.checkUpdate(function () {
        loadingIndicator.setValue(1)
        callback()
      })
    },
    function (callback) {
      loadingIndicator.setInactive()

      filterOverview = new form(
        null,
        {
          'bezirk': {
            'type': 'select',
            'name': 'Bezirk',
            'values': bezirkValues
          },
          'category': {
            'type': 'select',
            'name': 'Kategorie',
            'values': categoryValues
          },
          'user': {
            'type': 'text',
            'name': 'Autor',
            'desc': 'Eintrag oder Kommentar; verwende ganzen sichtbaren Namen, z.B. "Max M."'
          },
          'dateStart': {
            'type': 'date',
            'name': 'Erstellungsdatum ab',
          },
          'dateEnd': {
            'type': 'date',
            'name': 'Erstellungsdatum bis',
          },
          'lastCommentDateStart': {
            'type': 'date',
            'name': 'Erstellt oder zuletzt kommentiert ab',
          },
          'lastCommentDateEnd': {
            'type': 'date',
            'name': 'Erstellt oder zuletzt kommentiert bis',
          },
          'lastUpdateStart': {
            'type': 'date',
            'name': 'Letzte Änderung ab',
          },
          'lastUpdateEnd': {
            'type': 'date',
            'name': 'Letzte Änderung bis',
          },
          'order': {
            'type': 'select',
            'name': 'Sortierung',
            'default': 'lastComment',
            'values': {
              'lastComment': 'Neueste Kommentare bzw. Einträge zuerst',
              'id': 'Neueste Einträge zuerst',
              'likes': 'Einträge mit den meisten Unterstützungen zuerst',
              'commentsCount': 'Einträge mit den meisten Kommentaren zuerst',
              'lastUpdate': 'Einträge sortiert nach letzter Änderung'
            }
          }
        },
        {
          'type': 'filters',
          'button:add_element': 'Filter hinzufügen / Sortierung ändern',
          'order': false
        }
      )

      filterOverview.show(document.getElementById('filterOverview'))
      filterOverview.onchange = function () {
        return update(false, true)
      }

      hash(function (loc) {
        if (loc.match(/^#[0-9]+$/)) {
          pageShow(loc.substr(1))
        } else {
          var scroll = popScrollTop
          pageOverview()
          updateFormFromUrl()
          popScrollTop = scroll
          update()
        }
      })

      if (location.hash.match(/^#[0-9]+$/)) {
        pageShow(location.hash.substr(1))
      } else {
        updateFormFromUrl()
        update()
      }
    }
  ])
}

function updateFormFromUrl () {
  if (location.hash.match(/^#/)) {
    var url = querystring.parse(location.hash.substr(1))

    filterOverview.set_data(url)
  }
}

window.update = function (force, pushState) {
  if (force) {
    Radkummerkasten.checkUpdate(_update.bind(this, force, pushState))
  } else {
    _update(force, pushState)
  }
}

function buildFilter () {
  var r = filterOverview.get_data()
  var result = {}

  for (var k in r) {
    if (k === 'date') {
      if (r[k][0] || r[k][1]) {
        result[k] = [ r[k][0], r[k][1] ]
      }
    } else if (r[k] !== null) {
      result[k] = r[k]
    }
  }

  return result
}

function buildUrl () {
  var result = buildFilter()

  return result
}

function _update (force, pushState) {
  pageOverviewLoaded = true

  var url = buildUrl()
  url = '#' + querystring.stringify(url)
  if (pushState) {
    history.pushState({ scrollTop: document.body.scrollTop }, '', url)
  } else {
    history.replaceState({ scrollTop: document.body.scrollTop }, '', url)
  }

  var filter = buildFilter()
  overviewShowEntries(filter, 0)

  // Update timestamp
  Radkummerkasten.dbConfig.get('status', function (err, result) {
    if (err) {
      return
    }

    var domTs = document.getElementById('timestamp')
    var ts = moment(result.timestamp)
    domTs.innerHTML = ts.format().substr(0, 16).replace('T', ' ')
  })
}

function overviewShowEntries (filter, start) {
  var content = document.getElementById('pageOverview')

  if (start === 0) {
    content.innerHTML = ''
  }

  filter.limit = step + 1
  filter.offset = start

  var count = 0
  loadingIndicator.setActive()

  Radkummerkasten.getEntries(
    filter,
    function (err, entry) {
      loadingIndicator.setValue(count / step)

      if (err) {
        alert(err)
        restoreScroll()
        loadingIndicator.setInactive()
        return
      }

      count++

      if (count > step) {
        // load more
        var divLoadMore = document.createElement('div')
        divLoadMore.className = 'loadMore'

        var a = document.createElement('a')
        a.appendChild(document.createTextNode('lade mehr Einträge'))
        a.href = '#'
        a.onclick = function () {
          content.removeChild(divLoadMore)
          overviewShowEntries(filter, start + step)

          return false
        }

        divLoadMore.appendChild(a)
        content.appendChild(divLoadMore)
      } else {
        var div = document.createElement('div')
        div.className = 'entry'
        content.appendChild(div)

        showEntry(entry, div, function (err, result) {
        })
      }
    },
    function (err) {
      if (err) {
        alert(err)
      }

      loadingIndicator.setValue(1)
      loadingIndicator.setInactive()
      filterOverview.set_orig_data(filter)
      restoreScroll()
    }
  )
}

window.openDownload = function () {
  var formDownload = document.getElementById('downloadOptions')
  formDownload.style.display = 'block'
  updateDownloadForm()
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
    extension = 'html'
  }

  var blob = new Blob([ data ], { type: contentType + ";charset=utf-8" })
  FileSaver.saveAs(blob, 'radkummerkasten.' + extension)
  document.getElementById('downloadOptions').style.display = 'none'
}

window.updateDownloadForm = function () {
  var formDownload = document.getElementById('downloadOptions')
  var fileType = formDownload.elements.fileType.value

  var divs = formDownload.getElementsByClassName('downloadOption')
  for (var i = 0; i < divs.length; i++) {
    var div = divs[i]

    var t = div.getAttribute('downloadTypes')
    if (t) {
      t = t.split(',')
      if (t.indexOf(fileType) === -1) {
        div.style.display = 'none'
      } else {
        div.style.display = 'block'
      }
    }
  }
}

window.submitDownloadForm = function () {
  var filter = {}
  var downloadDom = document.getElementById('download')

  var formDownload = document.getElementById('downloadOptions')
  var formFilter = document.getElementById('filter' + currentPage)

  if ('filterId' in formFilter.elements) {
    filter.id = formFilter.elements.filterId.value
  } else {
    filter = buildFilter()
  }

  if (formDownload.elements.includeDetails.checked) {
    filter.includeDetails = true
  }
  if (formDownload.elements.embedImgs.checked) {
    filter.embedImgs = true
  }
  if (formDownload.elements.noMap.checked) {
    filter.noMap = true
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

    filter.template = 'office'
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
      id: [ '' + id ]
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
