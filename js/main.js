import { PALABRAS, TITULOS } from './palabras.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Coordenadas en unidades del viewBox (1400 × 1000).
const PATIO = { x: 150, y: 120, width: 1100, height: 760 };
const CENTER = { x: PATIO.x + PATIO.width / 2, y: PATIO.y + PATIO.height / 2 };
const INSET = 50; // distancia de cada micrófono al borde del patio

// turn: sentido de giro (alternado para que las hileras de micrófonos vecinos se crucen).
const MICS = [
  { id: 'M1', turn: 1, x: CENTER.x, y: PATIO.y + INSET, label: [0, 40] },
  { id: 'M2', turn: -1, x: PATIO.x + PATIO.width - INSET, y: CENTER.y, label: [-42, 0] },
  { id: 'M3', turn: 1, x: CENTER.x, y: PATIO.y + PATIO.height - INSET, label: [0, -40] },
  { id: 'M4', turn: -1, x: PATIO.x + INSET, y: CENTER.y, label: [42, 0] },
];

// Cada micrófono suelta hileras de palabras. La "cabeza" de la hilera avanza curvándose
// y las palabras la siguen por el mismo trazo, doblándose con él.
const EMIT = {
  interval: [1.2, 2.6], // segundos entre hileras de un micrófono
  words: [4, 8], // palabras por hilera
  speed: [45, 75], // velocidad de avance (unidades del viewBox por segundo)
  curl: 1.6, // curvatura base: tendencia a enroscarse en espiral
  flex: 1.4, // cuánto se flecta la curva hacia un lado y otro
  life: [9, 15], // segundos que avanza una hilera antes de desvanecerse
  fade: 1.5, // segundos de desvanecimiento
  size: [13, 24], // tamaño de fuente: los graves más grandes, los agudos más chicos
  titleChance: 0.08, // probabilidad de que la hilera sea un título de libro
  armSpin: 0.7, // radianes/s que rota la dirección de salida de cada micrófono
  burst: 5, // hileras extra al hacer clic en un micrófono
  max: 45, // tope de hileras simultáneas
};

// Cada hilera tiene un tono al azar entre grave (0) y agudo (1), que define su color.
const PITCH = {
  warm: [0, 35], // matiz (hue) de los graves: rojos y naranjos, del más grave al menos grave
  cool: [185, 255], // matiz de los agudos: celestes, azules e índigos, del menos agudo al más agudo
  speedBoost: 0.3, // los agudos avanzan hasta un 30 % más rápido que los graves
};

const STEP = 3; // distancia mínima entre puntos del trazo

const svg = document.querySelector('#plano');
const pauseButton = document.querySelector('#btn-pausa');

/* ---------- Aleatorio ---------- */

const between = ([min, max]) => min + Math.random() * (max - min);
const randInt = ([min, max]) => Math.floor(between([min, max + 1]));
const pickFrom = (list) => list[randInt([0, list.length - 1])];
const lerp = ([a, b], t) => a + (b - a) * t;

/** Graves → colores cálidos; agudos → colores fríos. */
function pitchColor(pitch) {
  if (pitch < 0.5) return `hsl(${lerp(PITCH.warm, pitch * 2).toFixed(0)} 80% 45%)`;
  return `hsl(${lerp(PITCH.cool, (pitch - 0.5) * 2).toFixed(0)} 75% 42%)`;
}

function randomPhrase() {
  if (Math.random() < EMIT.titleChance) return { text: pickFrom(TITULOS), isTitle: true };
  const words = Array.from({ length: randInt(EMIT.words) }, () => pickFrom(PALABRAS));
  return { text: words.join('  '), isTitle: false };
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
  const label = el('text', { class: 'patio-label', x: CENTER.x, y: CENTER.y }, svg);
  label.textContent = 'PATIO CENTRAL';
}

