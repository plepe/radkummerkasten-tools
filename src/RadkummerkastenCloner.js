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
 * The interface to RadkummerkastenCloner
 * @constructor
 * @property {object} options - Configuration
 * @property {string} options.baseUrl - base URL of the radkummerkasten. Default: either http://www.radkummerkasten.at or https://www.radkummerkasten.at
 * @property {string} [options.dbName='radkummerkasten'] name of the database to use. This can be a remote URL to a CouchDB.
 * @property {string} [options.dbReplicateFrom] CouchDB to replicate from. If not defined, data will be directly loaded from RadkummerkastenCloner.
 * @property {string} options.urlBezirksgrenzen - relative URL of the bezirksgrenzen GeoJSON
 * @property {string} options.urlMapMarkers - relative URL of the MapMarkers request
 * @property {string} options.urlMapEntry - relative URL of the MapEntry request. '{id}' will be replaced by the id of the map entry.
 */
function RadkummerkastenCloner () {
}

RadkummerkastenCloner.version = '__GIT_MY_VERSION__'

RadkummerkastenCloner.init = function () {
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

  if (typeof this.options.urlMapMarkers === 'undefined') {
    this.options.urlMapMarkers = '/ajax/?map&action=getMapMarkers'
  }

  if (typeof this.options.urlMapEntry === 'undefined') {
    this.options.urlMapEntry = '/ajax/?map&action=getMapEntry&marker={id}'
  }

  this.cacheEntries = {}
  this.parameter = {}
}

/**
 * set an option to a specific value
 * @param {string} option Key of the option (e.g. 'dbName')
 * @param {any} value Value to set for the option
 */
RadkummerkastenCloner.set = function (option, value) {
  if (typeof this.options === 'undefined') {
    this.options = {}
  }

  this.options[option] = value
}

/**
<<<<<<< HEAD
 * set all configuration options at once
 * @param {object} options Options for RadkummerkastenCloner
 */
RadkummerkastenCloner.setConfig = function (options) {
  this.options = options
}

/**
 * @callback RadkummerkastenCloner~featureCallback
 * @param {string|null} error - Error (or null, if there was no error)
 * @param {RadkummerkastenClonerEntry} entry - an entry of RadkummerkastenCloner
 */

/**
 * @callback RadkummerkastenCloner~finalCallback
 * @param {string|null} error - Error (or null, if there was no error)
 */

/**
 * load all entries from RadkummerkastenCloner and call the callbacks.
 * @param {object} options - Options and filter the results by certain criteria
 * @param {number[]|number|string[]|string} [options.id] - Only include entries with the specified ids (list might be filtered further by other filters)
 * @param {boolean} options.includeDetails=false - If true, for each entry the details will be loaded. Requires a separate http request for each entry.
 * @param {number[]|number} options.bezirk - Only include entries within the specified Bezirk or Bezirke.
 * @param {number[]|number|string[]|string} options.category - Only include entries of the specified categories (either numeric or string representation).
 * @param {number} options.limit - Only return the first n entries (after offset) (default: all)
 * @param {number} options.offset - Skip the first n entries (default: 0)
 * @param {boolean} options.force=false - Force reload of list
 * @param {boolean} options.forceDetails=false - If a result already exists in cache, force reload anyway
 * @param {RadkummerkastenCloner~featureCallback} featureCallback - The featureCallback function will be called for each received entry.
 * @param {RadkummerkastenCloner~finalCallback} [finalCallback] - The finalCallback will be called after the last entry.
 */
RadkummerkastenCloner.getEntries = function (options, featureCallback, finalCallback) {
  this.init()

  async.parallel(
    [
      function (callback) {
        this.loadBezirksgrenzen(callback)
      }.bind(this),
      function (callback) {
        this.dbConfig.get('parameter-category', function (err, result) {
          if (err && err.status === 404) {
            result = {
              _id: 'parameter-category',
              id: 'category',
              title: 'Kategorie',
              titlePlural: 'Kategorien',
              values: []
            }
          } else if (err) {
            return callback(err)
          }

          this.parameter.category = result

          callback()
        }.bind(this))
      }.bind(this)
    ],
    function (err) {
      if (err) {
        return finalCallback(err)
      }

      this._getEntries(options, featureCallback, finalCallback)
    }.bind(this)
  )
}

