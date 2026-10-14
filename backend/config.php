<?php
/**
 * Configuración general del backend de Crónica Andina.
 * Los valores pueden sobrescribirse con variables de entorno.
 */
return [
    // Ruta del archivo SQLite. Se crea automáticamente al primer arranque.
    'db_path'         => getenv('CA_DB_PATH') ?: __DIR__ . '/database/blog.sqlite',

    // Orígenes permitidos para CORS (servidor de desarrollo de Vite).
    'cors_origins'    => ['http://localhost:5173', 'http://127.0.0.1:5173'],

    // Duración del token de sesión (segundos): 8 horas.
    'token_ttl'       => 60 * 60 * 8,

    // Protección contra fuerza bruta en el login.
    'login_max_tries' => 5,
    'login_window'    => 15 * 60,

    // Subida de imágenes.
    'upload_dir'      => __DIR__ . '/public/uploads',
    'upload_url'      => '/uploads',
    'upload_max_mb'   => 2,

    // Paginación.
    'per_page_default' => 6,
    'per_page_max'     => 30,
];
