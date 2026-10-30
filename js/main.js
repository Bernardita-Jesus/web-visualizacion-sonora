import { EJEMPLOS, MOSTRAR_EJEMPLOS } from './ejemplos.js';
import { TEMATICAS, cargarRespuestas, horaDe, temaPorId, tematicaDe } from './respuestas.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/*
 * El telar: una franja por cada media hora de la jornada, de la mañana (arriba) a la tarde (abajo), todas
 * del mismo alto y con la misma distancia entre una y otra. Lo que se dijo en esa media hora es un hilo
 * (la trama), siempre del mismo grosor, que cruza el telar de lado a lado y ondula entre los hilos
 * verticales (la urdimbre), con el color de la temática de cada pendiente. Si se habló mucho, el hilo da
 * vueltas en los bordes y la franja se llena de líneas cada vez más juntas: los momentos más conversados
 * del día se ven más densos. Las medias horas en que nadie habló quedan vacías.
 * Sobre el tejido van pasando las frases de a una: cada frase se escribe sobre su hilo (con las letras más
 * apegadas si hace falta para que quepa) y vuelve a transformarse en hilo.
 */

// Coordenadas en unidades del viewBox.
const MARCO = { x: 150, y: 120, width: 900, height: 1150 }; // más angosto y menos alto: todo se ve más grande en pantalla
const DAY = { start: 8, end: 20, step: 0.5 }; // jornada de Diseño Abierto (bitácora): 8:00 a 20:00
const TELAR = {
  left: MARCO.x + 96, // espacio a la izquierda para las horas
  right: MARCO.x + MARCO.width - 28,
  top: MARCO.y + 34,
  bottom: MARCO.y + MARCO.height - 26,
  fontSize: 20, // tamaño máximo de la frase mientras se escribe; si no cabe, las letras se apegan
  gap: 6, // separación entre un pendiente y el siguiente en el mismo hilo
  maxChars: 400, // largo máximo de un pendiente
  stroke: 6, // grosor del hilo (el mismo en todo el telar)
  lineGap: 14, // separación entre líneas de una franja cuando hay pocas; con más texto se acercan
  apegue: 2.2, // cuánto pueden apegarse las letras antes de que el hilo pase a otra línea
  maxLines: 5, // líneas máximas por media hora (si se habla aún más, las letras se apegan más)
  bandGap: 11, // aire entre una media hora y la siguiente (igual en todo el telar)
  waveLength: 18, // separación aproximada entre los hilos verticales (urdimbre): el hilo ondula entre ellos
};

// Cómo pasan las frases: una se escribe letra a letra sobre su trazo, se queda un momento, vuelve a
// ser línea y recién entonces pasa la siguiente (en orden de hora, en ciclo).
const TEJIDO = {
  charsPerSecond: 60, // velocidad de escritura
  maxWrite: 2.6, // segundos máximos que tarda en escribirse una frase (las largas se escriben más rápido)
  hold: 1.6, // segundos que la frase queda escrita antes de volver a ser línea
  transform: 0.8, // segundos que tarda en transformarse en línea
  pause: 0.6, // respiro antes de la siguiente frase
};

const ROWS = Math.round((DAY.end - DAY.start) / DAY.step);
const rowHeight = (TELAR.bottom - TELAR.top) / ROWS;
const rowY = (row) => TELAR.top + (row + 0.5) * rowHeight;
const ANCHO = TELAR.right - TELAR.left;
// Largo de onda ajustado para que el hilo empiece y termine justo sobre los bordes.
const ONDA = ANCHO / Math.max(1, Math.round(ANCHO / TELAR.waveLength));

const svg = document.querySelector('#plano');

/* ---------- Utilidades ---------- */

function el(name, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  parent?.appendChild(node);
  return node;
}

