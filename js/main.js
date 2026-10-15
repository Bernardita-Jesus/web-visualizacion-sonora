import { PALABRAS, TITULOS } from './palabras.js';
import { cargarRespuestas, horaDe, palabrasDe } from './respuestas.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Coordenadas en unidades del viewBox (1400 × 1000).
const PATIO = { x: 150, y: 120, width: 1100, height: 760 };
const CENTER = { x: PATIO.x + PATIO.width / 2, y: PATIO.y + PATIO.height / 2 };

// Un solo micrófono, al centro del patio.
const MIC = { x: CENTER.x, y: CENTER.y, phase: Math.random() * Math.PI * 2 };

// El micrófono suelta hileras de palabras. La "cabeza" de la hilera avanza curvándose
// y las palabras la siguen por el mismo trazo, doblándose con él.
const EMIT = {
  interval: [0.5, 1.2], // segundos entre hileras
  words: [3, 6], // palabras por hilera
  speed: [60, 100], // velocidad de avance (unidades del viewBox por segundo)
  curl: 0.6, // curvatura base: tendencia a enroscarse en espiral (solo cerca del micrófono)
  flex: 0.45, // cuánto se flecta la curva hacia un lado y otro
  steer: 1.8, // radianes/s con que la hilera corrige su rumbo hacia su grupo
  freeTime: 1.2, // segundos que sale en espiral libre antes de buscar su grupo
  life: 30, // segundos máximos de una hilera (por si no llega a su grupo)
  fade: 1.5, // segundos de desvanecimiento
  absorb: 0.9, // segundos que tarda en desvanecerse al entrar a su grupo
  titleChance: 0.06, // probabilidad de que la hilera sea un título de libro
  titleSize: 18,
  responseChance: 0.05, // probabilidad por respuesta registrada de que una hilera sea una respuesta…
  responseMax: 0.5, // …hasta este máximo (así pocas respuestas no se repiten sin parar)
  responseWords: 8, // máximo de palabras de una respuesta por hilera
  armSpin: 0.7, // radianes/s que rota la dirección de salida
  burst: 6, // hileras extra al hacer clic en el micrófono
  max: 50, // tope de hileras simultáneas
};

// Tamaño según cuántas veces nombró la palabra su grupo.
const SIZE = { min: 11, max: 40, boldFrom: 0.7 };

// Tres grupos sobre el micrófono: cada hilera viaja hacia uno de ellos.
const GROUP_RADIUS = 85;
// Anillo de palabras recibidas que gira alrededor de cada círculo.
const ORBIT = { radius: GROUP_RADIUS + 16, fontSize: 14, speed: 0.25 }; // speed en radianes/s
const GROUPS = [
  { id: 'estudiantes', name: 'Estudiantes', x: CENTER.x - 330, y: PATIO.y + 190 },
  { id: 'funcionarios', name: 'Funcionarios', x: CENTER.x, y: PATIO.y + 190 },
  { id: 'externos', name: 'Externos', x: CENTER.x + 330, y: PATIO.y + 190 },
];

// Reloj simulado: recorre la jornada y el color de las palabras se enfría con las horas.
const DAY = {
  start: 8, // hora de inicio
  end: 22, // hora de término
  duration: 120, // segundos reales que dura la jornada completa
  hue: [38, -140], // de naranjo (mañana) pasando por rojo, magenta y violeta, hasta azul (noche)
  lightness: [48, 38],
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
  return `hsl(${hue.toFixed(0)} 80% ${lerp(DAY.lightness[0], DAY.lightness[1], t).toFixed(0)}%)`;
}

