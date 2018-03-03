var loadingIndicator = require('simple-loading-indicator')
var EventEmitter = require('events')
var _ = require('lodash')

function loadForms (div, entry, fieldValues) {
  var spans = div.getElementsByTagName('span')
  var emitter = new EventEmitter()

  _.forEach(spans, function (span) {
    var element = null

    if (span.className == 'form-select') {
      var element = document.createElement('select')
      element.name = span.getAttribute('name')

      if (element.name in fieldValues) {
        _.forEach(fieldValues[element.name], function (value, key) {
          var option = document.createElement('option')
          option.value = key
          option.appendChild(document.createTextNode(value))
          option.selected = span.getAttribute('value') == key

          element.appendChild(option)
        })
      }
    }

    if (element) {
      span.parentNode.insertBefore(element, span)
      span.parentNode.removeChild(span)

      element.onchange = function () {
        var data = {}
        data[this.name] = this.value

        var k = this.name
        entry.save(data,
          function (err) {
            if (err) {
              alert(err)
            }

            emitter.emit('save')
          }
        )

      }.bind(element)
    }
  })

  return emitter
}

module.exports = loadForms
