<?php include "conf.php"; /* load a local configuration */ ?>
<?php include "vendor/autoload.php"; ?>
<?php include "modulekit/loader.php"; /* loads all php-includes */ ?>
<?php session_start(); ?>
<?php call_hooks("init"); /* initialize submodules */ ?>
<?php
$changeset = new DBApiChangeset($api, array('message' => 'dump'));
$api->history->dump($changeset);
$api->history->commit($changeset);
