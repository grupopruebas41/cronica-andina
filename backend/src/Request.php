<?php
namespace App;

/** Envoltorio simple de la petición HTTP actual. */
final class Request
{
    private ?array $json = null;

    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        public array $params = [],
        public ?array $user = null
    ) {
    }

    public static function capture(): self
    {
        $uri  = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $path = '/' . trim($uri, '/');
        return new self(strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'), $path, $_GET);
    }

    /** Cuerpo JSON decodificado (o arreglo vacío). */
    public function body(): array
    {
        if ($this->json === null) {
            $raw = file_get_contents('php://input') ?: '';
            $data = json_decode($raw, true);
            $this->json = is_array($data) ? $data : [];
        }
        return $this->json;
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body()[$key] ?? $default;
    }

    public function header(string $name): ?string
    {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        return $_SERVER[$key] ?? null;
    }

    public function ip(): string
    {
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}
