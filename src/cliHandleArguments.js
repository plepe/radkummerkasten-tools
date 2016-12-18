var ArgumentParser = require('argparse').ArgumentParser

var parser = new ArgumentParser({
  description: 'Load entries from Radkummerkasten and print as CSV file',
  addHelp: true
})

parser.addArgument(
  [ '-d', '--details' ],
  {
    help: 'When loading entries, also load details for each entry (needs to do a request per entry, please filter data).',
    nargs: 0
  }
)

parser.addArgument(
  [ 'id' ],
  {
    help: 'You can limit the list on the specified ids (the number in the URL of an entry, e.g.: "#marker-1234" => "1234").',
    nargs: '*'
  }
)

parser.addArgument(
  [ '-b', '--bezirk' ],
  {
    help: 'Limit list to entries within the specified Bezirk(e).',
    nargs: '*'
  }
)

var args = parser.parseArgs()
if (args.id.length === 0) {
  delete args.id
}

module.exports = args
