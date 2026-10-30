import { EJEMPLOS } from './ejemplos.js';
import { TEMATICAS, borrarRespuestas, cargarRespuestas, horaDe, temaDeRespuesta, temaPorId, tematicaDe } from './respuestas.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/*
 * El telar: una franja por cada media hora de la jornada, de la mañana (arriba) a la tarde (abajo).
 * Lo que se dijo en esa media hora es un hilo (la trama) que ondula entre los hilos verticales (la
 * urdimbre), con el color de la temática de cada pendiente. Todo tiene siempre las mismas dimensiones:
 * cada tramo de hilo mide lo mismo que su frase escrita, con el mismo tamaño de letra, el mismo grosor y
 * la misma separación entre líneas. Cuando el hilo llega al borde da la vuelta y sigue en otra línea, así
 * que el alto de cada media hora (y la distancia entre las horas) depende solo de cuánto se dijo en ella;
 * las medias horas en que nadie habló quedan angostas y vacías. El telar se alarga con los testimonios.
 * Sobre el tejido van pasando las frases de a una: cada frase se escribe sobre su propio hilo y vuelve a
 * transformarse en hilo.
 */

// Coordenadas en unidades del viewBox.
// El alto del marco no es fijo: se calcula según los testimonios (ver distribuir()).
const MARCO = { x: 150, y: 120, width: 1320, height: 1000 }; // ancho: más texto por línea, telar más corto
export const DAY = { start: 8, end: 19.5, step: 0.5 }; // jornada de Diseño Abierto: de 8:00 a 19:30 (la última franja es la de las 7 PM)
const TELAR = {
  left: MARCO.x + 96, // espacio a la izquierda para las horas
  right: MARCO.x + MARCO.width - 28,
  top: MARCO.y + 26,
  fontSize: 15, // tamaño de la frase (siempre el mismo): el hilo mide lo mismo que la frase escrita
  gap: 6, // separación entre un pendiente y el siguiente en el mismo hilo
  maxChars: 400, // largo máximo de un pendiente
  stroke: 6, // grosor del hilo (siempre el mismo)
  lineGap: 19, // separación entre líneas (siempre la misma; la frase cabe sin tocar las líneas vecinas)
  bandPad: 8, // aire arriba y abajo de las líneas de cada media hora
  emptyBand: 16, // alto de una media hora sin testimonios
  bottomPad: 26, // aire bajo la última media hora, para la hora de cierre
  waveLength: 18, // separación aproximada entre los hilos verticales (urdimbre): el hilo ondula entre ellos
};

// Cómo pasan las frases: una se escribe letra a letra sobre su trazo, se queda un momento, vuelve a
// ser línea y recién entonces pasa la siguiente (en orden de hora, en ciclo).
const TEJIDO = {
  charsPerSecond: 28, // velocidad de escritura (letras por segundo)
  maxWrite: 6, // segundos máximos que tarda en escribirse una frase (las largas se escriben más rápido)
  hold: 8, // segundos que la frase queda escrita antes de volver a ser línea
  sewCharsPerSecond: 45, // velocidad con que la frase se cose (se convierte en hilo, de izquierda a derecha)
  maxSew: 3.5, // segundos máximos que tarda en coserse una frase
  pause: 0.6, // respiro antes de la siguiente frase
  seam: 7, // segundos en que la costura de un cambio de hora se descose y se vuelve a coser al pasar a otra hora
  turn: 0.4, // segundos en que se cose la vuelta del hilo en el borde (junto a su línea de arriba)
};

const ROWS = Math.round((DAY.end - DAY.start) / DAY.step);
// Posición provisoria de cada media hora (antes de conocer los testimonios); la real la fija distribuir().
const rowY = (row) => TELAR.top + (row + 0.5) * TELAR.emptyBand;
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

let marcoRect = null;

