window.Radkummerkasten = require('../src/Radkummerkasten')
var createCsv = require('../src/createCsv')
var createGeoJson = require('../src/createGeoJson')
var createHTML = require('../src/createHTML')
var getTemplate = require('../src/getTemplate')
var Selection = require('./Selection')
var httpGetJSON = require('./httpGetJSON')
var mapLayers = require('./mapLayers')

var csvWriter = require('csv-write-stream')
var concat = require('concat-stream')
var stream = require('stream')
var Twig = require('twig')
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

var postcodes = {}
var postcodeValues = {}
var surveys = {}
var surveyValues = {}
var states = {}
var statusValues = {}

var inlineForms = require('./inlineForms')

const DBApi = require('db-api')
var api = new DBApi('api.php')

function showEntry(entry, div, callback) {
  var data = JSON.parse(JSON.stringify(entry.properties))
  data.options = Radkummerkasten.options

  div.innerHTML = teaserTemplate.render(data)
  call_hooks('render-teaser', div, data)

  var formEmitter = inlineForms(div, entry, {
    "status": statusValues
  })
  formEmitter.on('save', function () {
    update(false, true)
  })

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
  document.getElementById('version').appendChild(document.createTextNode(Radkummerkasten.version))

  // initalize modules
  new Selection()

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

  Twig.extendFilter('parameter', function (value, args) {
    if (args[0] === 'survey') {
      if (value in surveys) {
        return surveys[value]
      } else {
        return { id: value, name: value }
      }
    }
    else if (args[0] === 'states') {
      if (value in states) {
        return states[value]
      } else {
        return { id: value, name: value }
      }
    }
  })

  async.series([
    function (callback) {
      getTemplate('teaserBody', function (err, result) {
        if (err) {
          alert('Kann Template "teaser" nicht laden! ' + err)
          return
        }

        loadingIndicator.setValue(0.2)

        teaserTemplate = Twig.twig({
          data: result
        })

        callback()
      })
    },
    function (callback) {
      Radkummerkasten.loadPostcodes(function (err, result) {
        if (err) {
          alert('Kann Postcodes nicht laden! ' + err)
          return
        }

        postcodes = result
        postcodes.forEach(function (postcode) {
          postcodeValues[postcode.id] = postcode.properties.NAMEK_NUM
        })
        postcodeValues[0] = 'außerhalb Wien'

        loadingIndicator.setValue(0.4)

        callback()
      })
    },
    function (callback) {
      Radkummerkasten.surveys(function (err, result) {
        if (err) {
          alert('Kann Kategorien nicht laden! ' + err)
          return
        }

        loadingIndicator.setValue(0.6)

        result.forEach(function (survey) {
          surveys[survey.id] = survey
          surveyValues[survey.id] = survey.name
        })

        callback()
      })
    },
    function (callback) {
      Radkummerkasten.states(function (err, result) {
        if (err) {
          alert('Kann Stati nicht laden! ' + err)
          return
        }

        loadingIndicator.setValue(0.8)

        result.forEach(function (state) {
          states[state.id] = state
          statusValues[state.id] = state.name
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

      filterFormDef =
        {
          'postcode': {
            'type': 'select',
            'name': 'Postcode',
            'values': postcodeValues
          },
          'status': {
            'type': 'select',
            'name': 'Status',
            'values': statusValues
          },
          'survey': {
            'type': 'select',
            'name': 'Kategorie',
            'values': surveyValues
          },
          'comments.name:strsearch': {
            'type': 'text',
            'name': 'Autor',
          },
          'day:>=': {
            'type': 'date',
            'name': 'Erstellungsdatum ab',
          },
          'day:<=': {
            'type': 'date',
            'name': 'Erstellungsdatum bis',
          },
          'lastCommentDay:>=': {
            'type': 'date',
            'name': 'Zuletzt kommentiert ab',
          },
          'lastCommentDay:<=': {
            'type': 'date',
            'name': 'Zuletzt kommentiert bis',
          },
          'lastUpdate:>=': {
            'type': 'date',
            'name': 'Letzte Änderung ab',
          },
          'lastUpdate:<=': {
            'type': 'date',
            'name': 'Letzte Änderung bis',
          },
          'order': {
            'type': 'select',
            'name': 'Sortierung',
            'default': 'lastCommentDate',
            'values': {
              'lastCommentDate': 'Neueste Kommentare bzw. Einträge zuerst',
              'id': 'Neueste Einträge zuerst',
              'likes': 'Einträge mit den meisten Unterstützungen zuerst',
              'commentsCount': 'Einträge mit den meisten Kommentaren zuerst',
              'lastUpdate': 'Einträge sortiert nach letzter Änderung'
            }
          }
        }

      call_hooks('filter-formdef', filterFormDef)

      filterOverview = new form(
        null,
        filterFormDef,
        {
          'type': 'form_chooser',
          'button:add_element': 'Filter hinzufügen / Sortierung ändern',
          'order': false
        }
      )

      filterOverview.show(document.getElementById('filterOverview'))
      filterOverview.onchange = function () {
        return update(false, true)
      }

      hash(function (loc) {
        let m

        if (loc.match(/^#[0-9]+$/)) {
          pageShow(loc.substr(1))
        } else if (m = loc.match(/^#([0-9]+)\/edit$/)) {
          pageEdit(m[1])
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
      } else if (m = location.hash.match(/^#([0-9]+)\/edit$/)) {
        pageEdit(m[1])
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

    call_hooks('url-receive', url)
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
  var param = {
    query: []
  }

  if (r === null) {
    r = {}
  }

  if (!('order' in r)) {
    r.order = 'lastCommentDate'
  }

  call_hooks('filter-to-param', r, param)

  for (var k in r) {
    var v = r[k]

    if (k === 'order') {
      param.order = [ '-' + r.order ]
    } else if (r[k] !== null) {
      let op = '='
      let m = k.match(/^(.*):(.*)$/)
      if (m) {
        k = m[1]
        op = m[2]
      }

      if (k.match(/\./)) {
        k = k.split(/\./)
      }

      param.query.push([ k, op, v ])
    }
  }

  return param
}

function buildUrl () {
  var r = filterOverview.get_data()

  if (r === null) {
    r = {}
  }

  call_hooks('url-build', r)

  return r
}

function updateTimestamp () {
  return
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

function _update (force, pushState) {
  pageOverviewLoaded = true

  var url = buildUrl()
  url = '#' + querystring.stringify(url)
  url = url.replace(/%2C/g, ',')
  if (pushState) {
    history.pushState({ scrollTop: document.body.scrollTop }, '', url)
  } else {
    history.replaceState({ scrollTop: document.body.scrollTop }, '', url)
  }

  var filter = buildFilter()
  overviewShowEntries(filter, 0)

  updateTimestamp()
}

function overviewShowEntries (filter, start, callback) {
  var oldContent, content

  if (start === 0) {
    oldContent = document.getElementById('pageOverview')
    content = document.createElement('div')
    oldContent.parentNode.insertBefore(content, oldContent)
    content.id = 'pageOverview'
    oldList = oldContent.entryDivList || {}
    content.entryDivList = {}
  } else {
    oldList = {}
    content = document.getElementById('pageOverview')
  }

  filter.table = 'markers'
  filter.limit = step
  filter.offset = start

  var count = 0
  loadingIndicator.setActive()

  getTemplate('teaserBody', function (err, result) {
    view = api.createView('Twig', result, { twig: Twig, split: step })
    view.extend('Leaflet', {
      latitudeField: 'lat',
      longitudeField: 'lng',
      layers: mapLayers()
    })
    view.set_query(filter)
    view.on('loadend', () => {
      loadingIndicator.setValue(1)
      loadingIndicator.setInactive()
    })
    view.show(content)
  })

  oldContent.parentNode.removeChild(oldContent)
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
          var formEmitter = inlineForms(page, entry, {
            "status": statusValues
          })

          formEmitter.on('save', function () {
            update(false, true)
          })
        }
      )
    },
    function (err) {
      restoreScroll()
    }
  )

  updateTimestamp()
}

window.pageEdit = function (id) {
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

  var pageTop = document.createElement('div')
  page.appendChild(pageTop)

  var divMap = document.createElement('div')
  divMap.id = 'pageEditMap'
  page.appendChild(divMap)

  var formNode = document.createElement('form')
  page.appendChild(formNode)

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
        pageTop,
        {
          template: 'edit'
        },
        function (err, page) {
        }
      )

      var formEdit
      entry.formDef({}, function (err, def) {
        formEdit = new form('edit', def)

        formEdit.show(formNode)
        formEdit.set_data(entry.properties)

        let submit = document.createElement('input')
        submit.type = 'submit'
        submit.value = 'Speichern'
        formNode.appendChild(submit)

        var layers = mapLayers({})

        var map = L.map('pageEditMap', {
          layers: layers[Object.keys(layers)[0]]
        }).setView([ entry.properties.lat, entry.properties.lng ], 17)
        L.control.layers(layers).addTo(map)

        var marker = L.marker([ entry.properties.lat, entry.properties.lng ],
        {
          draggable: !(def.lat.include_data === false)
        }).addTo(map)
        marker.on('dragend', function (e) {
          var pos = marker.getLatLng()
          formEdit.set_data({ lat: pos.lat.toFixed(6), lng: pos.lng.toFixed(6) })
        })
      })

      formNode.onsubmit = function () {
        entry.save(formEdit.get_data(), function (err, result) {
          if (err) {
            alert('Fehler: ' + err)
          } else {
            location.hash = '#' + id
          }
        })

        return false
      }
    },
    function (err) {
      restoreScroll()
    }
  )

  updateTimestamp()
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
