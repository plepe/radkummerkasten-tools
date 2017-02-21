var request = require('request-xmlhttprequest')
var async = require('async')
var PouchDB = require('pouchdb')
var parseDate = require('./parseDate')
var getTemplate = require('./getTemplate')
var fromHTML = require('./fromHTML')
var twig = require('twig').twig
var toDataUrl = require('./to-data-url')
var leafletImage = require('leaflet-image')
var turf = {
  inside: require('@turf/inside')
}
var mapLayers = require('./mapLayers')

var categoryNames = null

/**
 * The interface to Radkummerkasten
 * @constructor
 * @property {object} options - Configuration
 * @property {string} options.baseUrl - base URL of the radkummerkasten. Default: either http://www.radkummerkasten.at or https://www.radkummerkasten.at
 * @property {string} [options.dbName='radkummerkasten'] name of the database to use. This can be a remote URL to a CouchDB.
 * @property {string} [options.dbReplicateFrom] CouchDB to replicate from. If not defined, data will be directly loaded from Radkummerkasten.
 * @property {string} options.urlBezirksgrenzen - relative URL of the bezirksgrenzen GeoJSON
 * @property {string} options.urlMapMarkers - relative URL of the MapMarkers request
 * @property {string} options.urlMapEntry - relative URL of the MapEntry request. '{id}' will be replaced by the id of the map entry.
 */
function Radkummerkasten () {
}

Radkummerkasten.version = '__GIT_MY_VERSION__'

Radkummerkasten.init = function () {
  if (typeof this.isInit !== 'undefined') {
    return
  }
  this.isInit = true

  if (typeof this.options === 'undefined') {
    this.options = {}
  }

  if (typeof this.options.dbName === 'undefined') {
    this.options.dbName = 'radkummerkasten'
  }
  this.db = new PouchDB(this.options.dbName)
  this.dbConfig = new PouchDB(this.options.dbName + '-config')

  if (typeof this.options.dbReplicateFrom !== 'undefined' && this.options.dbReplicateFrom !== 'none') {
    this.db.replicate.from(this.options.dbReplicateFrom)
    this.dbConfig.replicate.from(this.options.dbReplicateFrom + '-config')
  }

  if (typeof this.options.baseUrl === 'undefined') {
    this.options.baseUrl = '//www.radkummerkasten.at'
  }

  if (this.options.baseUrl.substr(0, 2) === '//') {
    if (typeof location === 'undefined') {
      this.options.baseUrl = 'https:' + this.options.baseUrl
    } else if (location.protocol === 'http:') {
      this.options.baseUrl = 'http:' + this.options.baseUrl
    } else {
      this.options.baseUrl = 'https:' + this.options.baseUrl
    }
  }

  if (typeof this.options.urlBezirksgrenzen === 'undefined') {
    this.options.urlBezirksgrenzen = '/wp-content/plugins/radkummerkasten/js/data.wien.gv.at_bezirksgrenzen.json'
  }

  this.cacheEntries = {}
  this.parameter = {}
}

/**
 * set an option to a specific value
 * @param {string} option Key of the option (e.g. 'dbName')
 * @param {any} value Value to set for the option
 */
Radkummerkasten.set = function (option, value) {
  if (typeof this.options === 'undefined') {
    this.options = {}
  }

  this.options[option] = value
}

/**
<<<<<<< HEAD
 * set all configuration options at once
 * @param {object} options Options for Radkummerkasten
 */
Radkummerkasten.setConfig = function (options) {
  this.options = options
}

/**
 * @callback Radkummerkasten~featureCallback
 * @param {string|null} error - Error (or null, if there was no error)
 * @param {RadkummerkastenEntry} entry - an entry of Radkummerkasten
 */

/**
 * @callback Radkummerkasten~finalCallback
 * @param {string|null} error - Error (or null, if there was no error)
 */

