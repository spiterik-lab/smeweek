<?php
declare(strict_types=1);
require __DIR__ . '/config.php';
require __DIR__ . '/event.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

// Saved data lives OUTSIDE the deployed folder so GitHub deployments never wipe it.
// Preferred: next to public_html (not reachable from the web). Fallback: a protected folder beside the app.
function data_dir(): string {
  // App at a site's document root (smeweek.tetra.com.mt/public_html): data goes next to public_html.
  // App in a subfolder (old tetra.com.mt/public_html/smeweek): data goes next to that site's public_html.
  $outside = (basename(__DIR__) === 'public_html' ? dirname(__DIR__) : dirname(__DIR__, 2)) . '/smeweek-data';
  if ((is_dir($outside) || @mkdir($outside, 0755, true)) && is_writable($outside)) return $outside;
  $beside = dirname(__DIR__) . '/smeweek-data';
  if (!is_dir($beside)) @mkdir($beside, 0755, true);
  if (!is_file("$beside/.htaccess")) @file_put_contents("$beside/.htaccess", "Require all denied\n");
  return $beside;
}
define('DATA_DIR', data_dir());
define('SECTOR_NAMES', array_column(SECTORS, 0));
define('INTEREST_IDS', array_merge(
  array_map(fn($k) => "$k:give", array_keys(INTERESTS)),
  array_map(fn($k) => "$k:get", array_keys(INTERESTS)),
  ['network']
));

function out(array $a, int $code = 200): never { http_response_code($code); echo json_encode($a, JSON_UNESCAPED_UNICODE); exit; }
function fail(string $msg, int $code = 400): never { out(['ok' => false, 'error' => $msg], $code); }
function api_key(): string {
  static $k = null;
  if ($k === null) { $st = is_file(DATA_DIR . '/settings.json') ? (json_decode((string)file_get_contents(DATA_DIR . '/settings.json'), true) ?: []) : [];
    $k = (string)($st['api_key'] ?? '') ?: ANTHROPIC_API_KEY; }
  return $k;
}
function ai_on(): bool { return api_key() !== ''; }

if (!is_dir(DATA_DIR) && !@mkdir(DATA_DIR, 0755, true)) fail('The data folder could not be created. Check folder permissions.', 500);

/** Run $fn with an exclusive lock on a JSON file; $fn gets the decoded data by reference. */
function with_store(string $name, callable $fn, array $default) {
  $path = DATA_DIR . "/$name.json";
  $fh = fopen($path, 'c+');
  if (!$fh) fail('Storage is not writable.', 500);
  flock($fh, LOCK_EX);
  $raw = stream_get_contents($fh);
  $data = $raw ? (json_decode($raw, true) ?: $default) : $default;
  $before = $raw;
  $result = $fn($data);
  $after = json_encode($data, JSON_UNESCAPED_UNICODE);
  if ($after !== $before) { ftruncate($fh, 0); rewind($fh); fwrite($fh, $after); fflush($fh); }
  flock($fh, LOCK_UN); fclose($fh);
  return $result;
}
function read_store(string $name, array $default): array {
  $path = DATA_DIR . "/$name.json";
  if (!is_file($path)) return $default;
  $fh = fopen($path, 'r'); flock($fh, LOCK_SH); $raw = stream_get_contents($fh); flock($fh, LOCK_UN); fclose($fh);
  return $raw ? (json_decode($raw, true) ?: $default) : $default;
}

/** Simple per-visitor rate limit (IP is hashed, never stored raw). */
function limit(string $bucket, int $max, int $window): void {
  $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '0';
  $key = $bucket . ':' . substr(hash('sha256', $ip . ADMIN_KEY_HASH), 0, 16);
  $now = time();
  $ok = with_store('ratelimit', function (&$d) use ($key, $max, $window, $now) {
    foreach ($d as $k => $ts) { $d[$k] = array_values(array_filter($ts, fn($t) => $t > $now - 3600)); if (!$d[$k]) unset($d[$k]); }
    $hits = array_filter($d[$key] ?? [], fn($t) => $t > $now - $window);
    if (count($hits) >= $max) return false;
    $d[$key] = array_merge($d[$key] ?? [], [$now]);
    return true;
  }, []);
  if (!$ok) fail('Too many requests. Please wait a minute and try again.', 429);
}