RadkummerkastenCloner._getEntries = function (options, featureCallback, finalCallback, error) {
  if (error) {
    finalCallback(error)
    return
  }

  // cached result
  if (!options.force && this.markers) {
    return this._handleMarkers(options, featureCallback, finalCallback)
  }

  request.get(this.options.baseUrl + this.options.urlMapMarkers,
    function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var p = jsonParse(body)
        var e = p[0]
        var data = p[1]

        if (e) {
          finalCallback(e, null)
          return
        }
        var i

        var oldCategories = JSON.stringify(this.parameter.category)
        this.parameter.category.values = []

        categoryNames = {}
        for (var k in data.categories) {
          categoryNames[k] = data.categories[k].name

          this.parameter.category.values.push({
            id: parseInt(k),
            title: data.categories[k].name
          })
        }

        if (JSON.stringify(this.parameter.category) !== oldCategories) {
          this.parameter.category.lastUpdate = new Date().toISOString()
          this.dbConfig.put(this.parameter.category, function (err, result) {
            if (err) {
              console.error(err)
            }

            this.parameter.category._rev = result.rev
          }.bind(this))
        }

        this.markers = data.markers
        return this._handleMarkers(options, featureCallback, finalCallback)
      }

      finalCallback(error, null)
    }.bind(this)
  )
}

RadkummerkastenCloner._handleMarkers = function (options, featureCallback, finalCallback, error) {
  var detailsFunctions = []
  var offset = typeof options.offset === 'undefined' ? 0 : options.offset
  var limit = typeof options.limit === 'undefined' ? null : options.limit
  var i

  if ('id' in options) {
    if (!Array.isArray(options.id)) {
      options.id = [ options.id ]
    }
    for (i = 0; i < options.id.length; i++) {
      options.id[i] = parseInt(options.id[i])
    }
  }

  if ('bezirk' in options) {
    if (!Array.isArray(options.bezirk)) {
      options.bezirk = [ options.bezirk ]
    }
    for (i = 0; i < options.bezirk.length; i++) {
      options.bezirk[i] = '' + options.bezirk[i]
    }
  }

  if ('category' in options) {
    if (!Array.isArray(options.category)) {
      options.category = [ options.category ]
    }
    for (i = 0; i < options.category.length; i++) {
      // convert string categories to numeric value
      var found = false
      if (isNaN(parseInt(options.category[i]))) {
        for (k in categoryNames) {
          if (categoryNames[k].toLowerCase() === options.category[i].toLowerCase()) {
            options.category[i] = k
            found = true
          }
        }

        if (!found) {
          finalCallback('Can\'t parse Category name: ' + options.category[i])
          return
        }
      } else {
        options.category[i] = '' + options.category[i]
      }
    }
  }

  this.markers.forEach(function (entry) {
    if (!(entry.id in this.cacheEntries)) {
      this.cacheEntries[entry.id] = new RadkummerkastenClonerEntry(entry)
    }
    var ob = this.cacheEntries[entry.id]

    if ('id' in options && options.id.indexOf(ob.id) === -1) {
      return
    }

    if ('bezirk' in options && options.bezirk.indexOf('' + ob.properties.bezirk) === -1) {
      return
    }

    if ('category' in options && options.category.indexOf('' + ob.properties.category) === -1) {
      return
    }

    if (offset > 0) {
      offset--
      return
    }

    if (limit !== null) {
      if (limit <= 0) {
        return
      } else {
        limit--
      }
    }

    if (options.includeDetails && (options.forceDetails || !ob.hasDetails)) {
      detailsFunctions.push(function (ob, callback) {
        ob.getDetails(
          {
            force: options.forceDetails
          },
          function () {
            featureCallback(null, ob)
            callback()
          }
        )
      }.bind(this, ob))
    } else {
      featureCallback(null, ob)
    }
  }.bind(this))

  if (options.includeDetails) {
    async.parallelLimit(detailsFunctions, 4, function () {
      finalCallback(null)
    })
  } else {
    finalCallback(null)
  }
}

