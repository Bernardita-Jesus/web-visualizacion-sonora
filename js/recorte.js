import { DIAS_SIN_DATO, cargarRespuestas, diasDeRespuesta, temaDeRespuesta, temaPorId, tiempoEnPalabras } from './respuestas.js';

/*
 * La instancia de recorte: después de dar su testimonio, la persona ve a pantalla completa una grilla en
 * centímetros reales. Le dice en qué temática quedó su testimonio y de qué color es, y cuánta tela cortar:
 * dos centímetros por cada mes que lleva pospuesto. Apoya la tela sobre la pantalla, desde el 0, y la corta
 * donde marca la tijera, y la agrega al telar físico con el resto de los registros. Si la tira no cabe en una fila, la grilla sigue en la fila de abajo (la tela se
 * corre, como el hilo que da la vuelta en el telar).
 *
 * Para que los centímetros sean reales hay que calibrar la pantalla una vez (menú Registros → Calibrar
 * centímetros): cada pantalla tiene su propia densidad de píxeles.
 */

const RECORTE = {
  diasPorCm: 365 / 24, // dos centímetros por mes pospuesto
  maxCm: 120, // la tira más larga (5 años)
  minCm: 2,
  altoTira: 1, // ancho de la tira dibujada, en cm
  cmPorFila: 24, // cada fila de la grilla es un año de tela (24 cm); lo que sigue, baja dando la vuelta
  entreFilas: 1.9, // distancia entre una fila y la siguiente, en cm (la curva de la vuelta)
  transicion: 0.7, // segundos en que el rectángulo de arriba sube y la grilla ocupa la pantalla
  cerrarSola: 240, // segundos tras los que la grilla se cierra sola, si nadie aprieta "Listo"
  anchoTelar: 48, // ancho del telar físico, en cm: cada fila son dos años de tela (24 cm por año)
};

const CLAVE_CALIBRACION = 'diseno-abierto:px-por-cm';
// Sin calibrar: los centímetros "de CSS" (96 px por pulgada); casi nunca calzan con la pantalla real.
const PX_POR_CM_CSS = 96 / 2.54;

function pxPorCm() {
  try {
    const guardado = parseFloat(localStorage.getItem(CLAVE_CALIBRACION));
    if (guardado > 5) return guardado;
  } catch {
    // Sin almacenamiento: se usa el valor por defecto.
  }
  return PX_POR_CM_CSS;
}

const estaCalibrado = () => {
  try {
    return Boolean(localStorage.getItem(CLAVE_CALIBRACION));
  } catch {
    return false;
  }
};

/** Centímetros de tela para un pendiente: dos por mes pospuesto (con un mínimo y un máximo). */
export function cmDeTela(dias) {
  const cm = Math.round((dias ?? DIAS_SIN_DATO) / RECORTE.diasPorCm);
  return Math.min(RECORTE.maxCm, Math.max(RECORTE.minCm, cm));
}

/* ---------- La capa a pantalla completa ---------- */

const capa = document.querySelector('#recorte');
const mensaje = capa.querySelector('#recorte-mensaje');
const muestra = capa.querySelector('#paso-muestra');
const pasoTela = capa.querySelector('#paso-tela');
const pasoCorte = capa.querySelector('#paso-corte');
const pasoCuenta = capa.querySelector('#paso-cuenta');
const grilla = capa.querySelector('#recorte-grilla');
const aviso = capa.querySelector('#recorte-aviso');
let cierre = null;

const SVG_NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}, parent) => {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  parent?.appendChild(node);
  return node;
};

/**
 * Dibuja la grilla en centímetros reales y, encima, la tira de tela a cortar (`cm` de largo, del color de la
 * temática). Cada fila es un año (24 cm); si la tira es más larga, sigue en la fila de abajo dando la vuelta
 * con una curva, como el hilo en el telar: la primera fila va de izquierda a derecha, la segunda vuelve, y
 * así. Los centímetros se cuentan por los tramos rectos (la curva es solo la vuelta de la tela).
 */
