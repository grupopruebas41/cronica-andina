<?php
/**
 * Pruebas automatizadas de la API (integración / caja negra).
 * No requiere librerías: levanta el servidor embebido de PHP con una base temporal,
 * ejecuta cada caso de prueba (CP-xx del plan de pruebas) y guarda los resultados.
 *
 *   php tests/ApiTest.php
 */
declare(strict_types=1);
date_default_timezone_set('America/Lima');

$root   = dirname(__DIR__);
$port   = 8765;
$base   = "http://127.0.0.1:{$port}";
$dbFile = sys_get_temp_dir() . '/cronica_test_' . getmypid() . '.sqlite';
@unlink($dbFile);

// Se lanza el servidor sin shell (funciona en Windows/XAMPP, Linux y macOS).
$devNull = PHP_OS_FAMILY === 'Windows' ? 'NUL' : '/dev/null';
$proc = proc_open(
    [PHP_BINARY, '-S', "127.0.0.1:{$port}", '-t', "$root/public", "$root/public/index.php"],
    [1 => ['file', $devNull, 'w'], 2 => ['file', $devNull, 'w']],
    $pipes, null, ['CA_DB_PATH' => $dbFile] + getenv()
);
register_shutdown_function(function () use ($proc, $dbFile) {
    proc_terminate($proc);
    proc_close($proc);
    foreach (glob($dbFile . '*') ?: [] as $f) { @unlink($f); }
});
for ($i = 0; $i < 50 && !@file_get_contents("$base/api/health"); $i++) {
    usleep(100_000);
}

// ---------------------------------------------------------------- utilidades
function http(string $method, string $path, ?array $body = null, ?string $token = null, array $headers = []): array
{
    global $base;
    $h = array_merge(['Accept: application/json'], $headers);
    if ($body !== null) { $h[] = 'Content-Type: application/json'; }
    if ($token) { $h[] = 'Authorization: Bearer ' . $token; }
    $ctx = stream_context_create(['http' => [
        'method' => $method, 'header' => implode("\r\n", $h),
        'content' => $body !== null ? json_encode($body) : null, 'ignore_errors' => true,
    ]]);
    $t0  = microtime(true);
    $raw = file_get_contents($base . $path, false, $ctx);
    $ms  = (microtime(true) - $t0) * 1000;
    preg_match('#HTTP/\S+ (\d+)#', $http_response_header[0] ?? '', $m);
    $resHeaders = [];
    foreach ($http_response_header as $line) {
        if (str_contains($line, ':')) {
            [$k, $v] = explode(':', $line, 2);
            $resHeaders[strtolower(trim($k))] = trim($v);
        }
    }
    return ['status' => (int) ($m[1] ?? 0), 'json' => json_decode((string) $raw, true), 'raw' => $raw, 'headers' => $resHeaders, 'ms' => $ms];
}

$results = [];
function test(string $id, string $name, callable $fn): void
{
    global $results;
    $t0 = microtime(true);
    try {
        $fn();
        $results[] = ['id' => $id, 'name' => $name, 'ok' => true, 'ms' => round((microtime(true) - $t0) * 1000, 1)];
        echo "  \033[32m✔\033[0m {$id} {$name}\n";
    } catch (Throwable $e) {
        $results[] = ['id' => $id, 'name' => $name, 'ok' => false, 'error' => $e->getMessage(), 'ms' => round((microtime(true) - $t0) * 1000, 1)];
        echo "  \033[31m✘\033[0m {$id} {$name}\n      → {$e->getMessage()}\n";
    }
}
function check(bool $cond, string $msg): void
{
    if (!$cond) { throw new RuntimeException($msg); }
}
function eq(mixed $expected, mixed $actual, string $what): void
{
    check($expected === $actual, "{$what}: se esperaba " . var_export($expected, true) . ', se obtuvo ' . var_export($actual, true));
}

$validPost = [
    'title' => 'Prueba automatizada de publicación', 'excerpt' => 'Resumen de prueba con más de veinte caracteres.',
    'content' => str_repeat('Contenido de prueba para validar la creación de noticias. ', 3),
    'status' => 'draft', 'category_id' => 1,
];

echo "\nPruebas de la API — Crónica Andina\n\n";

// ---------------------------------------------------------------- casos
test('CP-01', 'El servicio responde (health check)', function () {
    $r = http('GET', '/api/health');
    eq(200, $r['status'], 'código');
    eq('ok', $r['json']['status'], 'estado');
});