/** Hora en formato de 12 horas, por ejemplo "8 AM" o "3:30 PM". */
function formatHour(hour) {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const h12 = h % 12 || 12;
  return `${h12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Línea del telar que corresponde a una hora (las horas fuera de la jornada van a la primera o la última). */
function rowOf(hour) {
  const row = Math.floor((hour - DAY.start) / DAY.step);
  return Math.min(Math.max(row, 0), ROWS - 1);
}

function recortar(texto) {
  const limpio = texto.trim().replace(/\s+/g, ' ').toLowerCase();
  return limpio.length > TELAR.maxChars ? `${limpio.slice(0, TELAR.maxChars - 1).trimEnd()}…` : limpio;
}

/* ---------- Dibujo del telar ---------- */

function drawFrame() {
  const marco = el('rect', { class: 'patio', ...MARCO }, svg);
  el('title', {}, marco).textContent = 'Clic para ver en pantalla completa';
  marco.addEventListener('click', toggleFullscreen);
}

function drawLoom() {
  // Urdimbre: hilos verticales tenues por donde la trama pasa por encima y por debajo.
  const urdimbre = el('g', { class: 'urdimbre' }, svg);
  for (let x = TELAR.left + ONDA / 4; x < TELAR.right; x += ONDA / 2) {
    el('line', { x1: x.toFixed(1), x2: x.toFixed(1), y1: TELAR.top, y2: TELAR.bottom }, urdimbre);
  }

  // Etiqueta de cada hora en punto, a la izquierda de su franja (se ubican al calcular las franjas).
  const horas = el('g', { class: 'horas' }, svg);
  for (let row = 0; row < ROWS; row++) {
    const hour = DAY.start + row * DAY.step;
    if (Number.isInteger(hour)) {
      etiquetas[row] = el('text', { class: 'hora', x: TELAR.left - 18, y: rowY(row) }, horas);
      etiquetas[row].textContent = formatHour(hour);
    }
  }
  etiquetaFin = el('text', { class: 'hora hora-fin', x: TELAR.left - 18, y: TELAR.bottom + 8 }, horas);
  etiquetaFin.textContent = formatHour(DAY.end);
}

const etiquetas = [];
let etiquetaFin = null;

/** Marca la franja de la hora actual (si está dentro de la jornada), junto al borde derecho. */
function drawNow() {
  const marca = el('g', { class: 'ahora' }, svg);
  const label = el('text', { x: TELAR.right + 6 }, marca);
  label.textContent = '◂ ahora';

  const update = () => {
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    const inside = hour >= DAY.start && hour < DAY.end;
    marca.style.display = inside ? '' : 'none';
    if (!inside) return;
    const franja = franjas[rowOf(hour)];
    label.setAttribute('y', (franja.top + franja.alto / 2).toFixed(1));
  };
  marcarAhora = update;
  setInterval(update, 60 * 1000);
}

let marcarAhora = () => {};

drawFrame();
drawLoom();
drawNow();
const tejido = el('g', { class: 'tejido' }, svg);
const emptyHint = el('text', { class: 'aviso-vacio', x: MARCO.x + MARCO.width / 2, y: MARCO.y + MARCO.height / 2 }, svg);
emptyHint.textContent = 'Aún no hay pendientes: cuenta el tuyo en el modo registro';

/* ---------- Tejer los pendientes ---------- */

const esperar = (segundos) => new Promise((resolve) => setTimeout(resolve, segundos * 1000));

// Por cada franja (media hora): sus pendientes en orden de hora, el grupo donde se dibuja su hilo y su
// lugar en el telar (arriba, alto, cuántas líneas tiene).
const franjas = Array.from({ length: ROWS }, (_, row) => ({
  pendientes: [],
  g: el('g', { class: 'franja' }, tejido),
  top: rowY(row) - rowHeight / 2,
  alto: rowHeight,
  lineas: 0,
}));
// Todos los pendientes tejidos, en orden de hora: por aquí van pasando las frases.
const tejidos = [];

// Para medir cuánto mide una frase con la letra de base.
const medidor = el('text', { class: 'escritura medidor', 'font-size': TELAR.fontSize, x: -9999, y: -9999 }, svg);
function medir(texto) {
  medidor.textContent = texto;
  return medidor.getComputedTextLength();
}

const largoDe = (franja) =>
  franja.pendientes.reduce((suma, p) => suma + p.largo, 0) + TELAR.gap * Math.max(0, franja.pendientes.length - 1);

/** Tramo ondulado de hilo entre xa y xb: pasa por encima y por debajo de la urdimbre. */
function onda(xa, xb, y, linea, amplitud) {
  const pasos = Math.max(2, Math.ceil(Math.abs(xb - xa) / 3));
  const fase = (linea % 2) * Math.PI; // líneas vecinas ondulan al revés, como en un tejido
  const puntos = [];
  for (let i = 0; i <= pasos; i++) {
    const x = xa + ((xb - xa) * i) / pasos;
    const yy = y + amplitud * Math.sin((2 * Math.PI * (x - TELAR.left)) / ONDA + fase);
    puntos.push(`${x.toFixed(1)} ${yy.toFixed(2)}`);
  }
  return `M ${puntos.join(' L ')}`;
}

/**
 * Cada media hora ocupa siempre el mismo alto (con aire entre una y otra). Dentro de su franja tiene tantas
 * líneas como necesite lo que se dijo, hasta un máximo; cuantas más líneas, más juntas quedan.
 * Luego dibuja todas las franjas.
 */
function distribuir() {
  const capacidad = ANCHO * TELAR.apegue; // lo que cabe en una línea con las letras apegadas
  const util = rowHeight - TELAR.bandGap; // alto de la franja sin el aire que la separa de la siguiente
  franjas.forEach((franja, row) => {
    const largo = largoDe(franja);
    franja.lineas = largo ? Math.min(TELAR.maxLines, Math.max(1, Math.ceil(largo / capacidad))) : 0;
    franja.separacion = franja.lineas ? Math.min(TELAR.lineGap, util / franja.lineas) : TELAR.lineGap;
    franja.top = TELAR.top + row * rowHeight;
    franja.alto = rowHeight;
    franja.inicioLineas = rowY(row) - (franja.lineas * franja.separacion) / 2; // líneas centradas en su franja
    dibujarFranja(row);
  });
  marcarAhora();
}

/**
 * Dibuja el hilo de una franja: todo lo dicho en esa media hora, de borde a borde y en tantas líneas como
 * tenga la franja. Las líneas pares van a la derecha y las impares vuelven: un solo hilo continuo que da
 * la vuelta en los bordes. El grosor es siempre el mismo.
 */
function dibujarFranja(row) {
  const franja = franjas[row];
  franja.g.replaceChildren();
  const lista = franja.pendientes;
  if (!lista.length) return; // media hora sin pendientes: franja vacía

  const lineas = franja.lineas;
  const porLinea = largoDe(franja) / lineas; // largo natural que entra en cada línea
  const escala = ANCHO / porLinea; // < 1: las letras se apegan; > 1: el hilo se estira hasta el borde
  const { separacion } = franja;
  const grosor = TELAR.stroke;
  const amplitud = Math.min(1.6, separacion * 0.08);
  const yDe = (linea) => franja.inicioLineas + (linea + 0.5) * separacion;
  const xDe = (linea, t) => {
    const d = (t - linea * porLinea) * escala;
    return linea % 2 === 0 ? TELAR.left + d : TELAR.right - d;
  };

  let t = 0;
  for (const p of lista) {
    const t0 = t;
    const t1 = t + p.largo;
    p.piezas = [];
    p.nodos = [];
    const titulo = `${p.tema.nombre} · ${formatHour(p.hora)} · ${p.texto}`;
    const trazo = (d, clase) => {
      const nodo = el('path', { class: clase, d, 'data-tema': p.tema.id }, franja.g);
      nodo.style.stroke = p.tema.color;
      nodo.style.strokeWidth = grosor.toFixed(2);
      el('title', {}, nodo).textContent = titulo;
      if (p.oculto) nodo.classList.add('oculta');
      p.nodos.push(nodo);
    };

    for (let linea = Math.floor(t0 / porLinea); linea < lineas && linea * porLinea < t1; linea++) {
      const a = Math.max(t0, linea * porLinea);
      const b = Math.min(t1, (linea + 1) * porLinea);
      if (b - a < 0.01) continue;
      const xa = xDe(linea, a);
      const xb = xDe(linea, b);
      const y = yDe(linea);
      trazo(onda(xa, xb, y, linea, amplitud), 'hebra');
      p.piezas.push({ x: Math.min(xa, xb), y });

      // Si el hilo de este pendiente sigue en la línea siguiente, da la vuelta en el borde.
      const fin = (linea + 1) * porLinea;
      if (b >= fin - 0.01 && t1 > fin + 0.01 && linea < lineas - 1) {
        const borde = linea % 2 === 0 ? TELAR.right : TELAR.left;
        const giro = linea % 2 === 0 ? 1 : 0;
        const r = (separacion / 2).toFixed(2);
        trazo(`M ${borde} ${y.toFixed(2)} A ${r} ${r} 0 0 ${giro} ${borde} ${(y + separacion).toFixed(2)}`, 'hebra vuelta');
      }
    }

    t = t1 + TELAR.gap;
  }
}

/** Agrega un pendiente al hilo de su media hora. Con `oculto`, su hilo aparece cuando pasa su frase. */
function colocar({ texto, hora }, oculto = false, redibujar = true) {
  const limpio = recortar(texto);
  const pendiente = { texto: limpio, hora, tema: temaPorId(tematicaDe(texto)), row: rowOf(hora), largo: medir(limpio), oculto };

  const enOrden = (lista) => {
    const i = lista.findIndex((otro) => otro.hora > hora);
    lista.splice(i === -1 ? lista.length : i, 0, pendiente);
  };
  enOrden(franjas[pendiente.row].pendientes);
  enOrden(tejidos);
  if (redibujar) distribuir();
  emptyHint.style.display = 'none';
  return pendiente;
}

/**
 * Pasa una frase: se escribe entera, en una sola línea, sobre la línea donde empieza su hilo (un
 * testimonio = un solo texto). Parte donde parte su tramo; si no alcanza a caber antes del borde se corre
 * hacia la izquierda, y si es más larga que el telar, las letras se apegan. Se queda un momento y vuelve
 * a ser hilo.
 */
async function pasarFrase(pendiente) {
  const { texto, tema, piezas, nodos } = pendiente;
  const primera = piezas[0];
  const letra = TELAR.fontSize;

  pendiente.oculto = false;
  for (const nodo of nodos) {
    nodo.classList.remove('oculta');
    nodo.classList.add('leyendose'); // el hilo se aclara mientras su frase está escrita encima
  }

  // El grupo apega las letras (las angosta a lo ancho) si la frase es más larga que el telar; el texto
  // de adentro es el que se anima al escribirse y al volver a ser hilo.
  const grupo = el('g', {}, tejido);
  const escrito = el('text', {
    class: 'escritura',
    y: primera.y.toFixed(1),
    'font-size': letra.toFixed(2),
    style: `fill: ${tema.color}`,
  }, grupo);
  escrito.textContent = texto;
  const largo = escrito.getComputedTextLength();
  if (largo > ANCHO) {
    escrito.setAttribute('x', TELAR.left);
    const k = (ANCHO / largo).toFixed(4);
    grupo.setAttribute('transform', `translate(${TELAR.left} 0) scale(${k} 1) translate(${-TELAR.left} 0)`);
  } else {
    // Parte donde parte su tramo; si no alcanza a caber antes del borde, se corre hacia la izquierda.
    escrito.setAttribute('x', Math.max(TELAR.left, Math.min(primera.x, TELAR.right - largo)).toFixed(1));
  }

  const segundos = Math.min(texto.length / TEJIDO.charsPerSecond, TEJIDO.maxWrite);
  escrito.style.setProperty('--dur', `${segundos.toFixed(2)}s`);
  await esperar(segundos + TEJIDO.hold);

  escrito.classList.add('transformandose');
  for (const nodo of nodos) nodo.classList.remove('leyendose');
  await esperar(TEJIDO.transform);
  grupo.remove();
  await esperar(TEJIDO.pause);
}

/* ---------- Las frases pasan de a una, en ciclo ---------- */

const urgentes = []; // pendientes recién registrados: pasan antes que el resto

let enCiclo = false;

/** Las frases pasan de a una, siempre la siguiente en orden de hora (y vuelve a empezar al final). */
async function ciclo() {
  if (enCiclo) return; // un solo ciclo: nunca dos frases a la vez
  enCiclo = true;
  let anterior = null;
  for (;;) {
    if (urgentes.length) {
      await pasarFrase(urgentes.shift());
    } else if (tejidos.length) {
      // El siguiente se busca a partir del anterior (no por posición): así, si llega un pendiente
      // nuevo y cambia la lista, el orden no se salta ni se repite.
      const i = anterior ? tejidos.indexOf(anterior) + 1 : 0;
      anterior = tejidos[i % tejidos.length];
      await pasarFrase(anterior);
    } else {
      await esperar(1);
    }
  }
}

function pendientesDelDia() {
  const ejemplos = MOSTRAR_EJEMPLOS ? EJEMPLOS : [];
  const reales = cargarRespuestas().map((respuesta) => ({ texto: respuesta.texto, hora: horaDe(respuesta) }));
  return [...ejemplos, ...reales].sort((a, b) => a.hora - b.hora);
}

/** Un pendiente recién registrado se suma al telar y su frase es la próxima en pasar. */
export function lanzarRespuesta(respuesta) {
  urgentes.push(colocar({ texto: respuesta.texto, hora: horaDe(respuesta) }, true));
}

// Se mide el largo de cada frase para ubicarla: hay que esperar a que cargue la tipografía de las frases,
// o se mediría con la letra de reemplazo (más angosta) y las frases no cabrían en su lugar. Se pide
// explícitamente, porque el navegador solo la descarga cuando se dibuja el primer texto con ella.
const tipografia = document.fonts.load(`${TELAR.fontSize}px "Source Serif 4"`).catch(() => {});
Promise.all([tipografia, document.fonts.ready]).then(() => {
  // El telar aparece completo desde el comienzo: todos los hilos, siempre.
  pendientesDelDia().forEach((pendiente) => colocar(pendiente, false, false));
  distribuir();
  emptyHint.style.display = tejidos.length ? 'none' : '';
  ciclo();
});

/* ---------- Simbología: temáticas (clic para destacar una) ---------- */

const listaTemas = document.querySelector('#simbologia-temas');
let temaActivo = null;

for (const tema of TEMATICAS) {
  const item = document.createElement('li');
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'tema';
  boton.dataset.tema = tema.id;
  boton.setAttribute('aria-pressed', 'false');
  const muestra = document.createElement('span');
  muestra.className = 'tema-color';
  muestra.setAttribute('aria-hidden', 'true');
  muestra.style.background = tema.color;
  boton.append(muestra, tema.nombre);
  boton.addEventListener('click', () => {
    temaActivo = temaActivo === tema.id ? null : tema.id;
    tejido.dataset.tema = temaActivo ?? '';
    for (const otro of listaTemas.querySelectorAll('.tema')) {
      otro.setAttribute('aria-pressed', String(otro.dataset.tema === temaActivo));
    }
  });
  item.append(boton);
  listaTemas.append(item);
}

/* ---------- Pantalla completa ---------- */

const planoWrap = document.querySelector('.plano-wrap');

/** Agranda la visualización (telar + simbología) a toda la pantalla, o vuelve a su mitad. */
function toggleFullscreen() {
  if (planoWrap.classList.contains('ampliado')) {
    planoWrap.classList.remove('ampliado');
    return;
  }
  if (document.fullscreenElement) {
    document.exitFullscreen();
    return;
  }
  // Pantalla completa real; si el navegador no la permite (por ejemplo, Safari en iPhone),
  // se amplía dentro de la ventana.
  const ampliar = () => planoWrap.classList.add('ampliado');
  if (planoWrap.requestFullscreen) planoWrap.requestFullscreen().catch(ampliar);
  else ampliar();
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') planoWrap.classList.remove('ampliado');
});
