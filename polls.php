<?php
// ============================================================================
// LIVE POLLS add-on. Included by api.php only when ENABLE_POLLS is true.
// Delete this file (plus polls.html and assets/polls.js) to remove polls entirely.
// Polls are defined in event.php (POLLS). One poll is open at a time; the host
// opens and closes it from host.html. Each phone has one vote per poll and can
// change it while the poll is open. Votes are stored per device as a hash only.
// ============================================================================
declare(strict_types=1);
if (!defined('DATA_DIR')) exit;

$emptyP = ['v' => 0, 'active' => null, 'shown' => null, 'votes' => []];

function poll_def(string $pid): ?array {
  if (!isset(POLLS[$pid])) return null;
  [$q, $opts, $max] = POLLS[$pid];
  return ['id' => $pid, 'question' => $q, 'options' => array_values($opts), 'max' => max(1, (int)$max)];
}
function poll_counts(array $d, string $pid): array {
  $def = poll_def($pid); $n = array_fill(0, count($def['options']), 0); $voters = 0;
  foreach ($d['votes'][$pid] ?? [] as $choices) { $voters++; foreach ($choices as $i) if (isset($n[$i])) $n[$i]++; }
  return ['counts' => $n, 'voters' => $voters];
}

switch ($action) {

  // Current poll for phones and the results screen. "shown" = the poll on screen (open, or just closed).
  case 'poll': {
    $d = read_store('polls', $emptyP);
    $pid = $d['shown'];
    if ($pid === null || !poll_def($pid)) out(['ok' => true, 'v' => $d['v'], 'poll' => null]);
    $dev = clean($_GET['device'] ?? '', 64); $h = $dev !== '' ? hash('sha256', $dev) : '';
    out(['ok' => true, 'v' => $d['v'], 'poll' => poll_def($pid) + poll_counts($d, $pid) + [
      'open' => $d['active'] === $pid, 'mine' => $h !== '' ? ($d['votes'][$pid][$h] ?? []) : []]]);
  }

  case 'pvote': {
    limit('pvote', 40, 600);
    $pid = (string)($body['pid'] ?? ''); $dev = clean($body['device'] ?? '', 64);
    $def = poll_def($pid);
    if (!$def || $dev === '') fail('Bad request.');
    $choices = array_values(array_unique(array_filter((array)($body['choices'] ?? []),
      fn($i) => is_int($i) && $i >= 0 && $i < count($def['options']))));
    if (!$choices) fail('Pick an answer first.');
    if (count($choices) > $def['max']) fail('Pick up to ' . $def['max'] . '.');
    $ok = with_store('polls', function (&$d) use ($pid, $dev, $choices) {
      if ($d['active'] !== $pid) return false;
      $d['votes'][$pid][hash('sha256', $dev)] = $choices; $d['v']++; return true;
    }, $emptyP);
    if (!$ok) fail('This poll has closed.', 409);
    out(['ok' => true]);
  }

  // Host controls (organiser password)
  case 'padmin': {
    require_admin($body);
    $op = $body['op'] ?? ''; $pid = (string)($body['pid'] ?? '');
    if (in_array($op, ['open', 'reset'], true) && !poll_def($pid)) fail('Unknown poll.');
    if ($op === 'open') with_store('polls', function (&$d) use ($pid) { $d['active'] = $pid; $d['shown'] = $pid; $d['v']++; }, $emptyP);
    elseif ($op === 'close') with_store('polls', function (&$d) { $d['active'] = null; $d['v']++; }, $emptyP);
    elseif ($op === 'hide') with_store('polls', function (&$d) { $d['active'] = null; $d['shown'] = null; $d['v']++; }, $emptyP);
    elseif ($op === 'reset') with_store('polls', function (&$d) use ($pid) { unset($d['votes'][$pid]); $d['v']++; }, $emptyP);
    elseif ($op === 'clearall') with_store('polls', function (&$d) { $d = ['v' => $d['v'] + 1, 'active' => null, 'shown' => null, 'votes' => []]; }, $emptyP);
    elseif ($op !== 'list') fail('Unknown request.');
    $d = read_store('polls', $emptyP); $list = [];
    foreach (array_keys(POLLS) as $k) $list[] = poll_def($k) + poll_counts($d, $k) + ['open' => $d['active'] === $k, 'shown' => $d['shown'] === $k];
    out(['ok' => true, 'v' => $d['v'], 'polls' => $list]);
  }
}
fail('Unknown request.', 404);
