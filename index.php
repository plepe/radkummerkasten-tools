<?php include "conf.php"; /* load a local configuration */ ?>
<?php include "modulekit/loader.php"; /* loads all php-includes */ ?>
<?php session_start(); ?>
<?php call_hooks("init"); /* initialize submodules */ ?>
<?php $auth = new Auth(); ?>
<?php
html_export_var(array('rights' => rights($auth)));
?>
<!DOCTYPE HTML>
<html>
<head>
  <meta charset="utf-8">
  <title>radkummerkasten-tools</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="style.css?<?=$modulekit['version']?>" />
  <link rel="stylesheet" href="node_modules/leaflet/dist/leaflet.css"/>
  <style>
.leaflet-popup-content {
  max-height: 250px;
  overflow: auto;
}
.leaflet-popup-content pre {
  font-size: 8px;
}
  </style>
  <script src="dist/index.js?<?=$modulekit['version']?>"></script>
  <script src="node_modules/leaflet/dist/leaflet.js"></script>
  <?php print modulekit_to_javascript(); /* pass modulekit configuration to JavaScript */ ?>
  <?php print modulekit_include_js(); /* prints all js-includes */ ?>
  <?php print modulekit_include_css(); /* prints all css-includes */ ?>
  <?php print_add_html_headers(); /* print additional html headers */ ?>
</head>
<body>
<?php print auth_user_menu() ?>

<h1><a href='#'>Radkummerkasten</a></h1>

<div id='menu'>
<div id='menuOverview'>
<form id='filterOverview' onSubmit='return false;'>
</form>
</div>

<div id='menuShow'>
<form id='filterShow'>
<input type='hidden' name='filterId' value=''/>
</form>
</div>

<a href='javascript:openDownload()'>Exportieren</a> |
<a href='javascript:update(true, false)'>Neu laden</a> (Stand: <span id='timestamp'></span>)

<form id='downloadOptions' onSubmit='return submitDownloadForm()'>
  <div class='downloadOption'>
    Dateityp:
    <select name='fileType' onChange='updateDownloadForm()'>
      <option value='csv'>CSV (Comma Separated Value, e.g. Excel)</option>
      <option value='geojson'>GeoJSON (GIS-Applications, e.g. qGIS)</option>
      <option value='html'>HTML</option>
      <option value='office'>Office (HTML, optimiert für den Import in LibreOffice/OpenOffice)</option>
    </select>
  </div>
  <div class='downloadOption' downloadTypes='csv'>
    <input name='includeDetails' type='checkbox' />Inkludiere Details für Einträge
  </div>
  <div class='downloadOption' downloadTypes='html,office'>
    <input name='embedImgs' type='checkbox' />Bilder einbetten
  </div>
  <div class='downloadOption' downloadTypes='html,office'>
    <input name='noMap' type='checkbox' />Keine Karte inkludieren
  </div>
  <input type='submit' value='Generiere Datei' />
  <span id='download'></span>
</form>

</div>

<hr/>

<div id='pageOverview'>
</div>

<div id='pageShow'>
</div>

<hr/>
<p>
Diese Webseite ist nicht Teil des offiziellen <a href='http://www.radkummerkasten.at'>Radkummerkastens</a>, sondern verwendet nur die Daten aus diesem.</p>
<p>Die <a href='https://github.com/plepe/radkummerkasten-tools'>radkummerkasten-tools</a> werden von Stephan Bösch-Plepelits entwickelt.
Diese sind Open Source und werden auf Github entwickelt. Kommentare, Bug
Reports und Erweiterungen sind herzlich willkommen.</p>
<p>Version: <a target='_blank' id='version' href='https://github.com/plepe/radkummerkasten-tools/blob/master/CHANGELOG.md'></a></p>
</body>
</html>
