<?php
// ============================================================================
// Web Push (VAPID + RFC 8291 "aes128gcm" payload encryption) and sign-in token
// checks (RS256 ID tokens from Google and Microsoft), using only PHP's openssl.
// No Composer packages, so it deploys on Hostinger by Git push alone.
// ============================================================================
declare(strict_types=1);
if (!defined('DATA_DIR')) exit;

function b64u(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function b64u_dec(string $s): string { return (string)base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4), false); }

/** Uncompressed P-256 point (65 bytes) from an openssl EC key. */
function ec_point($key): string {
  $d = openssl_pkey_get_details($key)['ec'];
  return "\x04" . str_pad($d['x'], 32, "\0", STR_PAD_LEFT) . str_pad($d['y'], 32, "\0", STR_PAD_LEFT);
}
/** PEM public key from an uncompressed P-256 point. */
function p256_pem(string $point): string {
  $der = hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200') . $point;
  return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
}
/** ASN.1 DER ECDSA signature => raw r||s (64 bytes), as JWT ES256 needs. */
function ecdsa_der_to_raw(string $der): string {
  $o = 2; if (ord($der[1]) & 0x80) $o += ord($der[1]) & 0x7f;
  $out = '';
  for ($i = 0; $i < 2; $i++) {
    $len = ord($der[$o + 1]); $v = substr($der, $o + 2, $len); $o += 2 + $len;
    $out .= str_pad(ltrim($v, "\0"), 32, "\0", STR_PAD_LEFT);
  }
  return $out;
}

/** The server's VAPID key pair. Created once and kept in the data folder (never in GitHub). */
function vapid(): array {
  static $v = null; if ($v) return $v;
  $path = DATA_DIR . '/vapid.json';
  if (is_file($path)) { $v = json_decode((string)file_get_contents($path), true); if (!empty($v['pem'])) return $v; }
  $k = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_EC, 'curve_name' => 'prime256v1']);
  if (!$k) return $v = ['pem' => '', 'pub' => ''];
  openssl_pkey_export($k, $pem);
  $v = ['pem' => $pem, 'pub' => b64u(ec_point($k))];
  file_put_contents($path, json_encode($v), LOCK_EX); @chmod($path, 0600);
  return $v;
}
function vapid_auth(string $endpoint): string {
  $u = parse_url($endpoint); $aud = ($u['scheme'] ?? 'https') . '://' . ($u['host'] ?? '') . (isset($u['port']) ? ':' . $u['port'] : '');
  $v = vapid();
  $h = b64u('{"typ":"JWT","alg":"ES256"}');
  $p = b64u(json_encode(['aud' => $aud, 'exp' => time() + 12 * 3600, 'sub' => 'mailto:' . PRIVACY_EMAIL]));
  openssl_sign("$h.$p", $sig, $v['pem'], OPENSSL_ALGO_SHA256);
  return 'vapid t=' . "$h.$p." . b64u(ecdsa_der_to_raw($sig)) . ', k=' . $v['pub'];
}
/** Encrypt a push message for one browser subscription (RFC 8291, aes128gcm). */
function push_encrypt(string $payload, string $p256dh, string $auth): ?string {
  $ua = b64u_dec($p256dh); $secret = b64u_dec($auth);
  if (strlen($ua) !== 65 || strlen($secret) < 16) return null;
  $eph = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_EC, 'curve_name' => 'prime256v1']);
  $peer = openssl_pkey_get_public(p256_pem($ua));
  if (!$eph || !$peer) return null;
  $as = ec_point($eph);
  $shared = openssl_pkey_derive($peer, $eph, 32);
  if ($shared === false) return null;
  $ikm = hash_hkdf('sha256', $shared, 32, "WebPush: info\0" . $ua . $as, $secret);
  $salt = random_bytes(16);
  $cek = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\0", $salt);
  $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\0", $salt);
  $ct = openssl_encrypt($payload . "\x02", 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag);
  if ($ct === false) return null;
  return $salt . pack('N', 4096) . chr(65) . $as . $ct . $tag;
}
/** Only real browser push services may be contacted (stops the server being pointed at other hosts). */
function push_host_ok(string $endpoint): bool {
  $u = parse_url($endpoint); $h = strtolower($u['host'] ?? '');
  if (defined('PUSH_TEST_ENDPOINT') && PUSH_TEST_ENDPOINT !== '' && str_starts_with($endpoint, PUSH_TEST_ENDPOINT)) return true;
  if (($u['scheme'] ?? '') !== 'https') return false;
  foreach (['fcm.googleapis.com', '.push.services.mozilla.com', '.push.apple.com', '.notify.windows.com', '.wns.windows.com'] as $ok)
    if ($h === ltrim($ok, '.') || str_ends_with($h, $ok[0] === '.' ? $ok : '.' . $ok)) return true;
  return false;
}
/**
 * Send one message to many subscriptions at once.
 * $jobs = [[subscription, payload array], ...]. Returns the endpoints that are gone (404/410) so they can be removed.
 */
