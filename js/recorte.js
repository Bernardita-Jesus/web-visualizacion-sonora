import { DIAS_SIN_DATO, cargarRespuestas, diasDeRespuesta, temaDeRespuesta, temaPorId, tiempoEnPalabras } from './respuestas.js';

/*
 * La instancia de recorte: después de dar su testimonio, la persona ve a pantalla completa en qué temática
 * quedó su testimonio y de qué color es, y cuánta tela cortar: un cuadrado por cada semana que lleva
 * pospuesto (la unidad mínima es una semana). Al lado, el telar grande muestra dónde va su tira, junto al
 * resto de los registros: cada fila del telar es medio año (26 semanas); si la tira no cabe, sigue en la fila
 * de abajo.
 */

const RECORTE = {
  diasPorCm: 7, // un cuadrado por semana pospuesta: los cuadrados son la unidad de medida
  maxCm: 120, // la tira más larga (120 semanas, unos 2 años y 4 meses; lo que pase de ahí se corta igual en 120)
  minCm: 1, // la unidad mínima es una semana: aunque digan menos (unos días), se marca una
  transicion: 0.7, // segundos en que el rectángulo de arriba sube y las instrucciones ocupan la pantalla
  cerrarSola: 240, // segundos tras los que las instrucciones se cierran solas, si nadie aprieta el botón
  anchoTelar: 26, // ancho del telar, en cuadrados (semanas): cada fila es medio año de tela
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

/** Centímetros de tela para un pendiente: uno (un cuadrado) por semana pospuesta (con un mínimo y un máximo). */
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
let cierre = null;

const SVG_NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}, parent) => {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  parent?.appendChild(node);
  return node;
};


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
  // Solo las filas cercanas a la tira nueva: un par antes (lo último que se tejió) y una sola fila sobrante
  // después de donde termina.
  const nueva = tiras.find((t) => t.nueva);
  const primeraNueva = Math.floor(nueva.desde / fila);
  const ultimaNueva = Math.floor((nueva.desde + nueva.largo - 1) / fila);
  const desdeFila = Math.max(0, primeraNueva - 2);
  const filas = ultimaNueva + 2 - desdeFila;

  // Medidas del dibujo: el ancho fijo y cada fila, una franja bien separada de la siguiente.
  const ancho = 640;
  const altoFila = 60;
  const grosor = 22; // alto de cada tira
  const arriba = 12; // aire arriba, para el tiempo escrito sobre la tira si cae en la primera fila
  const alto = arriba + filas * altoFila;
  const k = ancho / fila; // unidades del dibujo por cuadrado
  const vuelta = altoFila / 2 + grosor / 2 + 4; // lo que sobresale la vuelta de la lana en los bordes
  const margenNumeros = 34 + vuelta; // a la izquierda, el número de cada fila (por fuera de las vueltas)
  const margenCuadrados = 24; // arriba, el número de cada cuadrado (1 a 26)
  const yFila = (f) => arriba + (f - desdeFila) * altoFila;
  miniTelar.setAttribute('viewBox', `${-6 - margenNumeros} ${-6 - margenCuadrados} ${ancho + 12 + margenNumeros + vuelta} ${alto + 12 + margenCuadrados}`);
  miniTelar.replaceChildren();
  // La textura de lana: hebras torcidas en diagonal (oscuras y claras) y una pelusa en los bordes.
  const defs = el('defs', {}, miniTelar);
  const hebras = el('pattern', { id: 'telar-hebras', patternUnits: 'userSpaceOnUse', width: 7, height: 7, patternTransform: 'rotate(-55)' }, defs);
  el('rect', { width: 2.6, height: 7, fill: 'rgb(0 0 0 / 0.28)' }, hebras);
  el('rect', { x: 3.6, width: 1.3, height: 7, fill: 'rgb(255 255 255 / 0.35)' }, hebras);
  // (con espacio de sobra, para que no recorte el grosor de las vueltas de lana en los bordes)
  const pelusa = el('filter', { id: 'telar-pelusa', x: '-60%', y: '-60%', width: '220%', height: '220%' }, defs);
  el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.9, numOctaves: 2, result: 'ruido' }, pelusa);
  el('feDisplacementMap', { in: 'SourceGraphic', in2: 'ruido', scale: 3 }, pelusa);
  // Una hebra de lana: el color, redondeada en las puntas, con sus hebras torcidas encima.
  const lana = (tramo, color, padre, clase) => {
    const g = el('g', { class: clase, filter: 'url(#telar-pelusa)' }, padre);
    const forma = { ...tramo, rx: tramo.height / 2 };
    el('rect', { ...forma, class: 'lana-color', style: `fill: ${color}` }, g);
    el('rect', { ...forma, class: 'lana-hebras', fill: 'url(#telar-hebras)' }, g);
    return g;
  };
  el('rect', { x: -4, y: -4, width: ancho + 8, height: alto + 8, class: 'mini-marco' }, miniTelar);
  // El número de cada fila (el real del telar) y, entre una fila y otra, una línea que las separa.
  for (let f = desdeFila; f < desdeFila + filas; f++) {
    const numero = el('text', { x: -12 - vuelta, y: yFila(f) + altoFila / 2, class: 'mini-numero' }, miniTelar);
    numero.textContent = String(f + 1);
    if (f > desdeFila) el('line', { x1: -4, x2: ancho + 4, y1: yFila(f), y2: yFila(f), class: 'mini-separador' }, miniTelar);
  }

  // Arriba, el número de cada cuadrado (cada semana de la fila), del 1 al 26.
  for (let c = 0; c < fila; c++) {
    const numero = el('text', { x: (c + 0.5) * k, y: -16, class: 'mini-numero mini-numero-cuadrado' }, miniTelar);
    numero.textContent = String(c + 1);
  }

  // El telar se teje en zigzag, como la trama de un telar de verdad: las filas impares (1, 3, 5…) van de
  // izquierda a derecha y las pares de derecha a izquierda. Así, al llegar al borde, la lana da la vuelta y
  // sigue en la fila de abajo sin cortarse, y los trazos largos quedan unidos.
  const haciaLaDerecha = (f) => f % 2 === 0;
  // Cada tira, en los tramos de fila que ocupa (solo los de las filas que se ven).
  const tramos = (tira) => {
    const lista = [];
    for (let resto = tira.largo, pos = tira.desde; resto > 0; ) {
      const f = Math.floor(pos / fila);
      const enFila = Math.min(resto, (f + 1) * fila - pos);
      if (f >= desdeFila && f < desdeFila + filas) {
        const inicio = pos - f * fila; // cuadrados desde el comienzo de la fila (según su sentido)
        const x = haciaLaDerecha(f) ? inicio * k : ancho - (inicio + enFila) * k;
        // Si la tira sigue en la fila de abajo (y esa fila se ve), al final de este tramo da la vuelta.
        const sigue = resto > enFila && f + 1 < desdeFila + filas;
        lista.push({ x, y: yFila(f) + (altoFila - grosor) / 2, width: enFila * k, height: grosor, f, sigue });
      }
      pos += enFila;
      resto -= enFila;
    }
    return lista;
  };
  // La vuelta de la lana en el borde, de una fila a la de abajo: media curva por fuera del telar.
  const curvaVuelta = (f) => {
    const y1 = yFila(f) + altoFila / 2;
    const y2 = y1 + altoFila;
    // Parte un poco antes del borde, encima de la punta redondeada de cada tramo, para que se vean unidos.
    const r = altoFila / 2;
    const e = grosor / 2;
    return haciaLaDerecha(f)
      ? `M${ancho - e} ${y1}L${ancho} ${y1}A${r} ${r} 0 0 1 ${ancho} ${y2}L${ancho - e} ${y2}`
      : `M${e} ${y1}L0 ${y1}A${r} ${r} 0 0 0 0 ${y2}L${e} ${y2}`;
  };
  const vueltaDeLana = (tramo, color, padre, clase) => {
    const g = el('g', { class: clase, filter: 'url(#telar-pelusa)' }, padre);
    const d = curvaVuelta(tramo.f);
    el('path', { d, class: 'lana-vuelta', style: `stroke: ${color}; stroke-width: ${grosor}` }, g);
    el('path', { d, class: 'lana-vuelta', stroke: 'url(#telar-hebras)', style: `stroke-width: ${grosor}` }, g);
  };
  // Las tiras que ya están, tenues.
  for (const tira of tiras.filter((t) => !t.nueva)) {
    for (const tramo of tramos(tira)) {
      lana(tramo, tira.color, miniTelar, 'mini-tira');
    }
    for (const tramo of tramos(tira)) {
      if (tramo.sigue) vueltaDeLana(tramo, tira.color, miniTelar, 'mini-tira');
    }
  }
  // Una línea blanca vertical por semana (cada cuadrado), como los hilos del telar.
  for (let x = 0; x <= ancho + 0.01; x += k) el('line', { x1: x, x2: x, y1: -4, y2: alto + 4, class: 'mini-urdimbre' }, miniTelar);
  // La tira nueva, encima de todo, fuerte y con sus semanas marcadas.
  const tiempo = diasDeRespuesta(respuesta);
  const gNueva = el('g', { class: 'mini-nueva' }, miniTelar);
  tramos(nueva).forEach((tramo, i) => {
    // Sobre el comienzo de la tira, el tiempo de su registro.
    if (i === 0) {
      const derecha = haciaLaDerecha(tramo.f);
      el('text', {
        x: derecha ? tramo.x : tramo.x + tramo.width,
        y: tramo.y - 8,
        class: 'mini-tiempo',
        style: `fill: ${nueva.color}; text-anchor: ${derecha ? 'start' : 'end'}`,
      }, miniTelar).textContent =
        tiempo == null ? '1 semana' : tiempoEnPalabras(tiempo);
    }
    lana(tramo, nueva.color, gNueva, 'mini-lana');
    for (let x = tramo.x + k; x < tramo.x + tramo.width - 0.01; x += k) {
      el('line', { x1: x, x2: x, y1: tramo.y, y2: tramo.y + tramo.height, class: 'mini-semana' }, gNueva);
    }
  });
  // Sus vueltas en los bordes, encima de las puntas de los tramos: el borde oscuro y, encima, la lana.
  for (const tramo of tramos(nueva).filter((t) => t.sigue)) {
    el('path', { d: curvaVuelta(tramo.f), class: 'lana-vuelta-borde', style: `stroke-width: ${grosor + 3}` }, gNueva);
    vueltaDeLana(tramo, nueva.color, gNueva, 'mini-lana');
  }

  const filaNueva = Math.floor(nueva.desde / fila) + 1;
  const desdeCm = nueva.desde - (filaNueva - 1) * fila;
  // Arriba, grande, la fila; abajo, desde qué cuadrado.
  const principal = document.createElement('span');
  principal.className = 'mini-telar-fila';
  principal.append('Agrégalo al telar en la ', Object.assign(document.createElement('strong'), { textContent: `fila ${filaNueva}` }));
  const detalle = document.createElement('span');
  detalle.className = 'mini-telar-desde';
  // El cuadrado se cuenta con los números de arriba del telar (1 a 26, de izquierda a derecha); en las filas
  // que van de derecha a izquierda, el comienzo queda a la derecha.
  const derecha = haciaLaDerecha(filaNueva - 1);
  detalle.append('desde ', Object.assign(document.createElement('strong'), {
    textContent: `el cuadrado ${derecha ? desdeCm + 1 : fila - desdeCm}`,
  }), derecha ? ', hacia la derecha' : ', hacia la izquierda');
  if (nueva.desde + nueva.largo > filaNueva * fila) detalle.append(' (da la vuelta y sigue en la fila de abajo)');
  miniTexto.replaceChildren(principal, detalle);

}

