import { EJEMPLOS } from './ejemplos.js';
import {
  DIAS_SIN_DATO,
  TEMATICAS,
  borrarRespuestas,
  cargarRespuestas,
  diasPospuesto,
  horaDe,
  temaPorId,
  tematicasDe,
  temasDeRespuesta,
  tiempoEnPalabras,
} from './respuestas.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/*
 * El telar: un solo tejido continuo. Cada pendiente es un tramo de hilo (la trama) que ondula entre los
 * hilos verticales (la urdimbre), con el color de su temática, y su largo es cuánto tiempo lleva
 * pospuesto: el hilo va en puntadas y cada puntada es un día de postergación. Los pendientes van uno tras otro, en el
 * orden en que se registraron; cuando el hilo llega al borde da la vuelta y sigue en la línea de abajo,
 * así que el telar se alarga con todo lo que la comunidad ha pospuesto. No hay texto ni horas: solo hilo.
 * El tejido se va recorriendo de a un pendiente: su hilo se descose y se vuelve a coser.
 */

// Coordenadas en unidades del viewBox. El alto del marco no es fijo: crece con los pendientes.
const MARCO = { x: 150, y: 120, width: 1320, height: 600 };
const TELAR = {
  left: MARCO.x + 28,
  right: MARCO.x + MARCO.width - 28,
  top: MARCO.y + 28,
  diasPorLinea: 365, // una línea de borde a borde es un año: 365 puntadas, una por día
  puntada: 0.66, // parte de cada puntada que se ve (el resto es el espacio hasta la siguiente)
  gap: 6, // separación entre un pendiente y el siguiente en el mismo hilo
  stroke: 4, // grosor del hilo (siempre el mismo, salvo que las líneas queden muy juntas)
  lineGap: 12, // separación máxima entre líneas: si sobra ancho en la pantalla, se juntan (ver separacionParaLlenar)
  minLineGap: 5, // separación mínima entre líneas
  bottomPad: 28, // aire bajo la última línea
  altoVacio: 420, // alto del telar cuando todavía no hay pendientes
  waveLength: 18, // separación aproximada entre los hilos verticales (urdimbre): el hilo ondula entre ellos
};

// Cómo se recorre el tejido: cada pendiente se cose de nuevo, a una velocidad pareja (los que llevan
// más tiempo pospuestos tardan más), y luego pasa el siguiente.
const TEJIDO = {
  sewSpeed: 320, // unidades de hilo por segundo (unas 90 puntadas, o días, por segundo: un año en ~4 s)
  minSew: 1.2, // segundos mínimos que tarda en tejerse un pendiente
  maxSew: 25, // segundos máximos (los pospuestos por muchos años no detienen el telar)
  turn: 0.5, // segundos en que se teje la vuelta del hilo en el borde (junto a su línea de arriba)
  pause: 0.8, // respiro antes del siguiente
  hold: 6, // segundos que el telar completo queda a la vista antes de enrollarse en ovillos
};

// Por ahora, para ir viendo el final: cada vuelta parte con el telar casi tejido y solo se tejen los
// últimos pendientes. Para volver a tejerlo completo desde cero, poner `casiLleno` en false.
const PRUEBA = { casiLleno: true, porTejer: 3 };

/** Al empezar una vuelta: todo sin tejer o, en modo de prueba, todo tejido salvo los últimos. */
function empezarVuelta() {
  tejidos.forEach((p, i) => {
    p.oculto = !PRUEBA.casiLleno || i >= tejidos.length - PRUEBA.porTejer;
  });
}

const ANCHO = TELAR.right - TELAR.left;
// Largo de una puntada (un día), en unidades del dibujo.
const POR_DIA = ANCHO / TELAR.diasPorLinea;
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

/** Largo del hilo de un pendiente: proporcional a cuánto tiempo lleva pospuesto. */
export const largoDeDias = (dias) => Math.max(1, Math.round(dias ?? DIAS_SIN_DATO)) * POR_DIA;

/**
 * El hilo va en puntadas, una por cada día: `pathLength` cuenta el trazo en días (no en unidades del
 * dibujo), así cada puntada calza exacto con un día aunque el hilo ondule. Las vueltas del borde no son
 * días: van en puntadas del mismo tamaño, pero medidas sobre el dibujo.
 */
export function enPuntadas(nodo, dias = null) {
  if (dias) {
    nodo.setAttribute('pathLength', dias.toFixed(3));
    nodo.style.strokeDasharray = `${TELAR.puntada} ${(1 - TELAR.puntada).toFixed(2)}`;
  } else {
    nodo.style.strokeDasharray = `${(POR_DIA * TELAR.puntada).toFixed(2)} ${(POR_DIA * (1 - TELAR.puntada)).toFixed(2)}`;
  }
}

