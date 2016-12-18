var ArgumentParser = require('argparse').ArgumentParser

var parser = new ArgumentParser({
  description: 'Lade Einträge aus dem Radkummerkasten und generiere eine CSV Datei daraus.',
  addHelp: true
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

var args = parser.parseArgs()
if (args.id.length === 0) {
  delete args.id
}

module.exports = args