function drawFrame() {
  marcoRect = el('rect', { class: 'patio', ...MARCO }, svg);
  el('title', {}, marcoRect).textContent = 'Clic para ver en pantalla completa';
  marcoRect.addEventListener('click', toggleFullscreen);
}

function drawLoom() {
  // Urdimbre: hilos verticales tenues por donde la trama pasa por encima y por debajo.
  urdimbre = el('g', { class: 'urdimbre' }, svg);
  for (let x = TELAR.left + ONDA / 4; x < TELAR.right; x += ONDA / 2) {
    el('line', { x1: x.toFixed(1), x2: x.toFixed(1), y1: TELAR.top, y2: TELAR.top }, urdimbre);
  }
  // Costuras blancas que marcan cada cambio de hora (se ubican al calcular las franjas).
  costuras = el('g', { class: 'costuras-hora' }, svg);

  // Etiqueta de cada hora en punto, a la izquierda de su franja (se ubican al calcular las franjas).
  const horas = el('g', { class: 'horas' }, svg);
  for (let row = 0; row < ROWS; row++) {
    const hour = DAY.start + row * DAY.step;
    if (Number.isInteger(hour)) {
      etiquetas[row] = el('text', { class: 'hora', x: TELAR.left - 18, y: rowY(row) }, horas);
      etiquetas[row].textContent = formatHour(hour);
    }
  }
}

const etiquetas = [];
let urdimbre = null;
let costuras = null;

/** La hora en que estamos se marca como un botón: su etiqueta va dentro de una pastilla del color del título. */
function drawNow() {
  const horas = svg.querySelector('.horas');
  const pastilla = el('rect', { class: 'hora-pastilla' });
  horas.insertBefore(pastilla, horas.firstChild); // detrás de las etiquetas
  el('title', {}, pastilla).textContent = 'Hora actual';

  const update = () => {
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    const inside = hour >= DAY.start && hour < DAY.end;
    etiquetas.forEach((etiqueta) => etiqueta?.classList.remove('hora-actual'));
    pastilla.style.display = inside ? '' : 'none';
    if (!inside) return;
    // La etiqueta de la hora en punto que corresponde (a las 11:40 se marca "11 AM").
    const etiqueta = etiquetas[rowOf(Math.floor(hour))];
    if (!etiqueta) return;
    etiqueta.classList.add('hora-actual');
    const caja = etiqueta.getBBox();
    pastilla.setAttribute('x', (caja.x - 8).toFixed(1));
    pastilla.setAttribute('y', (caja.y - 4).toFixed(1));
    pastilla.setAttribute('width', (caja.width + 16).toFixed(1));
    pastilla.setAttribute('height', (caja.height + 8).toFixed(1));
    pastilla.setAttribute('rx', ((caja.height + 8) / 2).toFixed(1));
  };
  marcarAhora = update;
  // Cada minuto se actualiza la hora marcada; si cambió la hora, se traza su costura y el telar sigue.
  let horaVista = Math.floor(horaActual());
  setInterval(() => {
    const hora = Math.floor(horaActual());
    if (hora !== horaVista) {
      horaVista = hora;
      distribuir();
    } else {
      update();
    }
  }, 60 * 1000);
}

let marcarAhora = () => {};

// Costuras de cambio de hora ya trazadas (para animar solo la que aparece cuando cambia la hora).
const costurasTrazadas = new Set();

const horaActual = () => {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
};

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
  top: rowY(row) - TELAR.emptyBand / 2,
  alto: TELAR.emptyBand,
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
/** Alto de una media hora con cierta cantidad de líneas (o el mínimo, si no tiene). */
const altoPara = (lineas) => (lineas ? lineas * TELAR.lineGap + TELAR.bandPad * 2 : TELAR.emptyBand);

/**
 * Con registros reales, reparte el alto total del telar entre las horas: todas a la misma distancia mientras
 * quepa lo dicho; si a una hora le falta espacio, toma lo que necesita y las demás se achican parejo para
 * hacerle lugar (el telar mantiene su tamaño). Solo si ya no queda espacio en ninguna, el telar crece.
 * Devuelve el alto de cada media hora.
 */
