# web-visualizacion-sonora

**Taller de Visualización Interactiva** — Braulio, Bernardita y Benjamín.

Maqueta para el Diseño Abierto: las respuestas a *¿Cuál es tu motivación para asistir hoy al Diseño Abierto?*
brotan de un micrófono en hileras, una detrás de otra, que se flectan, enredan y rebotan en los bordes.
Solo aparecen las palabras de las respuestas registradas. Cada hilera viaja hacia su grupo —estudiantes,
funcionarios o externos— y queda girando en el anillo del círculo. El tamaño indica en cuántas respuestas
del grupo aparece la palabra, y el color la hora en que se respondió: cálido en la mañana, frío en la noche.
Sin dependencias ni paso de compilación: HTML, CSS, JavaScript (módulos ES) y SVG.

## Ejecutar en local

Los módulos ES y el micrófono necesitan servirse por HTTP (no funcionan abriendo el archivo con `file://`):

```sh
python3 -m http.server 8000
```

Luego abre <http://localhost:8000>.

## Estructura

```
index.html          Página y contenedor del plano (SVG)
css/styles.css      Estilos y animaciones
js/app.js           Registro: formulario y dictado por voz
js/main.js          Visualización: micrófono, grupos, reloj y animación de las palabras
js/respuestas.js    Guarda y lee las respuestas del registro (localStorage)
js/audio.js         AudioEngine (micrófono / análisis); aún no se usa, queda para conectar audio real
assets/             Imágenes, audios de ejemplo, fuentes
```

## Uso

La página es una sola pantalla dividida en dos mitades:

- **Izquierda, registro:** la pregunta *¿Cuál es tu motivación para asistir hoy al Diseño Abierto?*,
  la elección de grupo (estudiante, funcionario/a o externo/a) y el dictado por voz (se graba
  apretando el botón, que se habilita al elegir el rol). La respuesta solo se agrega con voz: el campo no se
  puede escribir. Lo dictado queda en el campo hasta presionar Enviar, o se borra con Eliminar respuesta.
  El dictado usa la Web Speech API (Chrome, Edge, Safari) y necesita internet.
- **Derecha, visualización:** simbología (con una barra de colores por hora que marca la hora del reloj)
  y el plano, donde cada respuesta viaja hacia su grupo. Sin respuestas registradas, el plano queda vacío.

Las respuestas se guardan en el navegador: solo aparecen en la visualización abierta en el mismo equipo.

En la visualización:

- **Pausar / Reanudar**: congela o retoma la emisión de palabras.
- **Clic en el micrófono**: suelta varias hileras de palabras a la vez.
- Posición del patio y del micrófono: constantes `PATIO` y `MIC` en `js/main.js`.
- Velocidad, frecuencia, tamaño y duración de las palabras: constante `EMIT` en `js/main.js`.
- Grupos: constante `GROUPS`; reloj y colores por hora: constante `DAY`; tamaños: constante `SIZE` (todas en `js/main.js`).