/**
 * load the this.parameter.bezirk.values (district borders) from the server
 * @param {function} callback - Callback which should be called after loading. will be passed an error or null as first parameter and the list of districts as second (array of GeoJSON objects).
 */
RadkummerkastenCloner.loadBezirksgrenzen = function (callback) {
  this.init()

  // already cached
  if ('bezirk' in this.parameter) {
    async.setImmediate(function () {
      callback(null, this.parameter.bezirk.values)
    }.bind(this))

    return
  }

  this.dbConfig.get('parameter-bezirk', function (err, result) {
    if (err && err.status === 404) {
      result = {
        _id: 'parameter-bezirk',
        id: 'bezirk',
        title: 'Bezirk',
        titlePlural: 'Bezirke',
        values: []
      }
    } else if (err) {
      return callback(err)
    }

    this.parameter.bezirk = result
    this.parameter.bezirk.values = []
    this._loadBezirksgrenzen1(callback)
  }.bind(this))
}

RadkummerkastenCloner._loadBezirksgrenzen1 = function (callback) {
  var oldData = JSON.stringify(this.parameter.bezirk)

  request.get(this.options.baseUrl + this.options.urlBezirksgrenzen,
    function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var p = jsonParse(body)
        var e = p[0]
        var data = p[1]

        if (e) {
          callback(e, null)
          return
        }

        for (var i = 0; i < data.features.length; i++) {
          var feature = data.features[i]

          feature.OGD_ID = feature.id
          feature.id = feature.properties.BEZNR
          feature.title = feature.properties.NAMEK_NUM

          this.parameter.bezirk.values.push(feature)
        }

        this.parameter.bezirk.values.sort(function (a, b) {
          return a.id - b.id
        })

        if (JSON.stringify(this.parameter.bezirk) === oldData) {
            callback(null, this.parameter.bezirk.values)
        } else {
          this.parameter.bezirk.lastUpdate = new Date().toISOString()
          this.dbConfig.put(this.parameter.bezirk, function (err, result) {
            if (err) {
              return callback(err)
            }

            this.parameter.bezirk._rev = result.rev
            callback(null, this.parameter.bezirk.values)
          }.bind(this))
        }
      } else {
        callback(error, null)
      }
    }.bind(this)
  )
}

/**
 * for the given lat/lon return the bezirk in Vienna
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @return {number} - The resulting bezirk (or 0 if it is not in Vienna)
 */
RadkummerkastenCloner.getBezirk = function (lat, lon) {
  for (var i = 0; i < this.parameter.bezirk.values.length; i++) {
    var r = turf.inside({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [ lon, lat ]
      }
    }, this.parameter.bezirk.values[i])

    if (r) {
      return this.parameter.bezirk.values[i].properties.BEZNR
    }
  }

  return 0
}

/**
 * get list of categories
 * @param {function} callback - Will be called with 'err' (which should be null) and an object with the categories. [ { 'id': categoryId, 'name': categoryName }, ... ]
 */
RadkummerkastenCloner.categories = function (callback) {
  function _buildCategories () {
    var ret = []
    for (var k in categoryNames) {
      ret.push({
        id: k,
        title: categoryNames[k]
      })
    }
    return ret
  }

  if (!categoryNames) {
    return this.getEntries(
      { limit: 0 },
      function () {},
      function (err) {
        callback(err, _buildCategories())
      }
    )
  }

  async.setImmediate(function () {
    callback(null, _buildCategories())
  })
}

/**
 * clear the cache of the map entries
 */
RadkummerkastenCloner.clearCache = function () {
  this.cacheEntries = {}
}

/**
 * A comment entry
 * @typedef {Object} RadkummerkastenClonerEntry.comments
 * @property {string} text - Kommentartext
 * @property {user} string - User Name
 * @property {date} date - ISO8601 date
 */

/**
 * An attachment
 * @typedef {Object} RadkummerkastenClonerEntry.attachment
 * @property {string} title - Title of the attachment
 * @property {string} url - absolute URL of the attachment
 */

