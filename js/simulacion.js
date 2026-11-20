/*
 * Simular la interacción: bajo las instrucciones (que se achican), la mesa de corte con una grilla en zigzag y,
 * al lado, el telar con velcros.
 *
 * La grilla va en zigzag desde 0 hasta un año: cuatro filas, la primera de izquierda a derecha, la segunda de
 * vuelta, y así, unidas por curvas en los bordes. Las 52 semanas se reparten parejo por todo el camino, también
 * por las curvas: cada casilla es una semana, con su número, y cada mes tiene su tono. Si el pendiente es más largo, al llegar al año la
 * lana da la vuelta y recorre la grilla de regreso (y otra vez, si son más años), cada pasada por su carril.
 *
 * Se arrastra la lana desde el 0 (se puede avanzar y retroceder: se vale equivocarse), se corta con la tijera y
 * se lleva la lana cortada al telar, donde se pega en su lugar sobre los velcros. Primero hay que tomar, de la
 * izquierda, el ovillo de su temática y dejarlo al lado del 0 (se vale tomar otro: la lana sale de ese color).
 */

import { TEMATICAS } from './respuestas.js';

const SIM = {
  semanasPorAno: 52, // la grilla llega a un año
  filas: 4, // en cuatro filas, unidas por curvas
  maxAnos: 3, // cuántas pasadas (años) caben, ida y vuelta
  anchoTelar: 26, // semanas por fila del telar (medio año), como en las instrucciones
  margenTijera: 24, // a qué distancia de la lana se puede soltar la tijera para que corte
  margenFecha: 1.5, // semanas antes o después de tu fecha que valen como cortar justo ahí
  giroTijera: 15, // grados que gira cada brazo de la tijera al cerrarse
  cierreTijera: 220, // milisegundos que tarda en cerrarse
  filasTelar: 10, // filas de velcro que se ven: las últimas 10 (hasta una sobrante bajo la lana nueva)
};
const ANO = SIM.semanasPorAno;
// La grilla sobre el papel de la mesa.
const GRILLA = { izquierda: -180, derecha: 180, arriba: -129, entreFilas: 86, media: 22 };
// Cada mes, un tono (claro, para que la lana se vea encima).
const TONOS_MES = ['#f6d9c9', '#f6e5c4', '#eef0c6', '#d9efcb', '#c9ecdc', '#c6e9ec', '#c9dcf2', '#d4d0f2', '#e5cdf0', '#f2cde3', '#f2d2d2', '#eadfcf'];
// Cada año va por un carril de la banda, para que al dar la vuelta no tape al anterior.
const CARRIL = [0, 11, -11];
const MESA_TIJERA = { x: 318, y: -196 }; // donde descansa la tijera
// Los ovillos de colores, uno por temática, a la izquierda de la mesa; el que se toma queda al lado del 0.
const OVILLOS = TEMATICAS.map((tema, i) => ({ tema, x: -368, y: -200 + i * 100, r: 30 }));
const AL_LADO_DEL_CERO = { x: -231, y: -129 };
// El telar, a la derecha de la mesa: el tablero y, dentro, las filas de velcro.
const TELAR = { x: 440, y: -290, ancho: 720, alto: 580, izquierda: 540, derecha: 1100, arriba: -250, abajo: 270 };

const SVG_NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}, parent) => {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  parent?.appendChild(node);
  return node;
};

const svg = document.querySelector('#mesa-de-corte');
const botonReiniciar = document.querySelector('#btn-simulacion-reiniciar');
svg.setAttribute('viewBox', '-430 -300 1600 600');

let sim = null; // la simulación en curso

/**
 * Arma la simulación para el pendiente recién dado. `tiras`: las tiras del telar, en orden (la del pendiente
 * con `nueva: true`); `tiempo`: cuánto lleva pospuesto, en palabras.
 */
export function prepararSimulacion(tiras, tiempo) {
  const nueva = tiras.find((t) => t.nueva);
  sim = {
    tiras: tiras.filter((t) => !t.nueva),
    nueva,
    semanas: nueva.largo,
    color: null, // el color de la lana que se eligió (todavía ninguno)
    ovillo: null,
    tiempo,
    avance: 0,
    modo: null,
    cortada: false,
    corte: 0,
    pegada: false,
  };
  dibujar();
}

/* ---------- La forma de la grilla en zigzag ---------- */

const f = (n) => n.toFixed(1);

/*
 * El camino de la grilla: filas rectas unidas por medias vueltas. Cada tramo sabe su largo, y una semana es el
 * largo total dividido en 52: así las curvas también tienen semanas.
 */
