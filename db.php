<?php include "conf.php"; /* load a local configuration */ ?>
<?php include "modulekit/loader.php"; /* loads all php-includes */ ?>
<?php
$dbconf[PDO::MYSQL_ATTR_INIT_COMMAND] = "SET NAMES utf8";
$db = new PDOext($dbconf);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

function load_entry ($id, $anonym=true) {
  global $db;
  $result = array();

  // base data
  $res = $db->query('select *, comments as commentsCount from map_markers where id=' . $db->quote($id));
  $result = $res->fetch();

  if (!$result) {
    return null;
  }

  if ($anonym) {
    unset($result['email']);
    unset($result['phone']);
    unset($result['website']);
  }

  // attachments
  $res = $db->query('select images.* from map_comments right join images on map_comments.id=images.context where marker=' . $db->quote($id));
  $images = $res->fetchAll();

  // comments
  $res = $db->query('select * from map_comments where marker=' . $db->quote($id));
  $result['comments'] = array();
  while ($elem = $res->fetch()) {
    $elem['attachments'] = array();

    if ($anonym) {
      unset($elem['email']);
      unset($elem['phone']);
      unset($elem['website']);
      unset($elem['gender']);
      $elem['name'] = mb_substr($elem['name'], 0, 1) . '.';
    }

    foreach ($images as $image) {
      if ($elem['id'] === $image['context']) {
        $elem['attachments'][] = $image;
      }
    }

    $result['comments'][] = $elem;
  }

  return $result;
}

function load_overview () {
  global $db;
  $result = array();

  // base data
  $res = $db->query('select id, comments as commentsCount, lat, lng, survey from map_markers order by commentsCount desc');
  return $res->fetchAll();
}

Header("Content-type: text/plain; charset=utf8");

if (array_key_exists('id', $_REQUEST)) {
  $ids = explode(',', $_REQUEST['id']);
  print "{\n";
  foreach ($ids as $i => $id) {
    print $i === 0 ? '' : ",\n";

    if (preg_match("/^\d+$/", $id)) {
      print "\"{$id}\": ";
      print json_readable_encode(load_entry($id));
    }
  }
  print "\n}";
} else {
  print json_readable_encode(load_overview());
}
