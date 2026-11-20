/*
 * Simular la interacción: bajo las instrucciones (que se achican), la mesa de corte con una grilla en zigzag y,
 * al lado, el telar con velcros.
 *
 * La grilla va en zigzag desde 0 hasta un año: cuatro filas de 13 semanas (tres meses cada una), la primera de
 * izquierda a derecha, la segunda de vuelta, y así, dando la vuelta en los bordes. Cada casilla es una semana,
 * con su número y un color que cambia de una semana a la otra. Si el pendiente es más largo, al llegar al año la
 * lana da la vuelta y recorre la grilla de regreso (y otra vez, si son más años), cada pasada por su carril.
 *
 * Se arrastra la lana desde el 0 (se puede avanzar y retroceder: se vale equivocarse), se corta con la tijera y
 * se lleva la lana cortada al telar, donde se pega en su lugar sobre los velcros.
 */

const SIM = {
  semanasPorFila: 13, // cada fila de la grilla son tres meses
  filas: 4, // cuatro filas: un año
  maxAnos: 3, // cuántas pasadas (años) caben, ida y vuelta
  anchoTelar: 26, // semanas por fila del telar (medio año), como en las instrucciones
  filasTelar: 10, // filas de velcro que se ven: las últimas 10 (hasta una sobrante bajo la lana nueva)
};
const ANO = SIM.semanasPorFila * SIM.filas;
// La grilla sobre el papel de la mesa.
const GRILLA = { izquierda: -195, derecha: 195, arriba: -129, entreFilas: 86, media: 22 };
const ANCHO_SEMANA = (GRILLA.derecha - GRILLA.izquierda) / SIM.semanasPorFila;
// Cada año va por un carril de la banda, para que al dar la vuelta no tape al anterior.
const CARRIL = [0, 11, -11];
const MESA_TIJERA = { x: 318, y: -196 }; // donde descansa la tijera
const OVILLO = { x: 330, y: 215, r: 34 };
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
svg.setAttribute('viewBox', '-310 -300 1480 600');

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
    color: nueva.color,
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
const yFila = (r) => GRILLA.arriba + r * GRILLA.entreFilas;

/** El punto de la semana `u` (0 a 13) de la fila `r` de la grilla, corrido `desvio` hacia abajo. */
function enFila(r, u, desvio = 0) {
  const x = r % 2 ? GRILLA.derecha - u * ANCHO_SEMANA : GRILLA.izquierda + u * ANCHO_SEMANA;
  return [x, yFila(r) + desvio];
}

/**
 * El punto de la semana `s` de la grilla (0 a 52), corrido `desvio` hacia abajo del centro de su fila. Justo
 * en el cambio de fila, `deVuelta` dice si se llega desde adelante (al recorrerla de regreso): entonces es el
 * final de la fila de arriba y no el comienzo de la de abajo.
 */
function enGrilla(s, desvio = 0, deVuelta = false) {
  const r = Math.max(0, Math.min(SIM.filas - 1, Math.floor((deVuelta ? s - 1e-7 : s) / SIM.semanasPorFila)));
  return enFila(r, s - r * SIM.semanasPorFila, desvio);
}

/** Dónde está la semana `t` de la lana: el primer año recorre la grilla de ida, el segundo de vuelta, y así. */
function ubicar(t) {
  const pasada = Math.min(SIM.maxAnos - 1, Math.floor(t / ANO));
  const u = t - pasada * ANO;
  const s = pasada % 2 ? ANO - u : u;
  return { s, pasada, punto: enGrilla(s, CARRIL[pasada], pasada % 2 === 1) };
}

/**
 * El camino de la lana desde la semana 0 hasta la `hasta`: recto por cada fila y, al pasar de una fila a otra,
 * una vuelta redonda por fuera del borde.
 */
function caminoLana(hasta) {
  if (hasta < 0.05) return '';
  const [x0, y0] = ubicar(0).punto;
  let d = `M${f(x0)} ${f(y0)}`;
  for (let k = 1; k * SIM.semanasPorFila < hasta + SIM.semanasPorFila; k++) {
    const borde = k * SIM.semanasPorFila;
    const [xa, ya] = ubicar(Math.min(hasta, borde - 1e-6)).punto;
    d += `L${f(xa)} ${f(ya)}`;
    if (borde >= hasta) break;
    const [xb, yb] = ubicar(borde).punto;
    if (Math.abs(yb - ya) > GRILLA.entreFilas / 2) {
      // Da la vuelta en el borde (por fuera, hacia el lado en que está).
      const r = Math.abs(yb - ya) / 2;
      const barrido = (xa > 0) === (yb > ya) ? 1 : 0;
      d += `A${f(r)} ${f(r)} 0 0 ${barrido} ${f(xb)} ${f(yb)}`;
    } else {
      d += `L${f(xb)} ${f(yb)}`; // pasa al carril del año siguiente
    }
  }
  return d;
}

