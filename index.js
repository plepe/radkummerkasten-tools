var Radkummerkasten = require('./src/Radkummerkasten')

Radkummerkasten.getEntries(
  {
  },
  function (err, entry) {
    if (err) {
      throw (err)
    }
    console.log(JSON.stringify(entry))
  },
  function (err) {
    if (err) {
      throw (err)
    }
  }
)