function drawMic(mic) {
  const [lx, ly] = mic.label;
  const g = el('g', {
    class: 'mic',
    transform: `translate(${mic.x} ${mic.y})`,
    role: 'button',
    tabindex: 0,
    'aria-label': `Micrófono ${mic.id}: soltar una ráfaga de palabras`,
  }, svg);

  el('circle', { class: 'pulse', r: 22 }, g);
  el('circle', { class: 'pulse', r: 22 }, g);
  el('circle', { class: 'mic-bg', r: 22 }, g);
  el('rect', { class: 'mic-body', x: -6, y: -14, width: 12, height: 18, rx: 6 }, g);
  el('path', { class: 'mic-stand', d: 'M -10 -2 a 10 10 0 0 0 20 0 M 0 8 V 13 M -6 13 H 6' }, g);
  const label = el('text', { class: 'mic-label', x: lx, y: ly }, g);
  label.textContent = mic.id;

  const burst = () => {
    for (let i = 0; i < EMIT.burst; i++) spawn(mic, (i / EMIT.burst) * Math.PI * 2);
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
// Trazos invisibles (guías de las hileras) y texto van entre el patio y los micrófonos.
const guides = el('defs', {}, svg);
const layer = el('g', { class: 'streams' }, svg);
MICS.forEach(drawMic);

/* ---------- Hileras de palabras ---------- */

const streams = [];
let nextId = 0;

function spawn(mic, angleOffset = 0) {
  if (streams.length >= EMIT.max) return;
  const id = `hilera-${nextId++}`;
  const { text, isTitle } = randomPhrase();
  const heading = mic.phase + angleOffset + between([-0.3, 0.3]);
  const pitch = Math.random();

  const path = el('path', { id }, guides);
  const textNode = el('text', {
    class: isTitle ? 'stream title' : 'stream',
    'font-size': lerp(EMIT.size, 1 - pitch).toFixed(1),
    'font-weight': Math.random() < 0.35 ? 600 : 400,
    style: `fill: ${pitchColor(pitch)}`,
  }, layer);
  const textPath = el('textPath', { href: `#${id}` }, textNode);
  textPath.textContent = text;
  const textLength = textNode.getComputedTextLength();

  // Arranca en el borde del ícono, no en su centro.
  const start = { x: mic.x + Math.cos(heading) * 24, y: mic.y + Math.sin(heading) * 24 };

  streams.push({
    mic,
    path,
    textNode,
    textPath,
    textLength,
    points: [start],
    lengths: [0], // distancia acumulada desde el origen hasta cada punto
    head: { ...start },
    heading,
    speed: between(EMIT.speed) * (1 + pitch * PITCH.speedBoost),
    flexFreq: between([0.4, 1.1]),
    flexPhase: Math.random() * Math.PI * 2,
    age: 0,
    life: between(EMIT.life),
  });
}

function advance(s, dt) {
  const { mic } = s;
  const distance = Math.hypot(s.head.x - mic.x, s.head.y - mic.y);
  // Curvatura: se enrosca alrededor del micrófono (más suave al alejarse) y se flecta con una onda.
  const curl = (mic.turn * EMIT.curl) / (1 + distance / 120);
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

const timers = MICS.map(() => between([0, 1]));
MICS.forEach((mic) => (mic.phase = Math.random() * Math.PI * 2));
let paused = false;
let last = performance.now();

function frame(now) {
  // Limita el salto de tiempo al volver de otra pestaña.
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  if (!paused) {
    MICS.forEach((mic, i) => {
      mic.phase += mic.turn * EMIT.armSpin * dt;
      timers[i] -= dt;
      if (timers[i] <= 0) {
        spawn(mic);
        timers[i] = between(EMIT.interval);
      }
    });
    update(dt);
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

/* ---------- Simbología: colores generados con la misma función que las hileras ---------- */

function gradient(from, to, steps = 6) {
  const stops = Array.from({ length: steps }, (_, i) => pitchColor(from + ((to - from) * i) / (steps - 1)));
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

document.querySelector('#muestra-graves').style.background = gradient(0, 0.49);
document.querySelector('#muestra-agudos').style.background = gradient(0.5, 1);

pauseButton.addEventListener('click', () => {
  paused = !paused;
  pauseButton.textContent = paused ? 'Reanudar' : 'Pausar';
  svg.classList.toggle('is-paused', paused);
});