const TRAMOS = (() => {
  const { izquierda, derecha, arriba, entreFilas } = GRILLA;
  const radio = entreFilas / 2;
  const lista = [];
  for (let r = 0; r < SIM.filas; r++) {
    const y = arriba + r * entreFilas;
    const haciaLaDerecha = r % 2 === 0;
    lista.push({ tipo: 'recta', fila: r, x: haciaLaDerecha ? izquierda : derecha, y, dx: haciaLaDerecha ? 1 : -1, largo: derecha - izquierda });
    if (r < SIM.filas - 1) {
      lista.push({ tipo: 'curva', fila: r, cx: haciaLaDerecha ? derecha : izquierda, cy: y + radio, radio, sentido: haciaLaDerecha ? 1 : -1, largo: Math.PI * radio });
    }
  }
  let desde = 0;
  for (const tramo of lista) {
    tramo.desde = desde;
    desde += tramo.largo;
  }
  return lista;
})();
const LARGO_GRILLA = TRAMOS.reduce((total, tramo) => total + tramo.largo, 0);
const LARGO_SEMANA = LARGO_GRILLA / ANO;

/**
 * El punto de la semana `s` de la grilla (0 a 52): dónde está, hacia dónde va el camino (tx, ty) y su normal a
 * la izquierda (nx, ny); `fila` es la fila a la que pertenece (las curvas, a la fila de antes).
 */
function enCamino(s) {
  const largo = Math.max(0, Math.min(LARGO_GRILLA, s * LARGO_SEMANA));
  const tramo = TRAMOS.find((t) => largo <= t.desde + t.largo + 1e-9) ?? TRAMOS[TRAMOS.length - 1];
  const d = largo - tramo.desde;
  let x;
  let y;
  let tx;
  let ty;
  if (tramo.tipo === 'recta') {
    x = tramo.x + tramo.dx * d;
    y = tramo.y;
    tx = tramo.dx;
    ty = 0;
  } else {
    // Media vuelta desde arriba hasta abajo, por fuera del borde (a la derecha o a la izquierda).
    const giro = d / tramo.radio;
    const angulo = -Math.PI / 2 + tramo.sentido * giro;
    x = tramo.cx + tramo.radio * Math.cos(angulo);
    y = tramo.cy + tramo.radio * Math.sin(angulo);
    tx = -Math.sin(angulo) * tramo.sentido;
    ty = Math.cos(angulo) * tramo.sentido;
  }
  return { x, y, tx, ty, nx: ty, ny: -tx, fila: tramo.fila };
}

/** El punto de la semana `s`, corrido `desvio` hacia la izquierda del camino. */
function enGrilla(s, desvio = 0) {
  const c = enCamino(s);
  return [c.x + c.nx * desvio, c.y + c.ny * desvio];
}

/** Hacia afuera (sobre la fila, o por fuera de la curva): +1 o -1 respecto de la normal a la izquierda. */
const haciaAfuera = (s) => (enCamino(s).fila % 2 === 0 ? 1 : -1);

/** Dónde está la semana `t` de la lana: el primer año recorre la grilla de ida, el segundo de vuelta, y así. */
function ubicar(t) {
  const pasada = Math.min(SIM.maxAnos - 1, Math.floor(t / ANO));
  const u = t - pasada * ANO;
  const s = pasada % 2 ? ANO - u : u;
  return { s, pasada, punto: enGrilla(s, CARRIL[pasada]) };
}

/** El camino de la lana desde la semana 0 hasta la `hasta`, siguiendo la grilla (también por las curvas). */
function caminoLana(hasta) {
  if (hasta < 0.05) return '';
  const pasos = Math.max(2, Math.ceil(hasta * 10));
  let d = '';
  for (let i = 0; i <= pasos; i++) {
    const [x, y] = ubicar((hasta * i) / pasos).punto;
    d += `${i ? 'L' : 'M'}${f(x)} ${f(y)}`;
  }
  return d;
}

/** Un color (#rrggbb) más oscuro: `cuanto` de 0 (igual) a 1 (negro). */
function oscurecer(color, cuanto) {
  const canal = (i) => Math.round(parseInt(color.slice(i, i + 2), 16) * (1 - cuanto)).toString(16).padStart(2, '0');
  return `#${canal(1)}${canal(3)}${canal(5)}`;
}

/** Texto sobre la grilla, girado según el camino (y nunca cabeza abajo). */
function textoEnGrilla(s, desvio, texto, clase, padre) {
  const c = enCamino(s);
  const x = c.x + c.nx * desvio;
  const y = c.y + c.ny * desvio;
  let giro = (Math.atan2(c.ty, c.tx) * 180) / Math.PI;
  if (giro > 90) giro -= 180;
  if (giro < -90) giro += 180;
  const nodo = el('text', { x: f(x), y: f(y), class: clase, transform: `rotate(${f(giro)} ${f(x)} ${f(y)})` }, padre);
  nodo.textContent = texto;
  return nodo;
}

// Puntos de la lana en todas sus pasadas, cada décimo de semana: para saber qué semana queda bajo el puntero.
const MUESTRAS = Array.from({ length: SIM.maxAnos * ANO * 10 + 1 }, (_, i) => {
  const t = i / 10;
  const [x, y] = ubicar(t).punto;
  return { t, x, y };
});

