var request = require('request')
var async = require('async')
var parseDate = require('./parseDate')
var fromHTML = require('./fromHTML')
var turf = {
  inside: require('@turf/inside')
}

var categoryNames = null

/**
 * The interface to Radkummerkasten
 * @constructor
 */
function Radkummerkasten () {
}

Radkummerkasten.init = function () {
  if (typeof this.options !== 'undefined') {
    return
  }

  this.options = {}

  if (typeof location === 'undefined') {
    this.options.baseUrl = 'https://www.radkummerkasten.at'
  } else if (location.protocol === 'http') {
    this.options.baseUrl = 'http://www.radkummerkasten.at'
  } else {
    this.options.baseUrl = 'https://www.radkummerkasten.at'
  }

  this.cacheEntries = {}
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
 * @param {number[]} [options.id] - Only include entries with the specified ids (list might be filtered further by other filters)
 * @param {boolean} options.includeDetails=false - If true, for each entry the details will be loaded. Requires a separate http request for each entry.
 * @param {number[]} options.bezirk - Only include entries within the specified Bezirk or Bezirke.
 * @param {number[]|string[]} options.category - Only include entries of the specified categories (either numeric or string representation).
 * @param {number} options.limit - Only return the first n entries (after offset) (default: all)
 * @param {number} options.offset - Skip the first n entries (default: 0)
 * @param {Radkummerkasten~featureCallback} featureCallback - The featureCallback function will be called for each received entry.
 * @param {Radkummerkasten~finalCallback} [finalCallback] - The finalCallback will be called after the last entry.
 */
Radkummerkasten.getEntries = function (options, featureCallback, finalCallback) {
  this.init()

  this.loadBezirksgrenzen(this._getEntries.bind(this, options, featureCallback, finalCallback))
}

Radkummerkasten._getEntries = function (options, featureCallback, finalCallback, error) {
  if (error) {
    finalCallback(error)
    return
  }

  // cached result
  if (this.markers) {
    return this._handleMarkers(options, featureCallback, finalCallback)
  }

  request.get(this.options.baseUrl + '/ajax/?map&action=getMapMarkers',
    function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var data = JSON.parse(body)

        categoryNames = {}
        for (var k in data.categories) {
          categoryNames[k] = data.categories[k].name
        }

        if ('category' in options) {
          for (var i = 0; i < options.category.length; i++) {
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
            }
          }
        }

        this.markers = data.markers
        return this._handleMarkers(options, featureCallback, finalCallback)
      }

      finalCallback(error, null)
    }.bind(this)
  )
}

