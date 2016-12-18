radkummerkasten-tools sind eine Sammlung von Command Line Tools um Auswertungen über die Daten des [Radkummerkastens](http://www.radkummerkasten.at) zu machen.

Command Line Utilities
======================
* `rkk-csv`: Exportiere die ausgewählten Einträge als CSV Datei.
* `rkk-geojson`: Exportiere die ausgewählten Einträge als GeoJSON Datei.

Mögliche Optionen für die utilities bekommt man bei Aufruf mit dem Parameter `-h`, z.b.: `rkk-csv -h`.

INSTALLATION
============
Um `radkummerkasten-tools` zu installieren, muss [Node.js](https://nodejs.org/) installiert sein. Dann:

```sh
git clone https://github.com/plepe/radkummerkasten-tools.git
cd radkummerkasten-tools
npm install
sudo npm link
```

Danach sollten die command line tools verfügbar sein.