/**
 * A RadkummerkastenCloner Entry
 * @constructor RadkummerkastenClonerEntry
 * @param {object} data - Data of the entry
 * @property {number} id - Id of the entry
 * @property {number} lat - Latitude of the entry
 * @property {number} lon - Longitude of the entry
 * @property {number} status - ???
 * @property {number} category - Category of the entry
 * @property {string} categoryName - Category as string
 * @property {number} bezirk - Bezirk
 * @property {number} bezirkRkk - Bezirk laut RadkummerkastenCloner
 * @property {string} title - Title (load details first)
 * @property {string} user - User, e.g. 'Max M.' (load details first)
 * @property {string} date - Date, ISO8601 (e.g. '2016-12-24') (load details first)
 * @property {string} text - Beschreibung (load details first)
 * @property {RadkummerkastenClonerEntry.comments[]} comments - Comments (load details first)
 * @property {number} commentsCount - Count of comments (load details first)
 * @property {RadkummerkastenClonerEntry.attachment[]} attachments - Attachments (load details first)
 * @property {number} attachmentsCount - Count of attachments (load details first)
 * @property {string} lastUpdate - The entry in the current state was first seen at: ISO-8601 date.
 * @property {string[]} errors - List of errors which occured during loading
 */
function RadkummerkastenClonerEntry (data) {
  this.id = data.id
  this.properties = {}
  this.properties.id = data.id
  this.properties._id = data.id + ''
  this.properties.lat = data.loc[0]
  this.properties.lon = data.loc[1]
  this.properties.status = data.options.status
  this.properties.category = data.options.survey
  this.properties.categoryName = categoryNames[data.options.survey]
  this.properties.bezirk = RadkummerkastenCloner.getBezirk(this.properties.lat, this.properties.lon)
  this._properties = null // last version saved to PouchDB, stringified
  this.hasDetails = false
}

/**
 * return the entry as JSON object
 */
RadkummerkastenClonerEntry.prototype.toJSON = function () {
  return this
}

/**
 * return the entry as GeoJSON object
 */