/* ---------- El dibujo ---------- */

let pieza; // la lana sobre la mesa (la que se arrastra y, ya cortada, se lleva al telar)
let lana;
let hebras;
let suelta;
let punta;
let tijera;
let brazos = [];
let telar;

function dibujar() {
  svg.replaceChildren();
  // Las texturas (madera, metal, hebras de lana, pelusa, sombra) son las del dibujo de las instrucciones,
  // copiadas aquí con otro nombre; y la del velcro y la tela del telar, propias.
  const texturas = document.querySelector('.ilustracion defs')?.cloneNode(true) ?? el('defs');
  texturas.querySelectorAll('[id]').forEach((nodo) => (nodo.id = nodo.id.replace('ilu-', 'sim-')));
  // La pelusa de la lana, sobre todo el dibujo: medida según cada lana, una lana recta (sin alto) se recortaba
  // entera y desaparecía al cortarla.
  const pelusa = texturas.querySelector('#sim-pelusa');
  if (pelusa) {
    Object.entries({ filterUnits: 'userSpaceOnUse', x: -440, y: -310, width: 1620, height: 620 }).forEach(([k, v]) => pelusa.setAttribute(k, v));
  }
  const velcro = el('pattern', { id: 'sim-velcro', patternUnits: 'userSpaceOnUse', width: 4, height: 4 }, texturas);
  el('rect', { width: 4, height: 4, fill: '#e6ddcc' }, velcro);
  el('circle', { cx: 1, cy: 1, r: 0.7, fill: '#cfc3ad' }, velcro);
  el('circle', { cx: 3, cy: 3, r: 0.7, fill: '#d8cdb9' }, velcro);
  const tela = el('pattern', { id: 'sim-tela', patternUnits: 'userSpaceOnUse', width: 3, height: 3 }, texturas);
  el('rect', { width: 3, height: 3, fill: '#ebe3d3' }, tela);
  el('rect', { width: 3, height: 1, fill: '#e4dbc9' }, tela);
  el('rect', { width: 1, height: 3, fill: '#e7dfce' }, tela);
  svg.append(texturas);

  // La tabla de corte verde (bajo los ovillos, la grilla y la tijera) y, encima, el papel con la grilla.
  dibujarTablaDeCorte();
  el('rect', { x: -326, y: -274, width: 628, height: 548, rx: 4, class: 'sim-papel', filter: 'url(#sim-sombra)' }, svg);

  // La grilla: cuatro filas en zigzag, unidas por curvas. Cada casilla es una semana (también en las curvas),
  // con su número, y del tono de su mes.
  const grilla = el('g', { class: 'sim-grilla' }, svg);
  const m = GRILLA.media;
  const borde = (desde, hasta, desvio) => {
    const pasos = Math.max(2, Math.ceil(Math.abs(hasta - desde) * 12));
    return Array.from({ length: pasos + 1 }, (_, i) => enGrilla(desde + ((hasta - desde) * i) / pasos, desvio));
  };
  for (let i = 0; i < ANO; i++) {
    const puntos = [...borde(i, i + 1, m), ...borde(i + 1, i, -m)];
    // El tono de su mes: una semana más clara y la siguiente más oscura.
    const mes = Math.min(11, Math.floor(((i + 0.5) * 12) / ANO));
    const tono = i % 2 ? oscurecer(TONOS_MES[mes], 0.12) : TONOS_MES[mes];
    el('path', { d: `M${puntos.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`, class: 'sim-casilla', style: `fill: ${tono}` }, grilla);
    textoEnGrilla(i + 0.5, -haciaAfuera(i + 0.5) * m * 0.6, String(i + 1), 'sim-texto-semana', grilla);
  }
  // Mes a mes: una línea más marcada y, por fuera, "1 mes", "2 meses"… hasta "1 año", donde se cumple cada uno.
  for (let mes = 1; mes <= 12; mes++) {
    const sm = (mes * ANO) / 12;
    const afuera = haciaAfuera(sm - 0.01);
    const [x1, y1] = enGrilla(sm, -afuera * m);
    const [x2, y2] = enGrilla(sm, afuera * (m + 6));
    el('line', { x1: f(x1), y1: f(y1), x2: f(x2), y2: f(y2), class: 'sim-mes' }, grilla);
    const [xt, yt] = enGrilla(sm, afuera * (m + 14));
    el('text', { x: f(xt), y: f(yt), class: 'sim-texto-mes' }, grilla).textContent = mes === 12 ? '1 año' : mes === 1 ? '1 mes' : `${mes} meses`;
  }
  const [xFin, yFin] = enGrilla(ANO, -haciaAfuera(ANO) * (m + 16));
  el('text', { x: f(xFin), y: f(yFin), class: 'sim-texto-vuelta', style: 'text-anchor: start' }, svg).textContent = '↩ da la vuelta';
  // El 0, donde parte.
  const [x0, y0] = enGrilla(0);
  el('circle', { cx: f(x0), cy: f(y0), r: 9, class: 'sim-cero' }, svg);
  el('text', { x: f(x0), y: f(y0), class: 'sim-texto-cero' }, svg).textContent = '0';

  // Tu fecha: donde hay que cortar (en la pasada que le toque).
  const fecha = ubicar(Math.min(sim.semanas, SIM.maxAnos * ANO));
  const afueraFecha = haciaAfuera(fecha.s);
  const [c1x, c1y] = enGrilla(fecha.s, -m - 4);
  const [c2x, c2y] = enGrilla(fecha.s, m + 4);
  el('line', { x1: f(c1x), y1: f(c1y), x2: f(c2x), y2: f(c2y), class: 'sim-corte' }, svg);
  const [ftx, fty] = enGrilla(fecha.s, -afueraFecha * (m + 13));
  el('text', { x: f(ftx), y: f(fty), class: 'sim-texto-fecha' }, svg).textContent = `✂ tu fecha: ${sim.tiempo}`;

  // El telar, al lado.
  telar = el('g', { class: 'sim-telar' }, svg);
  dibujarTelar();

  // La lana: la que va apoyada en la grilla y la que sigue suelta hasta el ovillo.
  pieza = el('g', { class: 'sim-pieza', filter: 'url(#sim-pelusa)' }, svg);
  suelta = el('path', { class: 'sim-lana sim-suelta' }, pieza);
  lana = el('path', { class: 'sim-lana' }, pieza);
  hebras = el('path', { class: 'sim-lana-hebras' }, pieza);
  // A la izquierda, los ovillos de colores con su temática: se toma uno (el de tu temática) y queda al lado del 0.
  for (const ovillo of OVILLOS) {
    const g = el('g', { class: 'sim-ovillo', 'data-tema': ovillo.tema.id }, svg);
    el('circle', { cx: ovillo.x, cy: ovillo.y, r: ovillo.r + 7, class: 'sim-ovillo-marca' }, g);
    const lanaOvillo = el('g', { filter: 'url(#sim-pelusa)' }, g);
    el('circle', { cx: ovillo.x, cy: ovillo.y, r: ovillo.r, style: `fill: ${ovillo.tema.color}` }, lanaOvillo);
    el('circle', { cx: ovillo.x, cy: ovillo.y, r: ovillo.r, fill: 'url(#sim-hebras)', opacity: 0.6 }, lanaOvillo);
    el('circle', { cx: ovillo.x, cy: ovillo.y, r: ovillo.r, fill: 'url(#sim-ovillo)' }, g);
    el('text', { x: ovillo.x, y: ovillo.y + ovillo.r + 22, class: 'sim-texto-ovillo' }, g).textContent = ovillo.tema.nombre;
  }

  // La punta de la lana: de ahí se toma para arrastrarla.
  punta = el('circle', { r: 15, class: 'sim-punta' }, svg);

  // La tijera, sobre la mesa: se arrastra hasta la lana para cortarla. Su punto de corte es (0, 0).
  tijera = el('g', { class: 'sim-tijera', filter: 'url(#sim-sombra)' }, svg);
  el('rect', { x: -40, y: -34, width: 110, height: 100, class: 'sim-tijera-zona' }, tijera);
  // Dos brazos que se cruzan en el eje (22, 0): la hoja de arriba sigue en el mango de abajo, y al revés.
  // Para cerrar la tijera, cada brazo gira hacia el otro.
  brazos = [el('g', {}, tijera), el('g', {}, tijera)];
  el('path', { d: 'M22 -4L-34 -18L-28 -9L22 4Z', class: 'sim-hoja' }, brazos[0]);
  el('path', { d: 'M22 0L46 27', class: 'sim-mango' }, brazos[0]);
  el('ellipse', { cx: 60, cy: 49, rx: 13, ry: 25, transform: 'rotate(-35 60 49)', class: 'sim-anillo' }, brazos[0]);
  el('path', { d: 'M22 4L-34 19L-28 10L22 -4Z', class: 'sim-hoja' }, brazos[1]);
  el('path', { d: 'M22 0L49 -15', class: 'sim-mango' }, brazos[1]);
  el('ellipse', { cx: 66, cy: -23, rx: 18, ry: 12, class: 'sim-anillo' }, brazos[1]);
  el('circle', { cx: 22, cy: 0, r: 4.5, class: 'sim-eje' }, tijera);
  ponerTijera(MESA_TIJERA.x, MESA_TIJERA.y);

  actualizar();
}