/* ---------- Dibujo del telar ---------- */

const marcoRect = el('rect', { class: 'patio', ...MARCO }, svg);
el('title', {}, marcoRect).textContent = 'Clic para ver en pantalla completa';
marcoRect.addEventListener('click', toggleFullscreen);

// Urdimbre: hilos verticales tenues por donde la trama pasa por encima y por debajo.
const urdimbre = el('g', { class: 'urdimbre' }, svg);
for (let x = TELAR.left + ONDA / 4; x < TELAR.right; x += ONDA / 2) {
  el('line', { x1: x.toFixed(1), x2: x.toFixed(1), y1: TELAR.top, y2: TELAR.top }, urdimbre);
}

const tejido = el('g', { class: 'tejido' }, svg);
const emptyHint = el('text', { class: 'aviso-vacio', x: MARCO.x + MARCO.width / 2, y: MARCO.y + MARCO.height / 2 }, svg);
emptyHint.textContent = 'Aún no hay pendientes: cuenta el tuyo en el modo registro';

const esperar = (segundos) => new Promise((resolve) => setTimeout(resolve, segundos * 1000));

// Todos los pendientes tejidos, en el orden en que se registraron.
const tejidos = [];
// Separación entre líneas y grosor del hilo con que se dibujó el telar (los ovillos usan los mismos).
let medidas = { separacion: TELAR.lineGap, grosor: TELAR.stroke };
// Mientras están los ovillos, el telar no se reacomoda solo al cambiar el espacio disponible.
let congelado = false;

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
 * Dibuja todo el tejido: los pendientes uno tras otro, de borde a borde. Las líneas pares van a la derecha
 * y las impares vuelven: un solo hilo continuo que da la vuelta en los bordes. El grosor es siempre el
 * mismo. El telar se alarga o se acorta con lo pospuesto.
 */
/**
 * Separación entre líneas para que el telar llene el espacio de la pantalla de lado a lado: si el telar
 * es más alto (en proporción) que el espacio disponible, se achicaría para caber y dejaría vacíos a los
 * lados; entonces las líneas se juntan hasta que su proporción calce con la del espacio. Una línea sigue
 * siendo un año: solo cambia la distancia entre una línea y la siguiente.
 */
function separacionParaLlenar(lineas) {
  const { clientWidth: ancho, clientHeight: alto } = svg;
  if (!lineas || !ancho || !alto) return TELAR.lineGap;
  const anchoVista = MARCO.width + 20;
  const altoDisponible = (alto / ancho) * anchoVista; // alto en unidades del dibujo que llena el ancho
  const relleno = TELAR.top - MARCO.y + TELAR.bottomPad + 20;
  const separacion = (altoDisponible - relleno) / lineas;
  return Math.min(TELAR.lineGap, Math.max(TELAR.minLineGap, separacion));
}

