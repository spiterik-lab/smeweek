<?php
declare(strict_types=1);
require __DIR__ . '/config.php';

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
const SECTORS = ["Tourism & hospitality","Gaming & digital entertainment","Shipping & maritime","Blue & green economy",
  "Financial services","Aviation & manufacturing","Retail & trade","Professional services","Tech & IT",
  "Public bodies & support","Education & training","Other"];
const TOPICS = ["AI know-how","Automation","Data & analytics","Cybersecurity","Digital marketing","Software development",
  "Funding & grants","Investment","Training & upskilling","Recruitment & talent","Legal & compliance",
  "Export & new markets","Clients & customers","Suppliers & partners","Sustainability / ESG","Mentoring"];

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
function pick_list(mixed $v, array $allowed): array {
  if (!is_array($v)) return [];
  return array_values(array_slice(array_unique(array_filter($v, fn($x) => is_string($x) && in_array($x, $allowed, true))), 0, 3));
}
function public_person(string $id, array $p): array {
  return ['id' => $id, 'name' => $p['name'], 'company' => $p['company'], 'role' => $p['role'], 'sector' => $p['sector'],
          'offer' => $p['offer'], 'need' => $p['need'], 'work' => $p['work']];
}
function owns(array $p, string $token): bool { return $token !== '' && hash_equals($p['token_hash'], hash('sha256', $token)); }

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

switch ($action) {

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
      'role' => clean($body['role'] ?? '', 80), 'work' => clean($body['work'] ?? '', 200),
      'sector' => in_array($body['sector'] ?? '', SECTORS, true) ? $body['sector'] : '',
      'offer' => pick_list($body['offer'] ?? [], TOPICS), 'need' => pick_list($body['need'] ?? [], TOPICS),
    ];
    if ($p['name'] === '' || $p['company'] === '' || $p['sector'] === '') fail('Add your name, organisation and sector.');
    if (!$p['offer'] || !$p['need']) fail("Pick at least one thing you can offer and one you're looking for.");
    $id = (string)($body['id'] ?? ''); $token = (string)($body['token'] ?? '');
    $res = with_store('people', function (&$d) use ($p, $id, $token) {
      if ($id !== '' && isset($d['people'][$id]) && owns($d['people'][$id], $token)) {
        $d['people'][$id] = array_merge($d['people'][$id], $p, ['at' => time()]);
        $d['v']++; return ['id' => $id, 'token' => $token];
      }
      if (count($d['people']) >= MAX_PEOPLE) return null;
      $newId = bin2hex(random_bytes(6)); $newToken = bin2hex(random_bytes(16));
      $d['people'][$newId] = $p + ['token_hash' => hash('sha256', $newToken), 'at' => time()];
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
    out(['ok' => true, 'removed' => $done]);
  }

  case 'icebreaker': {
    if (!ai_on()) fail('AI features are switched off.', 503);
    $id = (string)($body['id'] ?? ''); $token = (string)($body['token'] ?? ''); $other = (string)($body['other'] ?? '');
    $d = read_store('people', $empty);
    if (!isset($d['people'][$id]) || !owns($d['people'][$id], $token)) fail('Add yourself to the map first.', 403);
    if (!isset($d['people'][$other])) fail('That person is no longer on the map.', 404);
    $key = "$id|$other";
    $cache = read_store('icebreakers', []);
    if (isset($cache[$key])) out(['ok' => true] + $cache[$key]);
    limit('ai', 15, 600);
    $a = public_person($id, $d['people'][$id]); $b = public_person($other, $d['people'][$other]);
    unset($a['id'], $b['id']);
    $prompt = "Two people are at a Maltese business conference called \"" . EVENT_TITLE . "\". Write a warm, specific opening line "
      . "person A could use when walking up to person B, plus one sentence on what they could explore together. Plain English, "
      . "no jargon, under 60 words in total. Reply with only JSON: {\"opener\": string, \"explore\": string}.\n"
      . "Person A: " . json_encode($a, JSON_UNESCAPED_UNICODE) . "\nPerson B: " . json_encode($b, JSON_UNESCAPED_UNICODE);
    $text = claude($prompt, 250);
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
    foreach ($d['people'] as $p) $rows[] = "- {$p['sector']} | " . ($p['role'] ?: '?') . ' | offers: ' . implode(', ', $p['offer']) . ' | looking for: ' . implode(', ', $p['need']);
    $prompt = "You are helping the host of an SME conference in Malta (\"" . EVENT_TITLE . "\") read the room from a live networking "
      . "sign-up. Below is one line per attendee (sector | role | offers | looking for). Write a short, upbeat summary the host can "
      . "read aloud from the stage: first who is in the room in one sentence, then the two or three clusters or gaps you notice, "
      . "then the single most promising cross-sector collaboration. Under 110 words, plain language, no jargon, no names, no "
      . "headings or bullet symbols, short paragraphs.\n\n" . mb_substr(implode("\n", $rows), 0, 20000);
    $text = claude($prompt, 400);
    with_store('insight', function (&$x) use ($text, $d) { $x = ['text' => $text, 'at' => time(), 'v' => $d['v']]; }, []);
    out(['ok' => true, 'text' => $text]);
  }

  case 'admin': {
    limit('admin', 10, 600);
    if (!hash_equals(ADMIN_KEY_HASH, hash('sha256', (string)($body['key'] ?? '')))) fail('Wrong organiser password.', 403);
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
      foreach (['icebreakers', 'insight'] as $f) @unlink(DATA_DIR . "/$f.json");
      out(['ok' => true, 'deleted' => $n]);
    }
    if ($op === 'export') {
      $d = read_store('people', $empty); $rows = [];
      foreach ($d['people'] as $id => $p) $rows[] = public_person($id, $p);
      out(['ok' => true, 'people' => $rows]);
    }
    fail('Unknown request.');
  }

  default: fail('Unknown request.', 404);
}
