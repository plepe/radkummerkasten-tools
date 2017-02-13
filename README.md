radkummerkasten-tools sind eine Sammlung von Command Line Tools um Auswertungen über die Daten des [Radkummerkastens](http://www.radkummerkasten.at) zu machen.

VERWENDUNG
==========
Command Line Utilities
----------------------
* `rkk-csv`: Exportiere die ausgewählten Einträge als CSV Datei.
* `rkk-geojson`: Exportiere die ausgewählten Einträge als GeoJSON Datei.
* `rkk-html`: Exportiere die ausgewählten Einträge als HTML Datei mit wählbarem Template.
* `rkk-replicate`: Synchronisiere die Daten des Radkummerkastens in eine Datenbank vom Typ 'CouchDB'.

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
npm run build # generiere JS für die Webseite (optional)
npm run doc # generiere documentation im verzeichnis doc/ (optional)
```

API Usage
=========
Die `radkummerkasten-tools` stellen eine JavaScript API zur Verfügung, um auf
die Daten des Radkummerkastens zuzugreifen.

Ein funktionierendes Beispiel findet sich in der Datei `example.html`. Hier ein Auzug:
```js
  Radkummerkasten.getEntries(
    {
      bezirk: 15,
      includeDetails: true,
      limit: 5
    },
    // diese Funktion wird für jeden gefunden Eintrag aufgerufen
    // entry ist vom Typ RadkummerkastenEntry.
    function (err, entry) {
      alert(JSON.stringify(entry.toGeoJSON()))
    },
    // nach dem lezten gefunden Eintrag wird noch diese Funktion aufgerufen.
    function (err) {
    }
  )
```

Die volle Dokumentation über die Klassen `Radkummerkasten` und `RadkummerkastenEntry` findet sich in der Dokumentation (Verzeichnis `doc/` nachdem `npm run doc` aufgerufen wurde).

CONTRIBUTING
============
Diese Sourcen sind nicht Teil des offiziellen [http://www.radkummerkasten.at](Radkummerkastens), sondern verwendet nur die Daten aus diesem.

Die radkummerkasten-tools werden von Stephan Bösch-Plepelits entwickelt. Diese sind Open Source und werden auf Github entwickelt. Kommentare, Bug Reports und Erweiterungen sind herzlich willkommen: https://github.com/plepe/radkummerkasten-tools

Für Erweiterungen generiere bitte Tests (siehe Verzeichnis `test/`). In NodeJS können diese mit dem Kommando `npm test` ausgeführt werden, für Browser Tests mit `npm run build-test` kompilieren und dann die Datei `test.html` im Browser öffnen.
