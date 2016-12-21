window.Radkummerkasten = require('../src/Radkummerkasten')

function showEntry(entry, div) {
  entry.getDetails(function () {
    div.innerHTML = '<h3>' + entry.categoryName + ': ' + entry.title + '</h3>' +
      (entry.attachments && entry.attachments.length ? '<img src="' + entry.attachments[0].url + '">' : '') +
      (entry.text.length > 200 ? entry.text.substr(0, 200) + '...' : entry.text) +
      '<br><a href="https://www.radkummerkasten.at/#marker-' + entry.id + '">' + entry.date + ' von ' + entry.user + '</a>'
  })
}

window.onload = function () {
  update()
}

window.update = function () {
  var entries = []
  var content = document.getElementById('content')
  var form = document.getElementById('form')

  var filter = {}
  if (form.elements.bezirk.value !== '*') {
    filter.bezirk = [ form.elements.bezirk.value ]
  }
  if (form.elements.category.value !== '*') {
    filter.category = [ form.elements.category.value ]
  }

  Radkummerkasten.getEntries(
    filter,
    function (err, entry) {
      entries.push(entry)
    },
    function (err) {
      content.innerHTML = ''

      for (var i = Math.max(entries.length - 50, 0); i < entries.length; i++) {
        var div = document.createElement('div')
        div.className = 'entry'
        content.insertBefore(div, content.firstChild)

        showEntry(entries[i], div)
      }
    }
  )
}
