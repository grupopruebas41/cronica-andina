# Crónica Andina: blog de noticias autoadministrable

Producto Académico N.º 2 de Pruebas y Calidad de Software.
Frontend en **React 19** y backend (API REST) en **PHP 8** con base de datos **SQLite**.

## Estructura

```
cronica-andina/
├── backend/                 API REST en PHP (sin frameworks ni Composer)
│   ├── config.php           configuración
│   ├── database/schema.sql  esquema de la base de datos
│   ├── public/              raíz web: index.php + frontend compilado (index.html, assets/, img/)
│   ├── src/                 Router, Auth, Validator, Database, Seeder y Controllers/
│   └── tests/ApiTest.php    30 pruebas de integración de la API (CP-01 a CP-30)
├── frontend/                código fuente React (Vite)
│   ├── src/                 componentes, páginas, panel admin, contextos y utilidades
│   └── tests/               pruebas unitarias (PU) y de sistema/accesibilidad/eficiencia (E2E)
├── docs/
│   ├── Informe_Plan_de_Pruebas.docx
│   └── capturas/            evidencias de la ejecución de pruebas
└── INTEGRANTES.txt
```

## Cómo ejecutarlo

### Opción A: solo con PHP (la más rápida)

El frontend ya está compilado dentro de `backend/public`. Solo necesitas PHP 8.1 o superior con `pdo_sqlite`
(XAMPP lo trae).

```bash
cd backend
php -S localhost:8000 -t public public/index.php
```

Abre http://localhost:8000. La base de datos se crea sola la primera vez, con noticias de ejemplo.

### Opción B: XAMPP / Apache

1. Copia la carpeta `backend` dentro de `htdocs` (por ejemplo `htdocs/cronica`).
2. Crea un *Virtual Host* cuyo `DocumentRoot` sea `htdocs/cronica/public`, o usa la opción A.
   El archivo `public/.htaccess` ya redirige las rutas y comprime los recursos.
3. Activa `mod_rewrite` y la extensión `pdo_sqlite` en `php.ini`.

### Opción C: desarrollo del frontend con Vite

```bash
# terminal 1
cd backend && php -S localhost:8000 -t public public/index.php
# terminal 2
cd frontend
npm install
npm run dev        # http://localhost:5173 (las llamadas a /api van al puerto 8000)
npm run build      # vuelve a compilar dentro de backend/public
```

## Cuentas de demostración

| Rol            | Correo              | Contraseña  |
|----------------|---------------------|-------------|
| Administradora | admin@cronica.pe    | Admin2026   |
| Editor         | editor@cronica.pe   | Editor2026  |

Para volver a los datos iniciales, borra `backend/database/blog.sqlite`.

## Pruebas

```bash
# Integración de la API (PHP, sin dependencias)
cd backend && php tests/ApiTest.php

# Unitarias del frontend (Node 18+)
cd frontend && npm test

# Sistema (E2E), accesibilidad WCAG 2.2 AA y eficiencia (Playwright)
cd frontend && npm install && npx playwright install chromium && npm run test:e2e
```

Resultados de la última ejecución: 30/30 API, 11/11 unitarias, 17/17 E2E y 40/40 auditorías de accesibilidad
(10 páginas × 4 temas). Los detalles están en el informe y en `*/tests/results/*.json`.
