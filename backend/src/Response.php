<?php
namespace App;

/** Utilidades para emitir respuestas JSON. */
final class Response
{
    /**
     * Envía JSON. Para GET públicos se calcula un ETag y se responde 304
     * si el cliente ya tiene la misma versión (ahorro de datos y batería).
     */
    public static function json(mixed $data, int $status = 200, bool $cacheable = false): void
    {
        $body = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');

        if ($cacheable && $status === 200) {
            $etag = '"' . md5($body) . '"';
            header('ETag: ' . $etag);
            header('Cache-Control: public, max-age=30, must-revalidate');
            if (trim($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
                http_response_code(304);
                return;
            }
        } else {
            header('Cache-Control: no-store');
        }

        // Compresión gzip si el cliente la acepta y la respuesta es grande.
        $accept = $_SERVER['HTTP_ACCEPT_ENCODING'] ?? '';
        if (strlen($body) > 1024 && str_contains($accept, 'gzip') && function_exists('gzencode')) {
            header('Content-Encoding: gzip');
            header('Vary: Accept-Encoding');
            $body = gzencode($body, 6);
        }
        echo $body;
    }

    public static function noContent(): void
    {
        http_response_code(204);
    }
}
