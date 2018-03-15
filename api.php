<?php include "conf.php"; /* load a local configuration */ ?>
<?php include "modulekit/loader.php"; /* loads all php-includes */ ?>
<?php call_hooks('init'); ?>
<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $actions = json_decode(file_get_contents('php://input'),true);
} else {
  $actions = $_GET;
  if (!sizeof($_GET)) {
    $actions = json_decode(urldecode($_SERVER['QUERY_STRING']), true);
  }
}

Header("Content-type: application/json; charset=utf8");

foreach ($api->do($actions) as $i => $result) {
  print $i === 0 ? "[[\n" : "\n] ,[\n";
  foreach ($result as $j => $elem) {
    print $j === 0 ? '' : ",\n";
    print json_readable_encode($elem);
  }
}
print "\n]]\n";