/**
 * load all entries from Radkummerkasten and call the callbacks.
 * @param {object} options - Options and filter the results by certain criteria
 * @param {number[]|number|string[]|string} [options.id] - Only include entries with the specified ids (list might be filtered further by other filters)
 * @param {boolean} options.includeDetails=false - If true, for each entry the details will be loaded. Requires a separate http request for each entry.
 * @param {number} options.bezirk - Only include entries within the specified Bezirk or Bezirke.
 * @param {number|string} options.category - Only include entries of the specified categories (either numeric or string representation).
 * @param {string} options.user - Only include entries, which were created by the specified user or by whom has been commented upon.
 * @param {number} options.limit - Only return the first n entries (after offset) (default: all)
 * @param {number} options.offset - Skip the first n entries (default: 0)
 * @param {boolean} options.force=false - Force reload of list
 * @param {boolean} options.forceDetails=false - If a result already exists in cache, force reload anyway
 * @param {string} [options.order=id] - Order results by one of the following criteria: 'id': newest entries first, 'likes': most likes first, 'lastComment': order by date of last comment (or creation of entry), 'lastUpdate': order by date of last visible change.
 * @param {Radkummerkasten~featureCallback} featureCallback - The featureCallback function will be called for each received entry.
 * @param {Radkummerkasten~finalCallback} [finalCallback] - The finalCallback will be called after the last entry.
 */
Radkummerkasten.getEntries = function (options, featureCallback, finalCallback) {
  this.init()

  var filter = []
  var filterValues = []
  var filterFun = []
  var filterFunPerComment = []

  var param = {
    descending: true
  }

  if (typeof options.limit !== 'undefined') {
    param.limit = options.limit
  }

  if (typeof options.offset !== 'undefined') {
    param.skip = options.offset
  }

if (typeof options.bezirk === 'number') {
    filter.push('bezirk')
    filterFun.push('doc.bezirk')
    filterValues.push(options.bezirk)
  }

  if (typeof options.category === 'string') {
    var category = null

    for (k in categoryNames) {
      if (categoryNames[k].toLowerCase() === options.category.toLowerCase()) {
        category = k
      }
    }

    if (category === null) {
      finalCallback('Can\'t parse Category name: ' + options.category)
      return
    }

    filter.push('category')
    filterFun.push('doc.category')
    filterValues.push(parseInt(category))
  } else if (typeof options.category === 'number') {
    filter.push('category')
    filterFun.push('doc.category')
    filterValues.push(options.category)
  }

  filterFunPerComment = filterFun.concat([])
  if (typeof options.user !== 'undefined') {
    filter.push('user')
    filterFun.push('doc.user')
    filterValues.push(options.user)
    filterFunPerComment.push('comment.user')
  }

  if (options.order === 'likes') {
    filterFun.push('doc.likes')
    filterFun.push('doc.lastUpdate')
    filterFunPerComment.push('doc.likes')
    filterFunPerComment.push('doc.lastUpdate')
    param.startkey = filterValues.concat([ {}, {} ])
    param.endkey = filterValues

  } else if (options.order === 'lastComment') {
    filterFun.push('doc.comments.length ? doc.comments[doc.comments.length - 1].date : doc.date')
    filterFun.push('doc.lastUpdate')
    filterFunPerComment.push('doc.comments.length ? doc.comments[doc.comments.length - 1].date : doc.date')
    filterFunPerComment.push('doc.lastUpdate')
    param.startkey = filterValues.concat([ {}, {} ])
    param.endkey = filterValues

  } else if (options.order === 'lastUpdate') {
    filterFun.push('doc.lastUpdate')
    filterFunPerComment.push('doc.lastUpdate')
    param.startkey = filterValues.concat([ {} ])
    param.endkey = filterValues

  } else {
    filterFun.push('doc.id')
    filterFunPerComment.push('doc.id')
    param.startkey = filterValues.concat([ {} ])
    param.endkey = filterValues
  }

  var fun = 'var r = [ ' + filterFun.join(', ') + ' ]\n'
  fun += 'emit(r)\n'
  fun += 'var done = [ JSON.stringify(r) ]\n'

  if (filterFunPerComment.length) {
    fun += 'for (var c = 0; c < doc.comments.length; c++) {\n'
    fun += '  var comment = doc.comments[c]\n'
    fun += '  r = [ ' + filterFunPerComment.join(', ') + ' ]\n'
    fun += '  if (done.indexOf(JSON.stringify(r)) === -1) {\n'
    fun += '    emit(r)\n'
    fun += '    done.push(JSON.stringify(r))\n'
    fun += '  }\n'
    fun += '}\n'
  }

  fun = new Function('doc', fun)
  this.db.query(
    fun,
    param,
    this._getEntriesHandleResult.bind(this, options, featureCallback, finalCallback)
  )
}