test('CP-02', 'El listado público muestra solo noticias publicadas', function () {
    $r = http('GET', '/api/posts?per_page=30');
    eq(200, $r['status'], 'código');
    eq(8, $r['json']['meta']['total'], 'total publicadas');
    foreach ($r['json']['data'] as $p) { eq('published', $p['status'], "estado de {$p['slug']}"); }
});

test('CP-03', 'La paginación calcula páginas y respeta el límite', function () {
    $r = http('GET', '/api/posts?per_page=3&page=2');
    eq(3, count($r['json']['data']), 'elementos en la página');
    eq(3, $r['json']['meta']['total_pages'], 'total de páginas');
    $r = http('GET', '/api/posts?per_page=999');
    eq(30, $r['json']['meta']['per_page'], 'límite máximo por página');
});

test('CP-04', 'La búsqueda encuentra noticias por palabra', function () {
    $r = http('GET', '/api/posts?q=' . urlencode('robótica'));
    eq(1, $r['json']['meta']['total'], 'resultados');
});

test('CP-05', 'El filtro por categoría devuelve solo esa sección', function () {
    $r = http('GET', '/api/posts?category=tecnologia');
    eq(2, $r['json']['meta']['total'], 'resultados');
    foreach ($r['json']['data'] as $p) { eq('tecnologia', $p['category']['slug'], 'categoría'); }
});

test('CP-06', 'El detalle de una noticia incrementa sus lecturas', function () {
    $slug = 'el-equipo-juvenil-gana-el-torneo-regional-de-futbol-sub-17';
    $a = http('GET', "/api/posts/{$slug}");
    $b = http('GET', "/api/posts/{$slug}");
    eq(200, $a['status'], 'código');
    check(isset($a['json']['content']), 'el detalle incluye el contenido');
    eq($a['json']['views'] + 1, $b['json']['views'], 'lecturas');
});

test('CP-07', 'Una noticia inexistente devuelve 404 con mensaje claro', function () {
    $r = http('GET', '/api/posts/no-existe');
    eq(404, $r['status'], 'código');
    check(str_contains($r['json']['error'], 'no existe'), 'mensaje en español');
});

test('CP-08', 'Un borrador no es visible en el sitio público', function () {
    $r = http('GET', '/api/posts/borrador-balance-de-lluvias-de-la-temporada');
    eq(404, $r['status'], 'código');
});

$adminToken = null;
$editorToken = null;
test('CP-09', 'Inicio de sesión con credenciales válidas', function () use (&$adminToken, &$editorToken) {
    $r = http('POST', '/api/auth/login', ['email' => 'admin@cronica.pe', 'password' => 'Admin2026']);
    eq(200, $r['status'], 'código');
    check(strlen($r['json']['token']) === 64, 'token de 64 caracteres');
    eq('admin', $r['json']['user']['role'], 'rol');
    $adminToken = $r['json']['token'];
    $editorToken = http('POST', '/api/auth/login', ['email' => 'editor@cronica.pe', 'password' => 'Editor2026'])['json']['token'];
});

test('CP-10', 'Contraseña incorrecta: 401 con mensaje genérico', function () {
    $r = http('POST', '/api/auth/login', ['email' => 'admin@cronica.pe', 'password' => 'mala']);
    eq(401, $r['status'], 'código');
    eq('Correo o contraseña incorrectos.', $r['json']['error'], 'mensaje');
    http('POST', '/api/auth/login', ['email' => 'admin@cronica.pe', 'password' => 'Admin2026']); // limpia intentos
});

test('CP-11', 'Las rutas de administración exigen sesión', function () {
    eq(401, http('GET', '/api/admin/stats')['status'], 'sin token');
    eq(401, http('GET', '/api/admin/stats', null, str_repeat('a', 64))['status'], 'token falso');
});

$newId = null;
test('CP-12', 'Crear noticia válida (201) con slug automático', function () use (&$newId, &$adminToken, $validPost) {
    $r = http('POST', '/api/admin/posts', $validPost, $adminToken);
    eq(201, $r['status'], 'código');
    eq('prueba-automatizada-de-publicacion', $r['json']['slug'], 'slug');
    $newId = $r['json']['id'];
    $r2 = http('POST', '/api/admin/posts', $validPost, $adminToken);
    eq('prueba-automatizada-de-publicacion-2', $r2['json']['slug'], 'slug único');
});