/* ---------- La tabla de corte ---------- */

// La tabla de corte verde, como las de las mesas de costura: cuadriculada (una línea fina cada 10, una más
// marcada cada 50), con una regla numerada en los bordes y diagonales a 45°.
const TABLA = { x: -425, y: -292, ancho: 818, alto: 584, margen: 18 };

function dibujarTablaDeCorte() {
  const { x, y, ancho, alto, margen } = TABLA;
  const g = el('g', { class: 'sim-tabla' }, svg);
  el('rect', { x, y, width: ancho, height: alto, rx: 12, class: 'sim-tabla-fondo', filter: 'url(#sim-sombra)' }, g);
  const x0 = x + margen;
  const y0 = y + margen;
  const x1 = x + ancho - margen;
  const y1 = y + alto - margen;
  let fina = '';
  let marcada = '';
  let marcas = '';
  for (let i = 0, xi = x0; xi <= x1 + 0.01; i++, xi += 10) {
    if (i % 5) fina += `M${f(xi)} ${y0}V${y1}`;
    else marcada += `M${f(xi)} ${y0}V${y1}`;
    marcas += `M${f(xi)} ${y0}v${i % 5 ? -4 : -8}M${f(xi)} ${y1}v${i % 5 ? 4 : 8}`;
    if (i % 5 === 0 && i) el('text', { x: f(xi), y: f(y0 - 10), class: 'sim-tabla-numero' }, g).textContent = String(i);
  }
  for (let i = 0, yi = y0; yi <= y1 + 0.01; i++, yi += 10) {
    if (i % 5) fina += `M${x0} ${f(yi)}H${x1}`;
    else marcada += `M${x0} ${f(yi)}H${x1}`;
    marcas += `M${x0} ${f(yi)}h${i % 5 ? -4 : -8}M${x1} ${f(yi)}h${i % 5 ? 4 : 8}`;
    if (i % 5 === 0 && i) el('text', { x: f(x0 - 9), y: f(yi), class: 'sim-tabla-numero sim-tabla-numero-lado' }, g).textContent = String(i);
  }
  el('path', { d: fina, class: 'sim-tabla-fina' }, g);
  el('path', { d: marcada, class: 'sim-tabla-marcada' }, g);
  el('path', { d: marcas, class: 'sim-tabla-regla' }, g);
  // Las diagonales a 45°, desde las esquinas.
  const lado = Math.min(x1 - x0, y1 - y0);
  el('path', { d: `M${x0} ${y1}l${lado} ${-lado}M${x1} ${y1}l${-lado} ${-lado}`, class: 'sim-tabla-diagonal' }, g);
}