function push_send(array $jobs): array {
  if (!$jobs || vapid()['pem'] === '') return [];
  $mh = curl_multi_init(); $hs = [];
  foreach ($jobs as [$sub, $payload]) {
    $ep = (string)($sub['endpoint'] ?? '');
    if (!push_host_ok($ep)) continue;
    $body = push_encrypt(json_encode($payload, JSON_UNESCAPED_UNICODE), (string)($sub['p256dh'] ?? ''), (string)($sub['auth'] ?? ''));
    if ($body === null) continue;
    $ch = curl_init($ep);
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6, CURLOPT_CONNECTTIMEOUT => 4,
      CURLOPT_HTTPHEADER => ['Content-Type: application/octet-stream', 'Content-Encoding: aes128gcm', 'TTL: 14400', 'Urgency: high',
        'Authorization: ' . vapid_auth($ep)], CURLOPT_POSTFIELDS => $body]);
    curl_multi_add_handle($mh, $ch); $hs[] = [$ch, $ep];
  }
  do { $st = curl_multi_exec($mh, $running); if ($running) curl_multi_select($mh, 1.0); } while ($running && $st === CURLM_OK);
  $gone = [];
  foreach ($hs as [$ch, $ep]) {
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($code === 404 || $code === 410) $gone[] = $ep;
    curl_multi_remove_handle($mh, $ch); curl_close($ch);
  }
  curl_multi_close($mh);
  return $gone;
}

// ---------- "Sign in with Google / Microsoft": check the ID token the browser hands us ----------
function der_len(int $n): string { if ($n < 128) return chr($n); $b = ltrim(pack('N', $n), "\0"); return chr(0x80 | strlen($b)) . $b; }
function der_uint(string $bin): string { $bin = ltrim($bin, "\0"); if ($bin === '' || (ord($bin[0]) & 0x80)) $bin = "\0" . $bin; return "\x02" . der_len(strlen($bin)) . $bin; }
/** PEM RSA public key from a JWK's modulus and exponent. */
function rsa_pem(string $n, string $e): string {
  $rsa = der_uint(b64u_dec($n)) . der_uint(b64u_dec($e));
  $rsa = "\x30" . der_len(strlen($rsa)) . $rsa;
  $bit = "\x03" . der_len(strlen($rsa) + 1) . "\0" . $rsa;
  $alg = hex2bin('300d06092a864886f70d0101010500');
  $spki = "\x30" . der_len(strlen($alg . $bit)) . $alg . $bit;
  return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($spki), 64, "\n") . "-----END PUBLIC KEY-----\n";
}
function jwks(string $url): array {
  $path = DATA_DIR . '/jwks-' . md5($url) . '.json';
  if (is_file($path) && filemtime($path) > time() - 6 * 3600) { $j = json_decode((string)file_get_contents($path), true); if (!empty($j['keys'])) return $j['keys']; }
  $ch = curl_init($url); curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8]);
  $res = curl_exec($ch); curl_close($ch);
  $j = $res ? json_decode($res, true) : null;
  if (empty($j['keys'])) return [];
  @file_put_contents($path, $res, LOCK_EX);
  return $j['keys'];
}
/** Returns the token's claims if the signature is valid and it has not expired, otherwise null. */
function verify_rs256(string $jwt, string $jwksUrl): ?array {
  $parts = explode('.', $jwt); if (count($parts) !== 3) return null;
  $head = json_decode(b64u_dec($parts[0]), true); $claims = json_decode(b64u_dec($parts[1]), true);
  if (!is_array($head) || !is_array($claims) || ($head['alg'] ?? '') !== 'RS256') return null;
  foreach (jwks($jwksUrl) as $k) {
    if (($k['kid'] ?? '') !== ($head['kid'] ?? '') || ($k['kty'] ?? '') !== 'RSA') continue;
    if (openssl_verify("$parts[0].$parts[1]", b64u_dec($parts[2]), rsa_pem($k['n'], $k['e']), OPENSSL_ALGO_SHA256) !== 1) return null;
    if ((int)($claims['exp'] ?? 0) < time() - 60) return null;
    return $claims;
  }
  return null;
}