/** Muestra las instrucciones de recorte para un testimonio recién enviado. */
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
  // Título: el pendiente, con su tiempo, y en qué temática y color quedó.
  const tiempoTitulo = document.createElement('strong');
  tiempoTitulo.className = 'recorte-tiempo';
  tiempoTitulo.textContent = tiempoEnPalabras(dias ?? 0);
  const deTiempo = dias == null ? [] : [' de ', tiempoTitulo];
  mensaje.append('Tu pendiente', ...deTiempo, ' fue clasificado como ', nombre, ', que corresponde al color ', color, '.');

  // Los pasos: la tela de su color, cortarla en tantos cuadrados (semanas) y agregarla al telar.
  muestra.style.backgroundColor = tema.color;
  const negrita = (texto) => Object.assign(document.createElement('strong'), { textContent: texto });
  pasoTela.replaceChildren('Toma el ovillo de lana de color ', negrita(tema.colorNombre));
  pasoCorte.replaceChildren('Recorre con la lana hasta ', negrita('tu fecha'), ' y luego córtalo');
  pasoCuenta.textContent = `${dias == null ? '1 semana' : tiempoEnPalabras(dias)} · ${cm} ${cm === 1 ? 'cuadrado' : 'cuadrados'}`;

  // Aparece bajo el rectángulo de arriba y, mientras ese rectángulo sube, la capa sube con él hasta ocupar
  // toda la pantalla.
  capa.style.transition = 'none';
  capa.hidden = false;
  dibujarMiniTelar(respuesta);
  ubicarCapa(medidas().bajoCabecera);
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
// Al cambiar el tamaño de la ventana, se vuelve a ubicar después de que el lienzo se reescale.
window.addEventListener('resize', () => {
  setTimeout(() => {
    if (capa.hidden || !capa.dataset.cm) return;
    capa.style.transition = 'none';
    ubicarCapa();
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