/* ---------- El telar con velcros ---------- */

/**
 * Dibuja el telar: un tablero de tela con filas de velcro numeradas, de 26 semanas cada una. La lana va en
 * zigzag (las filas impares hacia la derecha y las pares hacia la izquierda), dando la vuelta por fuera del
 * borde, con todas las tiras que ya están una tras otra y, punteado, dónde va la nueva. Si ya se pegó, la lana
 * cortada queda en su lugar (con el largo que se cortó).
 */
function dibujarTelar() {
  telar.replaceChildren();
  const fila = SIM.anchoTelar;
  const { nueva } = sim;
  const largoVisible = Math.max(nueva.largo, sim.pegada ? sim.corte : 0);
  const ultima = Math.floor((nueva.desde + largoVisible - 1) / fila);
  // Las últimas 10 filas: hasta una sobrante bajo donde termina la lana nueva (si es muy larga, las que ocupe).
  const hasta = Math.max(SIM.filasTelar, ultima + 2); // siempre 10 filas, aunque haya pocas tiras
  const desdeFila = Math.max(0, Math.min(Math.floor(nueva.desde / fila), hasta - SIM.filasTelar));
  const filas = hasta - desdeFila;
  const k = (TELAR.derecha - TELAR.izquierda) / fila; // ancho de una semana
  const entre = (TELAR.abajo - TELAR.arriba) / filas; // de una fila a la siguiente
  const alto = entre * 0.72; // alto de la tira de velcro
  const grosor = Math.max(4, entre * 0.3); // grosor de la lana
  const centroFila = (fl) => TELAR.arriba + (fl - desdeFila + 0.5) * entre;
  const haciaLaDerecha = (fl) => fl % 2 === 0;

  // El tablero de tela, con su sombra.
  el('rect', { x: TELAR.x, y: TELAR.y, width: TELAR.ancho, height: TELAR.alto, rx: 4, class: 'sim-tablero', fill: 'url(#sim-tela)', filter: 'url(#sim-sombra)' }, telar);
  // Cada fila, una tira de velcro (con su costura punteada), con su número a la izquierda.
  for (let fl = desdeFila; fl < hasta; fl++) {
    const y = centroFila(fl);
    el('rect', { x: TELAR.izquierda, y: f(y - alto / 2), width: TELAR.derecha - TELAR.izquierda, height: f(alto), rx: 1.5, class: 'sim-velcro' }, telar);
    el('rect', { x: TELAR.izquierda + 3, y: f(y - alto / 2 + 3), width: TELAR.derecha - TELAR.izquierda - 6, height: f(alto - 6), class: 'sim-costura' }, telar);
    el('text', { x: TELAR.izquierda - 38, y: f(y), class: 'sim-numero-fila', style: `font-size: ${f(Math.min(22, entre * 0.62))}px` }, telar).textContent = String(fl + 1);
  }
  // Semana a semana: una línea por cada semana de la fila, y arriba su número (1 a 26).
  let lineas = '';
  for (let c = 1; c < fila; c++) {
    const x = f(TELAR.izquierda + c * k);
    for (let fl = desdeFila; fl < hasta; fl++) {
      const y = centroFila(fl);
      lineas += `M${x} ${f(y - alto / 2)}V${f(y + alto / 2)}`;
    }
  }
  el('path', { d: lineas, class: 'sim-semana-telar' }, telar);
  for (let c = 0; c < fila; c++) {
    el('text', { x: f(TELAR.izquierda + (c + 0.5) * k), y: f(TELAR.arriba - 10), class: 'sim-numero-semana' }, telar).textContent = String(c + 1);
  }

  // Los tramos de una tira, y si sigue en la fila de abajo (ahí da la vuelta).
  const tramos = (desde, largo) => {
    const lista = [];
    for (let resto = largo, pos = desde; resto > 0; ) {
      const fl = Math.floor(pos / fila);
      const enFila = Math.min(resto, (fl + 1) * fila - pos);
      if (fl >= desdeFila && fl < hasta) {
        const inicio = pos - fl * fila;
        const x = haciaLaDerecha(fl) ? TELAR.izquierda + inicio * k : TELAR.derecha - (inicio + enFila) * k;
        const empieza = haciaLaDerecha(fl) ? x : x + enFila * k; // por dónde entra la lana a este tramo
        lista.push({ x, y: centroFila(fl) - grosor / 2, width: enFila * k, height: grosor, fl, sigue: resto > enFila && fl + 1 < hasta, empieza });
      }
      pos += enFila;
      resto -= enFila;
    }
    return lista;
  };
  const vuelta = (fl) => {
    const y1 = centroFila(fl);
    const y2 = y1 + entre;
    const r = entre / 2;
    return haciaLaDerecha(fl)
      ? `M${TELAR.derecha - 1} ${f(y1)}L${TELAR.derecha} ${f(y1)}A${f(r)} ${f(r)} 0 0 1 ${TELAR.derecha} ${f(y2)}L${TELAR.derecha - 1} ${f(y2)}`
      : `M${TELAR.izquierda + 1} ${f(y1)}L${TELAR.izquierda} ${f(y1)}A${f(r)} ${f(r)} 0 0 0 ${TELAR.izquierda} ${f(y2)}L${TELAR.izquierda + 1} ${f(y2)}`;
  };
  const tira = (desde, largo, color, clase) => {
    const g = el('g', { class: clase, filter: 'url(#sim-pelusa)' }, telar);
    tramos(desde, largo).forEach((tramo, i) => {
      const forma = { x: f(tramo.x), y: f(tramo.y), width: f(tramo.width), height: f(tramo.height), rx: f(grosor / 2) };
      el('rect', { ...forma, style: `fill: ${color}` }, g);
      el('rect', { ...forma, fill: 'url(#sim-hebras)' }, g);
      if (tramo.sigue) {
        el('path', { d: vuelta(tramo.fl), class: 'sim-vuelta', style: `stroke: ${color}; stroke-width: ${f(grosor)}` }, g);
        el('path', { d: vuelta(tramo.fl), class: 'sim-vuelta', style: `stroke: url(#sim-hebras); stroke-width: ${f(grosor)}` }, g);
      }
      // El nudo con que empieza cada lana (donde se une con la anterior).
      if (i === 0) el('circle', { cx: f(tramo.empieza), cy: f(tramo.y + grosor / 2), r: f(grosor * 0.42), class: 'sim-nudo', style: `fill: ${color}` }, g);
    });
    return g;
  };

  // Las tiras que ya están.
  for (const otra of sim.tiras) tira(otra.desde, otra.largo, otra.color, 'sim-tira-vieja');
  // Dónde va la nueva (punteado, latiendo): ahí se lleva la lana cortada.
  const destino = el('g', { class: sim.pegada ? 'sim-destino sim-destino-listo' : 'sim-destino' }, telar);
  for (const tramo of tramos(nueva.desde, nueva.largo)) {
    el('rect', { x: f(tramo.x), y: f(tramo.y - 2), width: f(tramo.width), height: f(tramo.height + 4), rx: f(grosor / 2 + 2), style: `stroke: ${nueva.color}` }, destino);
    if (tramo.sigue) el('path', { d: vuelta(tramo.fl), class: 'sim-destino-vuelta', style: `stroke: ${nueva.color}` }, destino);
  }
  // Y, si ya se pegó, la lana cortada en su lugar.
  if (sim.pegada) tira(nueva.desde, sim.corte, sim.color, 'sim-tira-nueva');
}