function dibujar() {
  tejido.replaceChildren();
  const total = tejidos.reduce((suma, p) => suma + p.largo, 0) + TELAR.gap * Math.max(0, tejidos.length - 1);
  const lineas = total ? Math.ceil(total / ANCHO) : 0;
  const separacion = separacionParaLlenar(lineas);
  const grosor = Math.min(TELAR.stroke, separacion * 0.6);
  medidas = { separacion, grosor };
  const yDe = (linea) => TELAR.top + (linea + 0.5) * separacion;
  const xDe = (linea, t) => {
    const d = t - linea * ANCHO;
    return linea % 2 === 0 ? TELAR.left + d : TELAR.right - d;
  };

  let t = 0;
  for (const p of tejidos) {
    const t0 = t;
    const t1 = t + p.largo;
    p.piezas = [];
    p.nodos = [];
    const titulo = `${p.temas.map((tema) => tema.nombre).join(' y ')} · pospuesto ${tiempoEnPalabras(p.dias)}`;
    const trazo = (d, clase) => {
      const nodo = el('path', { class: clase, d, 'data-temas': p.temas.map((tema) => tema.id).join(' ') }, tejido);
      nodo.style.stroke = pintura(p.temas);
      nodo.style.strokeWidth = grosor.toFixed(2);
      el('title', {}, nodo).textContent = titulo;
      if (p.oculto) nodo.classList.add('oculta');
      p.nodos.push(nodo);
      return nodo;
    };

    for (let linea = Math.floor(t0 / ANCHO); linea < lineas && linea * ANCHO < t1; linea++) {
      const a = Math.max(t0, linea * ANCHO);
      const b = Math.min(t1, (linea + 1) * ANCHO);
      if (b - a < 0.01) continue;
      const y = yDe(linea);
      // Las líneas impares se tejen de derecha a izquierda, como avanza el hilo.
      const pieza = { largo: b - a, nodo: trazo(onda(xDe(linea, a), xDe(linea, b), y, linea, 1), linea % 2 ? 'hebra al-reves' : 'hebra') };
      enPuntadas(pieza.nodo, (b - a) / POR_DIA);
      p.piezas.push(pieza);

      // Si el hilo de este pendiente sigue en la línea siguiente, da la vuelta en el borde.
      const fin = (linea + 1) * ANCHO;
      if (b >= fin - 0.01 && t1 > fin + 0.01 && linea < lineas - 1) {
        const borde = linea % 2 === 0 ? TELAR.right : TELAR.left;
        const giro = linea % 2 === 0 ? 1 : 0;
        const r = (separacion / 2).toFixed(2);
        // La vuelta va con su línea de arriba: al coserse, aparece junto con ella.
        pieza.vuelta = trazo(`M ${borde} ${y.toFixed(2)} A ${r} ${r} 0 0 ${giro} ${borde} ${(y + separacion).toFixed(2)}`, 'hebra vuelta hacia-abajo');
        enPuntadas(pieza.vuelta);
      }
    }
    t = t1 + TELAR.gap;
  }

  // El marco, la urdimbre y el área visible se ajustan a lo tejido.
  const abajo = lineas ? TELAR.top + lineas * separacion : MARCO.y + TELAR.altoVacio - TELAR.bottomPad;
  MARCO.height = abajo + TELAR.bottomPad - MARCO.y;
  marcoRect.setAttribute('height', MARCO.height.toFixed(1));
  for (const linea of urdimbre.children) linea.setAttribute('y2', abajo.toFixed(1));
  svg.setAttribute('viewBox', `${MARCO.x - 10} ${MARCO.y - 10} ${MARCO.width + 20} ${(MARCO.height + 20).toFixed(1)}`);
  emptyHint.setAttribute('y', (MARCO.y + MARCO.height / 2).toFixed(1));
  emptyHint.style.display = tejidos.length ? 'none' : '';
}

/** Color con que se pinta un pendiente: el de su temática. */
export const pintura = (temas) => temas[0].color;

/** Agrega un pendiente al tejido. Con `oculto`, su hilo aparece cuando se cose por primera vez. */
function colocar({ texto, hora, temas }, oculto = false, redibujar = true) {
  const dias = diasPospuesto(texto);
  // La temática elegida a mano (si la hay) manda sobre la detectada en el texto.
  const pendiente = { texto, hora, temas: (temas ?? tematicasDe(texto)).map(temaPorId), dias, largo: largoDeDias(dias), oculto };
  const i = tejidos.findIndex((otro) => otro.hora > hora);
  tejidos.splice(i === -1 ? tejidos.length : i, 0, pendiente);
  if (redibujar) {
    dibujar();
    avisar(pendiente);
  }
  return pendiente;
}

/* ---------- Los pendientes se recorren de a uno, en ciclo ---------- */

// Cambia cada vez que se vuelve a tejer (por ejemplo, al apagar la simulación): el pendiente que se
// estaba cosiendo se corta.
let vuelta = 0;

/**
 * Cose de nuevo el hilo de un pendiente, línea por línea: cada tramo reaparece en puntadas de izquierda a
 * derecha; si el hilo da vuelta en el borde, la vuelta se cose junto a su línea de arriba y recién
 * entonces sigue la línea de abajo. Al terminar, cada tramo se tensa y queda continuo.
 */
async function coserPendiente(pendiente) {
  const miVuelta = vuelta;
  const vigente = () => miVuelta === vuelta;
  pendiente.oculto = false;
  for (const nodo of pendiente.nodos) {
    nodo.classList.remove('oculta', 'cosida');
    nodo.classList.add('leyendose'); // todavía sin tejer: aparece tramo a tramo
  }
  const coserNodo = async (nodo, segundos) => {
    nodo.style.setProperty('--coser', `${segundos.toFixed(2)}s`);
    nodo.classList.remove('leyendose');
    nodo.classList.add('cosiendo');
    await esperar(segundos);
    nodo.classList.remove('cosiendo');
    nodo.classList.add('cosida');
  };
  await esperar(0.3);
  if (!vigente()) return;
  const total = Math.min(TEJIDO.maxSew, Math.max(TEJIDO.minSew, pendiente.largo / TEJIDO.sewSpeed));
  for (const pieza of pendiente.piezas) {
    await coserNodo(pieza.nodo, total * (pieza.largo / pendiente.largo));
    if (!vigente()) return;
    if (pieza.vuelta) {
      await coserNodo(pieza.vuelta, TEJIDO.turn);
      if (!vigente()) return;
    }
  }
  await esperar(TEJIDO.pause);
}