function altosParejos(necesita) {
  const altoTotal = molde.reduce((suma, lineas) => suma + altoPara(lineas), 0);
  // Agrupa las medias horas por hora (la de las 7 PM tiene una sola).
  const horas = new Map();
  necesita.forEach((alto, row) => {
    const hora = Math.floor(DAY.start + row * DAY.step);
    if (!horas.has(hora)) horas.set(hora, []);
    horas.get(hora).push(row);
  });
  const grupos = [...horas.values()].map((rows) => ({ rows, necesita: rows.reduce((suma, row) => suma + necesita[row], 0) }));

  // Las horas que necesitan más que su parte se quedan con lo que necesitan; el resto se reparte parejo
  // entre las demás (se repite hasta que ninguna quede corta).
  const fijas = new Set();
  let parte = altoTotal / grupos.length;
  for (let cambio = true; cambio; ) {
    cambio = false;
    const libres = grupos.filter((g) => !fijas.has(g));
    const usado = grupos.filter((g) => fijas.has(g)).reduce((suma, g) => suma + g.necesita, 0);
    parte = libres.length ? (altoTotal - usado) / libres.length : 0;
    for (const g of libres) {
      if (g.necesita > parte) {
        fijas.add(g);
        cambio = true;
      }
    }
  }

  // Dentro de cada hora, cada media hora recibe lo que necesita más una parte igual de lo que sobra.
  const altos = Array(necesita.length).fill(0);
  for (const g of grupos) {
    const altoHora = fijas.has(g) ? g.necesita : parte;
    const sobra = (altoHora - g.necesita) / g.rows.length;
    for (const row of g.rows) altos[row] = necesita[row] + sobra;
  }
  return altos;
}

