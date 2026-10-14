<?php
namespace App;

final class Util
{
    /** Convierte un texto en un slug para URL: "Huancayo hoy" -> "huancayo-hoy". */
    public static function slugify(string $text): string
    {
        $text = mb_strtolower(trim($text));
        $map  = ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n'];
        $text = strtr($text, $map);
        $text = preg_replace('/[^a-z0-9]+/', '-', $text);
        $text = trim((string) $text, '-');
        return $text !== '' ? $text : 'entrada';
    }

    /** Genera un slug único en la tabla indicada, agregando -2, -3... si ya existe. */
    public static function uniqueSlug(string $table, string $text, ?int $ignoreId = null): string
    {
        $base = self::slugify($text);
        $slug = $base;
        $i    = 2;
        while (true) {
            $row = Database::one(
                "SELECT id FROM {$table} WHERE slug = ? AND id != ?",
                [$slug, $ignoreId ?? 0]
            );
            if (!$row) {
                return $slug;
            }
            $slug = $base . '-' . $i++;
        }
    }

    /** Tiempo estimado de lectura en minutos (200 palabras por minuto). */
    public static function readingTime(string $content): int
    {
        $words = str_word_count(strip_tags($content), 0, 'áéíóúüñÁÉÍÓÚÜÑ');
        return max(1, (int) ceil($words / 200));
    }

    /** Limpia texto libre: quita etiquetas HTML para prevenir XSS almacenado. */
    public static function clean(?string $text): string
    {
        return trim(strip_tags((string) $text));
    }
}
