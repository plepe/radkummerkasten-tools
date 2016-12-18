var months = [ 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember' ]

/**
 * parse ISO8601 date from German date string
 * @param {string} str - German date string, e.g. '24. Dezember 2016'
 * @return {string} ISO8601 date, e.g. '2016-12-24'
 */
function parseDate (str) {
  var m = str.match(/^([ 0-3][0-9])\. (.*) ([0-9]{4})$/)

  var r = m[3] + '-' + (months.indexOf(m[2]) + 1) + '-' + m[1]

  return r
}

module.exports = parseDate