function distribuir() {
  // Lo que necesita cada media hora para sus líneas (con la frase a su tamaño real, de borde a borde).
  franjas.forEach((franja) => {
    const largo = largoDe(franja);
    franja.lineas = largo ? Math.ceil(largo / ANCHO) : 0;
  });
  const necesita = franjas.map((franja) => altoPara(franja.lineas));
  // Simulando, cada media hora tiene el alto de su molde (o el que necesite, si es más); con registros
  // reales, las horas se reparten parejo el alto del telar y se redistribuyen si a alguna le falta espacio.
  const altos = simular ? necesita.map((alto, row) => Math.max(alto, altoPara(molde[row] ?? 0))) : altosParejos(necesita);

  let y = TELAR.top;
  franjas.forEach((franja, row) => {
    franja.top = y;
    franja.alto = altos[row];
    // Las líneas van centradas en el alto reservado: así la costura de cada hora queda al medio entre
    // lo de la hora anterior y lo de la siguiente, aunque la franja tenga menos líneas que su molde.
    franja.inicioLineas = y + (franja.alto - franja.lineas * TELAR.lineGap) / 2;
    y += franja.alto;
    dibujarFranja(row);
  });

  // Cada hora va centrada en su bloque: de su costura blanca a la siguiente (su media hora en punto y la
  // media hora que le sigue).
  etiquetas.forEach((etiqueta, row) => {
    if (!etiqueta) return;
    const desde = franjas[row].top;
    const ultima = franjas[row + 1] && !Number.isInteger(DAY.start + (row + 1) * DAY.step) ? franjas[row + 1] : franjas[row];
    etiqueta.setAttribute('y', ((desde + ultima.top + ultima.alto) / 2).toFixed(1));
  });

  // Costura blanca en cada cambio de hora: justo donde empieza la franja de cada hora en punto.
  // Simulando se ven las de todo el día; con registros reales, solo las de las horas que ya empezaron:
  // cuando el reloj cambia de hora, la costura nueva se traza de izquierda a derecha y el telar sigue.
  const ahora = horaActual();
  const primeraVez = !simular && costurasTrazadas.size === 0;
  costuras.replaceChildren();
  franjas.forEach((franja, row) => {
    const hora = DAY.start + row * DAY.step;
    if (row === 0 || !Number.isInteger(hora)) return;
    if (!simular && hora > ahora) return;
    const nueva = !simular && !primeraVez && !costurasTrazadas.has(hora);
    if (!simular) costurasTrazadas.add(hora); // simulando no cuentan: son de todo el día, no del reloj
    const yc = (franja.top - 0.5).toFixed(1);
    const clase = nueva ? ' trazandose' : '';
    el('line', { class: `costura-sombra${clase}`, 'data-row': row, x1: TELAR.left - 8, x2: TELAR.right + 8, y1: yc, y2: yc }, costuras);
    el('line', { class: `costura${clase}`, 'data-row': row, x1: TELAR.left - 8, x2: TELAR.right + 8, y1: yc, y2: yc }, costuras);
  });
  // Desde la primera vez quedan registradas: solo las que aparezcan después (al cambiar la hora) se animan.
  costurasTrazadas.add(DAY.start);

  // El telar se alarga o se acorta con lo que se ha dicho: marco, urdimbre y área visible.
  MARCO.height = y + TELAR.bottomPad - MARCO.y;
  marcoRect.setAttribute('height', MARCO.height.toFixed(1));
  for (const linea of urdimbre.children) linea.setAttribute('y2', y.toFixed(1));
  svg.setAttribute('viewBox', `${MARCO.x - 10} ${MARCO.y - 10} ${MARCO.width + 20} ${(MARCO.height + 20).toFixed(1)}`);
  emptyHint.setAttribute('y', (MARCO.y + MARCO.height / 2).toFixed(1));
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
  const porLinea = ANCHO; // cada línea lleva exactamente lo que cabe de borde a borde
  const escala = 1; // el hilo mide lo mismo que la frase escrita: siempre las mismas dimensiones
  const separacion = TELAR.lineGap;
  const grosor = TELAR.stroke;
  const amplitud = 1.6;
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
      return nodo;
    };

    for (let linea = Math.floor(t0 / porLinea); linea < lineas && linea * porLinea < t1; linea++) {
      const a = Math.max(t0, linea * porLinea);
      const b = Math.min(t1, (linea + 1) * porLinea);
      if (b - a < 0.01) continue;
      const xa = xDe(linea, a);
      const xb = xDe(linea, b);
      const y = yDe(linea);
      const nodo = trazo(onda(xa, xb, y, linea, amplitud), 'hebra');
      const pieza = { hasta: b - t0, x: Math.min(xa, xb), ancho: Math.abs(xb - xa), y, nodo };
      p.piezas.push(pieza);

      // Si el hilo de este pendiente sigue en la línea siguiente, da la vuelta en el borde.
      const fin = (linea + 1) * porLinea;
      if (b >= fin - 0.01 && t1 > fin + 0.01 && linea < lineas - 1) {
        const borde = linea % 2 === 0 ? TELAR.right : TELAR.left;
        const giro = linea % 2 === 0 ? 1 : 0;
        const r = (separacion / 2).toFixed(2);
        // La vuelta va con su línea de arriba: al coserse la frase, aparece junto con ella.
        pieza.vuelta = trazo(`M ${borde} ${y.toFixed(2)} A ${r} ${r} 0 0 ${giro} ${borde} ${(y + separacion).toFixed(2)}`, 'hebra vuelta');
      }
    }

    // Qué parte de la frase va sobre cada tramo (si el hilo da vuelta, la frase sigue en la otra línea).
    // Se calcula una sola vez, para que cada parte empiece justo donde terminó la anterior.
    let previo = 0;
    p.piezas.forEach((pieza, i) => {
      const corte = i === p.piezas.length - 1 ? p.texto.length : Math.max(previo, corteEn(p.texto, pieza.hasta));
      pieza.trozo = p.texto.slice(previo, corte).trim();
      previo = corte;
    });
    t = t1 + TELAR.gap;
  }
}

