<?php
namespace App\Controllers;

use App\Auth;
use App\Database;
use App\HttpException;
use App\Request;
use App\Response;
use App\Validator;

final class AuthController
{
    public static function login(Request $req): void
    {
        $data = $req->body();
        Validator::check($data, ['email' => 'required|email', 'password' => 'required']);
        $email = mb_strtolower(trim($data['email']));
        Auth::assertNotLocked($email, $req->ip());

        $user = Database::one('SELECT * FROM users WHERE email = ?', [$email]);
        if (!$user || !password_verify((string) $data['password'], $user['password_hash'])) {
            Auth::recordFailure($email, $req->ip());
            // Mensaje genérico: no revela si el correo existe.
            throw new HttpException(401, 'Correo o contraseña incorrectos.');
        }
        Auth::clearFailures($email, $req->ip());
        Response::json([
            'token' => Auth::issueToken((int) $user['id']),
            'user'  => ['id' => (int) $user['id'], 'name' => $user['name'], 'email' => $user['email'], 'role' => $user['role']],
        ]);
    }

    public static function me(Request $req): void
    {
        Response::json($req->user);
    }

    public static function logout(Request $req): void
    {
        Auth::revoke($req);
        Response::noContent();
    }
}
