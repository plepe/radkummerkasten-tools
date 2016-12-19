var parser

function init () {
  var ArgumentParser = require('argparse').ArgumentParser

  parser = new ArgumentParser({
    description: 'Lade Einträge aus dem Radkummerkasten und generiere eine CSV Datei daraus.',
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
      help: 'Lade nur Einträge im angegebenen Bezirk, bzw. in den angegebenen Bezirken.',
      nargs: '*'
    }
  )

  parser.addArgument(
    [ '-k', '--kategorie' ],
    {
      help: 'Lade nur Einträge der angegeben Kategorie(n). Diese können als nummerischer Wert oder Text angegeben werden.',
      nargs: '*',
      dest: 'category'
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

module.exports = {
  init: init,
  parseArgs: parseArgs
}
