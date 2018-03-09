<?php include "conf.php"; /* load a local configuration */ ?>
<?php include "modulekit/loader.php"; /* loads all php-includes */ ?>
<?php session_start(); ?>
<?php $auth = new Auth(); ?>
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

  $result['visible'] = (boolean)$result['visible'];
  $result['lat'] = (float)$result['lat'];
  $result['lng'] = (float)$result['lng'];
  $result['likes'] = (float)$result['likes'];
  $result['mail_verified'] = (int)$result['mail_verified'];

  if ($anonym) {
    unset($result['email']);
    unset($result['phone']);
    unset($result['website']);
    unset($result['ip']);
  }

  // attachments
  $res = $db->query('select images.* from map_comments right join images on map_comments.id=images.context where marker=' . $db->quote($id));
  $images = $res->fetchAll();

  // comments
  $res = $db->query('select * from map_comments where marker=' . $db->quote($id));
  $result['comments'] = array();
  while ($elem = $res->fetch()) {
    $elem['visible'] = (boolean)$elem['visible'];
    $elem['newsletter'] = (boolean)$elem['newsletter'];
    $elem['main'] = (boolean)$elem['main'];
    $elem['likes'] = (float)$elem['likes'];
    $elem['notify'] = (int)$elem['notify'];
    $elem['mail_verified'] = (int)$elem['mail_verified'];
    $elem['attachments'] = array();

    if ($anonym) {
      unset($elem['email']);
      unset($elem['phone']);
      unset($elem['website']);
      unset($elem['gender']);
      unset($elem['ip']);
      $elem['name'] = mb_substr($elem['name'], 0, 1) . '.';
    }

    foreach ($images as $image) {
      if ($elem['id'] === $image['context']) {
        $image['type'] = (int)$image['type'];
        $image['width'] = (int)$image['width'];
        $image['height'] = (int)$image['height'];

        $elem['attachments'][] = $image;
      }
    }

    $result['comments'][] = $elem;
  }

  return $result;
}

function load_overview ($options, $anonym=true) {
  global $db;
  $result = array();

  $limit = '';
  if (array_key_exists('limit', $options) && preg_match("/^\d+$/", $options['limit'])) {
    $limit = "limit {$options['limit']}";
  }

  $offset = '';
  if (array_key_exists('offset', $options) && preg_match("/^\d+$/", $options['offset'])) {
    $offset = "offset {$options['offset']}";
  }

  $select[] = '(select date from map_comments where map_comments.marker=map_markers.id order by date desc limit 1) lastCommentDate';

  if (array_key_exists('dateStart', $options) && $options['dateStart']) {
    $where[] = 'date>=' . $db->quote($options['dateStart']);
  }

  if (array_key_exists('dateEnd', $options) && $options['dateEnd']) {
    $where[] = 'date<=' . $db->quote($options['dateEnd']);
  }

  if (array_key_exists('postcode', $options) && $options['postcode']) {
    $select[] = 'postcode';
    $where[] = 'postcode=' . $db->quote($options['postcode']);
  }

  if (array_key_exists('survey', $options) && $options['survey']) {
    $where[] = 'survey=' . $db->quote($options['survey']);
  }

  if (array_key_exists('status', $options) && $options['status']) {
    $select[] = 'status';
    $where[] = 'status=' . $db->quote($options['status']);
  }

  if (array_key_exists('lastCommentDateStart', $options) && $options['lastCommentDateStart']) {
    $where[] = 'lastCommentDate>=' . $db->quote($options['lastCommentDateStart']);
  }

  if (array_key_exists('lastCommentDateEnd', $options) && $options['lastCommentDateEnd']) {
    $where[] = 'lastCommentDate<=' . $db->quote($options['lastCommentDateEnd']);
  }

  if (array_key_exists('user', $options) && $options['user']) {
    if ($anonym) {
      $userq = "concat(firstname, ' ', substr(name, 1, 1), '.')";
    }
    else {
      $userq = "concat(firstname, ' ', name)";
    }

    $select[] = "(select {$userq} user from map_comments where map_comments.marker=map_markers.id and {$userq} like " . $db->quote("%{$options['user']}%") . 'limit 1) _matchUser';
    $where[] = "_matchUser is not null";
  }

  switch ($options['order'] ?? 'lastComment') {
    case 'id':
      $order = 'order by id desc';
      break;
    case 'likes':
      $select[] = 'likes';
      $order = 'order by likes desc';
      break;
    case 'commentsCount':
      $order = 'order by commentsCount desc';
      break;
    case 'lastComment':
    default:
      $order = 'order by lastCommentDate desc';
  }

  if (sizeof($select)) {
    $select = ', ' . implode(', ', $select);
  }
  else {
    $select = '';
  }

  if (sizeof($where)) {
    $where = 'where ' . implode(' and ', $where);
  }
  else {
    $where = '';
  }

  // base data
  $query = "select * from (select id, date, comments as commentsCount, lat, lng, survey $select from map_markers) t {$where} {$order} {$limit} {$offset}";
  //print $query;
  $res = $db->query($query);
  return $res->fetchAll();
}

/*
 * @return [string] queries
 */
function update_data_struct ($entries, $struct) {
  global $db;
  $queries = array();

  foreach ($entries as $entry) {
    $set = array();

    if (!array_key_exists('id', $entry)) {
      return false;
    }

    foreach ($entry as $k => $d) {
      if ($k === 'id') {
        continue;
      }

      if (array_key_exists('sub_tables', $struct) &&
          array_key_exists($k, $struct['sub_tables'])) {
        $q = update_data_struct($d, $struct['sub_tables'][$k]);

        if (!is_array($q)) {
          return $q;
        }

        $queries = array_merge($queries, $q);

        continue;
      }

      if (!in_array($k, $struct['may_update'])) {
        return "may not update {$k}";
      }

      $set[] = $db->quoteIdent($k) . '=' . $db->quote($d);
    }

    if (sizeof($set)) {
      $queries[] = "update {$struct['table']} set " . implode(', ', $set) . ' where id=' . $db->quote($entry['id']);
    }
  }

  return $queries;
}

function update_data ($data) {
  global $db;
  global $rights;

  $queries = update_data_struct($data, $rights['marker_rights']);

  if (!is_array($queries)) {
    return $queries;
  }

  $db->beginTransaction();
  foreach ($queries as $query) {
    $db->query($query);
  }
  $db->commit();

  return $queries;
}

$rights = rights($auth);

Header("Content-type: text/plain; charset=utf8");

switch ($_SERVER['REQUEST_METHOD']) {
  case 'GET':
    if (array_key_exists('id', $_REQUEST)) {
      $ids = explode(',', $_REQUEST['id']);
      print "{\n";
      foreach ($ids as $i => $id) {
        print $i === 0 ? '' : ",\n";

        if (preg_match("/^\d+$/", $id)) {
          print "\"{$id}\": ";
          print json_readable_encode(load_entry($id, $rights['anonym']));
        }
      }
      print "\n}";
    } else {
      print json_readable_encode(load_overview($_REQUEST, $rights['anonym']));
    }
    break;
  case 'POST':
    $data = json_decode(file_get_contents('php://input'),true);

    $result = update_data($data);

    print json_readable_encode($result);

    break;
}
