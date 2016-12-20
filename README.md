radkummerkasten-tools sind eine Sammlung von Command Line Tools um Auswertungen über die Daten des [Radkummerkastens](http://www.radkummerkasten.at) zu machen.

VERWENDUNG
==========
Command Line Utilities
----------------------
* `rkk-csv`: Exportiere die ausgewählten Einträge als CSV Datei.
* `rkk-geojson`: Exportiere die ausgewählten Einträge als GeoJSON Datei.

Mögliche Optionen für die utilities bekommt man bei Aufruf mit dem Parameter `-h`, z.b.: `rkk-csv -h`.

Webpage
-------
Öffne die index.html im Browser. Dort können die Daten über das Formular runtergeladen werden.

INSTALLATION
============
Um `radkummerkasten-tools` zu installieren, muss [Node.js](https://nodejs.org/) installiert sein. Dann:

```sh
git clone https://github.com/plepe/radkummerkasten-tools.git
cd radkummerkasten-tools
npm install
sudo npm link # mache cli tools systemweit verfügbar (optional)
npm run build # build JS code, so that web page is available
```

Danach sollten die command line tools verfügbar sein.

CONTRIBUTING
============
Die radkummerkasten-tools werden von Stephan Bösch-Plepelits entwickelt. Diese sind Open Source und werden auf Github entwickelt. Kommentare, Bug Reports und Erweiterungen sind herzlich willkommen: https://github.com/plepe/radkummerkasten-tools
