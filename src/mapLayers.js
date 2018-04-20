function mapLayers (options) {
  var layers = {}

  var protocol = 'https:'
  if (typeof location !== 'undefined') {
    protocol = location.protocol
  }

  layers['OSM Default'] = {
        url: protocol + '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        maxNativeZoom: 19
    }

  layers['OSM CycleMap'] = {
        url: protocol + '//{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors, Tiles: <a href="http://www.thunderforest.com/">Andy Allan</a>',
        maxZoom: 19,
        maxNativeZoom: 18
    }

  layers['radlkarte.at'] = {
        url: protocol + '//radkummerkasten.at/map/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors, Tiles: <a href="http://radlkarte.at/">radlkarte.at</a>',
        maxZoom: 19,
        maxNativeZoom: 18
    }

  layers['Basemap'] = {
        url: protocol + '//{s}.wien.gv.at/basemap/geolandbasemap/normal/google3857/{z}/{y}/{x}.png',
        attribution: '&copy; <a href="http://www.basemap.at/">basemap.at</a>',
        maxZoom: 19,
        maxNativeZoom: 19,
        subdomains: [ 'maps', 'maps1', 'maps2', 'maps3', 'maps4' ]
    }

  layers['Basemap Orthophoto'] = {
        url: protocol + '//{s}.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpg',
        attribution: '&copy; <a href="http://www.basemap.at/">basemap.at</a>',
        maxZoom: 19,
        maxNativeZoom: 19,
        subdomains: [ 'maps', 'maps1', 'maps2', 'maps3', 'maps4' ]
    }

  layers['Stadtplan Wien Orthophoto'] = {
        url: protocol + '//{s}.wien.gv.at/wmts/lb/farbe/google3857/{z}/{y}/{x}.jpeg',
        attribution: '&copy; <a href="http://www.wien.gv.at">Stadt Wien</a>',
        maxZoom: 19,
        maxNativeZoom: 19,
        subdomains: [ 'maps', 'maps1', 'maps2', 'maps3', 'maps4' ]
    }

  layers['OpenTopoMap'] = {
        url: protocol + '//{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors, Tiles: <a href="http://opentopomap.org/">OpenTopoMap</a>',
        maxZoom: 19,
        maxNativeZoom: 17
    }

  layers['Hauptradverkehrsnetz 2015'] = {
        url: protocol + '//fahrrad.lima-city.de/Karten/Karten/Hauptradverkehrsnetz2015/Z{z}/{y}/{x}.png',
        attribution: '&copy; <a href="http://www.wien.gv.at">Stadt Wien</a>',
        maxZoom: 19,
        maxNativeZoom: 16
    }

  return layers
}

module.exports = mapLayers