function clean(mixed $v, int $max): string {
  $s = trim(preg_replace('/\s+/u', ' ', (string)($v ?? '')));
  return mb_substr(strip_tags($s), 0, $max);
}
function clean_phone(mixed $v): string {
  $s = preg_replace('/[^0-9+ ]/', '', (string)($v ?? ''));
  $s = trim(preg_replace('/\s+/', ' ', $s));
  return mb_substr($s, 0, 20);
}
function clean_email(mixed $v): string {
  $s = trim((string)($v ?? ''));
  if ($s === '') return '';
  if (!filter_var($s, FILTER_VALIDATE_EMAIL) || mb_strlen($s) > 120) fail('That email address does not look right.');
  return $s;
}
function clean_link(mixed $v): string {
  $s = trim((string)($v ?? ''));
  if ($s === '') return '';
  if (!preg_match('~^https?://~i', $s)) $s = 'https://' . $s;
  if (!filter_var($s, FILTER_VALIDATE_URL) || mb_strlen($s) > 200) fail('That LinkedIn or website link does not look right.');
  return $s;
}
function pick_interests(mixed $v): array {
  if (!is_array($v)) return [];
  return array_values(array_unique(array_filter($v, fn($x) => is_string($x) && in_array($x, INTEREST_IDS, true))));
}
/** What everyone in the room may see. Contact details are never included. */
function public_person(string $id, array $p): array {
  return ['id' => $id, 'name' => $p['name'], 'company' => $p['company'], 'role' => $p['role'] ?? '', 'sector' => $p['sector'] ?? 'Other',
          'interests' => $p['interests'] ?? [], 'speaker' => !empty($p['speaker']), 'work' => $p['work'] ?? ''];
}
/** The private "business card" a person shares once they accept (or have accepted) a connection. */
function card(array $p): array {
  return array_filter(['mobile' => empty($p['hide_mobile']) ? ($p['mobile'] ?? '') : '', 'email' => $p['email'] ?? '', 'linkedin' => $p['linkedin'] ?? '']);
}
/** contacts.json: $c[from][to] = request. Older entries were a bare timestamp. */
function req_at(mixed $r): int { return is_array($r) ? (int)($r['at'] ?? 0) : (int)$r; }
function req_msg(mixed $r): string { return is_array($r) ? (string)($r['msg'] ?? '') : ''; }
/** Interests as words, for the AI prompts and the export. */
function interest_words(array $ids): array {
  $w = [];
  foreach ($ids as $i) {
    if ($i === 'network') { $w[] = NETWORKING_LABEL; continue; }
    [$k, $side] = explode(':', $i) + ['', ''];
    if (isset(INTERESTS[$k])) $w[] = INTERESTS[$k][$side === 'give' ? 0 : 1];
  }
  return $w;
}
function owns(array $p, string $token): bool { return $token !== '' && hash_equals($p['token_hash'], hash('sha256', $token)); }
function me_or_fail(array $d, array $body): string {
  $id = (string)($body['id'] ?? ''); $token = (string)($body['token'] ?? '');
  if (!isset($d['people'][$id]) || !owns($d['people'][$id], $token)) fail('Add yourself to the map first.', 403);
  return $id;
}
function is_admin(array $body): bool { return hash_equals(ADMIN_KEY_HASH, hash('sha256', (string)($body['key'] ?? ''))); }
/** Organiser password check. Only wrong passwords count towards the lock-out, so host pages can refresh freely. */
function require_admin(array $body): void {
  $fails = read_store('ratelimit', []);
  $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '0';
  $fk = 'adminfail:' . substr(hash('sha256', $ip . ADMIN_KEY_HASH), 0, 16);
  if (count(array_filter($fails[$fk] ?? [], fn($t) => $t > time() - 600)) >= 10) fail('Too many wrong passwords. Please wait ten minutes.', 429);
  if (!is_admin($body)) { limit('adminfail', 1000, 600); fail('Wrong organiser password.', 403); }
}

