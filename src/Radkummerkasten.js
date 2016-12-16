var request = require('request')

function Radkummerkasten (config) {
}

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

RadkummerkastenEntry = function (data) {
  this.data = data
}

RadkummerkastenEntry.prototype.toJSON = function () {
  return this.data
}

module.exports = Radkummerkasten