test('CP-13', 'Validación: datos inválidos devuelven 422 con error por campo', function () use (&$adminToken) {
    $r = http('POST', '/api/admin/posts', ['title' => 'Hola', 'excerpt' => '', 'content' => 'corto', 'status' => 'otro', 'category_id' => 1], $adminToken);
    eq(422, $r['status'], 'código');
    foreach (['title', 'excerpt', 'content', 'status'] as $f) {
        check(isset($r['json']['errors'][$f]), "falta error para {$f}");
    }
});

test('CP-14', 'Accesibilidad: imagen sin texto alternativo es rechazada', function () use (&$adminToken, $validPost) {
    $r = http('POST', '/api/admin/posts', $validPost + ['image_url' => '/img/post-1.svg', 'image_alt' => ''], $adminToken);
    eq(422, $r['status'], 'código');
    check(isset($r['json']['errors']['image_alt']), 'error en image_alt');
});

test('CP-15', 'Seguridad: se eliminan etiquetas HTML (XSS)', function () use (&$adminToken, $validPost) {
    $r = http('POST', '/api/admin/posts', array_merge($validPost, ['title' => '<script>alert(1)</script>Título seguro']), $adminToken);
    eq(201, $r['status'], 'código');
    check(!str_contains($r['json']['title'], '<script>'), 'el título no contiene <script>');
});

test('CP-16', 'Publicar un borrador lo muestra en el sitio público', function () use (&$newId, &$adminToken, $validPost) {
    $r = http('PUT', "/api/admin/posts/{$newId}", array_merge($validPost, ['status' => 'published']), $adminToken);
    eq(200, $r['status'], 'código');
    check($r['json']['published_at'] !== null, 'tiene fecha de publicación');
    eq(200, http('GET', '/api/posts/prueba-automatizada-de-publicacion')['status'], 'visible en público');
});

test('CP-17', 'Permisos: un editor no puede editar noticias ajenas', function () use (&$newId, &$editorToken, $validPost) {
    eq(403, http('PUT', "/api/admin/posts/{$newId}", $validPost, $editorToken)['status'], 'editar');
    eq(403, http('DELETE', "/api/admin/posts/{$newId}", null, $editorToken)['status'], 'eliminar');
});

test('CP-18', 'Permisos: un editor no puede gestionar categorías ni usuarios', function () use (&$editorToken) {
    eq(403, http('POST', '/api/admin/categories', ['name' => 'Nueva'], $editorToken)['status'], 'categorías');
    eq(403, http('GET', '/api/admin/users', null, $editorToken)['status'], 'usuarios');
});

$commentId = null;
test('CP-19', 'Comentario válido queda pendiente y no se publica aún', function () use (&$commentId) {
    $r = http('POST', '/api/posts/1/comments', ['author' => 'Ana', 'email' => 'ana@correo.com', 'body' => 'Muy útil la nota.']);
    eq(201, $r['status'], 'código');
    eq('pending', $r['json']['status'], 'estado');
    $commentId = $r['json']['id'];
    $list = http('GET', '/api/posts/1/comments')['json'];
    check(!in_array($commentId, array_column($list, 'id'), true), 'no aparece antes de aprobar');
});

test('CP-20', 'Comentario con correo inválido es rechazado (422)', function () {
    $r = http('POST', '/api/posts/1/comments', ['author' => 'Ana', 'email' => 'ana@', 'body' => 'Hola']);
    eq(422, $r['status'], 'código');
    check(str_contains($r['json']['errors']['email'], 'nombre@correo.com'), 'mensaje con ejemplo');
});

test('CP-21', 'Anti-spam: el campo trampa bloquea bots', function () {
    $r = http('POST', '/api/posts/1/comments', ['author' => 'Bot', 'email' => 'bot@spam.com', 'body' => 'Compra ya', 'website' => 'http://spam']);
    eq(422, $r['status'], 'código');
});

test('CP-22', 'Moderación: un comentario aprobado se vuelve visible', function () use (&$commentId, &$editorToken) {
    eq(200, http('PUT', "/api/admin/comments/{$commentId}", ['status' => 'approved'], $editorToken)['status'], 'aprobar');
    $list = http('GET', '/api/posts/1/comments')['json'];
    check(in_array($commentId, array_column($list, 'id'), true), 'aparece tras aprobar');
});