Radkummerkasten._getEntriesHandleResult = function (options, featureCallback, finalCallback, error, result) {
  var ids = []
  var toLoad = []

  if (error) {
    return finalCallback(error)
  }

  for (var i = 0; i < result.rows.length; i++) {
    var id = result.rows[i].id
    ids.push(id)

    if (!(id in this.cacheEntries)) {
      toLoad.push(id)
    }
  }

  if (toLoad.length) {
    this.db.allDocs(
      {
        keys: toLoad,
        include_docs: true
      },
      function (error, result) {
        if (error) {
          return finalCallback(error)
        }

        for (var i = 0; i < result.rows.length; i++) {
          var id = result.rows[i].id
          var ob = new RadkummerkastenEntry(result.rows[i].doc)
          this.cacheEntries[id] = ob
        }

        this._getEntriesDone(ids, options, featureCallback, finalCallback)
      }.bind(this)
    )
  } else {
    this._getEntriesDone(ids, options, featureCallback, finalCallback)
  }
}

Radkummerkasten._getEntriesDone = function (ids, options, featureCallback, finalCallback) {
  for (var i = 0; i < ids.length; i++) {
    featureCallback(null, this.cacheEntries[ids[i]])
  }

  finalCallback(null)
}

/**
 * @typedef {object} Radkummerkasten.parameter
 * @property {string} id - ID, e.g. 'bezirk'
 * @property {string} title - Title, e.g. 'Bezirk'
 * @property {string} titlePlural - Title in plural, e.g. 'Bezirke'
 * @property {object[]} values - Values of the parameter
 * @property {number|string} values.id - ID of the parameter value, e.g. 1
 * @property {string} values.title - Title of the parameter, value, e.g. '1.,  Innere Stadt'
 */

/**
 * load a parameter from database
 * @param {string} id - ID of the parameter, e.g. 'bezirk'.
 * @param {function} callback - Callback which should be called after loading. will be passed an error or null as first parameter and the list of districts as second (array of GeoJSON objects).
 */
Radkummerkasten.getParameter = function (id, callback) {
  this.init()

  // already cached
  if (id in this.parameter) {
    async.setImmediate(function () {
      callback(null, this.parameter[id])
    }.bind(this))

    return
  }

  this.dbConfig.get('parameter-' + id, function (err, result) {
    if (err) {
      return callback(err)
    }

    this.parameter[id] = result
    callback(null, this.parameter[id])
  }.bind(this))
}

Radkummerkasten.listParameter = function (callback) {
  this.init()

  async.setImmediate(function () {
    callback(null, [ 'bezirk' ])
  })
}

/**
 * load the this.bezirksgrenzen (district borders) from the server
 * @param {function} callback - Callback which should be called after loading. will be passed an error or null as first parameter and the list of districts as second (array of GeoJSON objects).
 */
Radkummerkasten.loadBezirksgrenzen = function (callback) {
  this.init()

  // already cached
  if (this.bezirksgrenzen) {
    async.setImmediate(function () {
      callback(null, this.bezirksgrenzen)
    }.bind(this))

    return
  }

  this.dbConfig.get('parameter-bezirk', function (err, result) {
    if (err) {
      return callback(err)
    }

    this.parameter.bezirk = result
    this.bezirksgrenzen = result.values
    callback(null, this.bezirksgrenzen)
  }.bind(this))
}

/**
 * get list of categories
 * @param {function} callback - Will be called with 'err' (which should be null) and an object with the categories. [ { 'id': categoryId, 'name': categoryName }, ... ]
 */
Radkummerkasten.categories = function (callback) {
  this.init()

  this.getParameter('category', function (err, result) {
    if (err) {
      return callback(err)
    }

    callback(null, result.values)
  })
}

