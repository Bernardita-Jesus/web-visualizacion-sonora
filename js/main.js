import { cargarRespuestas, horaDe, palabrasDe, tematicaDe } from './respuestas.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Coordenadas en unidades del viewBox (1400 × 1000).
const PATIO = { x: 150, y: 120, width: 1100, height: 760 };
const CENTER = { x: PATIO.x + PATIO.width / 2, y: PATIO.y + PATIO.height / 2 };

// Un solo micrófono, al centro del patio.
const MIC = { x: CENTER.x, y: CENTER.y, phase: Math.random() * Math.PI * 2 };

// El micrófono suelta hileras de palabras. La "cabeza" de la hilera avanza curvándose
// y las palabras la siguen por el mismo trazo, doblándose con él.
const EMIT = {
  interval: [1.2, 2.5], // segundos entre hileras (cada una repite una respuesta registrada)
  speed: [60, 100], // velocidad de avance (unidades del viewBox por segundo)
  curl: 0.6, // curvatura base: tendencia a enroscarse en espiral (solo cerca del micrófono)
  flex: 0.45, // cuánto se flecta la curva hacia un lado y otro
  steer: 1.8, // radianes/s con que la hilera corrige su rumbo hacia su grupo
  freeTime: 1.2, // segundos que sale en espiral libre antes de buscar su grupo
  life: 30, // segundos máximos de una hilera (por si no llega a su grupo)
  fade: 1.5, // segundos de desvanecimiento
  absorb: 0.9, // segundos que tarda en desvanecerse al entrar a su grupo
  responseWords: 8, // máximo de palabras de una respuesta por hilera
  armSpin: 0.7, // radianes/s que rota la dirección de salida
  burst: 6, // hileras extra al hacer clic en el micrófono
  max: 50, // tope de hileras simultáneas
};

// Tamaño según en cuántos pendientes de la temática aparece la palabra.
const SIZE = { min: 16, max: 40, boldFrom: 0.7 };

// Una nube de palabras por temática (bitácora, Escala 02), repartidas en un óvalo alrededor del
// micrófono: cada pendiente viaja hacia su temática y sus palabras se suman a esa nube.
const ARRIVE_RADIUS = 45; // distancia al centro de la nube a la que una hilera se considera llegada
// Nube: área (elipse) donde caben sus palabras, tope de palabras visibles y tamaños de letra.
const CLOUD = { rx: 140, ry: 90, maxWords: 30, size: [14, 34], boldFrom: 0.6, pad: 3 };
const GROUP_LAYOUT = { rx: 420, ry: 270 }; // radios del óvalo donde se ubican las nubes
const GROUPS = [
  { id: 'estudios', name: 'Estudios', lines: ['Estudios'] },
  { id: 'trabajo', name: 'Trabajo', lines: ['Trabajo'] },
  { id: 'vinculos', name: 'Vínculos', lines: ['Vínculos'] },
  { id: 'familia', name: 'Familia', lines: ['Familia'] },
  { id: 'uno-mismo', name: 'Uno mismo', lines: ['Uno', 'mismo'] },
  { id: 'salud', name: 'Salud y cuerpo', lines: ['Salud y', 'cuerpo'] },
  { id: 'suenos', name: 'Sueños y proyectos', lines: ['Sueños y', 'proyectos'] },
  { id: 'otros', name: 'Otros', lines: ['Otros'] },
].map((group, i, all) => {
  const angle = -Math.PI / 2 + (i / all.length) * Math.PI * 2; // el primero arriba, en sentido horario
  return { ...group, x: MIC.x + Math.cos(angle) * GROUP_LAYOUT.rx, y: MIC.y + Math.sin(angle) * GROUP_LAYOUT.ry };
});

// Reloj simulado: recorre la jornada y el color de las palabras se enfría con las horas.
const DAY = {
  start: 8, // hora de inicio
  end: 22, // hora de término
  duration: 120, // segundos reales que dura la jornada completa
  // Tonos de la portada: de terracota (mañana) pasando por rosa y ciruela apagados, hasta azul pizarra (noche).
  hue: [20, -148],
  saturation: [58, 40],
  lightness: [50, 38],
};

const STEP = 3; // distancia mínima entre puntos del trazo
// Margen interior donde las hileras rebotan: media palabra grande, para que choquen con el borde sin cortarse.
const WALL = SIZE.max / 2 + 4;