/* ---------- El dibujo ---------- */

let pieza; // la lana sobre la mesa (la que se arrastra y, ya cortada, se lleva al telar)
let lana;
let hebras;
let suelta;
let punta;
let tijera;
let telar;

function dibujar() {
  svg.replaceChildren();
  // Las texturas (madera, metal, hebras de lana, pelusa, sombra) son las del dibujo de las instrucciones,
  // copiadas aquí con otro nombre; y la del velcro y la tela del telar, propias.
  const texturas = document.querySelector('.ilustracion defs')?.cloneNode(true) ?? el('defs');
  texturas.querySelectorAll('[id]').forEach((nodo) => (nodo.id = nodo.id.replace('ilu-', 'sim-')));
  const velcro = el('pattern', { id: 'sim-velcro', patternUnits: 'userSpaceOnUse', width: 4, height: 4 }, texturas);
  el('rect', { width: 4, height: 4, fill: '#e6ddcc' }, velcro);
  el('circle', { cx: 1, cy: 1, r: 0.7, fill: '#cfc3ad' }, velcro);
  el('circle', { cx: 3, cy: 3, r: 0.7, fill: '#d8cdb9' }, velcro);
  const tela = el('pattern', { id: 'sim-tela', patternUnits: 'userSpaceOnUse', width: 3, height: 3 }, texturas);
  el('rect', { width: 3, height: 3, fill: '#ebe3d3' }, tela);
  el('rect', { width: 3, height: 1, fill: '#e4dbc9' }, tela);
  el('rect', { width: 1, height: 3, fill: '#e7dfce' }, tela);
  svg.append(texturas);

  // La mesa de madera y, encima, el papel con la grilla.
  el('rect', { x: -300, y: -290, width: 690, height: 580, rx: 10, class: 'sim-mesa', fill: 'url(#sim-madera)' }, svg);
  el('rect', { x: -282, y: -272, width: 564, height: 544, rx: 4, class: 'sim-papel', filter: 'url(#sim-sombra)' }, svg);

  // La grilla: cuatro filas de 13 semanas, en zigzag. Cada casilla es una semana, con su número y de un color
  // distinto a la anterior; en los bordes, la banda da la vuelta a la fila siguiente.
  const grilla = el('g', { class: 'sim-grilla' }, svg);
  const m = GRILLA.media;
  for (let r = 0; r < SIM.filas - 1; r++) {
    const derecha = r % 2 === 0;
    const x = derecha ? GRILLA.derecha : GRILLA.izquierda;
    const y1 = yFila(r);
    const y2 = yFila(r + 1);
    const rAfuera = (y2 - y1) / 2 + m;
    const rAdentro = (y2 - y1) / 2 - m;
    const s = derecha ? 1 : 0;
    el('path', {
      d: `M${x} ${y1 - m}A${rAfuera} ${rAfuera} 0 0 ${s} ${x} ${y2 + m}L${x} ${y2 - m}A${rAdentro} ${rAdentro} 0 0 ${1 - s} ${x} ${y1 + m}Z`,
      class: 'sim-vuelta-grilla',
    }, grilla);
  }
  for (let i = 0; i < ANO; i++) {
    const [xa] = enGrilla(i);
    const [xb, y] = enGrilla(i + 0.999);
    const x = Math.min(xa, xb);
    el('rect', { x: f(x), y: f(y - m), width: f(ANCHO_SEMANA), height: 2 * m, class: `sim-casilla sim-casilla-${i % 2}` }, grilla);
    el('text', { x: f(x + ANCHO_SEMANA / 2), y: f(y - m * 0.62), class: 'sim-texto-semana' }, grilla).textContent = String(i + 1);
  }
  // Arriba de la grilla, mes a mes: una marca y "1 mes", "2 meses"… hasta "1 año", donde se cumple cada uno.
  for (let mes = 1; mes <= 12; mes++) {
    const sm = (mes * ANO) / 12;
    const [x, y] = enGrilla(sm, 0, true); // al final de su fila si cae justo en el borde
    el('line', { x1: f(x), y1: f(y - m - 7), x2: f(x), y2: f(y + m), class: 'sim-mes' }, grilla);
    el('text', { x: f(x), y: f(y - m - 11), class: 'sim-texto-mes' }, grilla).textContent = mes === 12 ? '1 año' : mes === 1 ? '1 mes' : `${mes} meses`;
  }
  const [xFin, yFin] = enGrilla(ANO);
  el('text', { x: f(xFin), y: f(yFin + m + 16), class: 'sim-texto-vuelta', style: 'text-anchor: start' }, svg).textContent = '↩ da la vuelta';
  // El 0, donde parte.
  const [x0, y0] = enGrilla(0);
  el('circle', { cx: f(x0), cy: f(y0), r: 9, class: 'sim-cero' }, svg);
  el('text', { x: f(x0), y: f(y0), class: 'sim-texto-cero' }, svg).textContent = '0';

  // Tu fecha: donde hay que cortar (en la pasada que le toque).
  const fecha = ubicar(Math.min(sim.semanas, SIM.maxAnos * ANO));
  const [cx, cy] = enGrilla(fecha.s);
  el('line', { x1: f(cx), y1: f(cy - m - 4), x2: f(cx), y2: f(cy + m + 4), class: 'sim-corte' }, svg);
  el('text', { x: f(cx), y: f(cy + m + 14), class: 'sim-texto-fecha' }, svg).textContent = `✂ tu fecha: ${sim.tiempo}`;

  // El telar, al lado.
  telar = el('g', { class: 'sim-telar' }, svg);
  dibujarTelar();

  // La lana: la que va apoyada en la grilla y la que sigue suelta hasta el ovillo.
  pieza = el('g', { class: 'sim-pieza', filter: 'url(#sim-pelusa)' }, svg);
  suelta = el('path', { class: 'sim-lana sim-suelta', style: `stroke: ${sim.color}` }, pieza);
  lana = el('path', { class: 'sim-lana', style: `stroke: ${sim.color}` }, pieza);
  hebras = el('path', { class: 'sim-lana-hebras' }, pieza);
  const ovillo = el('g', { filter: 'url(#sim-pelusa)' }, svg);
  el('circle', { cx: OVILLO.x, cy: OVILLO.y, r: OVILLO.r, style: `fill: ${sim.color}` }, ovillo);
  el('circle', { cx: OVILLO.x, cy: OVILLO.y, r: OVILLO.r, fill: 'url(#sim-hebras)', opacity: 0.6 }, ovillo);
  el('circle', { cx: OVILLO.x, cy: OVILLO.y, r: OVILLO.r, fill: 'url(#sim-ovillo)' }, svg);

  // La punta de la lana: de ahí se toma para arrastrarla.
  punta = el('circle', { r: 15, class: 'sim-punta', style: `stroke: ${sim.color}` }, svg);

  // La tijera, sobre la mesa: se arrastra hasta la lana para cortarla. Su punto de corte es (0, 0).
  tijera = el('g', { class: 'sim-tijera', filter: 'url(#sim-sombra)' }, svg);
  el('rect', { x: -40, y: -34, width: 110, height: 100, class: 'sim-tijera-zona' }, tijera);
  el('path', { d: 'M22 -4L-34 -18L-28 -9L22 4Z', class: 'sim-hoja' }, tijera);
  el('path', { d: 'M22 4L-34 19L-28 10L22 -4Z', class: 'sim-hoja' }, tijera);
  el('path', { d: 'M22 0L49 -15M22 0L46 27', class: 'sim-mango' }, tijera);
  el('ellipse', { cx: 66, cy: -23, rx: 18, ry: 12, class: 'sim-anillo' }, tijera);
  el('ellipse', { cx: 60, cy: 49, rx: 13, ry: 25, transform: 'rotate(-35 60 49)', class: 'sim-anillo' }, tijera);
  el('circle', { cx: 22, cy: 0, r: 4.5, class: 'sim-eje' }, tijera);
  ponerTijera(MESA_TIJERA.x, MESA_TIJERA.y);

  actualizar();
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
  const hasta = ultima + 2;
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
      if (i === 0) el('circle', { cx: f(tramo.empieza), cy: f(tramo.y + grosor / 2), r: f(grosor * 0.55), class: 'sim-nudo', style: `fill: ${color}` }, g);
    });
    return g;
  };

  // Las tiras que ya están.
  for (const otra of sim.tiras) tira(otra.desde, otra.largo, otra.color, 'sim-tira-vieja');
  // Dónde va la nueva (punteado, latiendo): ahí se lleva la lana cortada.
  const destino = el('g', { class: sim.pegada ? 'sim-destino sim-destino-listo' : 'sim-destino' }, telar);
  for (const tramo of tramos(nueva.desde, nueva.largo)) {
    el('rect', { x: f(tramo.x), y: f(tramo.y - 2), width: f(tramo.width), height: f(tramo.height + 4), rx: f(grosor / 2 + 2), style: `stroke: ${sim.color}` }, destino);
    if (tramo.sigue) el('path', { d: vuelta(tramo.fl), class: 'sim-destino-vuelta', style: `stroke: ${sim.color}` }, destino);
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
  // Mientras no se corte, la lana sigue unida al ovillo.
  suelta.setAttribute('d', sim.cortada ? '' : `M${f(px)} ${f(py)}Q${f((px + OVILLO.x) / 2)} ${f(Math.max(py, OVILLO.y) + 40)} ${OVILLO.x - 20} ${OVILLO.y + 10}`);
  punta.setAttribute('cx', f(px));
  punta.setAttribute('cy', f(py));
  punta.style.display = sim.cortada ? 'none' : '';
  pieza.style.display = sim.pegada ? 'none' : '';
  svg.classList.toggle('sim-cortada', sim.cortada);
}

