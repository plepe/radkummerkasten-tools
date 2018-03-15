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
      var fieldId = span.getAttribute('field')
      if (!(fieldId in def)) {
        return
      }

      var fieldDef = def[fieldId]
      if (!fieldDef.may_write) {
        return
      }

      while (span.firstChild) {
        span.removeChild(span.firstChild)
      }

      var f = new form('inline-' + entry.id + '-' + fieldId, {}, fieldDef)
      f.set_data(span.getAttribute('value'))
      f.show(span)

      f.onchange = function () {
        var data = {}
        data[fieldId] = f.get_data()

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
