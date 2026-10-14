<?php
namespace App;

/**
 * Autenticación por token (Bearer). El token se entrega una sola vez al cliente
 * y en la base se guarda solo su hash SHA-256.
 */
final class Auth
{
    public static function issueToken(int $userId): string
    {
        $token = bin2hex(random_bytes(32));
        Database::query(
            'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
            [hash('sha256', $token), $userId, time() + (int) Config::get('token_ttl')]
        );
        // Limpieza de sesiones vencidas.
        Database::query('DELETE FROM sessions WHERE expires_at < ?', [time()]);
        return $token;
    }

    public static function tokenFrom(Request $req): ?string
    {
        $header = $req->header('Authorization')
            ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null);
        if ($header && preg_match('/^Bearer\s+([a-f0-9]{64})$/i', trim($header), $m)) {
            return $m[1];
        }
        return null;
    }

    public static function userFrom(Request $req): ?array
    {
        $token = self::tokenFrom($req);
        if (!$token) {
            return null;
        }
        return Database::one(
            'SELECT u.id, u.name, u.email, u.role FROM sessions s
             JOIN users u ON u.id = s.user_id
             WHERE s.token_hash = ? AND s.expires_at > ?',
            [hash('sha256', $token), time()]
        );
    }

    public static function requireUser(Request $req): array
    {
        $user = self::userFrom($req);
        if (!$user) {
            throw new HttpException(401, 'Tu sesión no es válida o expiró. Inicia sesión nuevamente.');
        }
        return $user;
    }

    public static function revoke(Request $req): void
    {
        $token = self::tokenFrom($req);
        if ($token) {
            Database::query('DELETE FROM sessions WHERE token_hash = ?', [hash('sha256', $token)]);
        }
    }

    /** Bloquea el login tras N intentos fallidos en la ventana configurada. */
    public static function assertNotLocked(string $email, string $ip): void
    {
        $since = time() - (int) Config::get('login_window');
        $row = Database::one(
            'SELECT COUNT(*) AS n FROM login_attempts WHERE (email = ? OR ip = ?) AND created_at > ?',
            [$email, $ip, $since]
        );
        if ((int) $row['n'] >= (int) Config::get('login_max_tries')) {
            $min = (int) ceil(Config::get('login_window') / 60);
            throw new HttpException(429, "Demasiados intentos fallidos. Espera {$min} minutos e inténtalo de nuevo.");
        }
    }

    public static function recordFailure(string $email, string $ip): void
    {
        Database::query(
            'INSERT INTO login_attempts (email, ip, created_at) VALUES (?, ?, ?)',
            [$email, $ip, time()]
        );
    }

    public static function clearFailures(string $email, string $ip): void
    {
        Database::query('DELETE FROM login_attempts WHERE email = ? OR ip = ?', [$email, $ip]);
    }
}
