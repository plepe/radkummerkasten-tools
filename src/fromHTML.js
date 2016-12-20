var entities = require('entities')

module.exports = function fromHTML (str) {
  return entities.decodeHTML(str.replace(/\r\n/g, '').replace(/<br \/>/g, '\n'))
}
