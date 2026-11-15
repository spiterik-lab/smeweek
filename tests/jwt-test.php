<?php
// Offline check of the Google/Microsoft ID-token verification.  Run: php tests/jwt-test.php
define('DATA_DIR', sys_get_temp_dir() . '/smec-jwt-' . getmypid()); mkdir(DATA_DIR);
const PRIVACY_EMAIL = 'x@example.com';
require __DIR__ . '/../lib/crypto.php';
$k = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_RSA, 'private_key_bits' => 2048]);
$d = openssl_pkey_get_details($k)['rsa'];
$url = 'https://example.test/keys';
file_put_contents(DATA_DIR . '/jwks-' . md5($url) . '.json', json_encode(['keys' => [['kty' => 'RSA', 'kid' => 'k1', 'n' => b64u($d['n']), 'e' => b64u($d['e'])]]]));
$mk = function (array $claims, string $kid = 'k1') use ($k) {
  $h = b64u(json_encode(['alg' => 'RS256', 'kid' => $kid])); $p = b64u(json_encode($claims));
  openssl_sign("$h.$p", $sig, $k, OPENSSL_ALGO_SHA256); return "$h.$p." . b64u($sig);
};
$good = $mk(['sub' => '123', 'exp' => time() + 600, 'aud' => 'abc']);
$fails = 0; $t = function ($c, $n) use (&$fails) { if (!$c) { $fails++; echo "FAIL $n\n"; } };
$t((verify_rs256($good, $url)['sub'] ?? null) === '123', 'valid token accepted');
$t(verify_rs256($mk(['sub' => '1', 'exp' => time() - 600]), $url) === null, 'expired token rejected');
$parts = explode('.', $good); $parts[1] = b64u(json_encode(['sub' => 'attacker', 'exp' => time() + 600]));
$t(verify_rs256(implode('.', $parts), $url) === null, 'tampered token rejected');
$t(verify_rs256($mk(['sub' => '1', 'exp' => time() + 600], 'other'), $url) === null, 'unknown key rejected');
$t(verify_rs256(b64u('{"alg":"none"}') . '.' . $parts[1] . '.', $url) === null, 'alg none rejected');
echo $fails ? "$fails failed\n" : "all JWT checks passed\n";
array_map('unlink', glob(DATA_DIR . '/*')); rmdir(DATA_DIR);
