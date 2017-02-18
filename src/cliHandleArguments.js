var parser

function init () {
  var ArgumentParser = require('argparse').ArgumentParser

  parser = new ArgumentParser({
    addHelp: true,
    epilog: 'Die radkummerkasten-tools werden von Stephan Bösch-Plepelits entwickelt. Diese sind Open Source und werden auf Github entwickelt. Kommentare, Bug Reports und Erweiterungen sind herzlich willkommen: https://github.com/plepe/radkummerkasten-tools'
  })

  parser.addArgument(
    [ '-d', '--details' ],
    {
      help: 'Lade außerdem die detailierten Daten für alle (passenden) Einträge (Achtung: Für jeden Eintrag muss eine Anfrage an den Server gestellt werden - das dauert).',
      nargs: 0
    }
  )

  parser.addArgument(
    [ 'id' ],
    {
      help: 'Lade nur Einträge mit den angegebenen IDs (siehe Nummer in der URL eines Eintrages: z.B.: "#marker-1234" => "1234").',
      nargs: '*'
    }
  )

  parser.addArgument(
    [ '-b', '--bezirk' ],
    {
      help: 'Lade nur Einträge im angegebenen Bezirk.',
    }
  )

  parser.addArgument(
    [ '-k', '--kategorie' ],
    {
      help: 'Lade nur Einträge der angegeben Kategorie.',
      dest: 'category'
    }
  )

  parser.addArgument(
    [ '--limit' ],
    {
      help: 'Lade nur die ersten LIMIT Einträge (nach dem Offset)',
      type: 'int'
    }
  )

  parser.addArgument(
    [ '--offset' ],
    {
      help: 'Überspringe die ersten OFFSET Einträge',
      type: 'int'
    }
  )

  return parser
}

function parseArgs () {
  var args = parser.parseArgs()
  if (args.id.length === 0) {
    delete args.id
  }

  return args
}

function compileFilter (args) {
  var filter = {}

  if (args.id) {
    filter.id = args.id
  }
  if (args.bezirk) {
    filter.bezirk = parseInt(args.bezirk)
  }
  if (args.category) {
    filter.category = parseInt(args.category) === NaN ? args.category : parseInt(args.category)
  }
  filter.includeDetails = !!args.details

  if ('offset' in args) {
    filter.offset = args.offset
  }
  if ('limit' in args) {
    filter.limit = args.limit
  }

  return filter
}

module.exports = {
  init: init,
  parseArgs: parseArgs,
  compileFilter: compileFilter
}
