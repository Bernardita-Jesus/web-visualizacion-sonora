# web-visualizacion-sonora

**Taller de Visualización Interactiva** — Braulio, Bernardita y Benjamín.

Maqueta para el Diseño Abierto: las respuestas a *¿Qué tienes pendiente?*
brotan de un micrófono en hileras, una detrás de otra, que se flectan, enredan y rebotan en los bordes.
Todos los relatos son anónimos: solo se guarda el texto y la hora, nunca quién habla ni su voz.
Cada hilera viaja hacia la nube de su temática (estudios, trabajo, vínculos, familia, uno mismo,
salud y cuerpo, sueños y proyectos u otros), detectada por palabras clave, y sus palabras se suman a esa
nube, que se va formando durante la jornada. El tamaño indica en cuántos pendientes de la temática aparece la palabra, y el color la hora en que se
contó: cálido en la mañana, frío en la noche.
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

- **Izquierda, registro:** la pregunta *¿Qué tienes pendiente?*,
  el aviso de que los relatos son anónimos y el dictado por voz (se graba apretando el botón).
  El pendiente solo se agrega con voz: el campo no se puede escribir. Lo dictado queda en el campo hasta presionar Enviar, o se borra con Eliminar pendiente.
  El dictado usa la Web Speech API (Chrome, Edge, Safari) y necesita internet.
- **Derecha, visualización:** simbología (con una barra de colores por hora que marca la hora del reloj)
  y el plano, donde cada pendiente viaja hacia su temática. Sin pendientes registrados, el plano queda vacío.

Las respuestas se guardan en el navegador: solo aparecen en la visualización abierta en el mismo equipo.

En la visualización:

- **Pausar / Reanudar**: congela o retoma la emisión de palabras.
- **Clic en el micrófono**: suelta varias hileras de palabras a la vez.
- Posición del patio y del micrófono: constantes `PATIO` y `MIC` en `js/main.js`.
- Velocidad, frecuencia, tamaño y duración de las palabras: constante `EMIT` en `js/main.js`.
- Temáticas: nubes en `GROUPS` y su tamaño en `CLOUD` (`js/main.js`) y palabras clave en `TEMATICAS` (`js/respuestas.js`); reloj y colores por hora: constante `DAY`; tamaños: constante `SIZE` (todas en `js/main.js`).
