<?php
namespace App;

/**
 * Validador declarativo. Cada regla devuelve un mensaje claro en español
 * para que el usuario sepa exactamente cómo corregir el dato (accesibilidad cognitiva).
 *
 * Ejemplo: Validator::check($data, ['title' => 'required|min:5|max:150']);
 */
final class Validator
{
    private const LABELS = [
        'title' => 'título', 'excerpt' => 'resumen', 'content' => 'contenido',
        'email' => 'correo electrónico', 'password' => 'contraseña', 'name' => 'nombre',
        'author' => 'nombre', 'body' => 'comentario', 'image_alt' => 'texto alternativo',
        'category_id' => 'categoría', 'status' => 'estado', 'description' => 'descripción',
        'role' => 'rol', 'image_url' => 'imagen',
    ];

    public static function check(array $data, array $rules): array
    {
        $errors = [];
        foreach ($rules as $field => $ruleString) {
            $value = $data[$field] ?? null;
            if (is_string($value)) {
                $value = trim($value);
            }
            $label = self::LABELS[$field] ?? $field;
            foreach (explode('|', $ruleString) as $rule) {
                [$name, $arg] = array_pad(explode(':', $rule, 2), 2, null);
                $error = self::apply($name, $arg, $value, $label);
                if ($error !== null) {
                    $errors[$field] = $error;
                    break;
                }
            }
        }
        if ($errors) {
            throw new HttpException(422, 'Revisa los campos marcados.', $errors);
        }
        return $data;
    }

    private static function apply(string $name, ?string $arg, mixed $value, string $label): ?string
    {
        $empty = $value === null || $value === '';
        return match ($name) {
            'required' => $empty ? "El campo {$label} es obligatorio." : null,
            'min'      => (!$empty && mb_strlen((string) $value) < (int) $arg)
                ? "El {$label} debe tener al menos {$arg} caracteres." : null,
            'max'      => (!$empty && mb_strlen((string) $value) > (int) $arg)
                ? "El {$label} no puede superar {$arg} caracteres." : null,
            'email'    => (!$empty && !filter_var($value, FILTER_VALIDATE_EMAIL))
                ? 'Escribe un correo válido, por ejemplo: nombre@correo.com' : null,
            'in'       => (!$empty && !in_array($value, explode(',', (string) $arg), true))
                ? "El valor de {$label} no es válido. Opciones: " . str_replace(',', ', ', (string) $arg) . '.' : null,
            'int'      => (!$empty && filter_var($value, FILTER_VALIDATE_INT) === false)
                ? "El campo {$label} debe ser un número." : null,
            'strong'   => (!$empty && !preg_match('/^(?=.*[A-Za-z])(?=.*\d).{8,}$/', (string) $value))
                ? 'La contraseña debe tener 8 caracteres como mínimo, con letras y números.' : null,
            default    => null,
        };
    }
}