/**
 * clear the cache of the map entries
 */
Radkummerkasten.clearCache = function () {
  this.cacheEntries = {}
}

/**
 * A comment entry
 * @typedef {Object} RadkummerkastenEntry.comments
 * @property {string} text - Kommentartext
 * @property {user} string - User Name
 * @property {date} date - ISO8601 date
 */

/**
 * An attachment
 * @typedef {Object} RadkummerkastenEntry.attachment
 * @property {string} title - Title of the attachment
 * @property {string} url - absolute URL of the attachment
 */

/**
 * A Radkummerkasten Entry
 * @constructor RadkummerkastenEntry
 * @param {object} data - Data of the entry
 * @property {number} id - Id of the entry
 * @property {number} lat - Latitude of the entry
 * @property {number} lon - Longitude of the entry
 * @property {number} status - ???
 * @property {number} category - Category of the entry
 * @property {string} categoryName - Category as string
 * @property {number} bezirk - Bezirk
 * @property {number} bezirkRkk - Bezirk laut Radkummerkasten
 * @property {string} title - Title (load details first)
 * @property {string} user - User, e.g. 'Max M.' (load details first)
 * @property {string} date - Date, ISO8601 (e.g. '2016-12-24') (load details first)
 * @property {string} text - Beschreibung (load details first)
 * @property {RadkummerkastenEntry.comments[]} comments - Comments (load details first)
 * @property {number} commentsCount - Count of comments (load details first)
 * @property {RadkummerkastenEntry.attachment[]} attachments - Attachments (load details first)
 * @property {number} attachmentsCount - Count of attachments (load details first)
 * @property {string} lastUpdate - The entry in the current state was first seen at: ISO-8601 date.
 * @property {string[]} errors - List of errors which occured during loading
 */
function RadkummerkastenEntry (data) {
  this.id = data.id
  this.properties = data
}

/**
 * return the entry as JSON object
 */
RadkummerkastenEntry.prototype.toJSON = function () {
  return this
}

/**
 * return the entry as GeoJSON object
 */
RadkummerkastenEntry.prototype.toGeoJSON = function () {
  var ret = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [ this.properties.lon, this.properties.lat ]
    },
    properties: this.properties
  }

  return ret
}

/**
 * show object
 * @param {object} dom
 * @param {object} options
 * @param {boolean} [options.embedImgs=false] Convert img src to data uris
 * @param {boolean} [options.embedMapAsImg=false] Convert map to a data url image
 * @param {boolean} [options.noMap=false] Don't embed a map.
 * @param {number} [options.mapWidth] Force map width
 * @param {number} [options.mapHeight] Force map height
 * @param {string} [options.template="show"] Template to use for rendering
 * @param {function} callback Called with resulting HTML data. Parameters: err, dom (the same as in the first parameter).
 */
RadkummerkastenEntry.prototype.showHTML = function (dom, options, callback) {
  var template = 'show'
  if (options.template) {
    template = options.template
  }

  getTemplate(template + 'Body', function (err, result) {
    var showTemplate = twig({
      data: result
    })

    this._showHTML(dom, options, showTemplate, callback)
  }.bind(this))
}

RadkummerkastenEntry.prototype._showHTML = function (dom, options, showTemplate, callback) {
  options.mapData = {
    style: '',
    id: 'map-' + Math.random()
  }

  if (options.mapWidth) {
    options.mapData.style += 'width: ' + options.mapWidth + 'px;'
  }
  if (options.mapHeight) {
    options.mapData.style += 'height: ' + options.mapHeight + 'px;'
  }

  var data = JSON.parse(JSON.stringify(this.properties))
  data.options = Radkummerkasten.options
  data.map = options.mapData

  dom.innerHTML = showTemplate.render(data)

  var todo = []
  if (options.embedImgs) {
    todo.push(this._showHTMLincludeImgs.bind(this, dom, options))
  } else {
    todo.push(this._showHTMLnotIncludeImgs.bind(this, dom, options))
  }

  if (options.noMap) {
    var mapDom = document.getElementById(options.mapData.id)
    if (mapDom) {
      mapDom.parentNode.removeChild(mapDom)
    }
  } else {
    todo.push(this._showHTMLinitMap.bind(this, dom, options))
  }

  async.parallel(
    todo,
    function (err) {
      callback(null, dom)
    }
  )
}

