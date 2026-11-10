import { alCambiarPendientes, enPuntadas, largoDeDias, pintura } from './main.js';
import { espiral } from './ovillos.js';
import { TEMATICAS, tiempoEnPalabras } from './respuestas.js';

/*
 * Los ovillos a la derecha del registro (mientras el telar está escondido): tres filas de dos, un ovillo por
 * temática con todos los testimonios acumulados y, bajo cada uno, su nombre. Cada testimonio es un tramo del hilo, tan largo como el tiempo que
 * lleva pospuesto (una puntada por día), así que el ovillo más grande es la temática en que más tiempo se
 * ha postergado. Cuando llega un testimonio nuevo, su hilo se enrolla en su ovillo.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const COLUMNAS = 2; // tres filas de dos
const CELDA = 140; // ancho de cada ovillo con su aire
const FILA = 200; // alto de cada fila: el ovillo y, debajo, su nombre
const ANCHO = CELDA * COLUMNAS; // tamaño del dibujo (unidades del viewBox)
const ALTO = FILA * Math.ceil(TEMATICAS.length / COLUMNAS);
const RADIO_MAX = 54; // el ovillo más grande
const ROTULO = 64; // alto reservado bajo el ovillo para su nombre
const HILO = { separacion: 12, grosor: 4, centro: 3, gap: 6 }; // las mismas medidas del telar
const ENROLLAR = 4; // segundos en que el hilo de un testimonio nuevo se enrolla en su ovillo

const svg = document.querySelector('#panel-ovillos');
svg.setAttribute('viewBox', `0 0 ${ANCHO} ${ALTO}`);
const el = (name, attrs = {}, parent) => {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  parent?.appendChild(node);
  return node;
};
const defs = el('defs', {}, svg);
const capa = el('g', { class: 'tejido' }, svg);

/** El trazo de un tramo de espiral alrededor de (cx, cy), unido con curvas suaves. */
function trazoEspiral(polarEn, cx, cy, s0, s1) {
  const n = Math.max(12, Math.min(900, Math.round((s1 - s0) / 6)));
  const puntos = Array.from({ length: n }, (_, i) => {
    const [r, a] = polarEn(s0 + ((s1 - s0) * i) / (n - 1));
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
  const f = (v) => v.toFixed(1);
  let d = `M${f(puntos[0][0])} ${f(puntos[0][1])}`;
  for (let i = 1; i < n - 1; i++) {
    const [x, y] = puntos[i];
    const [x2, y2] = puntos[i + 1];
    d += `Q${f(x)} ${f(y)} ${f((x + x2) / 2)} ${f((y + y2) / 2)}`;
  }
  return `${d}L${f(puntos[n - 1][0])} ${f(puntos[n - 1][1])}`;
}

const recorte = document.querySelector('#recorte');

/**
 * Destapa un tramo desde su comienzo, siguiendo la espiral: el hilo se enrolla. Si la grilla de recorte
 * está abierta, espera a que se cierre (para que la persona vea su hilo enrollarse en su ovillo).
 */
function enrollar(nodo, segundos) {
  if (!recorte.hidden) {
    nodo.style.visibility = 'hidden';
    setTimeout(() => enrollar(nodo, segundos), 300);
    return;
  }
  nodo.style.visibility = '';
  const largo = nodo.getTotalLength();
  const id = `enrollar-${Math.random().toString(36).slice(2, 8)}`;
  const mascara = el('mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: ANCHO, height: ALTO }, defs);
  const destape = el('path', { d: nodo.getAttribute('d'), class: 'destape' }, mascara);
  destape.style.strokeDasharray = `${largo} ${largo}`;
  destape.style.strokeDashoffset = largo;
  nodo.setAttribute('mask', `url(#${id})`);
  destape.getBoundingClientRect();
  destape.style.transition = `stroke-dashoffset ${segundos}s ease-in-out 0.6s`;
  destape.style.strokeDashoffset = 0;
  setTimeout(() => {
    nodo.removeAttribute('mask');
    mascara.remove();
  }, segundos * 1000 + 800);
}

/** La separación entre vueltas más amplia con que el ovillo más largo cabe en su fila. */
function vueltaQueCabe(largoMayor) {
  const radio = (v) => Math.sqrt((largoMayor * v) / Math.PI + HILO.centro ** 2) + v;
  let [lo, hi] = [0.3, HILO.separacion];
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (radio(mid) <= RADIO_MAX) lo = mid;
    else hi = mid;
  }
  return lo;
}

function dibujar(pendientes, nuevo) {
  capa.replaceChildren();

  // Un ovillo por temática, en el orden de la simbología (también las que aún no tienen testimonios: su
  // lugar queda marcado); cada testimonio, un tramo.
  const ovillos = TEMATICAS.map((tema) => ({ tema, lista: pendientes.filter((p) => p.temas[0].id === tema.id) }));
  for (const ovillo of ovillos) {
    let s = 0;
    for (const p of ovillo.lista) {
      p.enPanel = { s0: s, s1: s + p.largo };
      s = p.enPanel.s1 + HILO.gap;
    }
    ovillo.total = s - HILO.gap;
  }
  const vuelta = vueltaQueCabe(Math.max(1, ...ovillos.map((ovillo) => ovillo.total)));
  const grosor = Math.min(HILO.grosor, vuelta * 0.6);
  const { polarEn } = espiral(vuelta);
  ovillos.forEach((ovillo, i) => {
    const cx = (i % COLUMNAS) * CELDA + CELDA / 2;
    const cy = Math.floor(i / COLUMNAS) * FILA + (FILA - ROTULO) / 2;
    const g = el('g', { class: 'ovillo' }, capa);
    // Sin testimonios: un círculo punteado, a la espera de su primer hilo.
    if (!ovillo.lista.length) el('circle', { class: 'ovillo-vacio', cx, cy, r: 10, style: `stroke: ${ovillo.tema.color}` }, g);
    for (const p of ovillo.lista) {
      const nodo = el('path', { class: 'hebra cosida', d: trazoEspiral(polarEn, cx, cy, p.enPanel.s0, p.enPanel.s1), 'data-temas': p.temas[0].id }, g);
      nodo.style.stroke = pintura(p.temas);
      nodo.style.strokeWidth = grosor.toFixed(2);
      enPuntadas(nodo, p.largo / largoDeDias(1)); // una puntada por día pospuesto
      el('title', {}, nodo).textContent = `${p.temas[0].nombre} · pospuesto ${tiempoEnPalabras(p.dias)}`;
      if (p === nuevo) enrollar(nodo, ENROLLAR);
    }
    // Bajo el ovillo: su temática, cuántas veces se repite y cuánto tiempo pospuesto suma.
    const dias = ovillo.lista.reduce((suma, p) => suma + p.largo / largoDeDias(1), 0);
    const veces = ovillo.lista.length;
    const datos = veces ? [`${veces} ${veces === 1 ? 'vez' : 'veces'}`, tiempoEnPalabras(dias)] : ['sin testimonios'];
    [ovillo.tema.nombre, ...datos].forEach((linea, k) => {
      const texto = el('text', { class: k ? 'panel-rotulo panel-rotulo-dato' : 'panel-rotulo', x: cx, y: cy + RADIO_MAX + 16 + k * 17 }, g);
      texto.style.fill = ovillo.tema.color;
      texto.textContent = linea;
    });
  });
}

alCambiarPendientes((pendientes, nuevo) => dibujar(pendientes, nuevo));