function claude(string $prompt, int $maxTokens = 350): string {
  $ch = curl_init('https://api.anthropic.com/v1/messages');
  curl_setopt_array($ch, [
    CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 40,
    CURLOPT_HTTPHEADER => ['content-type: application/json', 'x-api-key: ' . api_key(), 'anthropic-version: 2023-06-01'],
    CURLOPT_POSTFIELDS => json_encode(['model' => AI_MODEL, 'max_tokens' => $maxTokens,
      'messages' => [['role' => 'user', 'content' => $prompt]]]),
  ]);
  $res = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
  if ($res === false || $code !== 200) fail('The AI service did not respond. Try again in a moment.', 502);
  $j = json_decode($res, true);
  $text = '';
  foreach ($j['content'] ?? [] as $b) if (($b['type'] ?? '') === 'text') $text .= $b['text'];
  if (trim($text) === '') fail('The AI service returned an empty answer.', 502);
  return trim($text);
}

$action = $_GET['action'] ?? '';
$body = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $body = json_decode(file_get_contents('php://input') ?: '[]', true);
  if (!is_array($body)) fail('Bad request.');
}
$empty = ['v' => 0, 'people' => []];
$emptyQ = ['v' => 0, 'items' => []];

// Optional live polls add-on (see ENABLE_POLLS in event.php). polls.php handles its own actions and exits.
$pollsOn = defined('ENABLE_POLLS') && ENABLE_POLLS && is_file(__DIR__ . '/polls.php');
if ($pollsOn && in_array($action, ['poll', 'pvote', 'padmin'], true)) require __DIR__ . '/polls.php';

