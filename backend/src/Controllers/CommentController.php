<?php
namespace App\Controllers;

use App\Database;
use App\HttpException;
use App\Request;
use App\Response;
use App\Util;
use App\Validator;

final class CommentController
{
    /** Comentarios aprobados de una noticia (público). */
    public static function index(Request $req): void
    {
        $rows = Database::all(
            "SELECT id, author, body, created_at FROM comments WHERE post_id = ? AND status = 'approved' ORDER BY created_at ASC",
            [(int) $req->params['id']]
        );
        Response::json($rows);
    }

    /** Envío público de comentario: queda pendiente de moderación. */
    public static function store(Request $req): void
    {
        $data = $req->body();
        // Campo trampa (honeypot) contra bots: los humanos no lo ven ni lo llenan.
        if (!empty($data['website'])) {
            throw new HttpException(422, 'No se pudo enviar el comentario.');
        }
        Validator::check($data, [
            'author' => 'required|min:2|max:60',
            'email'  => 'required|email|max:120',
            'body'   => 'required|min:3|max:1000',
        ]);
        $postId = (int) $req->params['id'];
        if (!Database::one("SELECT id FROM posts WHERE id = ? AND status = 'published'", [$postId])) {
            throw new HttpException(404, 'La noticia no existe.');
        }
        Database::query('INSERT INTO comments (post_id, author, email, body, created_at) VALUES (?, ?, ?, ?, ?)',
            [$postId, Util::clean($data['author']), trim($data['email']), Util::clean($data['body']), date('Y-m-d H:i:s')]);
        Response::json([
            'id'      => Database::lastId(),
            'status'  => 'pending',
            'message' => 'Gracias. Tu comentario será publicado cuando un editor lo revise.',
        ], 201);
    }

    // ---------- Moderación ----------

    public static function adminIndex(Request $req): void
    {
        $status = $req->query['status'] ?? '';
        $where  = in_array($status, ['pending', 'approved', 'rejected'], true) ? 'WHERE c.status = ?' : '';
        $rows   = Database::all(
            "SELECT c.*, p.title AS post_title, p.slug AS post_slug FROM comments c
             JOIN posts p ON p.id = c.post_id {$where} ORDER BY c.created_at DESC LIMIT 200",
            $where ? [$status] : []
        );
        Response::json($rows);
    }

    public static function moderate(Request $req): void
    {
        $data = $req->body();
        Validator::check($data, ['status' => 'required|in:approved,rejected,pending']);
        $id = (int) $req->params['id'];
        if (!Database::one('SELECT id FROM comments WHERE id = ?', [$id])) {
            throw new HttpException(404, 'Comentario no encontrado.');
        }
        Database::query('UPDATE comments SET status = ? WHERE id = ?', [$data['status'], $id]);
        Response::json(['id' => $id, 'status' => $data['status']]);
    }

    public static function destroy(Request $req): void
    {
        Database::query('DELETE FROM comments WHERE id = ?', [(int) $req->params['id']]);
        Response::noContent();
    }
}