/**
 * Posición (en caracteres) donde cortar la frase para un largo medido desde su comienzo: el corte cae
 * en el espacio más cercano, para no partir palabras entre una vuelta del hilo y la siguiente.
 */
function corteEn(texto, largo) {
  if (largo <= 0) return 0;
  medidor.textContent = texto;
  if (largo >= medidor.getComputedTextLength()) return texto.length;
  let [lo, hi] = [1, texto.length];
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (medidor.getSubStringLength(0, mid) >= largo) hi = mid;
    else lo = mid + 1;
  }
  const candidatos = [texto.lastIndexOf(' ', lo), texto.indexOf(' ', lo)].filter((i) => i > 0);
  if (!candidatos.length) return lo;
  return candidatos.reduce((mejor, i) => (Math.abs(i - lo) < Math.abs(mejor - lo) ? i : mejor));
}

/** Agrega un pendiente al hilo de su media hora. Con `oculto`, su hilo aparece cuando pasa su frase. */
function colocar({ texto, hora, tema }, oculto = false, redibujar = true) {
  const limpio = recortar(texto);
  // La temática elegida a mano (si la hay) manda sobre la detectada en el texto.
  const pendiente = { texto: limpio, hora, tema: temaPorId(tema ?? tematicaDe(texto)), row: rowOf(hora), largo: medir(limpio), oculto };

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
 * Pasa una frase: solo desaparece su propio hilo y, justo encima, la frase se escribe con el color de su
 * temática, tramo por tramo (si el hilo da vuelta, la frase sigue en la línea siguiente). Cada parte
 * ocupa exactamente su tramo: si no cabe, las letras se apegan; nunca se sale de su hilo. Se queda un
 * momento y se cose de vuelta, de izquierda a derecha.
 */
// Cambia cada vez que se vuelve a tejer el día (por ejemplo, al apagar la simulación): la frase que se
// estaba escribiendo se corta y se borra, para no mostrar textos que ya no están en el telar.
let vuelta = 0;
const escritosEnCurso = new Set();

function cortarFraseEnCurso() {
  vuelta += 1;
  escritosEnCurso.forEach((grupo) => grupo.remove());
  escritosEnCurso.clear();
}

async function pasarFrase(pendiente) {
  const { tema, piezas, nodos } = pendiente;
  const miVuelta = vuelta;
  const vigente = () => miVuelta === vuelta;

  pendiente.oculto = false;
  for (const nodo of nodos) {
    nodo.classList.remove('oculta');
    nodo.classList.add('leyendose'); // solo su hilo desaparece; la frase se escribe en su lugar
  }

  const partes = [];
  for (const pieza of piezas) {
    if (!pieza.trozo) continue;
    // El grupo apega las letras (las angosta a lo ancho) cuando la parte es más larga que su tramo.
    const grupo = el('g', {}, tejido);
    const escrito = el('text', {
      class: 'escritura',
      x: pieza.x.toFixed(1),
      y: pieza.y.toFixed(1),
      'font-size': TELAR.fontSize,
      style: `fill: ${tema.color}`,
    }, grupo);
    escrito.textContent = pieza.trozo;
    const largo = escrito.getComputedTextLength();
    if (largo > pieza.ancho) {
      const k = (pieza.ancho / largo).toFixed(4);
      grupo.setAttribute('transform', `translate(${pieza.x.toFixed(1)} 0) scale(${k} 1) translate(${(-pieza.x).toFixed(1)} 0)`);
    }
    // Las partes se escriben una tras otra, siguiendo el hilo.
    const segundos = Math.min(pieza.trozo.length / TEJIDO.charsPerSecond, TEJIDO.maxWrite);
    escrito.style.setProperty('--dur', `${segundos.toFixed(2)}s`);
    partes.push({ grupo, escrito, pieza });
    escritosEnCurso.add(grupo);
    await esperar(segundos);
    if (!vigente()) return;
  }
  await esperar(TEJIDO.hold);
  if (!vigente()) return;

  // Se cose línea por línea, siguiendo el hilo: en cada tramo las letras desaparecen de izquierda a
  // derecha y en su lugar vuelve su hilo en puntadas; si el hilo da vuelta en el borde, la vuelta se
  // cose junto a su línea de arriba y recién entonces sigue la línea de abajo. Al terminar, cada tramo
  // se tensa y queda continuo.
  const largoTotal = piezas.reduce((suma, pieza) => suma + (pieza.trozo?.length ?? 0), 0);
  const coserTotal = Math.min(largoTotal / TEJIDO.sewCharsPerSecond, TEJIDO.maxSew);
  const coserNodo = async (nodo, segundos) => {
    nodo.style.setProperty('--coser', `${segundos.toFixed(2)}s`);
    nodo.classList.remove('leyendose');
    nodo.classList.add('cosiendo');
    await esperar(segundos);
    nodo.classList.remove('cosiendo');
    nodo.classList.add('cosida');
  };
  for (const pieza of piezas) {
    const segundos = largoTotal ? coserTotal * ((pieza.trozo?.length ?? 0) / largoTotal) : 0;
    const parte = partes.find((otra) => otra.pieza === pieza);
    if (parte) {
      parte.escrito.style.setProperty('--coser', `${segundos.toFixed(2)}s`);
      parte.escrito.classList.add('cosiendose');
    }
    await coserNodo(pieza.nodo, Math.max(segundos, 0.05));
    if (!vigente()) return;
    if (pieza.vuelta) {
      await coserNodo(pieza.vuelta, TEJIDO.turn);
      if (!vigente()) return;
    }
  }
  partes.forEach(({ grupo }) => {
    grupo.remove();
    escritosEnCurso.delete(grupo);
  });
  await esperar(TEJIDO.pause);
}

/* ---------- Al pasar a otra hora, su costura se descose y se vuelve a coser ---------- */

/**
 * Entre una frase y la siguiente, por cada cambio de hora que se cruza (de la franja `desde` a la franja
 * `hasta`), su costura blanca se descose de izquierda a derecha y se vuelve a coser. Las costuras se
 * ven siempre; esto solo marca, en la animación, que el telar pasó a otra hora.
 */
async function recoserCambiosDeHora(desde, hasta, vigente) {
  for (let row = desde + 1; row <= hasta; row++) {
    const lineas = costuras.querySelectorAll(`[data-row="${row}"]`);
    if (!lineas.length) continue; // no es cambio de hora, o la hora todavía no empieza
    for (const linea of lineas) {
      linea.style.setProperty('--trazo', `${TEJIDO.seam}s`);
      linea.classList.remove('trazandose', 'recosiendo');
      linea.getBBox(); // reinicia la animación aunque la costura ya se hubiera recosido antes
      linea.classList.add('recosiendo');
    }
    await esperar(TEJIDO.seam);
    if (!vigente()) return;
  }
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
    const miVuelta = vuelta;
    const vigente = () => miVuelta === vuelta;
    if (urgentes.length) {
      await pasarFrase(urgentes.shift());
    } else if (tejidos.length) {
      // El siguiente se busca a partir del anterior (no por posición): así, si llega un pendiente
      // nuevo y cambia la lista, el orden no se salta ni se repite.
      const i = anterior ? tejidos.indexOf(anterior) + 1 : 0;
      const siguiente = tejidos[i % tejidos.length];
      // Si entre la frase anterior y la siguiente hay un cambio de hora, su costura se recose.
      if (i > 0 && i < tejidos.length) await recoserCambiosDeHora(anterior.row, siguiente.row, vigente);
      anterior = siguiente;
      if (vigente()) await pasarFrase(anterior);
    } else {
      await esperar(1);
    }
  }
}