const svg = document.querySelector('#plano');
const pauseButton = document.querySelector('#btn-pausa');

/* ---------- Aleatorio ---------- */

const between = ([min, max]) => min + Math.random() * (max - min);
const randInt = ([min, max]) => Math.floor(between([min, max + 1]));
const pickFrom = (list) => list[randInt([0, list.length - 1])];
const lerp = (a, b, t) => a + (b - a) * t;

/** Color de una hora del día: cálido en la mañana, frío en la noche. */
export function hourColor(hour) {
  const t = Math.min(Math.max((hour - DAY.start) / (DAY.end - DAY.start), 0), 1);
  const hue = (lerp(DAY.hue[0], DAY.hue[1], t) + 360) % 360;
  const saturation = lerp(DAY.saturation[0], DAY.saturation[1], t);
  return `hsl(${hue.toFixed(0)} ${saturation.toFixed(0)}% ${lerp(DAY.lightness[0], DAY.lightness[1], t).toFixed(0)}%)`;
}

/** Hora en formato de 12 horas con AM / PM, por ejemplo "3:30 PM". */
function formatHour(hour) {
  const h = Math.floor(hour);
  const m = Math.floor((hour - h) * 60);
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/* ---------- Dibujo estático ---------- */

function el(name, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  parent?.appendChild(node);
  return node;
}

function drawPatio() {
  const patio = el('rect', { class: 'patio', ...PATIO }, svg);
  el('title', {}, patio).textContent = 'Clic para ver en pantalla completa';
  patio.addEventListener('click', toggleFullscreen);
}

/** Anillos concéntricos tenues alrededor del micrófono, como ondas de voz. */
function drawRipples() {
  const g = el('g', { class: 'ondas', 'clip-path': 'url(#recorte-patio)' }, svg);
  for (const r of [50, 95, 150, 215, 290, 375]) el('circle', { cx: MIC.x, cy: MIC.y, r }, g);
}

function drawGroups() {
  for (const group of GROUPS) {
    const g = el('g', {
      class: 'grupo',
      transform: `translate(${group.x} ${group.y})`,
      role: 'button',
      tabindex: 0,
      'aria-label': `${group.name}: ver todos sus pendientes`,
    }, svg);
    // Zona invisible para hacer clic en la nube (se insinúa al pasar el mouse).
    el('ellipse', { class: 'nube-zona', rx: CLOUD.rx, ry: CLOUD.ry }, g);
    // Nombre de la temática al centro, en una o dos líneas, con el contador debajo.
    const label = el('g', { class: 'nube-etiqueta' }, g);
    const top = -6 - (group.lines.length - 1) * 7;
    group.lines.forEach((line, i) => {
      el('text', { class: 'grupo-nombre', y: top + i * 14 }, label).textContent = line;
    });
    group.counter = el('text', { class: 'grupo-contador', y: top + group.lines.length * 14 + 2 }, label);
    group.label = label;
    group.wordsLayer = el('g', { class: 'nube-palabras' }, g);

    group.cloud = new Map(); // palabras dibujadas: texto → { node, box, size }
    group.arrived = new Set(); // palabras que ya llegaron a la nube
    group.tally = new Map(); // palabras de los pendientes de la temática: texto → { count, color }
    group.responses = 0;

    const open = () => openGroup(group);
    g.addEventListener('click', open);
    g.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  }
}

// Aviso mientras todavía no hay respuestas registradas.
function drawEmptyHint() {
  const hint = el('text', { class: 'aviso-vacio', x: MIC.x, y: MIC.y + 70 }, svg);
  hint.textContent = 'Aún no hay pendientes: cuenta el tuyo en el modo registro';
  return hint;
}

function drawClock() {
  const clock = el('text', { class: 'reloj', x: PATIO.x + PATIO.width - 24, y: PATIO.y + 24 }, svg);
  return clock;
}

function drawMic() {
  const g = el('g', {
    class: 'mic',
    transform: `translate(${MIC.x} ${MIC.y})`,
    role: 'button',
    tabindex: 0,
    'aria-label': 'Micrófono: soltar una ráfaga de palabras',
  }, svg);

  el('circle', { class: 'pulse', r: 22 }, g);
  el('circle', { class: 'pulse', r: 22 }, g);
  el('circle', { class: 'mic-bg', r: 22 }, g);
  el('rect', { class: 'mic-body', x: -6, y: -14, width: 12, height: 18, rx: 6 }, g);
  el('path', { class: 'mic-stand', d: 'M -10 -2 a 10 10 0 0 0 20 0 M 0 8 V 13 M -6 13 H 6' }, g);

  const burst = () => {
    for (let i = 0; i < EMIT.burst; i++) spawn((i / EMIT.burst) * Math.PI * 2);
  };
  g.addEventListener('click', burst);
  g.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      burst();
    }
  });
}

