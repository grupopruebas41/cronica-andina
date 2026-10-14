<?php
namespace App\Controllers;

use App\Config;
use App\Database;
use App\HttpException;
use App\Request;
use App\Response;
use App\Util;
use App\Validator;

final class PostController
{
    private const SELECT = "SELECT p.*, c.name AS category_name, c.slug AS category_slug, u.name AS author_name,
        (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id AND cm.status = 'approved') AS comment_count
        FROM posts p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN users u ON u.id = p.author_id";

    /** Da forma a una fila de la base para la API. */
    public static function present(array $row, bool $withContent = false): array
    {
        $post = [
            'id'            => (int) $row['id'],
            'title'         => $row['title'],
            'slug'          => $row['slug'],
            'excerpt'       => $row['excerpt'],
            'image_url'     => $row['image_url'],
            'image_alt'     => $row['image_alt'],
            'status'        => $row['status'],
            'featured'      => (bool) $row['featured'],
            'views'         => (int) $row['views'],
            'reading_time'  => Util::readingTime($row['content']),
            'comment_count' => (int) ($row['comment_count'] ?? 0),
            'published_at'  => $row['published_at'],
            'created_at'    => $row['created_at'],
            'updated_at'    => $row['updated_at'],
            'author'        => $row['author_name'] ?? 'Redacción',
            'author_id'     => $row['author_id'] !== null ? (int) $row['author_id'] : null,
            'category'      => $row['category_id'] ? [
                'id'   => (int) $row['category_id'],
                'name' => $row['category_name'],
                'slug' => $row['category_slug'],
            ] : null,
        ];
        if ($withContent) {
            $post['content'] = $row['content'];
        }
        return $post;
    }

    /** Construye WHERE + parámetros a partir de filtros de búsqueda. */
    private static function filters(Request $req, bool $admin): array
    {
        $where  = [];
        $params = [];
        if (!$admin) {
            $where[] = "p.status = 'published'";
        } elseif (in_array($req->query['status'] ?? '', ['draft', 'published'], true)) {
            $where[]  = 'p.status = ?';
            $params[] = $req->query['status'];
        }
        $q = trim((string) ($req->query['q'] ?? ''));
        if ($q !== '') {
            $where[] = '(p.title LIKE ? OR p.excerpt LIKE ? OR p.content LIKE ?)';
            $like    = '%' . $q . '%';
            array_push($params, $like, $like, $like);
        }
        if (!empty($req->query['category'])) {
            $where[]  = 'c.slug = ?';
            $params[] = (string) $req->query['category'];
        }
        return [$where ? 'WHERE ' . implode(' AND ', $where) : '', $params];
    }

    private static function paginate(Request $req, bool $admin): array
    {
        $perPage = (int) ($req->query['per_page'] ?? Config::get('per_page_default'));
        $perPage = max(1, min($perPage, (int) Config::get('per_page_max')));
        $page    = max(1, (int) ($req->query['page'] ?? 1));
        [$where, $params] = self::filters($req, $admin);

        $total = (int) Database::one(
            "SELECT COUNT(*) AS n FROM posts p LEFT JOIN categories c ON c.id = p.category_id {$where}",
            $params
        )['n'];

        $order = $admin ? 'p.updated_at DESC' : 'p.published_at DESC';
        $rows  = Database::all(
            self::SELECT . " {$where} ORDER BY {$order}, p.id DESC LIMIT {$perPage} OFFSET " . (($page - 1) * $perPage),
            $params
        );
        return [
            'data' => array_map(fn ($r) => self::present($r), $rows),
            'meta' => [
                'page'        => $page,
                'per_page'    => $perPage,
                'total'       => $total,
                'total_pages' => (int) max(1, ceil($total / $perPage)),
            ],
        ];
    }

    // ---------- Público ----------

    public static function index(Request $req): void
    {
        Response::json(self::paginate($req, false), 200, true);
    }

    public static function featured(Request $req): void
    {
        $row = Database::one(self::SELECT . " WHERE p.status = 'published' ORDER BY p.featured DESC, p.published_at DESC LIMIT 1");
        $popular = Database::all(self::SELECT . " WHERE p.status = 'published' ORDER BY p.views DESC LIMIT 4");
        Response::json([
            'featured' => $row ? self::present($row) : null,
            'popular'  => array_map(fn ($r) => self::present($r), $popular),
        ], 200, true);
    }

    public static function show(Request $req): void
    {
        $row = Database::one(self::SELECT . " WHERE p.slug = ? AND p.status = 'published'", [$req->params['slug']]);
        if (!$row) {
            throw new HttpException(404, 'La noticia que buscas no existe o fue retirada.');
        }
        Database::query('UPDATE posts SET views = views + 1 WHERE id = ?', [$row['id']]);

        $related = Database::all(
            self::SELECT . " WHERE p.status = 'published' AND p.category_id = ? AND p.id != ?
             ORDER BY p.published_at DESC LIMIT 3",
            [$row['category_id'], $row['id']]
        );
        $post = self::present($row, true);
        $post['related'] = array_map(fn ($r) => self::present($r), $related);
        Response::json($post);
    }

