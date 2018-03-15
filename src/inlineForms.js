var loadingIndicator = require('simple-loading-indicator')
var EventEmitter = require('events')
var _ = require('lodash')

function inlineForms (div, entry, fieldValues) {
  var emitter = new EventEmitter()

  entry.formDef({}, inlineForms2.bind(this, div, entry, emitter))

  return emitter
}

function inlineForms2 (div, entry, emitter, err, def) {
  var spans = []

  _.forEach(div.getElementsByTagName('span'), function (span) {
    spans.push(span)
  })

  spans.forEach(function (span) {
    if (!span) {
      // how can this happen?
      return
    }

    if (span.className == 'inlineForm') {
      var pathDef = def
      var fieldId = span.getAttribute('field')

      var path = span.getAttribute('path')
      if (path) {
        path.split('/').forEach(p => {
          let pp = p.split('.')
          if (pp[0] in pathDef && 'def' in pathDef[pp[0]] && 'def' in pathDef[pp[0]].def) {
            pathDef = pathDef[pp[0]].def.def
          } else {
            pathDef = null
          }
        })

        if (pathDef === null) {
          return
        }
      }

      if (!(fieldId in pathDef)) {
        return
      }
      var fieldDef = pathDef[fieldId]

      if (!fieldDef.may_write) {
        return
      }

      while (span.firstChild) {
        span.removeChild(span.firstChild)
      }

      var formId = 'inline-' + entry.id + '-' + path + '-' + fieldId
      var f = new form(formId, {}, fieldDef)
      f.set_data(span.getAttribute('value'))
      f.show(span)

      f.onchange = function () {
        var data = {}
        var d = data

        if (path) {
          path.split('/').forEach(p => {
            let pp = p.split('.')
            d[pp[0]] = [{
              id: pp[1]
            }]
            d = d[pp[0]][0]
          })
        }

        d[fieldId] = f.get_data()

        entry.save(data,
          function (err) {
            if (err) {
              alert(err)
            }

            emitter.emit('save')
          }
        )
      }
    }
  })

  return emitter
}

module.exports = inlineForms
