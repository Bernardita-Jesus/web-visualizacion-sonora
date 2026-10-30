# web-visualizacion-sonora

**Taller de Visualización Interactiva** — Braulio, Bernardita y Benjamín.

Maqueta para el Diseño Abierto: las respuestas a *¿Qué tienes pendiente?* se tejen en un **telar**.
Cada media hora de la jornada es una franja (8:00 arriba, 20:00 abajo). Lo dicho en esa media hora es un
**hilo**, siempre del mismo grosor, que cruza el telar de lado a lado y ondula entre una urdimbre de hilos
verticales. Cada pendiente es un tramo del hilo, del color de su temática (estudios, trabajo, familia,
vínculos, uno mismo, salud y cuerpo, sueños y proyectos u otros, detectada por palabras clave) y del largo
de su frase. Si se habló mucho, el hilo da vuelta en los bordes y la franja **se llena de líneas**: los
momentos más conversados del día se ven más densos. Las medias horas sin pendientes quedan vacías.
Sobre el tejido van pasando las frases de a una, en orden de hora: cada una se escribe sobre su hilo
—con las letras más apegadas si hace falta para que quepa— y vuelve a ser hilo.
Todos los relatos son anónimos: solo se guarda el texto y la hora, nunca quién habla ni su voz.
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
js/main.js          Visualización: el telar y la simbología de temáticas
js/ejemplos.js      Pendientes de ejemplo (MOSTRAR_EJEMPLOS = false para el evento)
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
- **Derecha, visualización:** el telar y, debajo, la simbología. Al hacer clic en una temática de la
  simbología se destacan sus pendientes; al hacer clic en el telar se ve en pantalla completa.

Las respuestas se guardan en el navegador: solo aparecen en la visualización abierta en el mismo equipo.

Para ajustar la visualización (`js/main.js`):

- Jornada y largo de cada línea: constante `DAY` (inicio, término y paso de media hora).
- Márgenes, tamaño de letra, grosor del hilo, separación entre líneas, cuánto se apega la letra antes de pasar
  a otra línea (`apegue`), ondulación y largo máximo de cada pendiente: constante `TELAR`.
- Velocidad de escritura, tiempo que queda escrita cada frase y transformación en línea: constante `TEJIDO`.
- Temáticas, colores y palabras clave: `TEMATICAS` en `js/respuestas.js`.
- Textos de ejemplo: `js/ejemplos.js`.
