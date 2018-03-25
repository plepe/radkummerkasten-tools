<?php
register_hook('init', function () {
  global $api;
  global $dbconf;
  global $db;
  global $auth;

  $dbconf[PDO::MYSQL_ATTR_INIT_COMMAND] = "SET NAMES utf8";
  $db = new PDOext($dbconf);
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

  $anonym = true;

  if ($auth->current_user->is_logged_in()) {
    $anonym = false;
  }

  $table_markers = array(
    'id' => 'markers',
    'table' => 'map_markers',
    'fields' => array(
      'id' => array(
        'type' => 'int',
      ),
      'lat' => array(
        'type' => 'float',
      ),
      'lng' => array(
        'type' => 'float',
      ),
      'survey' => array(
        'type' => 'int',
      ),
      'street' => array(
        'type' => 'text',
      ),
      'housenumber' => array(
        'type' => 'text',
      ),
      'postcode' => array(
        'type' => 'int',
      ),
      'city' => array(
        'type' => 'text',
      ),
      'date' => array(
        'type' => 'text',
      ),
      'likes' => array(
        'type' => 'int',
      ),
      'comments' => array(
        'type' => 'sub_table',
        'id' => 'map_comments',
        'parent_field' => 'marker',
        'fields' => array(
          'id' => array(
            'type' => 'int',
          ),
          'marker' => array(
            'type' => 'int',
          ),
          'message' => array(
            'type' => 'text',
          ),
          'firstname' => array(
            'type' => 'text',
            'read' => true,
          ),
          'lastname' => array(
            'type' => 'text',
            'select' => $anonym ? "concat(substr(name, 1, 1), '.')" : "name",
          ),
          'email' => array(
            'type' => 'text',
            'read' => !$anonym,
          ),
          'gender' => array(
            'type' => 'int',
            'read' => !$anonym,
          ),
          'newsletter' => array(
            'type' => 'int',
          ),
          'date' => array(
            'type' => 'text',
          ),
          'ip' => array(
            'type' => 'text',
          ),
          'visible' => array(
            'type' => 'boolean',
          ),
          'attachments' => array(
            'type' => 'sub_table',
            'id' => 'images',
            'parent_field' => 'context',
            'fields' => array(
              'id' => array(
                'type' => 'int',
              ),
              'context' => array(
                'type' => 'int',
              ),
              'type' => array(
                'type' => 'int',
              ),
              'date' => array(
                'type' => 'text',
              ),
              'file' => array(
                'type' => 'text',
              ),
              'rawfile' => array(
                'type' => 'text',
              ),
              'ord' => array(
                'type' => 'int',
              ),
              'width' => array(
                'type' => 'int',
              ),
              'height' => array(
                'type' => 'int',
              ),
              'text' => array(
                'type' => 'text',
              ),
            ),
          ),
        ),
      ),
      'commentsCount' => array(
        'type' => 'int',
        'select' => 'select count(*) from map_comments where map_comments.marker=map_markers.id',
      ),
      'lastCommentDate' => array(
        'type' => 'text',
        'select' => 'select date from map_comments where map_comments.marker=map_markers.id order by date desc limit 1'
      ),
      'visible' => array(
        'type' => 'boolean',
      ),
      'status' => array(
        'type' => 'int',
        'write' => true,
      ),
      'address' => array(
        'type' => 'text',
      ),
    ),
  );

  $table_surveys = array(
    'id' => 'survey',
    'table' => 'map_surveys',
    'fields' => array(
      'id' => array(
        'type' => 'int',
      ),
      'name' => array(
        'type' => 'text',
      ),
      'subtitle' => array(
        'type' => 'text',
      ),
      'startdate' => array(
        'type' => 'text',
      ),
      'enddate' => array(
        'type' => 'text',
      ),
      'active' => array(
        'type' => 'text',
      ),
      'commenting' => array(
        'type' => 'text',
      ),
      'public' => array(
        'type' => 'text',
      ),
    ),
  );

  $table_states = array(
    'id' => 'states',
    'table' => 'map_marker_state',
    'fields' => array(
      'id' => array(
        'type' => 'int',
      ),
      'name' => array(
        'type' => 'text',
      ),
    ),
  );

  $api = new DBApi($db);
  $api->addTable($table_markers);
  $api->addTable($table_surveys);
  $api->addTable($table_states);

  html_export_var(array('rights' => array(
    'markers' => $table_markers,
    'survey' => $table_surveys,
    'states' => $table_states,
  )));
});