drawPatio();
// Trazos invisibles (guías de las hileras y órbitas) y texto van entre el patio y el micrófono.
const guides = el('defs', {}, svg);
drawRipples();
drawGroups();
const clock = drawClock();
const emptyHint = drawEmptyHint();
// Recorte con la forma del rectángulo: ninguna palabra se dibuja fuera de él.
const clip = el('clipPath', { id: 'recorte-patio' }, guides);
el('rect', { ...PATIO }, clip);
const layer = el('g', { class: 'streams', 'clip-path': 'url(#recorte-patio)' }, svg);
drawMic();

/* ---------- Hileras de palabras ---------- */

const streams = [];
let nextId = 0;

/**
 * Hilera con una respuesta del modo registro: viaja a su grupo, con el color de la hora en que se registró.
 * El tamaño depende de cuántas respuestas de ese grupo usan la misma palabra.
 */
function responseRow(respuestas, respuesta = pickFrom(respuestas)) {
  const group = GROUPS.find(({ id }) => id === tematicaDe(respuesta.texto));
  const words = palabrasDe(respuesta.texto).slice(0, EMIT.responseWords);
  if (!group || words.length === 0) return null;

  const counts = new Map();
  for (const otra of respuestas) {
    if (tematicaDe(otra.texto) !== group.id) continue;
    for (const palabra of new Set(palabrasDe(otra.texto))) counts.set(palabra, (counts.get(palabra) ?? 0) + 1);
  }
  const max = Math.max(...counts.values(), 2);

  return {
    group,
    color: hourColor(horaDe(respuesta)),
    items: words.map((word) => {
      const t = Math.log(counts.get(word) ?? 1) / Math.log(max);
      return { text: word, size: lerp(SIZE.min, SIZE.max, t), weight: t >= SIZE.boldFrom ? 600 : 400 };
    }),
  };
}

/** Llena el textPath con las palabras de la hilera, cada una con su propio tamaño. */
function fillRow(textPath, items) {
  items.forEach((item, i) => {
    const tspan = el('tspan', { 'font-size': item.size.toFixed(1), 'font-weight': item.weight }, textPath);
    // Espacios duros para que el separador no se colapse entre tspans.
    tspan.textContent = i < items.length - 1 ? `${item.text}\u00a0\u00a0` : item.text;
  });
  return items.map(({ text }) => text);
}

function spawn(angleOffset = 0, forcedRow = null) {
  if (streams.length >= EMIT.max && !forcedRow) return;
  // Solo salen palabras de las respuestas registradas: sin respuestas, no sale nada.
  const respuestas = cargarRespuestas();
  const row = forcedRow ?? (respuestas.length > 0 ? responseRow(respuestas) : null);
  if (!row) return;
  const { group, color } = row;

  const id = `hilera-${nextId++}`;
  const heading = MIC.phase + angleOffset + between([-0.3, 0.3]);
  const path = el('path', { id }, guides);
  const textNode = el('text', { class: 'stream', style: `fill: ${color}` }, layer);
  const textPath = el('textPath', { href: `#${id}` }, textNode);
  const words = fillRow(textPath, row.items);
  const textLength = textNode.getComputedTextLength();

  // Arranca en el borde del ícono, no en su centro.
  const start = { x: MIC.x + Math.cos(heading) * 24, y: MIC.y + Math.sin(heading) * 24 };

  streams.push({
    path,
    textNode,
    textPath,
    textLength,
    points: [start],
    lengths: [0], // distancia acumulada desde el origen hasta cada punto
    head: { ...start },
    heading,
    turn: Math.random() < 0.5 ? 1 : -1, // sentido de giro: mezclados para que se enreden
    speed: between(EMIT.speed),
    flexFreq: between([0.4, 1.1]),
    flexPhase: Math.random() * Math.PI * 2,
    age: 0,
    group,
    words,
    color,
    arrivedAt: null, // momento en que entró a su grupo
  });
}