/** Si un punto del dibujo cae sobre el telar. */
const sobreTelar = (p) => p.x >= TELAR.x && p.x <= TELAR.x + TELAR.ancho && p.y >= TELAR.y && p.y <= TELAR.y + TELAR.alto;

/* ---------- La lana sobre la mesa ---------- */

function ponerTijera(x, y) {
  tijera.setAttribute('transform', `translate(${f(x)} ${f(y)})`);
}

/** Redibuja la lana hasta donde va. */
function actualizar() {
  const largo = sim.cortada ? sim.corte : sim.avance;
  const d = caminoLana(largo);
  lana.setAttribute('d', d);
  hebras.setAttribute('d', d);
  const [px, py] = ubicar(sim.avance).punto;
  // Mientras no se corte, la lana sigue unida al ovillo elegido (si todavía no se elige, no hay lana).
  const o = sim.ovillo;
  const { x: ox, y: oy } = AL_LADO_DEL_CERO; // ahí está el ovillo que se tomó
  suelta.setAttribute('d', sim.cortada || !o ? '' : `M${f(px)} ${f(py)}Q${f((px + ox) / 2)} ${f(Math.max(py, oy) + 40)} ${f(ox + 10)} ${f(oy + 22)}`);
  [suelta, lana, punta].forEach((nodo) => (nodo.style.stroke = sim.color ?? ''));
  punta.setAttribute('cx', f(px));
  punta.setAttribute('cy', f(py));
  punta.style.display = sim.cortada || !o ? 'none' : '';
  svg.querySelectorAll('.sim-ovillo').forEach((g) => {
    const elegido = g.dataset.tema === o?.tema.id;
    g.classList.toggle('sim-ovillo-elegido', elegido);
    // El elegido queda al lado del 0; los demás, en su lugar.
    if (sim.modo !== 'ovillo' || sim.arrastrado?.tema.id !== g.dataset.tema) moverOvillo(g, elegido ? AL_LADO_DEL_CERO : null);
  });
  svg.classList.toggle('sim-sin-ovillo', !o);
  pieza.style.display = sim.pegada ? 'none' : '';
  svg.classList.toggle('sim-cortada', sim.cortada);
}

