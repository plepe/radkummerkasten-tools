var csvWriter = require('csv-write-stream')
var Radkummerkasten = require('./Radkummerkasten')

module.exports = function (filter, pipe) {
  var headers = [ 'id', 'bezirk', 'category', 'categoryName', 'status', 'lat', 'lon' ]
  if (filter.includeDetails) {
    headers = [ 'id', 'title', 'bezirk', 'bezirkRkk', 'user', 'date', 'category', 'categoryName', 'status', 'likes', 'lat', 'lon', 'text', 'commentsCount', 'attachmentsCount' ]
  }

  // BOM (UTF-8 Byte Order Mark)
  pipe.write('﻿')

  var writer = csvWriter({
    headers: headers
  })
  writer.pipe(pipe)

  Radkummerkasten.getEntries(
    filter,
    function (err, entry) {
      if (err) {
        throw (err)
      }

      writer.write(entry.properties)
    },
    function (err) {
      if (err) {
        throw (err)
      }

      writer.end()
    }
  )
}
