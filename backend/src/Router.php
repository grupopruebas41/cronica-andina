<?php
namespace App;

/**
 * Enrutador mínimo: asocia método + patrón (con parámetros {id}) a un manejador.
 * Permite marcar rutas que requieren autenticación o un rol concreto.
 */
final class Router
{
    /** @var array<int, array{method:string, regex:string, keys:array, handler:callable, auth:?string}> */
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler, ?string $auth = null): void
    {
        preg_match_all('/\{(\w+)\}/', $pattern, $m);
        $regex = '#^' . preg_replace('/\{(\w+)\}/', '([^/]+)', $pattern) . '$#';
        $this->routes[] = [
            'method'  => $method,
            'regex'   => $regex,
            'keys'    => $m[1],
            'handler' => $handler,
            'auth'    => $auth, // null = público, 'any' = cualquier usuario, 'admin' = solo admin
        ];
    }

    public function get(string $p, callable $h, ?string $a = null): void    { $this->add('GET', $p, $h, $a); }
    public function post(string $p, callable $h, ?string $a = null): void   { $this->add('POST', $p, $h, $a); }
    public function put(string $p, callable $h, ?string $a = null): void    { $this->add('PUT', $p, $h, $a); }
    public function delete(string $p, callable $h, ?string $a = null): void { $this->add('DELETE', $p, $h, $a); }

    public function dispatch(Request $req): void
    {
        $pathMatched = false;
        foreach ($this->routes as $route) {
            if (!preg_match($route['regex'], $req->path, $matches)) {
                continue;
            }
            $pathMatched = true;
            if ($route['method'] !== $req->method) {
                continue;
            }
            array_shift($matches);
            $req->params = array_combine($route['keys'], array_map('urldecode', $matches)) ?: [];

            if ($route['auth'] !== null) {
                $req->user = Auth::requireUser($req);
                if ($route['auth'] === 'admin' && $req->user['role'] !== 'admin') {
                    throw new HttpException(403, 'No tienes permisos para realizar esta acción.');
                }
            }
            ($route['handler'])($req);
            return;
        }
        if ($pathMatched) {
            throw new HttpException(405, 'Método no permitido.');
        }
        throw new HttpException(404, 'Recurso no encontrado.');
    }
}