/* ---------- Arrastrar la lana, la tijera y la lana cortada ---------- */

function puntoSvg(evento) {
  const matriz = svg.getScreenCTM();
  if (!matriz) return null;
  return new DOMPoint(evento.clientX, evento.clientY).matrixTransform(matriz.inverse());
}

/**
 * Las semanas de la lana (en todas sus pasadas) más cercanas al puntero, de la más cercana a la más lejana:
 * [{ t, distancia }]. En cada fila de la grilla, la semana que queda a la altura del puntero.
 */
function semanasBajo(p) {
  const lista = [];
  for (let r = 0; r < SIM.filas; r++) {
    const desdeIzquierda = (p.x - GRILLA.izquierda) / ANCHO_SEMANA;
    const u = Math.max(0, Math.min(SIM.semanasPorFila, r % 2 ? SIM.semanasPorFila - desdeIzquierda : desdeIzquierda));
    const s = r * SIM.semanasPorFila + u;
    for (let pasada = 0; pasada < SIM.maxAnos; pasada++) {
      const t = pasada * ANO + (pasada % 2 ? ANO - s : s);
      const [x, y] = enFila(r, u, CARRIL[pasada]);
      lista.push({ t, distancia: Math.hypot(p.x - x, p.y - y) });
    }
  }
  return lista.sort((a, b) => a.distancia - b.distancia);
}

