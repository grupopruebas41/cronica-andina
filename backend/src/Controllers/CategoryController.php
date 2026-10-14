<?php
namespace App\Controllers;

use App\Database;
use App\HttpException;
use App\Request;
use App\Response;
use App\Util;
use App\Validator;

final class CategoryController
{
    public static function index(Request $req): void
    {
        $rows = Database::all(
            "SELECT c.*, (SELECT COUNT(*) FROM posts p WHERE p.category_id = c.id AND p.status = 'published') AS post_count
             FROM categories c ORDER BY c.name"
        );
        Response::json(array_map(fn ($r) => [
            'id' => (int) $r['id'], 'name' => $r['name'], 'slug' => $r['slug'],
            'description' => $r['description'], 'post_count' => (int) $r['post_count'],
        ], $rows), 200, true);
    }

    private static function validated(Request $req, ?int $ignoreId = null): array
    {
        $data = $req->body();
        Validator::check($data, ['name' => 'required|min:3|max:40', 'description' => 'max:160']);
        $name = Util::clean($data['name']);
        $dup  = Database::one('SELECT id FROM categories WHERE lower(name) = lower(?) AND id != ?', [$name, $ignoreId ?? 0]);
        if ($dup) {
            throw new HttpException(422, 'Revisa los campos marcados.', ['name' => 'Ya existe una categoría con ese nombre.']);
        }
        return ['name' => $name, 'description' => Util::clean($data['description'] ?? '')];
    }

    public static function store(Request $req): void
    {
        $d = self::validated($req);
        Database::query('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)',
            [$d['name'], Util::uniqueSlug('categories', $d['name']), $d['description']]);
        $id = Database::lastId();
        Response::json(['id' => $id] + $d + ['slug' => Database::one('SELECT slug FROM categories WHERE id = ?', [$id])['slug']], 201);
    }

    public static function update(Request $req): void
    {
        $id = (int) $req->params['id'];
        if (!Database::one('SELECT id FROM categories WHERE id = ?', [$id])) {
            throw new HttpException(404, 'Categoría no encontrada.');
        }
        $d = self::validated($req, $id);
        Database::query('UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ?',
            [$d['name'], Util::uniqueSlug('categories', $d['name'], $id), $d['description'], $id]);
        Response::json(Database::one('SELECT * FROM categories WHERE id = ?', [$id]));
    }

    public static function destroy(Request $req): void
    {
        $id = (int) $req->params['id'];
        $n  = (int) Database::one('SELECT COUNT(*) AS n FROM posts WHERE category_id = ?', [$id])['n'];
        if ($n > 0) {
            throw new HttpException(409, "No se puede eliminar: la categoría tiene {$n} entrada(s). Muévelas a otra categoría primero.");
        }
        Database::query('DELETE FROM categories WHERE id = ?', [$id]);
        Response::noContent();
    }
}
