# web-visualizacion-sonora

**Taller de Visualización Interactiva** — Braulio, Bernardita y Benjamín.

Maqueta para el Diseño Abierto: las respuestas a *¿Qué tienes pendiente?* se tejen en un **telar**.
Cada media hora de la jornada es una franja (8:00 arriba, 19:00 abajo, la última); su alto depende solo de cuánto se dijo en ella.
Una costura blanca marca cada cambio de hora: con registros reales se traza en el momento en que cambia la hora
(solo se ven las de las horas que ya empezaron); simulando, se ven las de todo el día. Cuando las frases que van
pasando cruzan a otra hora, su costura se descose y se vuelve a coser. Lo dicho en esa media hora es un
**hilo**, siempre del mismo grosor, que cruza el telar de lado a lado y ondula entre una urdimbre de hilos
verticales. Cada pendiente es un tramo del hilo, del color de su temática (estudios, trabajo, familia,
vínculos, uno mismo, salud y cuerpo, sueños y proyectos u otros, detectada por palabras clave; si habla de dos
temáticas, su hilo mezcla ambos colores, como dos hebras torcidas) y del largo de su frase, siempre con el mismo tamaño de letra, el mismo grosor y la misma separación entre líneas. Cuando
el hilo llega al borde da la vuelta: si se habló mucho, la franja **se llena de líneas** y el telar se alarga. Las medias horas sin pendientes quedan vacías.
Sobre el tejido van pasando las frases de a una, en orden de hora: cada una se escribe sobre su hilo
y vuelve a ser hilo.
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
js/ejemplos.js      Pendientes de ejemplo (se ven con el botón Simular registros) y molde del telar
js/respuestas.js    Guarda y lee las respuestas del registro (localStorage)
js/audio.js         AudioEngine (micrófono / análisis); aún no se usa, queda para conectar audio real
assets/             Imágenes, audios de ejemplo, fuentes
```

## Uso

La página es una sola pantalla dividida en dos mitades:

- **Izquierda, registro:** la pregunta *¿Qué tienes pendiente?*,
  el aviso de que los relatos son anónimos y el dictado por voz (se graba apretando el botón).
  Un reloj muestra la hora real y la franja del telar donde se tejerá el pendiente (según la hora en que se envía).
  El pendiente solo se agrega con voz: el campo no se puede escribir.
  Lo dictado se va sumando y se guarda como borrador: no se pierde hasta presionar Enviar o Eliminar pendiente.
  Antes de enviar se muestra en qué temática se registrará; solo si no es la correcta se elige otra a mano
  (no hace falta tocar nada más: basta con Enviar). Lo dictado queda en el campo hasta presionar Enviar, o se borra con Eliminar pendiente.
  El dictado usa la Web Speech API (Chrome, Edge, Safari) y necesita internet.
  Se dicta en español de Chile (`es-CL`). Al guardar se quitan las muletillas ("eh", "o sea", "cachai", "po"…),
  y la temática reconoce palabras del habla chilena (pega, pituto, pololo, tata, guagua, carrete, la u, solemne…).
  El registro se puede **ocultar** (botón Ocultar): queda como una pestaña angosta a la izquierda y la
  visualización ocupa toda la pantalla; al hacer clic en la pestaña se vuelve a abrir.
- **Botón Simular registros** (bajo la simbología): muestra testimonios de ejemplo de toda la jornada.
  Apagado, el telar muestra solo los registros reales hasta ahora. El telar y las costuras blancas tienen las
  mismas dimensiones en ambos modos (cada media hora reserva el alto que tiene en la simulación).
  El botón **Borrar registros reales** (con confirmación) limpia los registros guardados en el navegador.
- **Derecha, telar de testimonios:** bajo el título, la simbología (a la izquierda) y el telar (a la derecha);
  se ven completos, sin tener que bajar. Al hacer clic en una temática de la
  simbología se destacan sus pendientes; al hacer clic en el telar se ve en pantalla completa.

Las respuestas se guardan en el navegador: solo aparecen en la visualización abierta en el mismo equipo.

Para ajustar la visualización (`js/main.js`):

- Jornada y largo de cada línea: constante `DAY` (inicio, término y paso de media hora).
- Márgenes, tamaño de letra, grosor del hilo, separación entre líneas (`lineGap`), aire entre horas (`bandGap`),
  líneas máximas por media hora (`maxLines`), cuánto se apega la letra antes de pasar a otra línea (`apegue`),
  ondulación y largo máximo de cada pendiente: constante `TELAR`.
- Velocidad de escritura, tiempo que queda escrita cada frase y velocidad con que se cose (se vuelve hilo): constante `TEJIDO`.
- Temáticas, colores y palabras clave: `TEMATICAS` en `js/respuestas.js`.
- Textos de ejemplo: `js/ejemplos.js`.

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
| Familia | `mama`, `papa`, `herman`, `abuel`, `tata`, `guagua`, `sobrin` |
| Vínculos | `amig`, `polol`, `pareja`, `carrete`, `perdon`, `convers`, `llamar`, `ex` |
| Uno mismo | `mismo`, `soltar`, `dibuj`, `descans`, `paciencia`, `ordenar`, `bajon` |
| Salud y cuerpo | `medic`, `dentist`, `gimnasio`, `deporte`, `dormir`, `terapia`, `psicolog`, `nadar` |
| Sueños y proyectos | `viaj`, `sueno`, `proyecto`, `emprend`, `ingles`, `banda`, `negocio` |
| Otros | (ninguna: es lo que queda cuando nada calza) |

Una raíz reconoce todas las palabras que empiezan con ella: `estudi` reconoce *estudiar*, *estudios*
y *estudiando*. Las raíces de dos letras o menos (como `ex` o `u`, de "la u") cuentan solo como palabra
completa, para que *examen* no se confunda con *ex*.

**3. El conteo** (`tematicasDe(texto)`):

1. El texto se pasa a minúsculas, se le quitan las tildes ("tésis" → "tesis") y se separa en palabras.
2. Para cada temática se cuenta cuántas palabras del texto calzan con alguna de sus raíces.
3. Las temáticas se ordenan por puntaje. Si hay empate, gana la que va primero en la lista; por eso Familia
   va antes que Vínculos: en "llamar a mi abuela", *llamar* es de Vínculos y *abuela* de Familia, y gana Familia.
4. Se queda con la de más puntaje y, si otra temática también tuvo alguna palabra, con la segunda. Nunca
   son más de dos. Si ninguna calza, el pendiente queda en **Otros**.

Ejemplo: "tengo que estudiar para la prueba y pedirle un aumento a mi jefe". *estudiar* y *prueba* suman 2
para Estudios, y *jefe* suma 1 para Trabajo. Resultado: Estudios y Trabajo, con el hilo mezclado de ambos
colores (franjas diagonales, como dos hebras torcidas).

**4. La elección a mano.** Antes de enviar, el registro muestra la temática detectada ("Se registrará en
las temáticas Estudios y Trabajo"). Si no es la correcta, se puede elegir otra con "¿No es esa?
Seleccionar manualmente". La elegida a mano se guarda con el registro (`tema`) y manda sobre la detectada,
y el hilo queda de un solo color. Si no se elige, se guarda solo el texto y la temática se vuelve a
calcular cada vez que se teje el telar. Así, si se mejoran las raíces, los registros antiguos también
se reclasifican.

**Para mejorar la clasificación**, se agregan o quitan raíces en `TEMATICAS` (`js/respuestas.js`). Conviene
usar raíces cortas pero no ambiguas: `pega` sirve para "la pega", pero también reconoce "pegamento".