/** La semana bajo el puntero que sigue a la lana desde donde va (para no saltar a otra fila). */
function siguienteSemana(p) {
  const cerca = semanasBajo(p).filter((c) => c.distancia < GRILLA.entreFilas * 0.6 && Math.abs(c.t - sim.avance) <= 2.5);
  // La más cercana al puntero (ya vienen ordenadas): así, al dar la vuelta, sigue por el carril de la
  // pasada en que va y no se devuelve por la anterior.
  return cerca.length ? cerca[0].t : null;
}

svg.addEventListener('pointerdown', (evento) => {
  if (!sim || sim.pegada) return;
  const p = puntoSvg(evento);
  if (!p) return;
  if (sim.cortada) {
    // Ya cortada: se toma la lana para llevarla al telar.
    if (!evento.target.closest('.sim-pieza')) return;
    sim.modo = 'pieza';
    sim.agarre = p;
  } else if (evento.target.closest('.sim-tijera')) {
    sim.modo = 'tijera';
  } else {
    // La lana se toma por su punta (no se puede saltar a otra parte de la grilla).
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
  if (!sim?.modo) return;
  const p = puntoSvg(evento);
  if (!p) return;
  if (sim.modo === 'tijera') {
    ponerTijera(p.x, p.y);
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
  if (!sim?.modo) return;
  const modo = sim.modo;
  sim.modo = null;
  svg.classList.remove('sim-arrastrando');
  const p = puntoSvg(evento);
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
  // La tijera corta donde se suelta, si está sobre la lana (en la línea de semana más cercana); después vuelve
  // a su lugar en la mesa.
  const sobreLana = p && semanasBajo(p).find((c) => c.distancia < 12 && c.t > 0.3 && c.t <= sim.avance + 0.3);
  ponerTijera(MESA_TIJERA.x, MESA_TIJERA.y);
  if (!sobreLana) return;
  sim.corte = Math.max(1, Math.round(sobreLana.t));
  sim.cortada = true;
  actualizar();
}
svg.addEventListener('pointerup', soltar);
svg.addEventListener('pointercancel', soltar);

botonReiniciar.addEventListener('click', () => {
  if (!sim) return;
  prepararSimulacion([...sim.tiras, sim.nueva], sim.tiempo);
});
