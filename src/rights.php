<?php
function rights ($auth) {
  if ($auth->current_user->is_logged_in()) {
    return array(
      'anonym' => false,
    );
  }

  return array(
    'anonym' => true,
  );
}
