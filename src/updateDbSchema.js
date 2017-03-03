var Radkummerkasten = require('./RadkummerkastenCloner')

var currentSchema = 0

function updateDbSchema (status, callback) {
  var schema = 'schema' in status ? status.schema : 0
  status.schema = currentSchema

  if (schema < currentSchema) {
    console.log('updating db schema from ' + schema + ' to ' + currentSchema)

    Radkummerkasten.db.allDocs(
      {
        include_docs: true
      },
      function (err, result) {
        var entries = result.rows
        var docs = []

        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i]
          
          if (!entry.id.match(/^[0-9]+$/)) {
            continue
          }

          for (var j = schema; j < currentSchema; j++) {
            var fun = 'update' + j + 'to' + (j + 1)

            eval(fun)(entry.doc)
          }

          docs.push(entry.doc)
        }

        Radkummerkasten.db.bulkDocs(
          docs,
          {},
          function (err, response) {
            if (err) {
              throw(err)
            }

            callback()
          }
        )
      }
    )
  } else {
    callback()
  }
}

module.exports = updateDbSchema
