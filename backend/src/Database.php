<?php
namespace App;

use PDO;

/**
 * Conexión única (singleton) a SQLite mediante PDO.
 * Si la base no existe, crea el esquema y carga datos de ejemplo.
 */
final class Database
{
    private static ?PDO $pdo = null;

    public static function get(): PDO
    {
        if (self::$pdo !== null) {
            return self::$pdo;
        }
        $config = Config::all();
        $path   = $config['db_path'];
        $isNew  = !file_exists($path);

        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        $pdo = new PDO('sqlite:' . $path, null, null, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
        $pdo->exec('PRAGMA foreign_keys = ON');
        $pdo->exec('PRAGMA journal_mode = WAL');

        self::$pdo = $pdo;

        if ($isNew) {
            $pdo->exec(file_get_contents(__DIR__ . '/../database/schema.sql'));
            Seeder::run($pdo);
        }
        return $pdo;
    }

    /** Ejecuta una consulta preparada y devuelve el statement. */
    public static function query(string $sql, array $params = []): \PDOStatement
    {
        $stmt = self::get()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    public static function one(string $sql, array $params = []): ?array
    {
        $row = self::query($sql, $params)->fetch();
        return $row === false ? null : $row;
    }

    public static function all(string $sql, array $params = []): array
    {
        return self::query($sql, $params)->fetchAll();
    }

    public static function lastId(): int
    {
        return (int) self::get()->lastInsertId();
    }
}