/** Rebote contra los bordes del rectángulo: refleja la dirección como una pelota. */
function bounce(s) {
  const left = PATIO.x + WALL;
  const right = PATIO.x + PATIO.width - WALL;
  const top = PATIO.y + WALL;
  const bottom = PATIO.y + PATIO.height - WALL;

  if (s.head.x < left || s.head.x > right) {
    s.heading = Math.PI - s.heading;
    s.head.x = Math.min(Math.max(s.head.x, left), right);
  }
  if (s.head.y < top || s.head.y > bottom) {
    s.heading = -s.heading;
    s.head.y = Math.min(Math.max(s.head.y, top), bottom);
  }
}

/** Ángulo en (-π, π]. */
const wrapAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

function advance(s, dt) {
  const distance = Math.hypot(s.head.x - MIC.x, s.head.y - MIC.y);
  // Curvatura: se enrosca alrededor del micrófono (más suave al alejarse) y se flecta con una onda.
  const curl = (s.turn * EMIT.curl) / (1 + distance / 60);
  const flex = Math.sin(s.age * s.flexFreq + s.flexPhase) * EMIT.flex;
  s.heading += (curl + flex) * dt;

  // Después de salir en espiral, corrige el rumbo poco a poco hacia su grupo.
  if (s.age > EMIT.freeTime) {
    const target = Math.atan2(s.group.y - s.head.y, s.group.x - s.head.x);
    const delta = wrapAngle(target - s.heading);
    const maxTurn = EMIT.steer * dt;
    s.heading += Math.min(Math.max(delta, -maxTurn), maxTurn);
  }

  s.head.x += Math.cos(s.heading) * s.speed * dt;
  s.head.y += Math.sin(s.heading) * s.speed * dt;
  bounce(s);

  // Al llegar a su nube, la hilera se absorbe y sus palabras se suman a la nube.
  if (s.arrivedAt === null && Math.hypot(s.head.x - s.group.x, s.head.y - s.group.y) < ARRIVE_RADIUS) {
    s.arrivedAt = s.age;
    receive(s.group, s.words, s.color);
  }

  const lastPoint = s.points.at(-1);
  const segment = Math.hypot(s.head.x - lastPoint.x, s.head.y - lastPoint.y);
  if (segment >= STEP) {
    s.points.push({ ...s.head });
    s.lengths.push(s.lengths.at(-1) + segment);
  }

  // Descarta la cola que ya no lleva texto, para que el trazo no crezca sin límite.
  const total = s.lengths.at(-1);
  while (s.points.length > 2 && total - s.lengths[1] > s.textLength + 20) {
    s.points.shift();
    s.lengths.shift();
  }
}