RadkummerkastenClonerEntry.prototype.toGeoJSON = function () {
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
 * load details for the given RadkummerkastenClonerEntry and call the callbackfunction, with error code and the entry as object.
 * @param {object} options - Options
 * @param {boolean} options.force=false - Don't cache data if force is true
 * @param {function} callback - Callback function
 */
RadkummerkastenClonerEntry.prototype.getDetails = function (options, callback) {
  if (!options) {
    options = {}
  }

  if (this.hasDetails) {
    if (options.force) {
      return this._getDetails(options, callback)
    } else {
      async.setImmediate(function () {
        callback(null, this)
      }.bind(this))
      return
    }
  }


  // first try to load from PouchDB - even on force, as we need the revision id
  RadkummerkastenCloner.db.get(this.id + '', function (err, result) {
    if (err && err.status === 404) {
      this._getDetails(options, callback)
    } else if (err) {
      callback(err, null)
    } else {
      this.properties = result
      this._properties = JSON.stringify(result)

      if (options.force) {
        this._getDetails(options, callback)
      } else {
        callback(null, this)
      }
    }
  }.bind(this))
}

RadkummerkastenClonerEntry.prototype._getDetails = function (options, callback) {
  request.get(RadkummerkastenCloner.options.baseUrl + RadkummerkastenCloner.options.urlMapEntry.replace('{id}', encodeURI(this.id)),
    function (error, response, body) {
      var m

      if (!error && response.statusCode === 200) {
        var p = jsonParse(body)
        var e = p[0]
        var data = p[1]

        if (e) {
          this.errors = [ e ]
          callback(e, null)
          return
        }

        m = data.htmlData.match(/^<div class="marker-entry"><h3><span class="survey">([^<]*):<\/span> ([^<]*)<\/h3>(.*)<div class=""><p><span class="author"><i>(.*) schrieb am (.*), (.*):<\/i><\/span><br \/>/)
        this.properties.attachments = []

        if (m[3]) {
          var m1 = m[3].match(/<a href="([^"]*)" class="swipebox" title="([^"]*)"><img src/)
          this.properties.attachments.push({
            url: RadkummerkastenCloner.options.baseUrl + m1[1],
            title: m1[2]
          })
        }

        this.properties.title = data.title
        this.properties.bezirkRkk = data.bezirk
        this.properties.user = m[4]
        this.properties.date = parseDate(m[6])
        var p = data.htmlData.indexOf('</p>')
        this.properties.text = fromHTML(data.htmlData.substr(m[0].length, p - m[0].length))

        var remainingHtmlData = data.htmlData.substr(p + 4).trim()
        while(m = remainingHtmlData.match(/^(?:<\/div><div class="images">)?<a href="([^"]*)" class="swipebox" title="([^"]*)">((?!<\/a>).)*<\/a>/)) {
          this.properties.attachments.push({
            url: RadkummerkastenCloner.options.baseUrl + m[1],
            title: m[2]
          })

          remainingHtmlData = remainingHtmlData.substr(m[0].length).trim()
        }

        m = remainingHtmlData.match(/^[^]*<\/div><p class="text-center"><button type="button" class="btn btn-zustimmen btn-nodecoration btn-default" >Finde ich auch <i class="glyphicon glyphicon-thumbs-up"><\/i> <span class="badge">([0-9]+)<\/span><\/button><\/p>/m)
        this.properties.likes = parseInt(m[1])

        remainingHtmlData = remainingHtmlData.substr(m[0].length)
        this.properties.comments = []
        var commentsHtmlData = remainingHtmlData.split(/<\/p>/g)

        for (var i = 0; i < commentsHtmlData.length; i++) {
          m = commentsHtmlData[i].match(/<div class=""><p><span class="author"><i>(.*) schrieb am (.*), (.*):<\/i><\/span><br \/>([^]*)$/m)
          if (m) {
            this.properties.comments.push({
              user: m[1],
              date: parseDate(m[3]),
              text: fromHTML(m[4]),
              attachments: []
            })
          }

          if (i >= commentsHtmlData.length - 1) {
            break
          }

          var remainingHtmlData = commentsHtmlData[i + 1].trim()
          while(m = remainingHtmlData.match(/^(?:<\/div><div class="images">)?<a href="([^"]*)" class="swipebox" title="([^"]*)">((?!<\/a>).)*<\/a>/)) {
            this.properties.comments[this.properties.comments.length - 1].attachments.push({
              url: RadkummerkastenCloner.options.baseUrl + m[1],
              title: m[2]
            })

            remainingHtmlData = remainingHtmlData.substr(m[0].length).trim()
          }
        }
        this.properties.commentsCount = this.properties.comments.length
        this.properties.attachmentsCount = this.properties.attachments.length

        this.hasDetails = true

        if (JSON.stringify(this.properties) === this._properties) {
          // no need to update database
          callback(null, this)
        } else {
          this.properties.lastUpdate = new Date().toISOString()
          RadkummerkastenCloner.db.put(this.properties, function (err, result) {
            this.properties._rev = result.rev
            callback(null, this)
          }.bind(this))
        }

        return
      }

      callback(error, null)
    }.bind(this)
  )
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
RadkummerkastenClonerEntry.prototype.showHTML = function (dom, options, callback) {
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

RadkummerkastenClonerEntry.prototype._showHTML = function (dom, options, showTemplate, callback) {
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
  data.options = RadkummerkastenCloner.options
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

RadkummerkastenClonerEntry.prototype._showHTMLincludeImgs = function (dom, options, callback) {
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

RadkummerkastenClonerEntry.prototype._showHTMLnotIncludeImgs = function (dom, options, callback) {
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

RadkummerkastenClonerEntry.prototype._showHTMLinitMap = function (dom, options, callback) {
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

function jsonParse (str) {
  if (str === '') {
    return [ 'Error: JSON data empty' ]
  }

  try {
    var data = JSON.parse(str)
  } catch (e) {
    return [ e, null ]
  }

  return [ null, data ]
}

module.exports = RadkummerkastenCloner
