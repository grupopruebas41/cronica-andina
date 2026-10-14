<?php
namespace App;

use PDO;

/**
 * Datos de ejemplo para que el blog funcione desde el primer arranque.
 * Las noticias son ficticias y solo sirven para demostración y pruebas.
 */
final class Seeder
{
    public static function run(PDO $pdo): void
    {
        $pdo->beginTransaction();

        $users = [
            ['Administradora General', 'admin@cronica.pe', 'Admin2026', 'admin'],
            ['Editor de Turno', 'editor@cronica.pe', 'Editor2026', 'editor'],
        ];
        $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
        foreach ($users as [$name, $email, $pass, $role]) {
            $stmt->execute([$name, $email, password_hash($pass, PASSWORD_DEFAULT), $role]);
        }

        $categories = [
            ['Local', 'Lo que pasa en nuestra ciudad y sus distritos.'],
            ['Cultura', 'Festividades, arte, música y tradiciones.'],
            ['Tecnología', 'Innovación, ciencia y vida digital.'],
            ['Deportes', 'Resultados, crónicas y deporte comunitario.'],
            ['Economía', 'Emprendimiento, comercio y empleo.'],
            ['Medio ambiente', 'Agua, clima, nevados y biodiversidad.'],
        ];
        $stmt = $pdo->prepare('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)');
        foreach ($categories as [$name, $desc]) {
            $stmt->execute([$name, Util::slugify($name), $desc]);
        }

        $posts = self::posts();
        $stmt = $pdo->prepare(
            'INSERT INTO posts (title, slug, excerpt, content, image_url, image_alt, category_id, author_id,
                                status, featured, views, created_at, updated_at, published_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        foreach ($posts as $i => $p) {
            $date = date('Y-m-d H:i:s', strtotime('-' . ($i * 2 + 1) . ' days 09:30'));
            $stmt->execute([
                $p['title'], Util::slugify($p['title']), $p['excerpt'], $p['content'],
                '/img/post-' . ($i + 1) . '.svg', $p['alt'], $p['cat'], $p['author'],
                $p['status'], $p['featured'] ?? 0, $p['views'],
                $date, $date, $p['status'] === 'published' ? $date : null,
            ]);
        }

        $comments = [
            [1, 'María Quispe', 'maria@correo.com', 'Excelente iniciativa, ojalá llegue también a Chilca.', 'approved'],
            [1, 'Jorge Ríos', 'jorge@correo.com', '¿Saben si habrá horario nocturno los fines de semana?', 'approved'],
            [2, 'Lucía Paredes', 'lucia@correo.com', 'Qué bonito ver a los jóvenes aprendiendo la danza.', 'approved'],
            [3, 'Visitante', 'visita@correo.com', 'Me gustaría inscribir a mi hija en el taller.', 'pending'],
            [4, 'Carlos M.', 'carlos@correo.com', 'Gran partido, se merecían el triunfo.', 'pending'],
        ];
        $stmt = $pdo->prepare('INSERT INTO comments (post_id, author, email, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?)');
        foreach ($comments as $i => $c) {
            $stmt->execute([...$c, date('Y-m-d H:i:s', strtotime('-' . ($i + 1) . ' hours'))]);
        }

        $pdo->prepare('INSERT INTO subscribers (email) VALUES (?)')->execute(['lector@correo.com']);
        $pdo->commit();
    }

    private static function posts(): array
    {
        return [
            [
                'title'   => 'Nueva ciclovía conectará el centro con el parque de la Identidad',
                'excerpt' => 'El proyecto suma 6,4 km de carril exclusivo, señalización accesible y estacionamientos para bicicletas en tres puntos clave.',
                'content' => "La municipalidad presentó el expediente técnico de una ciclovía de 6,4 kilómetros que unirá el centro de la ciudad con el parque de la Identidad. La obra incluye carriles segregados, semáforos con señal sonora y rampas en cada esquina.\n\n## ¿Qué cambia para los vecinos?\n\nSe instalarán estacionamientos para bicicletas en tres puntos de alta demanda: el mercado, la plaza principal y la universidad. Además, se reducirá la velocidad máxima de los autos a 30 km/h en las calles compartidas.\n\n## Plazos\n\nLa primera etapa empezará en el próximo trimestre y tendrá una duración estimada de cinco meses. Durante las obras se habilitarán desvíos señalizados y la información se publicará en este blog.",
                'alt'     => 'Ilustración de una ciclovía entre edificios con montañas al fondo',
                'cat' => 1, 'author' => 1, 'status' => 'published', 'featured' => 1, 'views' => 342,
            ],
            [
                'title'   => 'Escolares del valle aprenden la danza del Huaylarsh en talleres gratuitos',
                'excerpt' => 'Más de 200 estudiantes participan en los talleres de verano que buscan mantener viva la tradición agrícola del valle.',
                'content' => "Los talleres de danza tradicional reunieron a más de 200 escolares de seis distritos. Cada sesión combina la práctica del paso con la historia del ciclo agrícola que inspira la danza.\n\n## Una tradición que se transmite\n\nLas profesoras explican que el zapateo representa el trabajo en la chacra y la alegría de la cosecha. Los padres de familia colaboraron confeccionando los trajes.\n\nLa presentación final será en la plaza principal, con acceso libre y zona reservada para personas con movilidad reducida.",
                'alt'     => 'Ilustración de figuras danzando en círculo con colores festivos',
                'cat' => 2, 'author' => 2, 'status' => 'published', 'views' => 211,
            ],
            [
                'title'   => 'Biblioteca municipal abre laboratorio de robótica para niñas y niños',
                'excerpt' => 'El espacio cuenta con 15 kits educativos y talleres sabatinos sin costo para estudiantes de 8 a 14 años.',
                'content' => "La biblioteca municipal inauguró un laboratorio de robótica educativa con 15 kits y computadoras reacondicionadas. Los talleres se dictan los sábados y no tienen costo.\n\n## Inscripciones\n\nLas inscripciones son presenciales y en línea. Se priorizará la participación de colegios públicos y se reservará el 30 % de las vacantes para niñas, con el objetivo de reducir la brecha de género en ciencia y tecnología.",
                'alt'     => 'Ilustración de un pequeño robot junto a piezas de engranajes',
                'cat' => 3, 'author' => 1, 'status' => 'published', 'views' => 158,
            ],
            [
                'title'   => 'El equipo juvenil gana el torneo regional de fútbol sub-17',
                'excerpt' => 'Con un gol en el último minuto, la selección local se coronó campeona y clasificó a la etapa nacional.',
                'content' => "En una final muy disputada, la selección sub-17 se impuso por 2 a 1. El gol del triunfo llegó en el último minuto tras una jugada colectiva.\n\n## Próximo reto\n\nEl equipo representará a la región en la etapa nacional. La liga organizará una colecta para cubrir pasajes y alojamiento de los jugadores.",
                'alt'     => 'Ilustración de un balón de fútbol frente a un arco',
                'cat' => 4, 'author' => 2, 'status' => 'published', 'views' => 497,
            ],
            [
                'title'   => 'Feria dominical incorpora pagos digitales en 300 puestos',
                'excerpt' => 'Comerciantes reciben capacitación gratuita para cobrar con billeteras móviles y códigos QR.',
                'content' => "Trescientos comerciantes de la feria dominical ya aceptan pagos con billeteras móviles. La capacitación fue gratuita y se dictó en castellano y quechua.\n\n## Beneficios\n\nLos vendedores señalan que el cobro digital reduce el riesgo de recibir billetes falsos y facilita llevar un registro de sus ventas. Los compradores pueden seguir pagando en efectivo.",
                'alt'     => 'Ilustración de un puesto de mercado con un teléfono mostrando un código QR',
                'cat' => 5, 'author' => 1, 'status' => 'published', 'views' => 276,
            ],
            [
                'title'   => 'Voluntarios reforestan 2 hectáreas con quinuales en la cabecera de cuenca',
                'excerpt' => 'La jornada reunió a 150 voluntarios que plantaron 3000 árboles nativos para proteger las fuentes de agua.',
                'content' => "Ciento cincuenta voluntarios participaron en una jornada de reforestación en la parte alta de la cuenca. Se plantaron 3000 quinuales, especie nativa que ayuda a retener la humedad del suelo.\n\n## Por qué importa\n\nLos bosques altoandinos regulan el agua que llega a la ciudad. Los organizadores harán seguimiento a la supervivencia de los plantones durante los próximos dos años.",
                'alt'     => 'Ilustración de pequeños árboles plantados en una ladera andina',
                'cat' => 6, 'author' => 2, 'status' => 'published', 'views' => 189,
            ],
            [
                'title'   => 'Universidades locales lanzan concurso de apps con impacto social',
                'excerpt' => 'Los equipos ganadores recibirán mentoría y financiamiento semilla para convertir sus prototipos en productos.',
                'content' => "Tres universidades organizan un concurso de aplicaciones con impacto social. Las categorías son salud, educación y accesibilidad digital.\n\n## Requisitos\n\nCada equipo debe tener entre tres y cinco integrantes y presentar un prototipo funcional. Se valorará especialmente que las propuestas cumplan pautas de accesibilidad WCAG.",
                'alt'     => 'Ilustración de un teléfono con íconos de salud, educación y accesibilidad',
                'cat' => 3, 'author' => 1, 'status' => 'published', 'views' => 133,
            ],
            [
                'title'   => 'Festival de cine andino proyectará películas con audiodescripción',
                'excerpt' => 'Por primera vez, todas las funciones contarán con subtítulos y audiodescripción para personas con discapacidad.',
                'content' => "El festival de cine andino anunció que todas sus funciones contarán con subtítulos descriptivos y audiodescripción. Además, habrá intérprete de lengua de señas en los conversatorios.\n\n## Programación\n\nSe proyectarán doce películas de realizadores regionales. La entrada es libre hasta completar el aforo.",
                'alt'     => 'Ilustración de una pantalla de cine con subtítulos y un símbolo de accesibilidad',
                'cat' => 2, 'author' => 2, 'status' => 'published', 'views' => 98,
            ],
            [
                'title'   => 'Borrador: balance de lluvias de la temporada',
                'excerpt' => 'Nota en preparación sobre el comportamiento de las lluvias y su efecto en la campaña agrícola.',
                'content' => "Este borrador todavía no se publica. Sirve para probar que las entradas en estado borrador no aparecen en el sitio público.",
                'alt'     => 'Ilustración de nubes de lluvia sobre campos de cultivo',
                'cat' => 6, 'author' => 1, 'status' => 'draft', 'views' => 0,
            ],
        ];
    }
}