function dibujarGrilla(cm, color) {
  grilla.replaceChildren();
  const k = pxPorCm();
  const { width, height } = grilla.getBoundingClientRect();
  grilla.setAttribute('viewBox', `0 0 ${width} ${height}`);

  // La grilla de fondo: líneas cada 1 cm, más marcadas cada 5 y cada 10.
  const fondo = el('g', { class: 'grilla-fondo' }, grilla);
  for (let x = 0; x <= width; x += k) {
    const n = Math.round(x / k);
    el('line', { x1: x, x2: x, y1: 0, y2: height, class: n % 10 === 0 ? 'diez' : n % 5 === 0 ? 'cinco' : '' }, fondo);
  }
  for (let y = 0; y <= height; y += k) {
    const n = Math.round(y / k);
    el('line', { x1: 0, x2: width, y1: y, y2: y, class: n % 10 === 0 ? 'diez' : n % 5 === 0 ? 'cinco' : '' }, fondo);
  }

  // La tira avanza por filas y da la vuelta en cada borde con una curva (media vuelta). Los centímetros se
  // cuentan a lo largo de TODA la tira, también en las curvas: cada curva es tela que también se corta.
  const izquierda = 2.3 * k; // la tira, pegada a la izquierda (solo el espacio para "apoya aquí")
  const R = (RECORTE.entreFilas * k) / 2; // radio de la curva (hasta el centro de la tira)
  const porFila = Math.max(5, Math.min(RECORTE.cmPorFila, Math.floor((width - izquierda - R - 2 * k) / k)));
  const curva = (Math.PI * R) / k; // cm de tela que tiene cada vuelta
  const paso = 2 * R; // de una fila a la siguiente
  // Cuántas filas ocupa: cada fila tiene `porFila` cm rectos y, si sigue, una curva.
  let filas = 1;
  for (let resto = cm - porFila; resto > 0; resto -= curva + porFila) filas += 1;
  const arriba = Math.max(1.5 * k, Math.round((height - (filas - 1) * paso) / 2 / k) * k);
  const yDe = (f) => arriba + f * paso;
  const xDe = (f, c) => (f % 2 === 0 ? izquierda + c * k : izquierda + (porFila - c) * k); // c: cm rectos en la fila

  /**
   * Dónde queda el centímetro `s` de la tira: el punto, hacia dónde mira el borde de arriba (la normal, para
   * las marcas y el corte) y si cae en un tramo recto o en una curva.
   */
  function puntoEn(s) {
    for (let f = 0; ; f++) {
      if (s <= porFila || f === filas - 1) return { x: xDe(f, s), y: yDe(f), nx: 0, ny: -1, recto: true, fila: f };
      s -= porFila;
      if (s <= curva) {
        const t = s / curva; // cuánto de la media vuelta lleva
        const derecha = f % 2 === 0; // las filas pares terminan a la derecha y dan la vuelta por ese lado
        const cx = xDe(f, porFila);
        const cy = yDe(f) + R;
        const a = derecha ? -Math.PI / 2 + Math.PI * t : -Math.PI / 2 - Math.PI * t;
        return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a), recto: false, fila: f };
      }
      s -= curva;
    }
  }

  // El trazo de la tira, hasta los `cm` exactos (puede terminar a mitad de una curva).
  const fin = puntoEn(cm);
  let d = `M ${xDe(0, 0)} ${yDe(0)}`;
  for (let f = 0, s = cm; ; f++) {
    const recto = Math.min(porFila, s);
    d += ` L ${xDe(f, recto)} ${yDe(f)}`;
    s -= recto;
    if (s <= 0) break;
    const enCurva = Math.min(curva, s);
    const p = puntoEn(cm - s + enCurva);
    d += ` A ${R} ${R} 0 0 ${f % 2 === 0 ? 1 : 0} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    s -= enCurva;
    if (s <= 0) break;
  }

  // El borde de la tira, en línea segmentada: el mismo trazo un poco más ancho, debajo; la tira lo tapa y
  // solo se ven sus orillas (y una línea en el comienzo).
  const anchoTira = RECORTE.altoTira * k;
  const mitad = anchoTira / 2;
  const borde = el('path', { d, class: 'tira-borde' }, grilla);
  borde.style.strokeWidth = `${anchoTira + 4}`;
  const tira = el('path', { d, class: 'tira' }, grilla);
  tira.style.stroke = color;
  tira.style.strokeWidth = `${anchoTira}`;
  el('line', { x1: xDe(0, 0), x2: xDe(0, 0), y1: yDe(0) - mitad - 2, y2: yDe(0) + mitad + 2, class: 'tira-inicio' }, grilla);

  // Los centímetros, a lo largo de la tira: una marca por centímetro en el borde de afuera (también en las
  // curvas) y el número cada 5 en los tramos rectos.
  for (let c = 0; c <= cm; c++) {
    const p = puntoEn(c);
    const largo = (c % 5 === 0 ? 0.45 : 0.22) * k;
    const bx = p.x + p.nx * mitad;
    const by = p.y + p.ny * mitad;
    el('line', { x1: bx, y1: by, x2: bx + p.nx * largo, y2: by + p.ny * largo, class: 'marca' }, grilla);
    // El número va dentro de la tira, sobre la tela, para que no quede apretado entre una fila y la otra.
    if (p.recto && ((c % 5 === 0 && cm - c >= 2) || c === cm)) {
      const haciaDerecha = p.fila % 2 === 0;
      const alComienzo = c === 0;
      const alFinal = c === cm;
      // En los extremos, el número se corre hacia adentro de la tira para no salirse de ella.
      const dentro = alComienzo ? 1 : alFinal ? -1 : 0;
      const x = p.x + dentro * (haciaDerecha ? 1 : -1) * 0.2 * k;
      const numero = el('text', { x, y: p.y, class: 'numero' }, grilla);
      numero.style.textAnchor = !dentro ? 'middle' : (dentro > 0) === haciaDerecha ? 'start' : 'end';
      numero.textContent = `${c}`;
    }
  }

  // Donde empieza: "apoya aquí"; donde termina: la línea de corte (atravesando la tira) y la tijera.
  const inicio = el('text', { x: izquierda - 0.3 * k, y: yDe(0), class: 'inicio' }, grilla);
  inicio.textContent = 'apoya aquí →';
  const largoCorte = mitad + 0.9 * k;
  el('line', {
    x1: fin.x - fin.nx * largoCorte, y1: fin.y - fin.ny * largoCorte,
    x2: fin.x + fin.nx * largoCorte, y2: fin.y + fin.ny * largoCorte,
    class: 'corte',
  }, grilla);
  // La frase va bajo el corte, centrada, pero sin salirse nunca de la grilla.
  const tijera = el('text', { x: fin.x, y: Math.max(fin.y, fin.y + fin.ny * largoCorte, fin.y - fin.ny * largoCorte) + 0.6 * k, class: 'tijera' }, grilla);
  tijera.textContent = `✂ corta aquí · ${cm} cm`;
  const anchoFrase = tijera.getComputedTextLength();
  tijera.style.textAnchor = 'middle';
  tijera.setAttribute('x', Math.min(width - anchoFrase / 2 - 0.4 * k, Math.max(anchoFrase / 2 + 0.4 * k, fin.x)).toFixed(1));
}

const cabecera = document.querySelector('.cabecera');

/**
 * Medidas de la capa de recorte: ocupa todo el lienzo (el rectángulo de arriba sube y se esconde), con los
 * mismos márgenes laterales que el registro. La capa va fuera del lienzo escalado para que sus centímetros
 * sean reales, así que se mide dónde quedó el lienzo en la pantalla.
 */
function medidas() {
  const lienzo = document.querySelector('#lienzo').getBoundingClientRect();
  const escala = lienzo.width / 1600; // el lienzo está diseñado a 1600 px de ancho
  return {
    lienzo,
    escala,
    bajoCabecera: lienzo.top + cabecera.offsetHeight * escala, // donde termina el rectángulo de arriba
    margen: 88 * escala, // el mismo margen que el registro y la pregunta
  };
}

/** Ubica la capa: `arriba` es dónde empieza (bajo el rectángulo de arriba, o arriba de todo). */
function ubicarCapa(arriba = medidas().lienzo.top) {
  const { lienzo, escala, margen } = medidas();
  capa.style.setProperty('--escala', escala.toFixed(4));
  Object.assign(capa.style, {
    top: `${arriba}px`,
    left: `${lienzo.left}px`,
    width: `${lienzo.width}px`,
    bottom: `${window.innerHeight - lienzo.bottom}px`,
    right: 'auto',
    paddingTop: `${40 * escala}px`,
    paddingLeft: `${margen}px`,
    paddingRight: `${margen}px`,
  });
}

/* ---------- El telar en miniatura: dónde va la tira nueva ---------- */

const miniTelar = capa.querySelector('#mini-telar');
const miniTexto = capa.querySelector('#mini-telar-texto');

/**
 * Dibuja el telar de la instalación en miniatura: las tiras de todos los registros, una tras otra en el
 * orden en que se registraron, en filas de `anchoTelar` cm (cuando una tira no cabe, sigue en la fila de
 * abajo, como el hilo que da la vuelta). La tira nueva parpadea en su lugar y el texto dice dónde va.
 */
function dibujarMiniTelar(respuesta) {
  const registros = cargarRespuestas();
  if (!registros.some((r) => r.id === respuesta.id)) registros.push(respuesta);
  const fila = RECORTE.anchoTelar;
  let cm = 0;
  const tiras = registros.map((r) => {
    const largo = cmDeTela(diasDeRespuesta(r));
    const tira = { desde: cm, largo, color: temaPorId(temaDeRespuesta(r)).color, nueva: r.id === respuesta.id };
    cm += largo;
    return tira;
  });
  const filas = Math.max(4, Math.ceil(cm / fila));

  // Medidas del dibujo: el ancho fijo y el alto según cuántas filas hay (cada fila, una franja).
  const ancho = 240;
  const altoFila = Math.max(5, Math.min(18, 150 / filas));
  const alto = filas * altoFila;
  const k = ancho / fila; // unidades del dibujo por cm
  const margenNumeros = 22; // a la izquierda, el número de cada fila
  miniTelar.setAttribute('viewBox', `${-6 - margenNumeros} -6 ${ancho + 12 + margenNumeros} ${alto + 12}`);
  miniTelar.replaceChildren();
  el('rect', { x: -4, y: -4, width: ancho + 8, height: alto + 8, class: 'mini-marco' }, miniTelar);
  for (let x = 0; x <= ancho; x += k * 4) el('line', { x1: x, x2: x, y1: -4, y2: alto + 4, class: 'mini-urdimbre' }, miniTelar);
  // El número de cada fila, de arriba hacia abajo, para ubicar la tira en el telar real.
  for (let f = 0; f < filas; f++) {
    const numero = el('text', { x: -10, y: f * altoFila + altoFila / 2, class: 'mini-numero' }, miniTelar);
    numero.style.fontSize = `${Math.max(5, Math.min(11, altoFila * 0.8)).toFixed(1)}px`;
    numero.textContent = String(f + 1);
  }

  for (const tira of tiras) {
    // Cada tira, en los tramos de fila que ocupa.
    for (let resto = tira.largo, pos = tira.desde; resto > 0; ) {
      const f = Math.floor(pos / fila);
      const enFila = Math.min(resto, (f + 1) * fila - pos);
      const tramo = el('rect', {
        x: (pos - f * fila) * k,
        y: f * altoFila + altoFila * 0.2,
        width: Math.max(1, enFila * k - 0.6),
        height: altoFila * 0.6,
        class: tira.nueva ? 'mini-tira mini-nueva' : 'mini-tira',
      }, miniTelar);
      tramo.style.fill = tira.color;
      pos += enFila;
      resto -= enFila;
    }
  }

  const nueva = tiras.find((t) => t.nueva);
  const filaNueva = Math.floor(nueva.desde / fila) + 1;
  const desdeCm = nueva.desde - (filaNueva - 1) * fila;
  miniTexto.replaceChildren(
    'Tu tira va en la ',
    Object.assign(document.createElement('strong'), { textContent: `fila ${filaNueva}` }),
    desdeCm ? `, desde los ${desdeCm} cm` : ', al comienzo',
    nueva.desde + nueva.largo > filaNueva * fila ? ' (sigue en la fila de abajo)' : '',
  );
}

/** Muestra la grilla de recorte para un testimonio recién enviado. */
export function mostrarRecorte(respuesta) {
  const tema = temaPorId(temaDeRespuesta(respuesta));
  const dias = diasDeRespuesta(respuesta);
  const cm = cmDeTela(dias);
  capa.style.setProperty('--color-tema', tema.color);
  capa.dataset.cm = String(cm);

  mensaje.innerHTML = '';
  const nombre = document.createElement('strong');
  nombre.textContent = tema.nombre;
  const color = document.createElement('strong');
  color.textContent = tema.colorNombre;
  mensaje.append('Tu pendiente fue clasificado como ', nombre, ', que corresponde al color ', color, '.');

  // Los tres pasos: la tela de su color, apoyarla desde el 0 y cortarla en tantos centímetros.
  muestra.style.background = tema.color;
  const negrita = (texto) => Object.assign(document.createElement('strong'), { textContent: texto });
  pasoTela.replaceChildren('Toma un trozo de tela de color ', negrita(tema.colorNombre));
  pasoCorte.replaceChildren('Córtala en ', negrita(`${cm} cm`));
  pasoCuenta.textContent = dias == null
    ? 'no dijiste cuánto lo has pospuesto'
    : `${tiempoEnPalabras(dias)} · 2 cm por mes`;
  aviso.hidden = estaCalibrado();

  // Aparece bajo el rectángulo de arriba y, mientras ese rectángulo sube, la capa sube con él hasta ocupar
  // toda la pantalla; la grilla se dibuja de nuevo cuando termina de subir.
  capa.style.transition = 'none';
  capa.hidden = false;
  dibujarMiniTelar(respuesta);
  ubicarCapa(medidas().bajoCabecera);
  dibujarGrilla(cm, tema.color);
  capa.getBoundingClientRect();
  capa.style.transition = `top ${RECORTE.transicion}s ease`;
  document.body.classList.add('instrucciones');
  ubicarCapa();
  clearTimeout(cierre);
  cierre = setTimeout(cerrarRecorte, RECORTE.cerrarSola * 1000);
}

export function cerrarRecorte() {
  clearTimeout(cierre);
  if (capa.hidden) return;
  // El rectángulo de arriba vuelve a bajar y la capa baja con él; recién entonces se esconde.
  document.body.classList.remove('instrucciones');
  ubicarCapa(medidas().bajoCabecera);
  setTimeout(() => {
    capa.hidden = true;
  }, RECORTE.transicion * 1000);
}

capa.querySelector('#btn-recorte-listo').addEventListener('click', cerrarRecorte);
// Cada vez que la grilla cambia de tamaño (al subir el rectángulo de arriba, o al cambiar la ventana), se
// vuelve a dibujar para llenarla entera.
new ResizeObserver(() => {
  if (!capa.hidden && capa.dataset.cm) dibujarGrilla(+capa.dataset.cm, capa.style.getPropertyValue('--color-tema'));
}).observe(grilla);
// Al cambiar el tamaño de la ventana, se vuelve a ubicar después de que el lienzo se reescale.
window.addEventListener('resize', () => {
  setTimeout(() => {
    if (capa.hidden || !capa.dataset.cm) return;
    capa.style.transition = 'none';
    ubicarCapa();
    dibujarGrilla(+capa.dataset.cm, capa.style.getPropertyValue('--color-tema'));
  }, 50);
});

/* ---------- Calibración: que un centímetro en pantalla sea un centímetro real ---------- */

const calibrar = document.querySelector('#calibrar');
const barra = calibrar.querySelector('#calibrar-barra');
const deslizador = calibrar.querySelector('#calibrar-deslizador');
const LARGO_BARRA = 10; // cm: la barra que se mide con una regla

function mostrarBarra() {
  barra.style.width = `${(LARGO_BARRA * parseFloat(deslizador.value)).toFixed(1)}px`;
}

export function abrirCalibracion() {
  deslizador.value = String(pxPorCm());
  mostrarBarra();
  calibrar.hidden = false;
}

deslizador.addEventListener('input', mostrarBarra);
calibrar.querySelector('#btn-calibrar-guardar').addEventListener('click', () => {
  try {
    localStorage.setItem(CLAVE_CALIBRACION, deslizador.value);
  } catch {
    // Sin almacenamiento: la calibración no se recuerda.
  }
  calibrar.hidden = true;
});
calibrar.querySelector('#btn-calibrar-cancelar').addEventListener('click', () => {
  calibrar.hidden = true;
});
