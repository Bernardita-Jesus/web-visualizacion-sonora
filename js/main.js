import { PALABRAS, TITULOS } from './palabras.js';

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
  speed: [45, 80], // velocidad de avance (unidades del viewBox por segundo)
  curl: 1.6, // curvatura base: tendencia a enroscarse en espiral
  flex: 1.4, // cuánto se flecta la curva hacia un lado y otro
  life: [9, 15], // segundos que avanza una hilera antes de desvanecerse
  fade: 1.5, // segundos de desvanecimiento
  titleChance: 0.06, // probabilidad de que la hilera sea un título de libro
  titleSize: 18,
  armSpin: 0.7, // radianes/s que rota la dirección de salida
  burst: 6, // hileras extra al hacer clic en el micrófono
  max: 50, // tope de hileras simultáneas
};

// Tamaño según cuántas veces se nombró la palabra en su semana.
const SIZE = { min: 11, max: 40, boldFrom: 0.7 };

// Cada hilera pertenece a una semana, que define su color.
const SEMANAS = {
  anterior: { hue: [348, 362], saturation: 75, lightness: [40, 50] }, // rojos
  actual: { hue: [205, 228], saturation: 75, lightness: [38, 48] }, // azules
};

const STEP = 3; // distancia mínima entre puntos del trazo

const svg = document.querySelector('#plano');
const pauseButton = document.querySelector('#btn-pausa');

/* ---------- Aleatorio ---------- */

const between = ([min, max]) => min + Math.random() * (max - min);
const randInt = ([min, max]) => Math.floor(between([min, max + 1]));
const pickFrom = (list) => list[randInt([0, list.length - 1])];
const lerp = (a, b, t) => a + (b - a) * t;

function weekColor(week) {
  const { hue, saturation, lightness } = SEMANAS[week];
  return `hsl(${(between(hue) % 360).toFixed(0)} ${saturation}% ${between(lightness).toFixed(0)}%)`;
}

/* ---------- Conteo simulado de menciones ---------- */

/**
 * Para la maqueta, cada semana tiene un conteo inventado de cuántas veces se nombró cada palabra.
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

const CONTEOS = { anterior: simulateCounts(), actual: simulateCounts() };

/** Elige una palabra con probabilidad proporcional a sus menciones. */
function pickWeighted(week) {
  const { counts, total } = CONTEOS[week];
  let roll = Math.random() * total;
  for (const entry of counts) {
    roll -= entry.count;
    if (roll <= 0) return entry;
  }
  return counts.at(-1);
}

/** 0 = la menos nombrada, 1 = la más nombrada (escala logarítmica). */
function prominence(count, week) {
  return Math.log(count) / Math.log(CONTEOS[week].max);
}

/* ---------- Dibujo estático ---------- */

function el(name, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  parent?.appendChild(node);
  return node;
}

function drawPatio() {
  el('rect', { class: 'patio', ...PATIO }, svg);
  const label = el('text', { class: 'patio-label', x: PATIO.x + 24, y: PATIO.y + 24 }, svg);
  label.textContent = 'PATIO CENTRAL';
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
// Trazos invisibles (guías de las hileras) y texto van entre el patio y el micrófono.
const guides = el('defs', {}, svg);
const layer = el('g', { class: 'streams' }, svg);
drawMic();

/* ---------- Hileras de palabras ---------- */

const streams = [];
let nextId = 0;

/** Llena el textPath: cada palabra con su propio tamaño según sus menciones. */
function fillRow(textPath, week) {
  if (Math.random() < EMIT.titleChance) {
    const title = el('tspan', { class: 'title', 'font-size': EMIT.titleSize }, textPath);
    title.textContent = pickFrom(TITULOS);
    return;
  }
  const length = randInt(EMIT.words);
  for (let i = 0; i < length; i++) {
    const { word, count } = pickWeighted(week);
    const t = prominence(count, week);
    const tspan = el('tspan', {
      'font-size': lerp(SIZE.min, SIZE.max, t).toFixed(1),
      'font-weight': t >= SIZE.boldFrom ? 600 : 400,
    }, textPath);
    // Espacios duros para que el separador no se colapse entre tspans.
    tspan.textContent = i < length - 1 ? `${word}  ` : word;
  }
}

function spawn(angleOffset = 0) {
  if (streams.length >= EMIT.max) return;
  const id = `hilera-${nextId++}`;
  const week = Math.random() < 0.5 ? 'anterior' : 'actual';
  const heading = MIC.phase + angleOffset + between([-0.3, 0.3]);

  const path = el('path', { id }, guides);
  const textNode = el('text', { class: 'stream', style: `fill: ${weekColor(week)}` }, layer);
  const textPath = el('textPath', { href: `#${id}` }, textNode);
  fillRow(textPath, week);
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
    life: between(EMIT.life),
  });
}

function advance(s, dt) {
  const distance = Math.hypot(s.head.x - MIC.x, s.head.y - MIC.y);
  // Curvatura: se enrosca alrededor del micrófono (más suave al alejarse) y se flecta con una onda.
  const curl = (s.turn * EMIT.curl) / (1 + distance / 120);
  const flex = Math.sin(s.age * s.flexFreq + s.flexPhase) * EMIT.flex;
  s.heading += (curl + flex) * dt;

  s.head.x += Math.cos(s.heading) * s.speed * dt;
  s.head.y += Math.sin(s.heading) * s.speed * dt;

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
  const fadeOut = Math.min((s.life + EMIT.fade - s.age) / EMIT.fade, 1);
  s.textNode.setAttribute('opacity', Math.max(0, Math.min(fadeIn, fadeOut)).toFixed(2));
}

function update(dt) {
  for (let i = streams.length - 1; i >= 0; i--) {
    const s = streams[i];
    s.age += dt;
    if (s.age >= s.life + EMIT.fade) {
      s.path.remove();
      s.textNode.remove();
      streams.splice(i, 1);
      continue;
    }
    advance(s, dt);
    render(s);
  }
}

/* ---------- Bucle ---------- */

let timer = 0;
let paused = false;
let last = performance.now();

function frame(now) {
  // Limita el salto de tiempo al volver de otra pestaña.
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  if (!paused) {
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

function swatch(week, steps = 5) {
  const stops = Array.from({ length: steps }, () => weekColor(week));
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

document.querySelector('#muestra-anterior').style.background = swatch('anterior');
document.querySelector('#muestra-actual').style.background = swatch('actual');

pauseButton.addEventListener('click', () => {
  paused = !paused;
  pauseButton.textContent = paused ? 'Reanudar' : 'Pausar';
  svg.classList.toggle('is-paused', paused);
});