RadkummerkastenEntry.prototype._showHTMLincludeImgs = function (dom, options, callback) {
  var imgs = dom.getElementsByTagName('img')
  async.each(
    imgs,
    function (img, callback) {
      var width
      var height
      var longerEdge
      var dataUri

      async.parallel([
        function (callback) {
          img.onload = function () {
            img.onload = null
            width = img.width
            height = img.height
            longerEdge = width > height ? width : height

            callback()
          }
        },
        function (callback) {
          toDataUrl(
            img.src,
            function (err, uri) {
              if (err) {
                alert(err)
              } else {
                dataUri = uri
              }

              callback(err)
            }
          )
        }
      ],
      function (err) {
        img.src = dataUri

        if (img.hasAttribute('scale')) {
          var scale = img.getAttribute('scale')

          img.setAttribute('width', scale * width / longerEdge)
          img.setAttribute('height', scale * height / longerEdge)
        }

        callback()
      })
    },
    function (err) {
      callback(err, dom)
    }
  )
}

RadkummerkastenEntry.prototype._showHTMLnotIncludeImgs = function (dom, options, callback) {
  var imgs = dom.getElementsByTagName('img')
  async.each(
    imgs,
    function (img, callback) {
      if (img.hasAttribute('scale')) {
        img.onload = function () {
          var scale = img.getAttribute('scale')
          var longerEdge = img.width > img.height ? img.width : img.height

          var h = scale * img.height / longerEdge
          var w = scale * img.width / longerEdge
          img.setAttribute('height', h)
          img.setAttribute('width', w)

          callback()
        }
      } else {
        callback()
      }
    },
    function (err) {
      callback(err, dom)
    }
  )
}

RadkummerkastenEntry.prototype._showHTMLinitMap = function (dom, options, callback) {
  if (!document.getElementById(options.mapData.id)) {
    callback()
  }

  if (!options.preferredLayer) {
    options.preferredLayer = 'OSM Default'
  }

  var layers = mapLayers({})

  var map = L.map(options.mapData.id, {
    layers: layers[options.preferredLayer]
  }).setView([ this.properties.lat, this.properties.lon ], 17)
  if (map.setSize && options.mapWidth !== 'auto') {
    map.setSize(options.mapWidth, options.mapHeight)
  }
  L.control.layers(layers).addTo(map)

  L.marker([ this.properties.lat, this.properties.lon ]).addTo(map)

  map.on('baselayerchange', function (event) {
    options.preferredLayer = event.name
  })

  if (options.embedMapAsImg) {
    leafletImage(map, function (err, canvas) {
      var img = document.createElement('img')
      var dimensions = map.getSize()
      img.width = dimensions.x
      img.height = dimensions.y
      img.src = canvas.toDataURL()
      var mapDiv = document.getElementById(options.mapData.id)

      if (mapDiv.hasAttribute('replaceDiv')) {
        var attrs = mapDiv.attributes
        for (var i = 0; i < attrs.length; i++) {
          img.setAttribute(attrs[i].name, attrs[i].value)
        }

        if (img.hasAttribute('scale')) {
          var scale = img.getAttribute('scale')
          var longerEdge = img.width > img.height ? img.width : img.height
          img.setAttribute('width', scale * img.width / longerEdge)
          img.setAttribute('height', scale * img.height / longerEdge)
          img.style.width = img.getAttribute('width') + 'px'
          img.style.height = img.getAttribute('height') + 'px'
        }

        mapDiv.parentNode.replaceChild(img, mapDiv)
      } else {
        mapDiv.innerHTML = ''
        mapDiv.appendChild(img)

        var divAttr = document.createElement('div')
        divAttr.className = 'attribution'
        divAttr.innerHTML = layers[options.preferredLayer].options.attribution
        mapDiv.appendChild(divAttr)
      }

      callback()
    }.bind(this))
  } else {
    callback()
  }
}

module.exports = Radkummerkasten