Radkummerkasten._handleMarkers = function (options, featureCallback, finalCallback, error) {
  var detailsFunctions = []
  var offset = typeof options.offset === 'undefined' ? 0 : options.offset
  var limit = typeof options.limit === 'undefined' ? null : options.limit

  this.markers.forEach(function (entry) {
    if (!(entry.id in this.cacheEntries)) {
      this.cacheEntries[entry.id] = new RadkummerkastenEntry(entry)
    }
    var ob = this.cacheEntries[entry.id]

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

    if ('id' in options && options.id.indexOf('' + ob.id) === -1) {
      return
    }

    if ('bezirk' in options && options.bezirk.indexOf('' + ob.bezirk) === -1) {
      return
    }

    if ('category' in options && options.category.indexOf('' + ob.category) === -1) {
      return
    }

    if (options.includeDetails && !ob.hasDetails) {
      detailsFunctions.push(function (ob, callback) {
        ob.getDetails({}, function () {
          featureCallback(null, ob)
          callback()
        })
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
 * load the this.bezirksgrenzen (district borders) from the server
 * @param {function} callback - Callback which should be called after loading. will be passed an error or null as first parameter and the list of districts as second (array of GeoJSON objects).
 */
Radkummerkasten.loadBezirksgrenzen = function (callback) {
  this.init()

  // already cached
  if (this.bezirksgrenzen) {
    async.setImmediate(function () {
      callback(null, this.bezirksgrenzen)
    })

    return
  }

  this.bezirksgrenzen = []

  request.get(this.options.baseUrl + '/wp-content/plugins/radkummerkasten/js/data.wien.gv.at_bezirksgrenzen.json',
    function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var data = JSON.parse(body)

        for (var i = 0; i < data.features.length; i++) {
          var feature = data.features[i]

          this.bezirksgrenzen.push(feature)
        }

        this.bezirksgrenzen.sort(function (a, b) {
          return a.properties.BEZNR - b.properties.BEZNR
        })

        callback(null, this.bezirksgrenzen)
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
Radkummerkasten.getBezirk = function (lat, lon) {
  for (var i = 0; i < this.bezirksgrenzen.length; i++) {
    var r = turf.inside({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [ lon, lat ]
      }
    }, this.bezirksgrenzen[i])

    if (r) {
      return this.bezirksgrenzen[i].properties.BEZNR
    }
  }

  return 0
}

/**
 * get list of categories
 * @param {function} callback - Will be called with 'err' (which should be null) and an object with the categories. [ { 'id': categoryId, 'name': categoryName }, ... ]
 */
Radkummerkasten.categories = function (callback) {
  function _buildCategories () {
    var ret = []
    for (var k in categoryNames) {
      ret.push({
        id: k,
        name: categoryNames[k]
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
 * @property {string} title - Title (load details first)
 * @property {string} user - User, e.g. 'Max M.' (load details first)
 * @property {string} date - Date, ISO8601 (e.g. '2016-12-24') (load details first)
 * @property {string} text - Beschreibung (load details first)
 * @property {RadkummerkastenEntry.comments[]} comments - Comments (load details first)
 * @property {number} commentsCount - Count of comments (load details first)
 * @property {RadkummerkastenEntry.attachment[]} attachments - Attachments (load details first)
 * @property {number} attachmentsCount - Count of attachments (load details first)
 */
function RadkummerkastenEntry (data) {
  this.id = data.id
  this.lat = data.loc[0]
  this.lon = data.loc[1]
  this.status = data.options.status
  this.category = data.options.survey
  this.categoryName = categoryNames[data.options.survey]
  this.bezirk = Radkummerkasten.getBezirk(this.lat, this.lon)
  this.hasDetails = false
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
      coordinates: [ this.lon, this.lat ]
    },
    properties: {
      id: this.id,
      bezirk: this.bezirk,
      status: this.status,
      category: this.category,
      categoryName: this.categoryName
    }
  }

  if (this.title) {
    ret.properties.title = this.title
    ret.properties.user = this.user
    ret.properties.date = this.date
    ret.properties.text = this.text
    ret.properties.likes = this.likes
    ret.properties.comments = this.comments
    ret.properties.attachments = this.attachments
  }

  return ret
}

/**
 * load details for the given RadkummerkastenEntry and call the callbackfunction, with error code and the entry as object.
 * @param {object} options - Options
 * @param {function} callback - Callback function
 */
RadkummerkastenEntry.prototype.getDetails = function (options, callback) {
  if (!options) {
    options = {}
  }

  request.get(Radkummerkasten.options.baseUrl + '/ajax/?map&action=getMapEntry&marker=' + encodeURI(this.id),
    function (error, response, body) {
      var m

      if (!error && response.statusCode === 200) {
        var data = JSON.parse(body)

        m = data.htmlData.match(/^<div class="marker-entry"><h3><span class="survey">([^<]*):<\/span> ([^<]*)<\/h3>(.*)<div class=""><p><span class="author"><i>(.*) schrieb am (.*), (.*):<\/i><\/span><br \/>/)
        this.attachments = []

        if (m[3]) {
          var m1 = m[3].match(/<a href="(.*)" class="swipebox" title="(.*)"><img src/)
          this.attachments.push({
            url: Radkummerkasten.options.baseUrl + m1[1],
            title: m1[2]
          })
        }

        this.title = data.title
        this.bezirk = data.bezirk
        this.user = m[4]
        this.date = parseDate(m[6])
        var p = data.htmlData.indexOf('</p>')
        this.text = fromHTML(data.htmlData.substr(m[0].length, p - m[0].length))

        var remainingHtmlData = data.htmlData.substr(p + 4).trim()
        while(m = remainingHtmlData.match(/^<\/div><div class="images"><a href="(.*)" class="swipebox" title="(.*)">((?!<\/a>).)*<\/a>/)) {
          this.attachments.push({
            url: Radkummerkasten.options.baseUrl + m[1],
            title: m[2]
          })

          remainingHtmlData = remainingHtmlData.substr(m[0].length).trim()
        }

        m = remainingHtmlData.match(/^[^]*<\/div><p class="text-center"><button type="button" class="btn btn-zustimmen btn-nodecoration btn-default" >Finde ich auch <i class="glyphicon glyphicon-thumbs-up"><\/i> <span class="badge">([0-9]+)<\/span><\/button><\/p>/m)
        this.likes = parseInt(m[1])

        remainingHtmlData = remainingHtmlData.substr(m[0].length)
        this.comments = []
        var commentsHtmlData = remainingHtmlData.split(/<\/p>/g)

        for (var i = 0; i < commentsHtmlData.length; i++) {
          m = commentsHtmlData[i].match(/<div class=""><p><span class="author"><i>(.*) schrieb am (.*), (.*):<\/i><\/span><br \/>([^]*)$/m)
          if (m) {
            this.comments.push({
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
          while(m = remainingHtmlData.match(/^<\/div><div class="images"><a href="(.*)" class="swipebox" title="(.*)">((?!<\/a>).)*<\/a>/)) {
            this.comments[this.comments.length - 1].attachments.push({
              url: Radkummerkasten.options.baseUrl + m[1],
              title: m[2]
            })

            remainingHtmlData = remainingHtmlData.substr(m[0].length).trim()
          }
        }
        this.commentsCount = this.comments.length
        this.attachmentsCount = this.attachments.length

        this.hasDetails = true
        callback(null, this)
        return
      }

      callback(error, null)
    }.bind(this)
  )
}

module.exports = Radkummerkasten