function render(s) {
  s.path.setAttribute('d', 'M ' + s.points.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L '));
  // El final del texto va pegado a la cabeza: las palabras avanzan en fila y van apareciendo desde el micrófono.
  const pathLength = s.lengths.at(-1) - s.lengths[0];
  s.textPath.setAttribute('startOffset', (pathLength - s.textLength).toFixed(1));

  const fadeIn = Math.min(s.age / 0.4, 1);
  const fadeOut = s.arrivedAt !== null
    ? 1 - (s.age - s.arrivedAt) / EMIT.absorb
    : Math.min((EMIT.life + EMIT.fade - s.age) / EMIT.fade, 1);
  s.textNode.setAttribute('opacity', Math.max(0, Math.min(fadeIn, fadeOut)).toFixed(2));
}

function update(dt) {
  for (let i = streams.length - 1; i >= 0; i--) {
    const s = streams[i];
    s.age += dt;
    const absorbed = s.arrivedAt !== null && s.age - s.arrivedAt >= EMIT.absorb;
    if (absorbed || s.age >= EMIT.life + EMIT.fade) {
      s.path.remove();
      s.textNode.remove();
      streams.splice(i, 1);
      continue;
    }
    advance(s, dt);
    render(s);
  }
}

function receive(group, words) {
  const nuevas = new Set(words.filter((word) => !group.arrived.has(word)));
  for (const word of words) group.arrived.add(word);
  renderCloud(group, nuevas);
}

/* ---------- Nube de palabras ---------- */

const overlaps = (a, b) =>
  a.x < b.x + b.w + CLOUD.pad && b.x < a.x + a.w + CLOUD.pad && a.y < b.y + b.h + CLOUD.pad && b.y < a.y + a.h + CLOUD.pad;

/** Caja de un elemento centrado en (cx, cy), a partir de su tamaño medido. */
const boxAt = (bbox, cx, cy) => ({ x: bbox.x + cx, y: bbox.y + cy, w: bbox.width, h: bbox.height });

/**
 * Dibuja la nube de una temática. Las palabras que ya estaban no se mueven (la nube se va formando);
 * las nuevas, o las que cambiaron de tamaño, buscan lugar en espiral desde el centro hacia afuera.
 */
function renderCloud(group, nuevas = new Set()) {
  // Las más nombradas primero; solo las que ya llegaron, hasta el tope de la nube.
  const visibles = [...group.arrived]
    .filter((word) => group.tally.has(word))
    .sort((a, b) => group.tally.get(b).count - group.tally.get(a).count)
    .slice(0, CLOUD.maxWords);
  const max = Math.max(...visibles.map((word) => group.tally.get(word).count), 2);

  const sizeOf = (word) => {
    const t = Math.log(group.tally.get(word).count) / Math.log(max);
    return { size: lerp(CLOUD.size[0], CLOUD.size[1], t), bold: t >= CLOUD.boldFrom };
  };

  // Quita las que salieron de la nube o cambiaron de tamaño (se vuelven a ubicar).
  for (const [word, placed] of group.cloud) {
    if (!visibles.includes(word) || Math.abs(sizeOf(word).size - placed.size) > 0.5) {
      placed.node.remove();
      group.cloud.delete(word);
    }
  }

  const ocupadas = [boxAt(group.label.getBBox(), 0, 0), ...[...group.cloud.values()].map((p) => p.box)];

  for (const word of visibles) {
    const { color } = group.tally.get(word);
    const placed = group.cloud.get(word);
    if (placed) {
      placed.node.style.fill = color;
      continue;
    }

    const { size, bold } = sizeOf(word);
    const node = el('text', {
      class: nuevas.has(word) ? 'nube-palabra nueva' : 'nube-palabra',
      'font-size': size.toFixed(1),
      'font-weight': bold ? 600 : 400,
      style: `fill: ${color}`,
    }, group.wordsLayer);
    node.textContent = word;
    const bbox = node.getBBox();

    // Espiral (más ancha que alta) desde el centro: primer lugar libre dentro de la nube.
    let lugar = null;
    for (let step = 0; step < 600 && !lugar; step++) {
      const angle = step * 0.45;
      const radius = step * 0.55;
      const cx = Math.cos(angle) * radius * 1.6;
      const cy = Math.sin(angle) * radius;
      const box = boxAt(bbox, cx, cy);
      const dentro = ((box.x + box.w / 2) / CLOUD.rx) ** 2 + ((box.y + box.h / 2) / CLOUD.ry) ** 2 <= 1
        && Math.abs(cx) + box.w / 2 <= CLOUD.rx + 10;
      if (dentro && !ocupadas.some((other) => overlaps(box, other))) lugar = { cx, cy, box };
    }

    if (!lugar) {
      node.remove(); // no cabe: sigue disponible en la ventana de la temática
      continue;
    }
    node.setAttribute('x', lugar.cx.toFixed(1));
    node.setAttribute('y', lugar.cy.toFixed(1));
    ocupadas.push(lugar.box);
    group.cloud.set(word, { node, box: lugar.box, size });
  }
}

/* ---------- Conteo real de las respuestas de cada grupo ---------- */

let cloudsReady = false;

/** Recalcula contadores y palabras a partir de los pendientes guardados. */
function refreshGroups() {
  const respuestas = cargarRespuestas();
  emptyHint.style.display = respuestas.length ? 'none' : '';

  for (const group of GROUPS) {
    const propias = respuestas.filter((r) => tematicaDe(r.texto) === group.id);
    group.responses = propias.length;
    group.counter.textContent = `${propias.length} ${propias.length === 1 ? 'pendiente' : 'pendientes'}`;

    group.tally = new Map();
    for (const respuesta of propias) {
      const color = hourColor(horaDe(respuesta));
      for (const palabra of palabrasDe(respuesta.texto)) {
        const entry = group.tally.get(palabra) ?? { count: 0 };
        entry.count += 1;
        entry.color = color; // color de la última vez que se dijo
        group.tally.set(palabra, entry);
      }
    }

    // Al abrir la página, la nube parte con las palabras de los pendientes ya guardados.
    if (!cloudsReady) {
      for (const word of group.tally.keys()) group.arrived.add(word);
      renderCloud(group);
    }
    if (dialog.open && dialog.dataset.group === group.id) fillDialog(group);
  }
  cloudsReady = true;
}

// Si se registran respuestas en otra pestaña del mismo navegador, se actualiza.
window.addEventListener('storage', refreshGroups);

/* ---------- Ventana con todas las palabras de un grupo ---------- */

const dialog = document.querySelector('#grupo-dialogo');
const dialogTitle = document.querySelector('#grupo-dialogo-titulo');
const dialogSummary = document.querySelector('#grupo-dialogo-resumen');
const dialogWords = document.querySelector('#grupo-dialogo-palabras');

function fillDialog(group) {
  dialogTitle.textContent = group.name;
  const entries = [...group.tally.entries()].sort((a, b) => b[1].count - a[1].count);
  dialogSummary.textContent = entries.length
    ? `${group.responses} ${group.responses === 1 ? 'pendiente' : 'pendientes'} · ${entries.length} palabras distintas`
    : 'Todavía no hay pendientes de esta temática.';

  const max = entries[0]?.[1].count ?? 1;
  dialogWords.replaceChildren(...entries.map(([text, { count, color }]) => {
    const item = document.createElement('li');
    item.textContent = text;
    item.title = `${count} ${count === 1 ? 'vez' : 'veces'}`;
    item.style.color = color;
    item.style.fontSize = `${lerp(0.85, 2.1, Math.log(count) / Math.log(Math.max(max, 2))).toFixed(2)}rem`;
    return item;
  }));
}

function openGroup(group) {
  dialog.dataset.group = group.id;
  fillDialog(group);
  dialog.showModal();
}

document.querySelector('#grupo-dialogo-cerrar').addEventListener('click', () => dialog.close());
// Cerrar al hacer clic fuera del contenido.
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

/* ---------- Pantalla completa ---------- */

const planoWrap = document.querySelector('.plano-wrap');

/** Agranda la visualización (simbología + plano) a toda la pantalla, o vuelve a su mitad. */
function toggleFullscreen() {
  // Si ya está agrandada (de cualquiera de las dos formas), vuelve a su mitad.
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

/* ---------- Reloj ---------- */

let dayElapsed = 0;
const scaleMark = document.querySelector('#escala-marca');

function clockHour() {
  return DAY.start + (dayElapsed / DAY.duration) * (DAY.end - DAY.start);
}

function tickClock(dt) {
  dayElapsed = (dayElapsed + dt) % DAY.duration;
  const hour = clockHour();
  clock.textContent = formatHour(hour);
  clock.style.fill = hourColor(hour);
  // Marca de la hora actual sobre la barra de colores de la simbología.
  if (scaleMark) scaleMark.style.left = `${((hour - DAY.start) / (DAY.end - DAY.start)) * 100}%`;
}

/* ---------- Bucle ---------- */

let timer = 0;
let paused = false;
let active = false; // la animación solo corre mientras se ve la pantalla de visualización
let last = performance.now();

export function activarVisualizacion(visible) {
  active = visible;
  last = performance.now();
}

/** Lanza de inmediato una respuesta recién registrada, para verla viajar a su grupo. */
export function lanzarRespuesta(respuesta) {
  refreshGroups();
  const row = responseRow(cargarRespuestas(), respuesta);
  if (row) spawn(0, row);
}

function frame(now) {
  // Limita el salto de tiempo al volver de otra pestaña.
  const dt = Math.min(Math.max((now - last) / 1000, 0), 0.1);
  last = now;

  if (active && !paused) {
    tickClock(dt);
    MIC.phase += EMIT.armSpin * dt;
    timer -= dt;
    if (timer <= 0) {
      spawn();
      timer = between(EMIT.interval);
    }
    update(dt);
  }
  requestAnimationFrame(frame);
}

refreshGroups();
requestAnimationFrame(frame);

/* ---------- Simbología: colores generados con la misma función que las hileras ---------- */

function gradient(fromHour, toHour, steps = 15) {
  const stops = Array.from({ length: steps }, (_, i) => hourColor(lerp(fromHour, toHour, i / (steps - 1))));
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

document.querySelector('#escala-hora').style.background = gradient(DAY.start, DAY.end);

pauseButton.addEventListener('click', () => {
  paused = !paused;
  pauseButton.textContent = paused ? 'Reanudar' : 'Pausar';
  svg.classList.toggle('is-paused', paused);
});