/* ---------- Simular registros (ejemplos) o solo los reales ---------- */

const CLAVE_SIMULAR = 'diseno-abierto:simular';
let simular = false;
try {
  simular = localStorage.getItem(CLAVE_SIMULAR) === '1';
} catch {
  // Sin almacenamiento: parte mostrando solo los registros reales.
}

// Alto que ocupa cada media hora en la simulación: es el molde del telar en ambos modos.
const molde = [];

function calcularMolde() {
  const largos = Array(ROWS).fill(0);
  const cuantos = Array(ROWS).fill(0);
  for (const { texto, hora } of EJEMPLOS) {
    const row = rowOf(hora);
    largos[row] += medir(recortar(texto));
    cuantos[row] += 1;
  }
  largos.forEach((largo, row) => {
    molde[row] = largo ? Math.ceil((largo + TELAR.gap * (cuantos[row] - 1)) / ANCHO) : 0;
  });
}

/** Los registros reales (siempre) y, si se está simulando, también los de ejemplo; en orden de hora. */
function pendientesDelDia() {
  const ejemplos = simular ? EJEMPLOS : [];
  const reales = cargarRespuestas().map((respuesta) => ({ texto: respuesta.texto, hora: horaDe(respuesta), tema: temaDeRespuesta(respuesta) }));
  return [...ejemplos, ...reales].sort((a, b) => a.hora - b.hora);
}