/** Lleva un ovillo a un punto (o de vuelta a su lugar, con `null`). */
function moverOvillo(g, punto) {
  const ovillo = OVILLOS.find((o) => o.tema.id === g.dataset.tema);
  if (!punto) g.removeAttribute('transform');
  else g.setAttribute('transform', `translate(${f(punto.x - ovillo.x)} ${f(punto.y - ovillo.y)})`);
}

/* ---------- Arrastrar los ovillos, la lana, la tijera y la lana cortada ---------- */

function puntoSvg(evento) {
  const matriz = svg.getScreenCTM();
  if (!matriz) return null;
  return new DOMPoint(evento.clientX, evento.clientY).matrixTransform(matriz.inverse());
}

/**
 * Las semanas de la lana (en todas sus pasadas) más cercanas al puntero, de la más cercana a la más lejana:
 * [{ t, distancia }] (de entre los puntos de la lana, cada décimo de semana).
 */
function semanasBajo(p, hasta = 60) {
  return MUESTRAS.map((m) => ({ t: m.t, distancia: Math.hypot(p.x - m.x, p.y - m.y) }))
    .filter((c) => c.distancia < hasta)
    .sort((a, b) => a.distancia - b.distancia);
}

/** La semana bajo el puntero que sigue a la lana desde donde va (para no saltar a otra fila). */
function siguienteSemana(p) {
  const cerca = semanasBajo(p).filter((c) => c.distancia < GRILLA.entreFilas * 0.6 && Math.abs(c.t - sim.avance) <= 2.5);
  // La más cercana al puntero (ya vienen ordenadas): así, al dar la vuelta, sigue por el carril de la
  // pasada en que va y no se devuelve por la anterior.
  return cerca.length ? cerca[0].t : null;
}

svg.addEventListener('pointerdown', (evento) => {
  if (!sim || sim.pegada || sim.modo === 'cortando') return;
  const p = puntoSvg(evento);
  if (!p) return;
  const ovillo = evento.target.closest('.sim-ovillo');
  if (ovillo && !sim.cortada) {
    // Se toma un ovillo para dejarlo al lado del 0 (se puede cambiar por otro mientras no se corte).
    sim.modo = 'ovillo';
    sim.arrastrado = OVILLOS.find((o) => o.tema.id === ovillo.dataset.tema);
    sim.agarre = p;
    sim.desde = ovillo.classList.contains('sim-ovillo-elegido') ? AL_LADO_DEL_CERO : sim.arrastrado;
  } else if (sim.cortada) {
    // Ya cortada: se toma la lana para llevarla al telar.
    if (!evento.target.closest('.sim-pieza')) return;
    sim.modo = 'pieza';
    sim.agarre = p;
  } else if (evento.target.closest('.sim-tijera')) {
    sim.modo = 'tijera';
  } else {
    // La lana se toma por su punta (no se puede saltar a otra parte de la grilla), una vez elegido el ovillo.
    if (!sim.ovillo) return;
    const [px, py] = ubicar(sim.avance).punto;
    if (Math.hypot(p.x - px, p.y - py) > 24) return;
    sim.modo = 'lana';
  }
  try {
    svg.setPointerCapture(evento.pointerId); // sigue arrastrando aunque el dedo salga de la grilla
  } catch {
    // Sin captura: igual se arrastra mientras el puntero esté sobre el dibujo.
  }
  svg.classList.add('sim-arrastrando');
});

