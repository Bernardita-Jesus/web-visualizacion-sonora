import { DIAS_SIN_DATO, diasPospuesto, temaDeRespuesta, temaPorId, tiempoEnPalabras } from './respuestas.js';

/*
 * La instancia de recorte: después de dar su testimonio, la persona ve a pantalla completa una grilla en
 * centímetros reales. Le dice en qué temática quedó su testimonio y de qué color es, y cuánta tela cortar:
 * dos centímetros por cada mes que lleva pospuesto. Apoya la tela sobre la pantalla, desde el 0, y la corta
 * donde marca la tijera. Si la tira no cabe en una fila, la grilla sigue en la fila de abajo (la tela se
 * corre, como el hilo que da la vuelta en el telar).
 *
 * Para que los centímetros sean reales hay que calibrar la pantalla una vez (menú Registros → Calibrar
 * centímetros): cada pantalla tiene su propia densidad de píxeles.
 */

const RECORTE = {
  diasPorCm: 365 / 24, // dos centímetros por mes pospuesto
  maxCm: 120, // la tira más larga (5 años)
  minCm: 2,
  altoTira: 4, // alto de la tira dibujada, en cm
  cerrarSola: 240, // segundos tras los que la grilla se cierra sola, si nadie aprieta "Listo"
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
const instruccion = capa.querySelector('#recorte-instruccion');
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
 * Dibuja la grilla en centímetros reales y, encima, la tira de tela a cortar (`cm` de largo, del color de
 * la temática). Si no cabe en una fila, sigue en las de abajo; la tijera marca dónde cortar.
 */
function dibujarGrilla(cm, color) {
  grilla.replaceChildren();
  const k = pxPorCm();
  const { width, height } = grilla.getBoundingClientRect();
  // A la izquierda, espacio para "apoya aquí"; a la derecha, para "sigue abajo" y la tijera.
  const izquierda = 3 * k;
  const porFila = Math.max(5, Math.floor((width - izquierda - 5 * k) / k)); // cm enteros por fila
  const filas = Math.ceil(cm / porFila);
  const altoFila = (RECORTE.altoTira + 2) * k; // la tira más el aire para los números
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

  // La tira de tela, fila por fila, alineada a la grilla.
  const arriba = Math.max(k, Math.round((height - filas * altoFila) / 2 / k) * k);
  for (let f = 0; f < filas; f++) {
    const desde = f * porFila;
    const hasta = Math.min(cm, desde + porFila);
    const y = arriba + f * altoFila + k;
    const tira = el('rect', { x: izquierda, y, width: (hasta - desde) * k, height: RECORTE.altoTira * k, class: 'tira' }, grilla);
    tira.style.fill = color;
    // Los centímetros de esta fila, contados desde el comienzo de la tira.
    for (let c = desde; c <= hasta; c++) {
      const x = izquierda + (c - desde) * k;
      const largo = c % 5 === 0 ? 0.6 : 0.3;
      el('line', { x1: x, x2: x, y1: y - largo * k, y2: y, class: 'marca' }, grilla);
      if (c % 5 === 0 || c === hasta) {
        const numero = el('text', { x, y: y - 0.75 * k, class: 'numero' }, grilla);
        numero.textContent = `${c}`;
      }
    }
    // Donde la fila sigue abajo, una flecha; donde termina la tira, la tijera y la línea de corte.
    const xFin = izquierda + (hasta - desde) * k;
    if (hasta < cm) {
      const sigue = el('text', { x: xFin + 0.4 * k, y: y + (RECORTE.altoTira * k) / 2, class: 'sigue' }, grilla);
      sigue.textContent = '↓ sigue abajo';
    } else {
      el('line', { x1: xFin, x2: xFin, y1: y - 1.2 * k, y2: y + (RECORTE.altoTira + 1.2) * k, class: 'corte' }, grilla);
      const tijera = el('text', { x: xFin + 0.3 * k, y: y + (RECORTE.altoTira * k) / 2, class: 'tijera' }, grilla);
      tijera.textContent = `✂ corta aquí · ${cm} cm`;
    }
    const inicio = el('text', { x: izquierda - 0.2 * k, y: y + (RECORTE.altoTira * k) / 2, class: 'inicio' }, grilla);
    inicio.textContent = f === 0 ? 'apoya aquí →' : '';
  }
}

/** Muestra la grilla de recorte para un testimonio recién enviado. */
export function mostrarRecorte(respuesta) {
  const tema = temaPorId(temaDeRespuesta(respuesta));
  const dias = diasPospuesto(respuesta.texto);
  const cm = cmDeTela(dias);
  capa.style.setProperty('--color-tema', tema.color);
  capa.dataset.cm = String(cm);

  mensaje.innerHTML = '';
  const nombre = document.createElement('strong');
  nombre.textContent = tema.nombre;
  const color = document.createElement('strong');
  color.textContent = tema.colorNombre;
  mensaje.append('Tu testimonio fue clasificado como ', nombre, ', que corresponde al color ', color, '.');

  instruccion.textContent = dias == null
    ? `No dijiste cuánto tiempo lo has pospuesto: toma un trozo de tela de color ${tema.colorNombre} y córtalo de ${cm} cm.`
    : `Lo has pospuesto ${tiempoEnPalabras(dias)}. Toma un trozo de tela de color ${tema.colorNombre}, apóyalo sobre la grilla desde el 0 y córtalo de ${cm} cm (dos centímetros por cada mes).`;
  aviso.hidden = estaCalibrado();

  capa.hidden = false;
  dibujarGrilla(cm, tema.color);
  clearTimeout(cierre);
  cierre = setTimeout(cerrarRecorte, RECORTE.cerrarSola * 1000);
}

export function cerrarRecorte() {
  clearTimeout(cierre);
  capa.hidden = true;
}

capa.querySelector('#btn-recorte-listo').addEventListener('click', cerrarRecorte);
window.addEventListener('resize', () => {
  if (!capa.hidden && capa.dataset.cm) dibujarGrilla(+capa.dataset.cm, capa.style.getPropertyValue('--color-tema'));
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
