window.Radkummerkasten = require('../src/Radkummerkasten')
var createCsv = require('../src/createCsv')
var createGeoJson = require('../src/createGeoJson')
var createHTML = require('../src/createHTML')
var getTemplate = require('../src/getTemplate')
var httpGetJSON = require('./httpGetJSON')

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

var loadForms = require('./loadForms')

function showEntry(entry, div, callback) {
  var data = JSON.parse(JSON.stringify(entry.properties))
  data.options = Radkummerkasten.options

  div.innerHTML = teaserTemplate.render(data)

  var formEmitter = loadForms(div, entry, {
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

      filterOverview = new form(
        null,
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
            'name': 'Zuletzt kommentiert ab',
          },
          'lastCommentDateEnd': {
            'type': 'date',
            'name': 'Zuletzt kommentiert bis',
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

  if (r === null) {
    r = {}
  }

  if (!('order' in r)) {
    r.order = 'lastComment'
  }

  return r
}

function buildUrl () {
  var r = filterOverview.get_data()

  if (r === null) {
    return {}
  }

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
          overviewShowEntries(filter, start + step, function () {
            divLoadMore.parentNode.removeChild(divLoadMore)
          })

          return false
        }

        divLoadMore.appendChild(a)
        content.appendChild(divLoadMore)
      } else {
        var div

        if (entry.id in oldList) {
          div = oldList[entry.id]
          div.innerHTML = ''
        } else {
          div = document.createElement('div')
          div.className = 'entry'
        }

        content.appendChild(div)
        content.entryDivList[entry.id] = div

        showEntry(entry, div, function (err, result) {
        })
      }
    },
    function (err) {
      if (err) {
        alert(err)
      }

      if (start === 0) {
        oldContent.parentNode.removeChild(oldContent)
      }

      loadingIndicator.setValue(1)
      loadingIndicator.setInactive()
      filterOverview.set_orig_data(filter)
      restoreScroll()

      if (callback) {
        callback()
      }
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
          var formEmitter = loadForms(page, entry, {
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

      var formEdit = new form('edit',
        {
          'survey': {
            'type': 'select',
            'name': 'Kategorie',
            'values': surveyValues
          },
          'address': {
            'name': 'Adresse',
            'type': 'text'
          },
          'status': {
            'type': 'select',
            'name': 'Status',
            'values': statusValues
          },
          'visible': {
            'name': 'Sichtbar',
            'type': 'boolean'
          },
          'lat': {
            'name': 'Latitude',
            'type': 'float'
          },
          'lng': {
            'name': 'Longitude',
            'type': 'float'
          },
          'street': {
            'name': 'Straße',
            'type': 'text'
          },
          'housenumber': {
            'name': 'Hausnummer',
            'type': 'text'
          },
          'postcode': {
            'type': 'select',
            'name': 'Postcode',
            'values': postcodeValues
          },
          'city': {
            'name': 'Ort',
            'type': 'text'
          },
          'date': {
            'name': 'Datum',
            'type': 'text'
          },
          'likes': {
            'name': 'Likes',
            'type': 'integer'
          },
          'email': {
            'name': 'email',
            'type': 'integer'
          },
          'comments': {
            'type': 'array',
            'name': 'Kommentare',
            'order': false,
            'def': {
              'type': 'form',
              'def': {
                'id': {
                  'name': 'ID',
                  'type': 'hidden'
                },
                'message': {
                  'name': 'Message',
                  'type': 'textarea'
                },
                'visible': {
                  'name': 'Sichtbar',
                  'type': 'boolean'
                },
                'firstname': {
                  'name': 'Vorname',
                  'type': 'text'
                },
                'name': {
                  'name': 'Nachname',
                  'type': 'text'
                },
                'email': {
                  'name': 'E-Mail',
                  'type': 'text'
                },
                'gender': {
                  'name': 'Gender',
                  'type': 'radio',
                  'values': {
                    0: 'unbekannt',
                    1: 'Herr',
                    2: 'Frau'
                  }
                },
                'date': {
                  'name': 'Datum',
                  'type': 'text'
                },
                'attachments': {
                  'name': 'Anhänge',
                  'type': 'array',
                  'order': 'false',
                  'def': {
                    'type': 'form',
                    'def': {
                      'id': {
                        'type': 'hidden'
                      },
                      'type': {
                        'name': 'Type',
                        'type': 'integer'
                      },
                      'date': {
                        'name': 'Datum',
                        'type': 'text',
                      },
                      'file': {
                        'name': 'Dateiname',
                        'type': 'text'
                      },
                      'width': {
                        'name': 'Breite',
                        'type': 'integer'
                      },
                      'height': {
                        'name': 'Höhe',
                        'type': 'integer'
                      },
                      'text': {
                        'name': 'Text',
                        'type': 'textarea'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      )

      formEdit.show(formNode)
      formEdit.set_data(entry.properties)

      let submit = document.createElement('input')
      submit.type = 'submit'
      submit.value = 'Speichern'
      formNode.appendChild(submit)

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