switch ($action) {

  // ---------- event content (questions, sectors, agenda) ----------
  case 'config': {
    $interests = [];
    foreach (INTERESTS as $k => [$give, $get, $noun]) $interests[] = ['key' => $k, 'give' => $give, 'get' => $get, 'noun' => $noun];
    $agenda = array_map(fn($a) => ['time' => $a[0], 'mins' => $a[1], 'title' => $a[2], 'who' => $a[3], 'qa' => $a[4]], AGENDA);
    $qa = []; foreach (QA_SESSIONS as $k => $label) $qa[] = ['key' => $k, 'label' => $label];
    out(['ok' => true, 'title' => EVENT_TITLE, 'date' => EVENT_DATE, 'interests' => $interests, 'networking' => NETWORKING_LABEL,
         'sectors' => SECTORS, 'agenda' => $agenda, 'qa' => $qa, 'consent' => CONSENT_TEXT, 'reportConsent' => REPORT_CONSENT_TEXT,
         'retention' => RETENTION_TEXT, 'intro' => ['title' => INTRO_TITLE, 'text' => INTRO_TEXT], 'requestDefault' => REQUEST_DEFAULT,
         'polls' => $pollsOn]);
  }

  // ---------- networking map ----------
  case 'list': {
    $d = read_store('people', $empty);
    $since = (int)($_GET['since'] ?? -1);
    if ($since === (int)$d['v']) out(['ok' => true, 'v' => $d['v'], 'unchanged' => true]);
    $people = [];
    foreach ($d['people'] as $id => $p) $people[] = public_person($id, $p);
    out(['ok' => true, 'v' => $d['v'], 'people' => $people, 'ai' => ai_on(), 'title' => EVENT_TITLE]);
  }

  case 'join': {
    limit('join', 12, 600);
    if (empty($body['consent'])) fail('Tick the consent box so others can see your details.');
    $p = [
      'name' => clean($body['name'] ?? '', 60), 'company' => clean($body['company'] ?? '', 80),
      'mobile' => clean_phone($body['mobile'] ?? ''),
      'email' => clean_email($body['email'] ?? ''), 'linkedin' => clean_link($body['linkedin'] ?? ''),
      'hide_mobile' => !empty($body['hide_mobile']), 'report' => !empty($body['report']),
      'role' => clean($body['role'] ?? '', 80), 'work' => clean($body['work'] ?? '', 200),
      'sector' => in_array($body['sector'] ?? '', SECTOR_NAMES, true) ? $body['sector'] : 'Other',
      'interests' => pick_interests($body['interests'] ?? []),
      'speaker' => !empty($body['speaker']),
    ];
    if ($p['name'] === '' || $p['company'] === '') fail('Add your name and organisation.');
    if ($p['mobile'] !== '' && strlen(preg_replace('/\D/', '', $p['mobile'])) < 8) fail('That mobile number looks too short.');
    if (!$p['interests']) fail('Tick at least one reason you are attending.');
    $id = (string)($body['id'] ?? ''); $token = (string)($body['token'] ?? '');
    $res = with_store('people', function (&$d) use ($p, $id, $token) {
      if ($id !== '' && isset($d['people'][$id]) && owns($d['people'][$id], $token)) {
        $d['people'][$id] = array_merge($d['people'][$id], $p, ['at' => time()]);
        $d['v']++; return ['id' => $id, 'token' => $token];
      }
      if (count($d['people']) >= MAX_PEOPLE) return null;
      $newId = bin2hex(random_bytes(6)); $newToken = bin2hex(random_bytes(16));
      $d['people'][$newId] = $p + ['token_hash' => hash('sha256', $newToken), 'at' => time(), 'created' => time()];
      $d['v']++; return ['id' => $newId, 'token' => $newToken];
    }, $empty);
    if ($res === null) fail('The map is full.', 409);
    out(['ok' => true] + $res);
  }

  case 'remove': {
    $id = (string)($body['id'] ?? ''); $token = (string)($body['token'] ?? '');
    $done = with_store('people', function (&$d) use ($id, $token) {
      if (!isset($d['people'][$id]) || !owns($d['people'][$id], $token)) return false;
      unset($d['people'][$id]); $d['v']++; return true;
    }, $empty);
    if ($done) foreach (['contacts', 'declined'] as $f) with_store($f, function (&$c) use ($id) {
      unset($c[$id]); foreach ($c as $k => $to) { unset($c[$k][$id]); if (!$c[$k]) unset($c[$k]); }
    }, []);
    out(['ok' => true, 'removed' => $done]);
  }

  // ---------- connection requests (contact details are swapped only when both agree) ----------
  case 'connect': {
    limit('connect', 40, 600);
    $d = read_store('people', $empty);
    $me = me_or_fail($d, $body);
    $other = (string)($body['other'] ?? '');
    if (!isset($d['people'][$other]) || $other === $me) fail('That person is no longer on the map.', 404);
    $undo = !empty($body['undo']);
    $msg = clean($body['msg'] ?? '', 160);
    with_store('contacts', function (&$c) use ($me, $other, $undo, $msg) {
      if ($undo) { unset($c[$me][$other]); if (empty($c[$me])) unset($c[$me]); }
      elseif (!isset($c[$me][$other])) $c[$me][$other] = ['at' => time(), 'msg' => $msg];
    }, []);
    // Accepting clears an earlier "not now"; cancelling leaves the other person's choice alone.
    if (!$undo) with_store('declined', function (&$x) use ($me, $other) { unset($x[$me][$other]); if (empty($x[$me])) unset($x[$me]); }, []);
    out(['ok' => true]);
  }

  case 'decline': {
    $d = read_store('people', $empty);
    $me = me_or_fail($d, $body);
    $other = (string)($body['other'] ?? '');
    with_store('declined', function (&$x) use ($me, $other) { $x[$me][$other] = time(); }, []);
    out(['ok' => true]);
  }

  case 'contacts': {
    $d = read_store('people', $empty);
    $me = me_or_fail($d, $body);
    $c = read_store('contacts', []);
    $dec = read_store('declined', [])[$me] ?? [];
    $mine = $c[$me] ?? [];
    $incoming = []; $swapped = []; $sent = [];
    foreach ($c as $from => $to) {
      if ($from === $me || !isset($to[$me]) || !isset($d['people'][$from])) continue;
      $p = $d['people'][$from];
      $who = ['id' => $from, 'name' => $p['name'], 'company' => $p['company'], 'role' => $p['role'] ?? ''];
      if (isset($mine[$from])) $swapped[] = $who + ['card' => (object)card($p), 'at' => max(req_at($to[$me]), req_at($mine[$from]))];
      elseif (!isset($dec[$from])) $incoming[] = $who + ['msg' => req_msg($to[$me]), 'at' => req_at($to[$me])];
    }
    $swappedIds = array_column($swapped, 'id');
    foreach ($mine as $to => $r) if (isset($d['people'][$to]) && !in_array($to, $swappedIds, true)) $sent[] = $to;
    usort($swapped, fn($a, $b) => $b['at'] <=> $a['at']);
    out(['ok' => true, 'incoming' => $incoming, 'swapped' => $swapped, 'sent' => $sent,
         'declined' => array_keys($dec), 'card' => (object)card($d['people'][$me])]);
  }

  // ---------- counts unique devices that opened the app (hashed, for the event report) ----------
  case 'hello': {
    $dev = clean($body['device'] ?? '', 64);
    if ($dev === '') out(['ok' => true]);
    $h = substr(hash('sha256', $dev . ADMIN_KEY_HASH), 0, 20);
    with_store('visits', function (&$v) use ($h) { $now = time(); $v[$h] = [($v[$h][0] ?? $now), $now]; }, []);
    out(['ok' => true]);
  }

  // ---------- AI helpers ----------
  case 'icebreaker': {
    if (!ai_on()) fail('AI features are switched off.', 503);
    $d = read_store('people', $empty);
    $id = me_or_fail($d, $body); $other = (string)($body['other'] ?? '');
    if (!isset($d['people'][$other])) fail('That person is no longer on the map.', 404);
    $key = "$id|$other";
    $cache = read_store('icebreakers', []);
    if (isset($cache[$key])) out(['ok' => true] + $cache[$key]);
    limit('ai', 15, 600);
    $a = public_person($id, $d['people'][$id]); $b = public_person($other, $d['people'][$other]);
    foreach ([&$a, &$b] as &$x) { $x['interests'] = interest_words($x['interests']); unset($x['id'], $x['hasMobile']); } unset($x);
    $prompt = "Two people are at a Maltese business conference called \"" . EVENT_TITLE . "\". Write a warm, specific opening line "
      . "person A could use when walking up to person B, plus one sentence on what they could explore together. Plain English, "
      . "no jargon, under 60 words in total. Reply with only JSON: {\"opener\": string, \"explore\": string}.\n"
      . "Person A: " . json_encode($a, JSON_UNESCAPED_UNICODE) . "\nPerson B: " . json_encode($b, JSON_UNESCAPED_UNICODE);
    $text = claude($prompt, 250);
    $j = null;
    if (preg_match('/\{.*\}/s', $text, $m)) $j = json_decode($m[0], true);
    $r = ['opener' => clean($j['opener'] ?? $text, 300), 'explore' => clean($j['explore'] ?? '', 300)];
    with_store('icebreakers', function (&$c) use ($key, $r) { $c[$key] = $r; }, []);
    out(['ok' => true] + $r);
  }

  case 'insight': {
    if (!ai_on()) fail('AI features are switched off.', 503);
    $d = read_store('people', $empty);
    if (count($d['people']) < 3) fail('Wait until at least three people have joined.');
    $c = read_store('insight', []);
    if (($c['v'] ?? -1) === $d['v'] || (time() - ($c['at'] ?? 0)) < INSIGHT_CACHE_S) {
      if (!empty($c['text'])) out(['ok' => true, 'text' => $c['text'], 'cached' => true]);
    }
    limit('insight', 6, 600);
    $rows = [];
    foreach ($d['people'] as $p) $rows[] = '- ' . ($p['sector'] ?? 'Other') . ' | ' . (($p['role'] ?? '') ?: '?') . (!empty($p['speaker']) ? ' | speaker' : '')
      . ' | here for: ' . implode('; ', interest_words($p['interests'] ?? []));
    $prompt = "You are helping the host of an SME conference in Malta (\"" . EVENT_TITLE . "\") read the room from a live networking "
      . "sign-up. Below is one line per attendee (sector | role | why they are attending). Write a short, upbeat summary the host can "
      . "read aloud from the stage: first who is in the room in one sentence, then the two or three clusters or gaps you notice "
      . "(for example many people looking for something few are offering), then the single most promising match-up in the room. "
      . "Under 110 words, plain language, no jargon, no names, no headings or bullet symbols, short paragraphs.\n\n"
      . mb_substr(implode("\n", $rows), 0, 20000);
    $text = claude($prompt, 400);
    with_store('insight', function (&$x) use ($text, $d) { $x = ['text' => $text, 'at' => time(), 'v' => $d['v']]; }, []);
    out(['ok' => true, 'text' => $text]);
  }

  // ---------- audience questions ----------
  case 'ask': {
    limit('ask', 6, 600);
    $s = (string)($body['session'] ?? '');
    if (!isset(QA_SESSIONS[$s])) fail('Choose which session your question is for.');
    $text = clean($body['text'] ?? '', 280);
    if (mb_strlen($text) < 8) fail('Write your question in a few more words.');
    $dev = clean($body['device'] ?? '', 64);
    $q = ['s' => $s, 'text' => $text, 'name' => clean($body['name'] ?? '', 60), 'at' => time(),
          'votes' => $dev !== '' ? [hash('sha256', $dev)] : [], 'hidden' => false, 'answered' => false];
    $qid = with_store('questions', function (&$d) use ($q) {
      if (count($d['items']) >= 1000) return null;
      $id = bin2hex(random_bytes(5)); $d['items'][$id] = $q; $d['v']++; return $id;
    }, $emptyQ);
    if ($qid === null) fail('The question list is full.', 409);
    out(['ok' => true, 'id' => $qid]);
  }

  case 'vote': {
    limit('vote', 60, 600);
    $qid = (string)($body['qid'] ?? ''); $dev = clean($body['device'] ?? '', 64);
    if ($dev === '') fail('Bad request.');
    $h = hash('sha256', $dev);
    $n = with_store('questions', function (&$d) use ($qid, $h) {
      if (!isset($d['items'][$qid]) || $d['items'][$qid]['hidden']) return null;
      $v = &$d['items'][$qid]['votes'];
      if (in_array($h, $v, true)) $v = array_values(array_diff($v, [$h])); else $v[] = $h;
      $d['v']++; return count($v);
    }, $emptyQ);
    if ($n === null) fail('That question is no longer available.', 404);
    out(['ok' => true, 'votes' => $n]);
  }

  case 'questions': {
    $s = (string)($_GET['session'] ?? '');
    $dev = clean($_GET['device'] ?? '', 64); $h = $dev !== '' ? hash('sha256', $dev) : '';
    $d = read_store('questions', $emptyQ);
    $items = [];
    foreach ($d['items'] as $id => $q) {
      if ($q['hidden'] || ($s !== '' && $q['s'] !== $s)) continue;
      $items[] = ['id' => $id, 's' => $q['s'], 'text' => $q['text'], 'name' => $q['name'], 'votes' => count($q['votes']),
                  'mine' => $h !== '' && in_array($h, $q['votes'], true), 'answered' => $q['answered'], 'at' => $q['at']];
    }
    usort($items, fn($a, $b) => [$a['answered'], -$a['votes'], $a['at']] <=> [$b['answered'], -$b['votes'], $b['at']]);
    out(['ok' => true, 'v' => $d['v'], 'items' => $items]);
  }

  // ---------- organiser and host tools (organiser password) ----------
  case 'admin': {
    require_admin($body);
    $op = $body['op'] ?? '';
    if ($op === 'check') out(['ok' => true, 'ai' => ai_on()]);
    if ($op === 'setkey') {
      $k = trim((string)($body['api_key'] ?? ''));
      if ($k !== '' && !preg_match('/^sk-ant-[A-Za-z0-9_\-]{20,}$/', $k)) fail('That does not look like a Claude API key. It should start with sk-ant-.');
      with_store('settings', function (&$st) use ($k) { $st['api_key'] = $k; }, []);
      @unlink(DATA_DIR . '/insight.json');
      out(['ok' => true, 'ai' => $k !== '']);
    }
    if ($op === 'clear') {
      $n = with_store('people', function (&$d) { $n = count($d['people']); $d = ['v' => $d['v'] + 1, 'people' => []]; return $n; }, $empty);
      foreach (['icebreakers', 'insight', 'contacts', 'declined', 'visits'] as $f) @unlink(DATA_DIR . "/$f.json");
      out(['ok' => true, 'deleted' => $n]);
    }
    if ($op === 'export' || $op === 'report') {
      // Event report for Malta Employers. Contact details, and who connected with whom, are only included
      // for people who ticked the optional report box (both people, for a connection).
      $d = read_store('people', $empty); $c = read_store('contacts', []);
      $P = $d['people']; $ok = fn($id) => !empty($P[$id]['report']);
      $sent = []; $recv = []; $pairs = []; $accepted = 0; $pending = 0;
      foreach ($c as $from => $to) foreach ($to as $t => $r) {
        if (!isset($P[$from], $P[$t])) continue;
        $sent[$from] = ($sent[$from] ?? 0) + 1; $recv[$t] = ($recv[$t] ?? 0) + 1;
        $back = $c[$t][$from] ?? null;
        if ($back !== null && strcmp($from, $t) > 0) continue; // count each accepted pair once
        if ($back !== null) $accepted++; else $pending++;
        if ($ok($from) && $ok($t)) $pairs[] = ['from' => $P[$from]['name'] . ' (' . $P[$from]['company'] . ')', 'to' => $P[$t]['name'] . ' (' . $P[$t]['company'] . ')',
          'status' => $back !== null ? 'Connected' : 'Request not answered', 'requested' => date('c', req_at($r)),
          'accepted' => $back !== null ? date('c', max(req_at($r), req_at($back))) : ''];
      }
      $links = [];
      foreach ($c as $from => $to) foreach ($to as $t => $r) if (isset($c[$t][$from], $P[$from], $P[$t])) $links[$from][] = $t;
      $rows = [];
      foreach ($P as $id => $p) {
        $r = public_person($id, $p); $r['interests'] = interest_words($r['interests']); unset($r['id']);
        $r['joined'] = date('c', (int)($p['created'] ?? $p['at'] ?? 0));
        $r['report'] = $ok($id);
        $r['mobile'] = $ok($id) ? ($p['mobile'] ?? '') : ''; $r['email'] = $ok($id) ? ($p['email'] ?? '') : ''; $r['linkedin'] = $ok($id) ? ($p['linkedin'] ?? '') : '';
        $r['requests_sent'] = $sent[$id] ?? 0; $r['requests_received'] = $recv[$id] ?? 0; $r['connections'] = count($links[$id] ?? []);
        $r['connected_with'] = $ok($id) ? implode('; ', array_map(fn($o) => $P[$o]['name'] . ' (' . $P[$o]['company'] . ')', array_filter($links[$id] ?? [], $ok))) : '';
        $rows[] = $r;
      }
      $q = read_store('questions', $emptyQ); $qv = 0; foreach ($q['items'] as $it) $qv += count($it['votes']);
      $pv = 0; $pl = read_store('polls', []); foreach (($pl['votes'] ?? []) as $byDev) $pv += is_array($byDev) ? count($byDev) : 0;
      $stats = ['App opened (unique phones)' => count(read_store('visits', [])), 'Profiles on the map' => count($P),
        'Speakers on the map' => count(array_filter($P, fn($p) => !empty($p['speaker']))), 'Agreed to the event report' => count(array_filter($P, fn($p) => !empty($p['report']))),
        'Connection requests sent' => array_sum($sent), 'Connections made (both agreed)' => $accepted, 'Requests not answered' => $pending,
        'Questions asked' => count($q['items']), 'Question votes' => $qv, 'Poll votes' => $pv];
      out(['ok' => true, 'people' => $rows, 'connections' => $pairs, 'stats' => $stats, 'at' => date('c')]);
    }
    if ($op === 'qall') {
      $d = read_store('questions', $emptyQ); $items = [];
      foreach ($d['items'] as $id => $q) $items[] = ['id' => $id, 's' => $q['s'], 'text' => $q['text'], 'name' => $q['name'],
        'votes' => count($q['votes']), 'hidden' => $q['hidden'], 'answered' => $q['answered'], 'at' => $q['at']];
      usort($items, fn($a, $b) => [$a['answered'], -$a['votes'], $a['at']] <=> [$b['answered'], -$b['votes'], $b['at']]);
      out(['ok' => true, 'v' => $d['v'], 'items' => $items, 'ai' => ai_on()]);
    }
    if ($op === 'qset') {
      $qid = (string)($body['qid'] ?? ''); $field = (string)($body['field'] ?? '');
      if (!in_array($field, ['hidden', 'answered'], true)) fail('Bad request.');
      $ok = with_store('questions', function (&$d) use ($qid, $field) {
        if (!isset($d['items'][$qid])) return false;
        $d['items'][$qid][$field] = !$d['items'][$qid][$field]; $d['v']++; return true;
      }, $emptyQ);
      out(['ok' => $ok]);
    }
    if ($op === 'qsummary') {
      if (!ai_on()) fail('AI features are switched off.', 503);
      $s = (string)($body['session'] ?? '');
      $d = read_store('questions', $emptyQ); $rows = [];
      foreach ($d['items'] as $q) if (!$q['hidden'] && !$q['answered'] && $q['s'] === $s) $rows[] = '- (' . count($q['votes']) . ' votes) ' . $q['text'];
      if (count($rows) < 2) fail('There are not enough open questions for this session yet.');
      $prompt = "You are helping the moderator of a panel at an SME conference in Malta (\"" . EVENT_TITLE . "\"). The session is: "
        . (QA_SESSIONS[$s] ?? '') . ". Below are the open audience questions with their votes. Group similar questions into at most "
        . "four themes. For each theme write one clear, short question the moderator can put to the panel, merging the wording of the "
        . "audience, and say in brackets how many audience questions it covers. Most popular theme first. Plain language, no preamble, "
        . "one theme per line.\n\n" . mb_substr(implode("\n", $rows), 0, 15000);
      out(['ok' => true, 'text' => claude($prompt, 450)]);
    }
    if ($op === 'qclear') {
      $n = with_store('questions', function (&$d) { $n = count($d['items']); $d = ['v' => $d['v'] + 1, 'items' => []]; return $n; }, $emptyQ);
      out(['ok' => true, 'deleted' => $n]);
    }
    fail('Unknown request.');
  }

  default: fail('Unknown request.', 404);
}