/** Vuelve a tejer el telar desde cero con lo que corresponde al modo actual. */
function tejerDia() {
  cortarFraseEnCurso();
  urgentes.length = 0;
  for (const franja of franjas) franja.pendientes = [];
  tejidos.length = 0;
  pendientesDelDia().forEach((pendiente) => colocar(pendiente, false, false));
  distribuir();
  emptyHint.style.display = tejidos.length ? 'none' : '';
}

const botonSimular = document.querySelector('#btn-simular');

function mostrarModoSimulacion() {
  botonSimular.setAttribute('aria-pressed', String(simular));
  botonSimular.textContent = simular ? 'Simulando registros ✓' : 'Simular registros';
}

botonSimular.addEventListener('click', () => {
  simular = !simular;
  try {
    localStorage.setItem(CLAVE_SIMULAR, simular ? '1' : '');
  } catch {
    // Sin almacenamiento: no se recuerda, pero el cambio funciona igual.
  }
  mostrarModoSimulacion();
  tejerDia();
});
mostrarModoSimulacion();

// Borrar los registros reales guardados en este navegador (por ejemplo, pruebas antes del evento).
document.querySelector('#btn-borrar-registros').addEventListener('click', () => {
  const cuantos = cargarRespuestas().length;
  if (!cuantos) {
    window.alert('No hay registros reales guardados en este navegador.');
    return;
  }
  const texto = `¿Borrar ${cuantos === 1 ? 'el registro real' : `los ${cuantos} registros reales`} guardados en este navegador? No se puede deshacer.`;
  if (!window.confirm(texto)) return;
  borrarRespuestas();
  tejerDia();
});

/** Un pendiente recién registrado se suma al telar y su frase es la próxima en pasar. */
export function lanzarRespuesta(respuesta) {
  urgentes.push(colocar({ texto: respuesta.texto, hora: horaDe(respuesta), tema: temaDeRespuesta(respuesta) }, true));
}

// Se mide el largo de cada frase para ubicarla: hay que esperar a que cargue la tipografía de las frases,
// o se mediría con la letra de reemplazo (más angosta) y las frases no cabrían en su lugar. Se pide
// explícitamente, porque el navegador solo la descarga cuando se dibuja el primer texto con ella.
const tipografia = document.fonts.load(`${TELAR.fontSize}px "Source Serif 4"`).catch(() => {});
Promise.all([tipografia, document.fonts.ready]).then(() => {
  // El telar aparece completo desde el comienzo: todos los hilos, siempre.
  calcularMolde();
  tejerDia();
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
