<?php
namespace App;

final class Config
{
    private static ?array $values = null;

    public static function all(): array
    {
        if (self::$values === null) {
            self::$values = require __DIR__ . '/../config.php';
        }
        return self::$values;
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return self::all()[$key] ?? $default;
    }
}
