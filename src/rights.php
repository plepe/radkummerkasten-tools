<?php
function rights ($auth) {
  if ($auth->current_user->is_logged_in()) {
    return array(
      'anonym' => false,
    );
  }

  return array(
    'anonym' => true,
    'marker_rights' => array(
      'table' => 'map_markers',
      'may_update' => array('survey', 'postcode', 'status', 'visible'),
      'sub_tables' => array(
        'comments' => array(
          'table' => 'map_comments',
          'may_update' => array('message', 'visible'),
          'sub_tables' => array(
            'attachments' => array(
              'table' => 'images',
              'may_update' => array(),
            ),
          ),
        ),
      ),
    ),
  );
}