const urgentes = []; // pendientes recién registrados: se tejen antes que el resto

// Lo que pasa cuando el telar termina de tejerse (los ovillos): funciones que devuelven una promesa.
const alTerminar = [];
export function alTerminarTelar(fn) {
  alTerminar.push(fn);
}

/**
 * El telar se teje desde cero, un pendiente tras otro, en orden (los recién registrados primero): las
 * tiritas se van acumulando. Cuando está completo, queda un momento a la vista, sus tiritas se enrollan
 * en ovillos (ver ovillos.js) y el telar vuelve a tejerse desde cero.
 */
async function ciclo() {
  for (;;) {
    const miVuelta = vuelta;
    const vigente = () => miVuelta === vuelta;
    const siguiente = urgentes.shift() ?? tejidos.find((p) => p.oculto);
    if (siguiente) {
      await coserPendiente(siguiente);
      continue;
    }
    if (!tejidos.length) {
      await esperar(1);
      continue;
    }
    await esperar(TEJIDO.hold);
    // Lo que los ovillos necesitan del telar: dónde está, sus hilos y cómo dibujarlos.
    const telar = {
      svg,
      tejidos,
      // Lo que se ve del telar (su viewBox): los ovillos lo mueven a la izquierda para hacerse espacio.
      vista: { x: MARCO.x - 10, y: MARCO.y - 10, ancho: MARCO.width + 20, alto: MARCO.height + 20 },
      ...medidas,
      tejido, // los hilos del telar
      // Mientras están los ovillos, el telar no se reacomoda al cambiar el espacio (lo mueven ellos).
      congelar: (si) => {
        congelado = si;
      },
    };
    for (const fn of alTerminar) if (vigente()) await fn(vigente, telar);
    congelado = false;
    if (!vigente()) continue;
    // Se destejen las tiritas y el telar vuelve a empezar.
    empezarVuelta();
    dibujar();
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

/** Los registros reales (siempre) y, si se está simulando, también los de ejemplo; en orden de registro. */
function pendientesDelDia() {
  const ejemplos = simular ? EJEMPLOS : [];
  const reales = cargarRespuestas().map((respuesta) => ({ texto: respuesta.texto, hora: horaDe(respuesta), temas: temasDeRespuesta(respuesta) }));
  return [...ejemplos, ...reales].sort((a, b) => a.hora - b.hora);
}

/** Vuelve a tejer el telar desde cero con lo que corresponde al modo actual. */
function tejerDia() {
  vuelta += 1;
  urgentes.length = 0;
  tejidos.length = 0;
  // El telar parte vacío: cada pendiente aparece cuando se teje.
  pendientesDelDia().forEach((pendiente) => colocar(pendiente, true, false));
  empezarVuelta();
  dibujar();
  avisar(null);
}

/* ---------- Otras visualizaciones (Opción 2) usan los mismos pendientes ---------- */

const oyentes = [];

/**
 * `fn(pendientes, nuevo)` se llama cada vez que cambian los pendientes del día: al tejer el día de nuevo
 * (`nuevo` es null) o cuando llega un pendiente recién registrado (`nuevo` es ese pendiente).
 */
export function alCambiarPendientes(fn) {
  oyentes.push(fn);
  if (tejidos.length) fn(tejidos, null);
}

function avisar(nuevo) {
  for (const fn of oyentes) fn(tejidos, nuevo);
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

/** Un pendiente recién registrado se suma al telar y es el próximo en coserse. */
export function lanzarRespuesta(respuesta) {
  urgentes.push(colocar({ texto: respuesta.texto, hora: horaDe(respuesta), temas: temasDeRespuesta(respuesta) }, true));
}

// El telar aparece completo desde el comienzo: todos los hilos, siempre.
tejerDia();
ciclo();

// Si cambia el espacio disponible (la ventana, ocultar el registro, pantalla completa), el telar se
// vuelve a acomodar para llenarlo de lado a lado.
let anchoVisto = 0;
let altoVisto = 0;
new ResizeObserver(() => {
  if (congelado || (svg.clientWidth === anchoVisto && svg.clientHeight === altoVisto)) return;
  anchoVisto = svg.clientWidth;
  altoVisto = svg.clientHeight;
  dibujar();
}).observe(svg);

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
    // Destaca en el telar y en cualquier otra visualización (todas tienen su grupo .tejido).
    for (const grupo of document.querySelectorAll('.tejido')) grupo.dataset.tema = temaActivo ?? '';
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
