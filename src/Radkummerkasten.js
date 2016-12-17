var request = require('request')
var async = require('async')

/**
 * The interface to Radkummerkasten
 * @constructor
 * @param {object} config - Optional settings (currently none)
 */
function Radkummerkasten (config) {
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
 * @param {object} filter - Filter the results by certain criteria
 * @param {number[]} [filter.id] - Only include entries with the specified ids (list might be filtered further by other filters)
 * @param {boolean} includeDetails=false - If true, for each entry the details will be loaded. Requires a separate http request for each entry.
 * @param {Radkummerkasten~featureCallback} featureCallback - The featureCallback function will be called for each received entry.
 * @param {Radkummerkasten~finalCallback} [finalCallback] - The finalCallback will be called after the last entry.
 */
Radkummerkasten.getEntries = function (filter, featureCallback, finalCallback) {
  request.get('http://www.radkummerkasten.at/ajax/?map&action=getMapMarkers',
    function (error, response, body) {
      var detailsFunctions = []

      if (!error && response.statusCode === 200) {
        var data = JSON.parse(body)

        data.markers.forEach(function (entry) {
          var ob = new RadkummerkastenEntry(entry)

          if ('id' in filter && filter.id.indexOf('' + ob.id) === -1) {
            return
          }

          if (filter.includeDetails) {
            detailsFunctions.push(function (ob, callback) {
              ob.getDetails(function () {
                featureCallback(null, ob)
                callback()
              })
            }.bind(this, ob))
          } else {
            featureCallback(null, ob)
          }
        })

        if (filter.includeDetails) {
          async.parallelLimit(detailsFunctions, 4, function () {
            finalCallback(null)
          })
        } else {
          finalCallback(null)
        }

        return
      }

      finalCallback(error, null)
    }
  )
}

/**
 * A Radkummerkasten Entry
 * @constructor RadkummerkastenEntry
 * @param {object} data - Data of the entry
 * @property {number} id - Id of the entry
 * @property {number} lat - Latitude of the entry
 * @property {number} lon - Longitude of the entry
 * @property {number} status - ???
 * @property {number} category - Category of the entry
 */
function RadkummerkastenEntry (data) {
  this.id = data.id
  this.lat = data.loc[0]
  this.lon = data.loc[1]
  this.status = data.options.status
  this.category = data.options.survey
}

/**
 * return the entry as JSON object
 */
RadkummerkastenEntry.prototype.toJSON = function () {
  return this
}

/**
 * load details for the given RadkummerkastenEntry and call the callbackfunction, with error code and the entry as object.
 * @param {function} callback - Callback function
 */
RadkummerkastenEntry.prototype.getDetails = function (callback) {
  request.get('http://www.radkummerkasten.at/ajax/?map&action=getMapEntry&marker=' + encodeURI(this.id),
    function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var data = JSON.parse(body)

        this.title = data.title
        this.bezirk = data.bezirk

        callback(null, this)
        return
      }

      callback(error, null)
    }.bind(this)
  )
}

module.exports = Radkummerkasten
