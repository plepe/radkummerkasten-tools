window.Radkummerkasten = require('../src/Radkummerkasten')

const step = 20

function showEntry(entry, div) {
  entry.getDetails(function () {
    div.innerHTML = '<h3>#' + entry.id + ' ' + entry.categoryName + ': ' + entry.title + '</h3>' +
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

      for (var i = Math.max(entries.length - step, 0); i < entries.length; i++) {
        var div = document.createElement('div')
        div.className = 'entry'
        content.insertBefore(div, content.firstChild)

        showEntry(entries[i], div)
      }

      var done = step

      if (entries.length <= step) {
        return
      }

      var divLoadMore = document.createElement('div')
      divLoadMore.className = 'loadMore'

      var a = document.createElement('a')
      a.appendChild(document.createTextNode('lade mehr Einträge'))
      a.href = '#'
      a.onclick = function () {
        for (var i = entries.length - done - 1; i >= Math.max(entries.length - done - step, 0); i--) {
          var div = document.createElement('div')
          div.className = 'entry'
          content.insertBefore(div, divLoadMore)

          showEntry(entries[i], div)
        }

        done += step

        if (entries.length <= done) {
          content.removeChild(divLoadMore)
        }

        return false
      }

      divLoadMore.appendChild(a)
      content.appendChild(divLoadMore)
    }
  )
}
