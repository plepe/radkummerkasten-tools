var request = require('request')

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
 * @param {Radkummerkasten~featureCallback} featureCallback - The featureCallback function will be called for each received entry.
 * @param {Radkummerkasten~finalCallback} [finalCallback] - The finalCallback will be called after the last entry.
 */
Radkummerkasten.getEntries = function (filter, featureCallback, finalCallback) {
  request.get('http://www.radkummerkasten.at/ajax/?map&action=getMapMarkers',
    function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var data = JSON.parse(body)

        data.markers.forEach(function (entry) {
          var ob = new RadkummerkastenEntry(entry)
          featureCallback(null, ob)
        })

        if (finalCallback) {
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
 */
function RadkummerkastenEntry (data) {
  this.data = data
}

/**
 * return the entry as JSON object
 */
RadkummerkastenEntry.prototype.toJSON = function () {
  return this.data
}

module.exports = Radkummerkasten