svg.addEventListener('pointermove', (evento) => {
  if (!sim?.modo || sim.modo === 'cortando') return;
  const p = puntoSvg(evento);
  if (!p) return;
  if (sim.modo === 'tijera') {
    ponerTijera(p.x, p.y);
    return;
  }
  if (sim.modo === 'ovillo') {
    const g = svg.querySelector(`.sim-ovillo[data-tema="${sim.arrastrado.tema.id}"]`);
    moverOvillo(g, { x: sim.desde.x + p.x - sim.agarre.x, y: sim.desde.y + p.y - sim.agarre.y });
    return;
  }
  if (sim.modo === 'pieza') {
    pieza.setAttribute('transform', `translate(${f(p.x - sim.agarre.x)} ${f(p.y - sim.agarre.y)})`);
    return;
  }
  // La lana sigue al puntero por la grilla, hacia adelante o hacia atrás (se vale equivocarse).
  const t = siguienteSemana(p);
  if (t == null) return;
  sim.avance = Math.max(0, Math.min(SIM.maxAnos * ANO, t));
  actualizar();
});

function soltar(evento) {
  if (!sim?.modo || sim.modo === 'cortando') return;
  const modo = sim.modo;
  sim.modo = null;
  svg.classList.remove('sim-arrastrando');
  const p = puntoSvg(evento);
  if (modo === 'ovillo') {
    // Se deja sobre la mesa (o solo se toca): queda al lado del 0 y la lana sale de él. Si se suelta fuera de la
    // mesa, vuelve a donde estaba.
    const tocado = p && Math.hypot(p.x - sim.agarre.x, p.y - sim.agarre.y) < 6;
    const sobreMesa = p && p.x > -300 && p.x < 390 && p.y > -290 && p.y < 290;
    if (tocado || sobreMesa) {
      sim.ovillo = sim.arrastrado;
      sim.color = sim.ovillo.tema.color;
    }
    sim.arrastrado = null;
    actualizar();
    return;
  }
  if (modo === 'pieza') {
    // Sobre el telar, la lana se pega en su lugar; si no, vuelve a la mesa.
    pieza.removeAttribute('transform');
    if (p && sobreTelar(p)) {
      sim.pegada = true;
      dibujarTelar();
      actualizar();
    }
    return;
  }
  if (modo !== 'tijera') return;
  // La tijera corta donde se suelta, si está sobre la lana (con margen, para que sea fácil atinarle).
  const sobreLana = p && semanasBajo(p).find((c) => c.distancia < SIM.margenTijera && c.t > 0.3 && c.t <= sim.avance + 0.3);
  if (!sobreLana) {
    ponerTijera(MESA_TIJERA.x, MESA_TIJERA.y);
    return;
  }
  // Cerca de la marca (un poquito antes o un poquito después) vale como cortar justo en tu fecha.
  const t = Math.abs(sobreLana.t - sim.semanas) <= SIM.margenFecha ? sim.semanas : Math.max(1, Math.round(sobreLana.t));
  cortarCon(t);
}

const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms));

/** Gira los brazos de la tijera: 0 abierta, 1 cerrada. */
function cerrarTijera(cuanto) {
  const giro = SIM.giroTijera * cuanto;
  brazos[0].setAttribute('transform', `rotate(${f(-giro)} 22 0)`);
  brazos[1].setAttribute('transform', `rotate(${f(giro)} 22 0)`);
}

/** La tijera se pone sobre la lana, se cierra, corta, se abre y vuelve a su lugar en la mesa. */
async function cortarCon(t) {
  const esta = sim; // si se vuelve a empezar mientras corta, esta tijera ya no sigue
  esta.modo = 'cortando'; // mientras corta, no se puede arrastrar nada
  const [cx, cy] = ubicar(t).punto;
  ponerTijera(cx, cy);
  const pasos = 8;
  for (let i = 1; i <= pasos; i++) {
    cerrarTijera(i / pasos);
    await esperar(SIM.cierreTijera / pasos);
    if (sim !== esta) return;
  }
  esta.corte = t;
  esta.cortada = true;
  actualizar();
  await esperar(350);
  if (sim !== esta) return;
  cerrarTijera(0);
  ponerTijera(MESA_TIJERA.x, MESA_TIJERA.y);
  esta.modo = null;
}
svg.addEventListener('pointerup', soltar);
svg.addEventListener('pointercancel', soltar);

botonReiniciar.addEventListener('click', () => {
  if (!sim) return;
  prepararSimulacion([...sim.tiras, sim.nueva], sim.tiempo);
});
