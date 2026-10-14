<?php
namespace App\Controllers;

use App\Config;
use App\Database;
use App\HttpException;
use App\Request;
use App\Response;
use App\Util;
use App\Validator;

final class AdminController
{
    /** Indicadores del panel. */
    public static function stats(Request $req): void
    {
        $n = fn (string $sql) => (int) Database::one($sql)['n'];
        Response::json([
            'posts_published'  => $n("SELECT COUNT(*) AS n FROM posts WHERE status = 'published'"),
            'posts_draft'      => $n("SELECT COUNT(*) AS n FROM posts WHERE status = 'draft'"),
            'comments_pending' => $n("SELECT COUNT(*) AS n FROM comments WHERE status = 'pending'"),
            'subscribers'      => $n('SELECT COUNT(*) AS n FROM subscribers'),
            'total_views'      => $n('SELECT COALESCE(SUM(views), 0) AS n FROM posts'),
            'by_category'      => Database::all(
                "SELECT c.name, COUNT(p.id) AS posts, COALESCE(SUM(p.views), 0) AS views
                 FROM categories c LEFT JOIN posts p ON p.category_id = c.id AND p.status = 'published'
                 GROUP BY c.id ORDER BY views DESC"
            ),
            'top_posts'        => Database::all(
                "SELECT id, title, slug, views FROM posts WHERE status = 'published' ORDER BY views DESC LIMIT 5"
            ),
        ]);
    }

    // ---------- Suscriptores ----------

    public static function subscribe(Request $req): void
    {
        $data = $req->body();
        Validator::check($data, ['email' => 'required|email|max:120']);
        $email = mb_strtolower(trim($data['email']));
        if (Database::one('SELECT id FROM subscribers WHERE email = ?', [$email])) {
            throw new HttpException(409, 'Este correo ya está suscrito al boletín.');
        }
        Database::query('INSERT INTO subscribers (email, created_at) VALUES (?, ?)', [$email, date('Y-m-d H:i:s')]);
        Response::json(['message' => '¡Listo! Te enviaremos las noticias más importantes cada semana.'], 201);
    }

    public static function subscribers(Request $req): void
    {
        Response::json(Database::all('SELECT * FROM subscribers ORDER BY created_at DESC'));
    }

    public static function deleteSubscriber(Request $req): void
    {
        Database::query('DELETE FROM subscribers WHERE id = ?', [(int) $req->params['id']]);
        Response::noContent();
    }

    // ---------- Usuarios (solo admin) ----------

    public static function users(Request $req): void
    {
        Response::json(Database::all(
            'SELECT u.id, u.name, u.email, u.role, u.created_at,
                    (SELECT COUNT(*) FROM posts p WHERE p.author_id = u.id) AS post_count
             FROM users u ORDER BY u.name'
        ));
    }

    public static function createUser(Request $req): void
    {
        $data = $req->body();
        Validator::check($data, [
            'name'     => 'required|min:3|max:60',
            'email'    => 'required|email|max:120',
            'password' => 'required|strong',
            'role'     => 'required|in:admin,editor',
        ]);
        $email = mb_strtolower(trim($data['email']));
        if (Database::one('SELECT id FROM users WHERE email = ?', [$email])) {
            throw new HttpException(422, 'Revisa los campos marcados.', ['email' => 'Ya existe un usuario con ese correo.']);
        }
        Database::query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [Util::clean($data['name']), $email, password_hash($data['password'], PASSWORD_DEFAULT), $data['role']]);
        Response::json(['id' => Database::lastId(), 'name' => $data['name'], 'email' => $email, 'role' => $data['role']], 201);
    }

    public static function deleteUser(Request $req): void
    {
        $id = (int) $req->params['id'];
        if ($id === (int) $req->user['id']) {
            throw new HttpException(409, 'No puedes eliminar tu propia cuenta mientras estás conectado.');
        }
        Database::query('DELETE FROM users WHERE id = ?', [$id]);
        Response::noContent();
    }

    // ---------- Subida de imágenes ----------

    public static function upload(Request $req): void
    {
        $file = $_FILES['image'] ?? null;
        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            throw new HttpException(422, 'Selecciona una imagen para subir.');
        }
        $maxBytes = (int) Config::get('upload_max_mb') * 1024 * 1024;
        if ($file['size'] > $maxBytes) {
            throw new HttpException(413, 'La imagen pesa más de ' . Config::get('upload_max_mb') . ' MB. Redúcela para que la página cargue rápido.');
        }
        $info    = @getimagesize($file['tmp_name']);
        $allowed = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp', IMAGETYPE_GIF => 'gif'];
        if (!$info || !isset($allowed[$info[2]])) {
            throw new HttpException(415, 'Formato no permitido. Usa JPG, PNG, WEBP o GIF.');
        }
        $dir = Config::get('upload_dir');
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $name = bin2hex(random_bytes(8)) . '.' . $allowed[$info[2]];
        move_uploaded_file($file['tmp_name'], $dir . '/' . $name);
        Response::json(['url' => Config::get('upload_url') . '/' . $name, 'width' => $info[0], 'height' => $info[1]], 201);
    }
}