function formatHour(hour) {
  const h = Math.floor(hour);
  const m = Math.floor((hour - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/* ---------- Conteo simulado de menciones ---------- */

/**
 * Para la maqueta, cada grupo tiene un conteo inventado de cuántas veces se nombró cada palabra.
 * Sigue una distribución tipo Zipf: pocas palabras muy nombradas y muchas poco nombradas.
 */
function simulateCounts() {
  const shuffled = [...PALABRAS].sort(() => Math.random() - 0.5);
  const counts = shuffled.map((word, rank) => ({
    word,
    count: Math.max(1, Math.round(60 / (rank + 1) ** 0.9 + between([-1, 1]))),
  }));
  const total = counts.reduce((sum, { count }) => sum + count, 0);
  const max = counts[0].count;
  return { counts, total, max };
}

const CONTEOS = Object.fromEntries(GROUPS.map((group) => [group.id, simulateCounts()]));

/** Elige una palabra con probabilidad proporcional a sus menciones. */
function pickWeighted(groupId) {
  const { counts, total } = CONTEOS[groupId];
  let roll = Math.random() * total;
  for (const entry of counts) {
    roll -= entry.count;
    if (roll <= 0) return entry;
  }
  return counts.at(-1);
}

/** 0 = la menos nombrada, 1 = la más nombrada (escala logarítmica). */
function prominence(count, groupId) {
  return Math.log(count) / Math.log(CONTEOS[groupId].max);
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

function drawGroups(defs) {
  // Blanco al centro que se funde con el fondo hacia el borde del círculo.
  const fade = el('radialGradient', { id: 'difuminado-grupo' }, defs);
  el('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': 0.85 }, fade);
  el('stop', { offset: '60%', 'stop-color': '#ffffff', 'stop-opacity': 0.5 }, fade);
  el('stop', { offset: '100%', 'stop-color': '#ffffff', 'stop-opacity': 0 }, fade);

  GROUPS.forEach((group, index) => {
    const g = el('g', {
      class: 'grupo',
      transform: `translate(${group.x} ${group.y})`,
      role: 'button',
      tabindex: 0,
      'aria-label': `${group.name}: ver todas las palabras recibidas`,
    }, svg);
    group.ring = el('circle', { class: 'grupo-circulo', r: GROUP_RADIUS }, g);
    const name = el('text', { class: 'grupo-nombre', y: -8 }, g);
    name.textContent = group.name;
    group.counter = el('text', { class: 'grupo-contador', y: 14 }, g);
    group.counter.textContent = '0 palabras';

    // Trazo circular (centrado en el grupo) sobre el que giran las palabras recibidas.
    const r = ORBIT.radius;
    el('path', {
      id: `orbita-${group.id}`,
      d: `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r}`,
    }, defs);
    group.orbit = el('g', { class: 'orbita' }, g);
    group.orbitText = el('text', { class: 'orbita-texto', 'font-size': ORBIT.fontSize }, group.orbit);
    group.orbitPath = el('textPath', { href: `#orbita-${group.id}` }, group.orbitText);
    group.orbitAngle = Math.random() * 360;
    group.orbitTurn = index % 2 === 0 ? 1 : -1; // grupos vecinos giran en sentidos opuestos

    group.received = 0;
    group.recent = []; // últimas palabras, para el anillo
    group.tally = new Map(); // todas las palabras recibidas: texto → { count, color, isTitle }

    const open = () => openGroup(group);
    g.addEventListener('click', open);
    g.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  });
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
drawGroups(guides);
const clock = drawClock();
// Recorte con la forma del rectángulo: ninguna palabra se dibuja fuera de él.
const clip = el('clipPath', { id: 'recorte-patio' }, guides);
el('rect', { ...PATIO }, clip);
const layer = el('g', { class: 'streams', 'clip-path': 'url(#recorte-patio)' }, svg);
drawMic();

/* ---------- Hileras de palabras ---------- */

const streams = [];
let nextId = 0;

/** Hilera de vocabulario de Pizarnik: cada palabra con su tamaño según cuánto la nombró el grupo. */
function pizarnikRow(group) {
  if (Math.random() < EMIT.titleChance) {
    return [{ text: pickFrom(TITULOS), isTitle: true, size: EMIT.titleSize, weight: 400 }];
  }
  return Array.from({ length: randInt(EMIT.words) }, () => {
    const { word, count } = pickWeighted(group.id);
    const t = prominence(count, group.id);
    return { text: word, isTitle: false, size: lerp(SIZE.min, SIZE.max, t), weight: t >= SIZE.boldFrom ? 600 : 400 };
  });
}

/**
 * Hilera con una respuesta del modo registro: viaja a su grupo, con el color de la hora en que se registró.
 * El tamaño depende de cuántas respuestas de ese grupo usan la misma palabra.
 */
function responseRow(respuestas, respuesta = pickFrom(respuestas)) {
  const group = GROUPS.find(({ id }) => id === respuesta.grupo);
  const words = palabrasDe(respuesta.texto).slice(0, EMIT.responseWords);
  if (!group || words.length === 0) return null;

  const counts = new Map();
  for (const otra of respuestas) {
    if (otra.grupo !== group.id) continue;
    for (const palabra of new Set(palabrasDe(otra.texto))) counts.set(palabra, (counts.get(palabra) ?? 0) + 1);
  }
  const max = Math.max(...counts.values(), 2);

  return {
    group,
    color: hourColor(horaDe(respuesta)),
    items: words.map((word) => {
      const t = Math.log(counts.get(word) ?? 1) / Math.log(max);
      // Las respuestas reales parten un poco más grandes que las palabras simuladas.
      return { text: word, isTitle: false, size: lerp(SIZE.min + 8, SIZE.max, t), weight: 600 };
    }),
  };
}

/** Llena el textPath con las palabras de la hilera, cada una con su propio tamaño. */
function fillRow(textPath, items) {
  items.forEach((item, i) => {
    const tspan = el('tspan', { 'font-size': item.size.toFixed(1), 'font-weight': item.weight }, textPath);
    if (item.isTitle) tspan.setAttribute('class', 'title');
    // Espacios duros para que el separador no se colapse entre tspans.
    tspan.textContent = i < items.length - 1 ? `${item.text}\u00a0\u00a0` : item.text;
  });
  return items.map(({ text, isTitle }) => ({ text, isTitle }));
}

function spawn(angleOffset = 0, forcedRow = null) {
  if (streams.length >= EMIT.max && !forcedRow) return;
  const id = `hilera-${nextId++}`;
  const heading = MIC.phase + angleOffset + between([-0.3, 0.3]);

  const respuestas = cargarRespuestas();
  const chance = Math.min(respuestas.length * EMIT.responseChance, EMIT.responseMax);
  const row = forcedRow ?? (respuestas.length > 0 && Math.random() < chance ? responseRow(respuestas) : null);
  const group = row?.group ?? pickFrom(GROUPS);
  const color = row?.color ?? hourColor(clockHour());

  const path = el('path', { id }, guides);
  const textNode = el('text', { class: 'stream', style: `fill: ${color}` }, layer);
  const textPath = el('textPath', { href: `#${id}` }, textNode);
  const words = fillRow(textPath, row?.items ?? pizarnikRow(group));
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

  // Al entrar al círculo, la hilera se absorbe y suma sus palabras al contador del grupo.
  if (s.arrivedAt === null && Math.hypot(s.head.x - s.group.x, s.head.y - s.group.y) < GROUP_RADIUS * 0.8) {
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

function receive(group, words, color) {
  group.received += words.length;
  group.counter.textContent = `${group.received} palabras`;

  for (const { text, isTitle } of words) {
    const entry = group.tally.get(text) ?? { count: 0, isTitle };
    entry.count += 1;
    entry.color = color; // color de la última vez que se nombró
    group.tally.set(text, entry);
    group.recent.unshift({ text, isTitle, color });
  }
  group.recent.length = Math.min(group.recent.length, 40);
  if (dialog.open && dialog.dataset.group === group.id) fillDialog(group);
  renderOrbit(group);
  // Pulso breve del círculo al recibir palabras.
  group.ring.classList.remove('recibe');
  void group.ring.getBoundingClientRect(); // fuerza el reinicio de la animación
  group.ring.classList.add('recibe');
}

/** Llena el anillo con las palabras más recientes que caben en la circunferencia. */
function renderOrbit(group) {
  const limit = 2 * Math.PI * ORBIT.radius * 0.96;
  group.orbitPath.replaceChildren();
  for (const { text, isTitle, color } of group.recent) {
    const tspan = el('tspan', { style: `fill: ${color}` }, group.orbitPath);
    if (isTitle) tspan.setAttribute('class', 'title');
    tspan.textContent = `${text}  `;
    if (group.orbitText.getComputedTextLength() > limit) {
      tspan.remove();
      break;
    }
  }
}

function spinOrbits(dt) {
  for (const group of GROUPS) {
    group.orbitAngle = (group.orbitAngle + group.orbitTurn * ORBIT.speed * dt * (180 / Math.PI)) % 360;
    group.orbit.setAttribute('transform', `rotate(${group.orbitAngle.toFixed(2)})`);
  }
}

/* ---------- Ventana con todas las palabras de un grupo ---------- */

const dialog = document.querySelector('#grupo-dialogo');
const dialogTitle = document.querySelector('#grupo-dialogo-titulo');
const dialogSummary = document.querySelector('#grupo-dialogo-resumen');
const dialogWords = document.querySelector('#grupo-dialogo-palabras');

function fillDialog(group) {
  dialogTitle.textContent = group.name;
  const entries = [...group.tally.entries()].sort((a, b) => b[1].count - a[1].count);
  dialogSummary.textContent = entries.length
    ? `${group.received} palabras recibidas · ${entries.length} distintas`
    : 'Todavía no llegan palabras a este grupo.';

  const max = entries[0]?.[1].count ?? 1;
  dialogWords.replaceChildren(...entries.map(([text, { count, color, isTitle }]) => {
    const item = document.createElement('li');
    item.textContent = text;
    item.title = `${count} ${count === 1 ? 'vez' : 'veces'}`;
    item.style.color = color;
    item.style.fontSize = `${lerp(0.85, 2.1, Math.log(count) / Math.log(Math.max(max, 2))).toFixed(2)}rem`;
    if (isTitle) item.classList.add('title');
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
  const row = responseRow(cargarRespuestas(), respuesta);
  if (row) spawn(0, row);
}

function frame(now) {
  // Limita el salto de tiempo al volver de otra pestaña.
  const dt = Math.min(Math.max((now - last) / 1000, 0), 0.1);
  last = now;

  if (active && !paused) {
    tickClock(dt);
    spinOrbits(dt);
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