test('CP-23', 'Suscripción al boletín y control de duplicados', function () {
    eq(201, http('POST', '/api/subscribe', ['email' => 'nuevo@correo.com'])['status'], 'alta');
    eq(409, http('POST', '/api/subscribe', ['email' => 'NUEVO@correo.com'])['status'], 'duplicado');
    eq(422, http('POST', '/api/subscribe', ['email' => 'sin-arroba'])['status'], 'inválido');
});

test('CP-24', 'Integridad: no se elimina una categoría con noticias', function () use (&$adminToken) {
    $r = http('DELETE', '/api/admin/categories/1', null, $adminToken);
    eq(409, $r['status'], 'código');
    $c = http('POST', '/api/admin/categories', ['name' => 'Opinión', 'description' => 'Columnas'], $adminToken);
    eq(201, $c['status'], 'crear');
    eq(204, http('DELETE', "/api/admin/categories/{$c['json']['id']}", null, $adminToken)['status'], 'eliminar vacía');
});

test('CP-25', 'Seguridad: inyección SQL en la búsqueda no altera la consulta', function () {
    $r = http('GET', '/api/posts?q=' . urlencode("' OR 1=1 --"));
    eq(200, $r['status'], 'código');
    eq(0, $r['json']['meta']['total'], 'resultados');
});

test('CP-26', 'Eficiencia: caché con ETag responde 304 sin cuerpo', function () {
    $a = http('GET', '/api/categories');
    check(isset($a['headers']['etag']), 'cabecera ETag');
    $b = http('GET', '/api/categories', null, null, ['If-None-Match: ' . $a['headers']['etag']]);
    eq(304, $b['status'], 'código');
    eq('', (string) $b['raw'], 'cuerpo vacío');
});

test('CP-27', 'Eficiencia: respuestas grandes comprimidas con gzip', function () {
    $r = http('GET', '/api/posts?per_page=30', null, null, ['Accept-Encoding: gzip']);
    eq('gzip', $r['headers']['content-encoding'] ?? null, 'Content-Encoding');
    $plain = strlen(gzdecode($r['raw']));
    check(strlen($r['raw']) < $plain * 0.5, 'reduce más del 50 % (' . strlen($r['raw']) . " de {$plain} bytes)");
});

$perf = [];
test('CP-28', 'Rendimiento: el listado responde en menos de 500 ms (promedio de 20)', function () use (&$perf) {
    $times = [];
    for ($i = 0; $i < 20; $i++) { $times[] = http('GET', '/api/posts?page=' . ($i % 2 + 1))['ms']; }
    sort($times);
    $perf = ['avg_ms' => round(array_sum($times) / count($times), 1), 'p95_ms' => round($times[18], 1), 'max_ms' => round(max($times), 1)];
    check($perf['avg_ms'] < 500, "promedio {$perf['avg_ms']} ms");
});

test('CP-29', 'Cerrar sesión invalida el token', function () use (&$editorToken) {
    eq(204, http('POST', '/api/auth/logout', null, $editorToken)['status'], 'logout');
    eq(401, http('GET', '/api/auth/me', null, $editorToken)['status'], 'token revocado');
});

test('CP-30', 'Seguridad: bloqueo tras 5 intentos fallidos de inicio de sesión', function () {
    for ($i = 0; $i < 5; $i++) {
        http('POST', '/api/auth/login', ['email' => 'editor@cronica.pe', 'password' => 'x' . $i]);
    }
    $r = http('POST', '/api/auth/login', ['email' => 'editor@cronica.pe', 'password' => 'Editor2026']);
    eq(429, $r['status'], 'código');
});

// ---------------------------------------------------------------- resumen
$ok = count(array_filter($results, fn ($r) => $r['ok']));
$total = count($results);
echo "\n{$ok} de {$total} pruebas aprobadas (" . round($ok / $total * 100, 1) . " %)\n";
echo "Tiempo de respuesta del listado: promedio {$perf['avg_ms']} ms, p95 {$perf['p95_ms']} ms\n\n";

@mkdir(__DIR__ . '/results', 0775, true);
file_put_contents(__DIR__ . '/results/api-results.json', json_encode([
    'date' => date('Y-m-d H:i:s'), 'php' => PHP_VERSION, 'passed' => $ok, 'total' => $total,
    'performance' => $perf, 'cases' => $results,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

exit($ok === $total ? 0 : 1);
