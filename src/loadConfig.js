var yaml = require('js-yaml')
var fs = require('fs')
var config

try {
  config = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8'))

  if (config === null) {
    config = {}
  }
} catch (e) {
  console.log(e)

  if (typeof window !== 'undefined') {
    console.error('Can\'t load configuration! Please copy config.yml-dist to config.yml')
    process.exit(1)
  } else {
    alert('Can\'t load configuration! Please copy config.yml-dist to config.yml')
  }
}

module.exports = config
