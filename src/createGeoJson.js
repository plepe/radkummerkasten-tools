var Radkummerkasten = require('./Radkummerkasten')

module.exports = function (filter, pipe, callback) {
  var first = true

  pipe.write('{ "type": "FeatureCollection", "features": [\n')

  Radkummerkasten.getEntries(
    filter,
    function (err, entry) {
      if (err) {
        throw (err)
      }

      if (first) {
        first = false
      } else {
        pipe.write(',\n')
      }

      pipe.write(JSON.stringify(entry.toGeoJSON(), null, '  '))
    },
    function (err) {
      if (err) {
        throw (err)
      }

      pipe.write(']}')
      callback()
    }
  )
}