    // ---------- Administración ----------

    public static function adminIndex(Request $req): void
    {
        Response::json(self::paginate($req, true));
    }

    public static function adminShow(Request $req): void
    {
        $row = Database::one(self::SELECT . ' WHERE p.id = ?', [(int) $req->params['id']]);
        if (!$row) {
            throw new HttpException(404, 'Entrada no encontrada.');
        }
        Response::json(self::present($row, true));
    }

    private static function validated(Request $req): array
    {
        $data = $req->body();
        Validator::check($data, [
            'title'       => 'required|min:5|max:150',
            'excerpt'     => 'required|min:20|max:300',
            'content'     => 'required|min:50',
            'status'      => 'required|in:draft,published',
            'category_id' => 'required|int',
        ]);
        // Regla de accesibilidad: toda imagen debe tener texto alternativo (WCAG 1.1.1).
        if (!empty($data['image_url'])) {
            Validator::check($data, ['image_alt' => 'required|min:5|max:200']);
        }
        if (!Database::one('SELECT id FROM categories WHERE id = ?', [(int) $data['category_id']])) {
            throw new HttpException(422, 'Revisa los campos marcados.', ['category_id' => 'La categoría seleccionada no existe.']);
        }
        return [
            'title'       => Util::clean($data['title']),
            'excerpt'     => Util::clean($data['excerpt']),
            'content'     => Util::clean($data['content']),
            'status'      => $data['status'],
            'category_id' => (int) $data['category_id'],
            'image_url'   => !empty($data['image_url']) ? Util::clean($data['image_url']) : null,
            'image_alt'   => !empty($data['image_url']) ? Util::clean($data['image_alt'] ?? '') : null,
            'featured'    => !empty($data['featured']) ? 1 : 0,
        ];
    }

    public static function store(Request $req): void
    {
        $d    = self::validated($req);
        $slug = Util::uniqueSlug('posts', $d['title']);
        if ($d['featured']) {
            Database::query('UPDATE posts SET featured = 0');
        }
        $now = date('Y-m-d H:i:s');
        Database::query(
            "INSERT INTO posts (title, slug, excerpt, content, image_url, image_alt, category_id, author_id, status, featured, published_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [$d['title'], $slug, $d['excerpt'], $d['content'], $d['image_url'], $d['image_alt'],
             $d['category_id'], $req->user['id'], $d['status'], $d['featured'],
             $d['status'] === 'published' ? $now : null, $now, $now]
        );
        $row = Database::one(self::SELECT . ' WHERE p.id = ?', [Database::lastId()]);
        Response::json(self::present($row, true), 201);
    }

    public static function update(Request $req): void
    {
        $id      = (int) $req->params['id'];
        $current = Database::one('SELECT * FROM posts WHERE id = ?', [$id]);
        if (!$current) {
            throw new HttpException(404, 'Entrada no encontrada.');
        }
        // Un editor solo puede modificar sus propias entradas.
        if ($req->user['role'] !== 'admin' && (int) $current['author_id'] !== (int) $req->user['id']) {
            throw new HttpException(403, 'Solo puedes editar tus propias entradas.');
        }
        $d    = self::validated($req);
        $slug = $d['title'] !== $current['title'] ? Util::uniqueSlug('posts', $d['title'], $id) : $current['slug'];
        $publishedAt = $current['published_at'];
        if ($d['status'] === 'published' && !$publishedAt) {
            $publishedAt = date('Y-m-d H:i:s');
        }
        if ($d['featured']) {
            Database::query('UPDATE posts SET featured = 0 WHERE id != ?', [$id]);
        }
        Database::query(
            "UPDATE posts SET title = ?, slug = ?, excerpt = ?, content = ?, image_url = ?, image_alt = ?,
             category_id = ?, status = ?, featured = ?, published_at = ?, updated_at = ? WHERE id = ?",
            [$d['title'], $slug, $d['excerpt'], $d['content'], $d['image_url'], $d['image_alt'],
             $d['category_id'], $d['status'], $d['featured'], $publishedAt, date('Y-m-d H:i:s'), $id]
        );
        $row = Database::one(self::SELECT . ' WHERE p.id = ?', [$id]);
        Response::json(self::present($row, true));
    }

    public static function destroy(Request $req): void
    {
        $id      = (int) $req->params['id'];
        $current = Database::one('SELECT author_id FROM posts WHERE id = ?', [$id]);
        if (!$current) {
            throw new HttpException(404, 'Entrada no encontrada.');
        }
        if ($req->user['role'] !== 'admin' && (int) $current['author_id'] !== (int) $req->user['id']) {
            throw new HttpException(403, 'Solo puedes eliminar tus propias entradas.');
        }
        Database::query('DELETE FROM posts WHERE id = ?', [$id]);
        Response::noContent();
    }
}
