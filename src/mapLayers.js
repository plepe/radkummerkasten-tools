function mapLayers (options) {
  var layers = {}

  var protocol = 'https:'
  if (typeof location !== 'undefined') {
    protocol = location.protocol
  }

  layers['OSM Default'] =
    L.tileLayer(protocol + '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        maxNativeZoom: 19
    })

  layers['OSM CycleMap'] =
    L.tileLayer(protocol + '//{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors, Tiles: <a href="http://www.thunderforest.com/">Andy Allan</a>',
        maxZoom: 19,
        maxNativeZoom: 18
    })

  layers['Radkummerkasten'] =
    L.tileLayer(protocol + '//radkummerkasten.at/map/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors, Tiles: <a href="http://radlkarte.at/">radlkarte.at</a>',
        maxZoom: 19,
        maxNativeZoom: 18
    })

  return layers
}

module.exports = mapLayers
