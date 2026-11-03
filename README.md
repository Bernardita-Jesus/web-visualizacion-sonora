# web-visualizacion-sonora

**Taller de Visualización Interactiva** — Braulio, Bernardita y Benjamín.

Maqueta para el Diseño Abierto: las respuestas a *¿Qué tienes pendiente y hace cuánto lo pospones?* se tejen en un **telar**.
Cada pendiente es un tramo de **hilo**, siempre del mismo grosor, del color de su temática (estudios, trabajo,
vínculos (amigos, pareja y familia), salud y cuerpo, proyectos o hobbies, detectada por palabras clave). **Su largo es cuánto tiempo lleva
pospuesto**: el hilo va en puntadas y **cada puntada es un día**, así que lo pospuesto unas semanas es un trazo
corto y **cada línea horizontal es un año** (365 puntadas). Las puntadas se distinguen con
zoom o en pantalla completa; a la vista normal se ven como la textura del hilo. Los pendientes van uno
tras otro, en el orden en que se registraron, en un solo tejido continuo que ondula entre una urdimbre de hilos
verticales; cuando el hilo llega al borde da la vuelta, así que **el telar se alarga con todo lo que la comunidad ha
pospuesto**. No hay texto ni horas: solo hilo. El telar se teje lento, de a un pendiente, y al
completarse sus hilos salen del cuadrado y forman un ovillo por temática (ver *Del telar a los ovillos*).
Todos los relatos son anónimos: solo se guarda el texto, nunca quién habla ni su voz.
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
js/ovillos.js       Los ovillos: al completarse el telar, sus hilos salen y se enrollan por temática
js/ejemplos.js      Pendientes de ejemplo (se ven con el botón Simular registros) y molde del telar
js/respuestas.js    Guarda y lee las respuestas del registro (localStorage)
js/audio.js         AudioEngine (micrófono / análisis); aún no se usa, queda para conectar audio real
assets/             Imágenes, audios de ejemplo, fuentes
```

## Uso

La página es una sola pantalla dividida en dos mitades:

- **Izquierda, registro:** la pregunta *¿Qué tienes pendiente y hace cuánto lo pospones?* (con una bajada breve),
  el aviso de que los relatos son anónimos y el dictado por voz (se graba apretando el botón).
  El pendiente solo se agrega con voz: el campo no se puede escribir.
  Lo dictado se va sumando y se guarda como borrador: no se pierde hasta presionar Enviar o Eliminar pendiente.
  Antes de enviar se muestra en qué temática se registrará y cuánto tiempo dice que lo ha pospuesto (si no lo
  dice, se le sugiere contarlo); solo si la temática no es la correcta se elige otra a mano
  (no hace falta tocar nada más: basta con Enviar). Lo dictado queda en el campo hasta presionar Enviar, o se borra con Eliminar pendiente.
  El dictado usa la Web Speech API (Chrome, Edge, Safari) y necesita internet.
  Se dicta en español de Chile (`es-CL`). Al guardar se quitan las muletillas ("eh", "o sea", "cachai", "po"…),
  y la temática reconoce palabras del habla chilena (pega, pituto, pololo, tata, guagua, carrete, la u, solemne…).
  El registro se puede **ocultar** (botón Ocultar): queda como una pestaña angosta a la izquierda y la
  visualización ocupa toda la pantalla; al hacer clic en la pestaña se vuelve a abrir.
- **Botón Simular registros** (arriba, en la barra): muestra testimonios de ejemplo, cada uno con cuánto tiempo
  lleva pospuesto. Apagado, el telar muestra solo los registros reales.
  El botón **Borrar registros reales** (con confirmación) limpia los registros guardados en el navegador.
- **Derecha, telar de testimonios:** bajo el título, la simbología (a la izquierda) y el telar (a la derecha);
  se ven completos, sin tener que bajar. Al hacer clic en una temática de la
  simbología se destacan sus pendientes; al hacer clic en el telar se ve en pantalla completa.

Las respuestas se guardan en el navegador: solo aparecen en la visualización abierta en el mismo equipo.

Para ajustar la visualización (`js/main.js`):

- Cuántos días caben en una línea (`diasPorLinea`: 365, una línea es un año; cada puntada es un día), cuánto de ella se ve (`puntada`), márgenes, grosor
  del hilo, separación entre líneas y ondulación: constante `TELAR`.
- Velocidad con que se cose cada pendiente al recorrer el tejido: constante `TEJIDO`.
- Cómo se lee el tiempo pospuesto en el texto: `diasPospuesto` en `js/respuestas.js` (ver más abajo).
- Temáticas, colores y palabras clave: `TEMATICAS` en `js/respuestas.js`.
- Textos de ejemplo: `js/ejemplos.js`.

## Del telar a los ovillos

La visualización es un ciclo en dos tiempos (`js/main.js` y `js/ovillos.js`):

1. **Se teje el telar.** Parte vacío y los pendientes se tejen de a uno, lento y en el orden en que se
   registraron (unas 90 puntadas, o días, por segundo: un año en unos 4 segundos). Cada línea avanza en el
   sentido del hilo: las que vuelven, de derecha a izquierda, y las vueltas del borde, de arriba abajo. Las
   tiritas se van acumulando hasta completar el telar. Un pendiente recién registrado se teje primero.
2. **El telar se corre y sus hilos forman ovillos.** Con el telar completo, la columna del título y la
   simbología se repliega hacia la izquierda y desaparece, y el telar completo se corre a la izquierda (con
   su mismo tamaño, quedando en parte fuera del borde) dejando libre la mitad derecha. Entonces cada hilo sale del cuadrado y viaja hasta el **ovillo de su
   temática**, en ese espacio, donde queda enrollado en espiral (del centro hacia afuera). Los hilos parten uno
   tras otro, en el orden en que se tejieron, y conservan su largo y sus puntadas: **mientras más grande el
   ovillo, más tiempo se ha pospuesto en esa temática**. Bajo cada ovillo aparece su temática, cuántas veces
   se repite y cuánto tiempo pospuesto suma (por ejemplo, "19 veces · 27 años"). Los ovillos quedan a la vista unos segundos, se desvanecen, la simbología y el telar vuelven a su
   lugar, y el telar se teje de nuevo desde cero.

Los tiempos se ajustan en `TEJIDO` (`js/main.js`) y `TIEMPOS` (`js/ovillos.js`).

La idea viene de la bitácora (Escala 02): los *círculos que no se cierran* y los *hilos sueltos*.

## Cómo se clasifican las temáticas

La clasificación es un script propio y simple, por **palabras clave**. Está en `js/respuestas.js` y corre
en el navegador: no usa inteligencia artificial ni servicios externos, y el texto no sale del equipo.
Así, siempre da el mismo resultado para el mismo texto.

**1. El dictado.** El navegador transcribe la voz con la Web Speech API (`js/app.js`). Antes de guardar,
`limpiarDictado()` quita las muletillas ("eh", "o sea", "cachai", "po", "weón"…) y ordena espacios y comas.

**2. Las temáticas.** Cada temática de `TEMATICAS` tiene un nombre, un color y una lista de **raíces** de
palabras que la delatan. Por ejemplo:

| Temática | Algunas raíces |
| --- | --- |
| Estudios | `estudi`, `tesis`, `ramo`, `prueb`, `solemne`, `certamen`, `entrega`, `profe`, `beca` |
| Trabajo | `trabaj`, `pega`, `jef`, `pituto`, `sueldo`, `cliente`, `renunci`, `postul` |
| Vínculos | `mama`, `herman`, `abuel`, `amig`, `polol`, `pareja`, `carrete`, `perdon`, `convers`, `llamar`, `ex` |
| Salud y cuerpo | `medic`, `dentist`, `gimnasio`, `deporte`, `dormir`, `terapia`, `psicolog`, `nadar` |
| Proyectos | `proyecto`, `emprend`, `negocio`, `crear`, `ingles`, `viaj`, `ahorr` |
| Hobbies | `hobby`, `dibuj`, `pintar`, `leer`, `novela`, `musica`, `guitarra`, `cocin`, `ceramica`, `tejer` |

Una raíz reconoce todas las palabras que empiezan con ella: `estudi` reconoce *estudiar*, *estudios*
y *estudiando*. Las raíces de dos letras o menos (como `ex` o `u`, de "la u") cuentan solo como palabra
completa, para que *examen* no se confunda con *ex*.

**3. El conteo** (`tematicasDe(texto)`):

1. El texto se pasa a minúsculas, se le quitan las tildes ("tésis" → "tesis") y se separa en palabras.
2. Para cada temática se cuenta cuántas palabras del texto calzan con alguna de sus raíces.
3. Las temáticas se ordenan por puntaje. Si hay empate, gana la que va primero en la lista; por ejemplo, en
   "entregar la práctica", *entregar* es de Estudios y *práctica* de Trabajo, y gana Estudios.
4. Se queda con la de más puntaje: cada pendiente tiene una sola temática. Si ninguna calza, va a la **más cercana**: la temática con más palabras que empiezan con las
   mismas 4 letras que alguna de sus raíces ("biblioteca"…). Si tampoco hay ninguna, va a Proyectos.

Ejemplo: "tengo que estudiar para la prueba y pedirle un aumento a mi jefe". *estudiar* y *prueba* suman 2
para Estudios, y *jefe* suma 1 para Trabajo. Resultado: Estudios.

**4. La elección a mano.** Antes de enviar, el registro muestra la temática detectada ("Se registrará en
las temáticas Estudios y Trabajo"). Si no es la correcta, se puede elegir otra con "¿No es esa?
Seleccionar manualmente". La elegida a mano se guarda con el registro (`tema`) y manda sobre la detectada,
y el hilo queda de un solo color. Si no se elige, se guarda solo el texto y la temática se vuelve a
calcular cada vez que se teje el telar. Así, si se mejoran las raíces, los registros antiguos también
se reclasifican.

**Para mejorar la clasificación**, se agregan o quitan raíces en `TEMATICAS` (`js/respuestas.js`). Conviene
usar raíces cortas pero no ambiguas: `pega` sirve para "la pega", pero también reconoce "pegamento".

## Cómo se lee el tiempo pospuesto

`diasPospuesto(texto)` (en `js/respuestas.js`) busca en el texto cuánto tiempo lleva pospuesto y lo pasa a días:

- Un número (en cifras o en palabras) y una unidad: "dos semanas", "3 meses", "un semestre", "cinco años".
  También "un año y medio" y "medio año".
- Sin número: "hace años", "hace meses" o "hace semanas" cuentan como tres de esa unidad.
- "Desde marzo": los meses entre ese mes y hoy. "Desde chica" son 15 años y "toda la vida", 20.
- Si menciona varios tiempos, se queda con el más largo.
- Si no dice cuánto, el hilo se teje corto, como un mes (`DIAS_SIN_DATO`), y el registro sugiere contarlo antes de enviar.

El hilo tiene una puntada por cada uno de esos días, y cada línea del telar es un año (`diasPorLinea` en `js/main.js`).
