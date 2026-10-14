<?php
/**
 * Front controller de Crónica Andina.
 *  - /api/...   -> API REST (JSON)
 *  - archivos   -> se sirven tal cual (imágenes, JS, CSS del build de React)
 *  - otra ruta  -> index.html de React (Single Page Application)
 *
 * Desarrollo:  php -S localhost:8000 -t public public/index.php
 */
declare(strict_types=1);

date_default_timezone_set('America/Lima');

$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// Con el servidor embebido de PHP, deja que sirva los archivos estáticos existentes.
if (PHP_SAPI === 'cli-server' && $uriPath !== '/' && is_file(__DIR__ . $uriPath)) {
    return false;
}

// Rutas que no son de la API: entregar la aplicación React compilada.
if (!str_starts_with($uriPath, '/api')) {
    $spa = __DIR__ . '/index.html';
    if (is_file($spa)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($spa);
    } else {
        http_response_code(200);
        header('Content-Type: text/plain; charset=utf-8');
        echo "API de Crónica Andina activa. Compila el frontend (npm run build) o usa el servidor de Vite en :5173.";
    }
    return;
}

spl_autoload_register(function (string $class): void {
    if (str_starts_with($class, 'App\\')) {
        $file = __DIR__ . '/../src/' . str_replace('\\', '/', substr($class, 4)) . '.php';
        if (is_file($file)) {
            require $file;
        }
    }
});

use App\Config;
use App\Controllers\AdminController;
use App\Controllers\AuthController;
use App\Controllers\CategoryController;
use App\Controllers\CommentController;
use App\Controllers\PostController;
use App\HttpException;
use App\Request;
use App\Response;
use App\Router;

// CORS para el servidor de desarrollo de Vite.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, Config::get('cors_origins'), true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    return;
}

$r = new Router();

// Salud del servicio
$r->get('/api/health', fn () => Response::json(['status' => 'ok', 'time' => date(DATE_ATOM)]));

// Autenticación
$r->post('/api/auth/login', [AuthController::class, 'login']);
$r->get('/api/auth/me', [AuthController::class, 'me'], 'any');
$r->post('/api/auth/logout', [AuthController::class, 'logout'], 'any');

// Público
$r->get('/api/posts', [PostController::class, 'index']);
$r->get('/api/posts/featured', [PostController::class, 'featured']);
$r->get('/api/posts/{slug}', [PostController::class, 'show']);
$r->get('/api/posts/{id}/comments', [CommentController::class, 'index']);
$r->post('/api/posts/{id}/comments', [CommentController::class, 'store']);
$r->get('/api/categories', [CategoryController::class, 'index']);
$r->post('/api/subscribe', [AdminController::class, 'subscribe']);

// Administración (requiere sesión)
$r->get('/api/admin/stats', [AdminController::class, 'stats'], 'any');
$r->get('/api/admin/posts', [PostController::class, 'adminIndex'], 'any');
$r->get('/api/admin/posts/{id}', [PostController::class, 'adminShow'], 'any');
$r->post('/api/admin/posts', [PostController::class, 'store'], 'any');
$r->put('/api/admin/posts/{id}', [PostController::class, 'update'], 'any');
$r->delete('/api/admin/posts/{id}', [PostController::class, 'destroy'], 'any');
$r->post('/api/admin/upload', [AdminController::class, 'upload'], 'any');

$r->get('/api/admin/comments', [CommentController::class, 'adminIndex'], 'any');
$r->put('/api/admin/comments/{id}', [CommentController::class, 'moderate'], 'any');
$r->delete('/api/admin/comments/{id}', [CommentController::class, 'destroy'], 'any');

// Solo administrador
$r->post('/api/admin/categories', [CategoryController::class, 'store'], 'admin');
$r->put('/api/admin/categories/{id}', [CategoryController::class, 'update'], 'admin');
$r->delete('/api/admin/categories/{id}', [CategoryController::class, 'destroy'], 'admin');
$r->get('/api/admin/subscribers', [AdminController::class, 'subscribers'], 'admin');
$r->delete('/api/admin/subscribers/{id}', [AdminController::class, 'deleteSubscriber'], 'admin');
$r->get('/api/admin/users', [AdminController::class, 'users'], 'admin');
$r->post('/api/admin/users', [AdminController::class, 'createUser'], 'admin');
$r->delete('/api/admin/users/{id}', [AdminController::class, 'deleteUser'], 'admin');

try {
    $r->dispatch(Request::capture());
} catch (HttpException $e) {
    Response::json(['error' => $e->getMessage(), 'errors' => (object) $e->errors], $e->getCode());
} catch (\Throwable $e) {
    error_log((string) $e);
    Response::json(['error' => 'Ocurrió un error inesperado. Inténtalo nuevamente en unos minutos.'], 500);
}
