# web-visualizacion-sonora

**Escala 02 · Taller de Visualización Interactiva** — Braulio, Bernardita y Benjamín.

Maqueta del patio central de la universidad: cuatro micrófonos de los que brotan palabras
en hileras, una detrás de otra, que se flectan y enredan, tomadas del vocabulario de Alejandra Pizarnik.
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
js/main.js          Patio, micrófonos y animación de las palabras
js/palabras.js      Vocabulario de Pizarnik y títulos de sus libros (editable)
js/audio.js         AudioEngine (micrófono / análisis); aún no se usa, queda para conectar audio real
assets/             Imágenes, audios de ejemplo, fuentes
```

## Uso

- **Pausar / Reanudar**: congela o retoma la emisión de palabras.
- **Clic en un micrófono**: suelta varias hileras de palabras a la vez.
- Posiciones del patio y micrófonos: constantes `PATIO` y `MICS` en `js/main.js`.
- Velocidad, frecuencia, tamaño y duración de las palabras: constante `EMIT` en `js/main.js`.
- Colores por tono (graves cálidos, agudos fríos): constante `PITCH` en `js/main.js`.
