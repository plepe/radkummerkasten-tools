## Version 0.6.0, 2017-04-02
* Neu designes User Interface für Filter / Sortierung
* Neue Filter: Erstellungsdatum, Erstellt oder zuletzt kommentiert, Letzte Änderung (allerdings verwenden sie einen Workaround, da das mit der Datenbank derzeit nicht funktioniert; langsam)

## Version 0.5.2, 2017-03-11
* Neue Sortiermöglichkeit: Meist Kommentiert

## Version 0.5.1, 2017-02-24
* Bugfixes

## Version 0.5.0, 2017-02-23
* Verwende eine serverseitige Datenbank: CouchDB
* Script rkk-replicate um Daten vom Radkummerkasten in die Datenbank zu laden
* Neuer Filter: Autor
* Verschiedene Möglichkeiten zur Sortierung

## Version 0.4.2, 2017-02-16
* Verbessere Anpassung an mobile Geräte

## Version 0.4.1, 2017-02-14
* Bugfixes

## Version 0.4.0, 2017-02-09
* Exportierte nach HTML & Office mit Kartenansicht & Bildern.

## Version 0.3.7, 2017-01-31
* Wähle richtiges Protokoll zum Zugriff auf Radkummerkasten: http: oder https:
* Starte CSV Dateien mit dem UTF-8 Byte Order Mark (damit Encoding richtig erkannt wird)

## Version 0.3.6, 2017-01-18
* Merke Scroll Position beim vor/zurück gehen in der Browser History
* OSM Default, OSM CycleMap und Radkummerkasten als alternative Kartenhintergründe

## Version 0.3.5, 2017-01-09
* Bugfixes

## Version 0.3.4, 2017-01-03
* Bugfixes

## Version 0.3.3, 2016-12-31
* Unit tests via Mocha (`npm test` on command line; `npm run build-test`, open test.html in web browser)
* Besseres Parsing für Attachments
* Bezirkszuordnung im Radkummerkasten teilweise falsch -> Spalte 'bezirkRkk'

## Version 0.3.2, 2016-12-26
* Loading indicator

## Version 0.3.1, 2016-12-23
* Bugfixes

## Version 0.3.0, 2016-12-23
* limit/offset geladener Entries
* mehr caching

## Version 0.2.1, 2016-12-22
* Attachments von Kommentaren

## Version 0.2.0, 2016-12-22
* Liste aktueller Einträge auf der Webseite, plus Detailansicht mit Karte
* Download CSV/GeoJSON ist jetzt optional
* Cache geladener Details im Memory

## Version 0.1.0, 2016-12-20
* Erste funktionierende Version. Command Line scripts oder Webseite erstellen Exports nach CSV und GeoJSON erstellen, dabei die Daten nach Bezirk und Kategorie filtern.
