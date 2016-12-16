var Radkummerkasten = require('./src/Radkummerkasten')

Radkummerkasten.getEntries(
  {
  },
  function (err, data) {
    if (err) {
      throw (err)
    }
    console.log(data)
  },
  function (err) {
    if (err) {
      throw (err)
    }
  }
)
