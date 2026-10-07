# web-visualizacion-sonora

**Escala 02 · Taller de Visualización Interactiva** — Braulio, Bernardita y Benjamín.

Maqueta de la entrada de la FAAD: un micrófono del que brotan palabras
en hileras, una detrás de otra, que se flectan, enredan y rebotan en los bordes, tomadas del vocabulario de Alejandra Pizarnik.
El tamaño indica cuántas veces se nombró la palabra (por ahora, conteos simulados) y el color la semana:
rojo la anterior, azul la actual.
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
js/main.js          Patio, micrófono, conteos simulados y animación de las palabras
js/palabras.js      Vocabulario de Pizarnik y títulos de sus libros (editable)
js/audio.js         AudioEngine (micrófono / análisis); aún no se usa, queda para conectar audio real
assets/             Imágenes, audios de ejemplo, fuentes
```

## Uso

- **Pausar / Reanudar**: congela o retoma la emisión de palabras.
- **Clic en el micrófono**: suelta varias hileras de palabras a la vez.
- Posición del patio y del micrófono: constantes `PATIO` y `MIC` en `js/main.js`.
- Velocidad, frecuencia, tamaño y duración de las palabras: constante `EMIT` en `js/main.js`.
- Colores por semana: constante `SEMANAS`; tamaños por menciones: constante `SIZE` (ambas en `js/main.js`).
