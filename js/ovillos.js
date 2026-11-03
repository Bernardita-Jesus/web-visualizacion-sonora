import { alTerminarTelar, enPuntadas, largoDeDias, pintura } from './main.js';
import { TEMATICAS, tiempoEnPalabras } from './respuestas.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/*
 * Los ovillos: cuando el telar termina de tejerse, la columna de la simbología se repliega hacia la
 * izquierda y desaparece, el telar completo se corre a la izquierda (con su mismo tamaño; si hace falta,
 * queda en parte fuera del borde) dejando espacio a la derecha, y sus hilos salen del cuadrado hacia ese espacio, donde se enrollan en un ovillo por temática. Cada ovillo es un solo hilo en espiral que parte en el centro con el primer pendiente
 * registrado y se enrolla hacia afuera. Cada hilo conserva su largo (el tiempo que lleva pospuesto, una
 * puntada por día), así que el tamaño del ovillo dice cuánto tiempo se ha postergado en esa temática.
 * Quedan un rato a la vista, todo vuelve a su lugar y el telar se teje de nuevo desde cero.
 */

const OVILLO = {
  centro: 4, // radio donde empieza el hilo de cada ovillo
  gap: 6, // separación entre un pendiente y el siguiente en el mismo hilo (la misma del telar)
  margen: 28, // aire entre ovillos
  etiqueta: 84, // espacio bajo cada ovillo para su nombre y lo que suma
  letra: 24, // tamaño del nombre de cada ovillo
  paso: 0.02, // resolución de la espiral (radianes)
};

const TIEMPOS = {
  mover: 2.5, // segundos en que la simbología se repliega y el telar se corre a la izquierda (y al volver)
  espacio: 0.5, // parte del ancho que queda libre a la derecha para los ovillos (el telar se sale por la izquierda)
  salir: 10, // segundos que tarda cada hilo en salir del cuadrado y enrollarse
  escalonado: 8, // los hilos no salen todos juntos: el último parte estos segundos después del primero
  tirar: 0.5, // el hilo sale tirado desde su punta: el final parte esta fracción del viaje después que la punta
  arco: 60, // cuánto se levantan los hilos en su viaje (en unidades del dibujo)
  hold: 12, // segundos que los ovillos quedan a la vista antes de volver a tejer el telar
  fundido: 1.5, // segundos en que los ovillos se desvanecen al volver
};

const el = (name, attrs = {}, parent) => {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  parent?.appendChild(node);
  return node;
};
const esperar = (segundos) => new Promise((resolve) => setTimeout(resolve, segundos * 1000));
/** Espera, pero termina antes si deja de estar vigente (por ejemplo, al prender o apagar la simulación). */
async function esperarMientras(segundos, vigente) {
  for (let t = 0; t < segundos && vigente(); t += 0.25) await esperar(Math.min(0.25, segundos - t));
}
// Cuadros de la animación, unos 60 por segundo (con un reloj propio: también avanza si el navegador
// no está pintando cuadros, por ejemplo en una pestaña de fondo o en pruebas).
const siguienteCuadro = (fn) => setTimeout(() => fn(performance.now()), 16);
const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2); // entra y sale despacio

/* ---------- La espiral ---------- */

/**
 * Espiral de Arquímedes con `vuelta` de separación entre giros, recorrida en sentido horario. Devuelve
 * cómo ubicar un punto según cuánto hilo lleva enrollado (`puntoEn(s)`).
 */
function espiral(vuelta) {
  const b = vuelta / (2 * Math.PI);
  const radioEn = (theta) => OVILLO.centro + b * theta;
  const largo = [0];
  const anguloEn = (s) => {
    while (largo.at(-1) < s) {
      const theta = (largo.length - 1) * OVILLO.paso;
      largo.push(largo.at(-1) + Math.hypot(radioEn(theta), b) * OVILLO.paso);
    }
    let [lo, hi] = [0, largo.length - 1];
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (largo[mid] < s) lo = mid;
      else hi = mid;
    }
    const t = (s - largo[lo]) / (largo[hi] - largo[lo] || 1);
    return (lo + t) * OVILLO.paso;
  };
  return {
    puntoEn: (cx, cy, s) => {
      const theta = anguloEn(s);
      return [cx + radioEn(theta) * Math.cos(theta), cy + radioEn(theta) * Math.sin(theta)];
    },
  };
}

/* ---------- Dónde va cada ovillo ---------- */

/** Ordena los ovillos en filas centradas dentro del área; devuelve el alto que ocupan. */
function ordenar(ovillos, area, radioDe) {
  const filas = [];
  let fila = null;
  for (const ovillo of ovillos) {
    ovillo.radio = radioDe(ovillo);
    // Cada ovillo ocupa lo que mide, o lo que mide su nombre si es más ancho.
    const ancho = Math.max(ovillo.radio * 2, ovillo.anchoNombre);
    if (!fila || fila.ancho + OVILLO.margen + ancho > area.ancho) {
      fila = { ovillos: [], ancho: -OVILLO.margen, alto: 0 };
      filas.push(fila);
    }
    fila.ovillos.push(ovillo);
    fila.ancho += OVILLO.margen + ancho;
    fila.alto = Math.max(fila.alto, ovillo.radio * 2 + OVILLO.etiqueta);
  }
  const alto = filas.reduce((suma, f) => suma + f.alto, 0) + OVILLO.margen * (filas.length - 1);
  let y = area.y + Math.max(0, (area.alto - alto) / 2);
  for (const f of filas) {
    let x = area.x + (area.ancho - f.ancho) / 2;
    for (const ovillo of f.ovillos) {
      const ancho = Math.max(ovillo.radio * 2, ovillo.anchoNombre);
      ovillo.cx = x + ancho / 2;
      ovillo.cy = y + (f.alto - OVILLO.etiqueta) / 2;
      x += ancho + OVILLO.margen;
    }
    y += f.alto + OVILLO.margen;
  }
  return alto;
}

/**
 * Arma los ovillos (uno por temática con pendientes) y elige la separación entre vueltas más amplia
 * (hasta el doble de la del telar) con que caben todos en el lugar del telar. El largo de cada hilo no cambia.
 */
function armarOvillos(telar) {
  const ovillos = TEMATICAS.map((tema) => ({ tema, lista: telar.tejidos.filter((p) => p.temas[0].id === tema.id) }))
    .filter((ovillo) => ovillo.lista.length);
  for (const ovillo of ovillos) {
    let s = 0;
    for (const p of ovillo.lista) {
      p.enOvillo = { s0: s, s1: s + p.largo };
      s = p.enOvillo.s1 + OVILLO.gap;
    }
    ovillo.total = s - OVILLO.gap;
    // Lo que dice bajo el ovillo: cuántas veces se repite la temática y cuánto tiempo pospuesto suma.
    const dias = ovillo.lista.reduce((suma, p) => suma + p.largo / largoDeDias(1), 0);
    ovillo.rotulo = [ovillo.tema.nombre, `${ovillo.lista.length} ${ovillo.lista.length === 1 ? 'vez' : 'veces'} · ${tiempoEnPalabras(dias)}`];
    ovillo.anchoNombre = Math.max(ovillo.rotulo[0].length * OVILLO.letra * 0.58, ovillo.rotulo[1].length * OVILLO.letra * 0.8 * 0.5);
  }
  // Radio aproximado de una espiral de largo L: su área es más o menos L · vuelta.
  const radioCon = (vuelta) => (ovillo) => Math.sqrt((ovillo.total * vuelta) / Math.PI + OVILLO.centro ** 2) + vuelta;
  let [lo, hi] = [0.3, telar.separacion * 2];
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (ordenar(ovillos, telar.area, radioCon(mid)) <= telar.area.alto) lo = mid;
    else hi = mid;
  }
  const vuelta = lo;
  ordenar(ovillos, telar.area, radioCon(vuelta));
  return { ovillos, vuelta, grosor: Math.min(telar.grosor, vuelta * 0.6) };
}

/* ---------- Del telar a los ovillos ---------- */

/** Puntos repartidos a lo largo de los hilos de un pendiente en el telar (sus tramos y sus vueltas). */
function puntosEnTelar(p, cuantos) {
  const largos = p.nodos.map((nodo) => nodo.getTotalLength());
  const total = largos.reduce((a, b) => a + b, 0);
  const puntos = [];
  for (let i = 0; i < cuantos; i++) {
    let s = (total * i) / (cuantos - 1);
    let k = 0;
    while (k < largos.length - 1 && s > largos[k]) s -= largos[k++];
    const { x, y } = p.nodos[k].getPointAtLength(Math.min(s, largos[k]));
    puntos.push([x, y]);
  }
  return puntos;
}

const titulo = document.querySelector('#titulo-visualizacion');

function mostrarSimbologia(vista) {
  document.body.dataset.opcion = vista === 'ovillos' ? '2' : '1';
  titulo.textContent = vista === 'ovillos' ? 'Ovillos de pendientes' : 'Telar de testimonios';
}

/** Anima `pasoA(e)` con `e` de 0 a 1 (suave) durante `segundos`. */
function animar(segundos, pasoA, vigente) {
  const inicio = performance.now();
  return new Promise((resolve) => {
    const cuadro = (ahora) => {
      const t = Math.min(1, (ahora - inicio) / 1000 / segundos);
      pasoA(suave(t));
      if (t < 1 && vigente()) siguienteCuadro(cuadro);
      else resolve();
    };
    siguienteCuadro(cuadro);
  });
}

const planoWrap = document.querySelector('.plano-wrap');

/**
 * Corre el telar: en cada cuadro calcula qué parte del dibujo se ve (el viewBox) para que el telar quede
 * con la escala `k` y su borde izquierdo en `izq` (en píxeles de la pantalla). Devuelve esa vista.
 */
function verTelar(svg, vista, k, izq, arriba) {
  const r = svg.getBoundingClientRect();
  const v = { x: vista.x - (izq - r.left) / k, y: vista.y - (arriba - r.top) / k, ancho: r.width / k, alto: r.height / k };
  svg.setAttribute('viewBox', `${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.ancho.toFixed(1)} ${v.alto.toFixed(1)}`);
  return v;
}

/**
 * Cuando el telar termina: la simbología se repliega a la izquierda y el telar se corre hacia allá,
 * dejando espacio a la derecha. Cada hilo sale del cuadrado y viaja hasta su lugar en el ovillo de su
 * temática, donde queda enrollado; parten uno tras otro, en el orden en que se tejieron. Luego aparecen
 * los nombres de los ovillos; quedan un rato a la vista y todo vuelve a su lugar.
 */
alTerminarTelar(async (vigente, telar) => {
  if (!telar.tejidos.length) return;
  const { svg, vista } = telar;
  telar.congelar(true);

  // Dónde está el telar ahora (centrado en su espacio) y cómo se corre a la izquierda.
  const r0 = svg.getBoundingClientRect();
  const k0 = Math.min(r0.width / vista.ancho, r0.height / vista.alto);
  const izq0 = r0.left + (r0.width - vista.ancho * k0) / 2;
  const arriba = r0.top;
  svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
  planoWrap.classList.add('replegada');
  mostrarSimbologia('ovillos');
  // El telar se corre con su mismo tamaño, hasta que su borde derecho deje libre la parte derecha del
  // espacio (si es ancho, queda en parte fuera del borde izquierdo).
  let v = vista;
  await animar(TIEMPOS.mover, (e) => {
    const r = svg.getBoundingClientRect();
    const izqFinal = Math.min(r.left, r.left + r.width * (1 - TIEMPOS.espacio) - vista.ancho * k0);
    v = verTelar(svg, vista, k0, izq0 + (izqFinal - izq0) * e, arriba);
  }, vigente);

  // El espacio que quedó a la derecha del telar es para los ovillos.
  const margen = 30;
  const area = {
    x: vista.x + vista.ancho + margen,
    y: v.y + margen,
    ancho: v.x + v.ancho - (vista.x + vista.ancho) - margen * 2,
    alto: v.alto - margen * 2,
  };
  const { ovillos, vuelta, grosor } = armarOvillos({ ...telar, area });
  const { puntoEn } = espiral(vuelta);

  // Cada hilo: dónde está en el telar y dónde quedará en su ovillo, con la misma cantidad de puntos.
  const capa = el('g', { class: 'tejido ovillos' }, svg);
  capa.dataset.tema = telar.tejido.dataset.tema ?? '';
  const viajes = [];
  for (const ovillo of ovillos) {
    for (const p of ovillo.lista) {
      const cuantos = Math.max(12, Math.min(900, Math.round(p.largo / 8)));
      const desde = puntosEnTelar(p, cuantos);
      const hasta = Array.from({ length: cuantos }, (_, i) =>
        puntoEn(ovillo.cx, ovillo.cy, p.enOvillo.s0 + ((p.enOvillo.s1 - p.enOvillo.s0) * i) / (cuantos - 1)));
      const nodo = el('path', { class: 'hebra cosida', 'data-temas': p.temas[0].id }, capa);
      nodo.style.stroke = pintura(p.temas);
      nodo.style.strokeWidth = telar.grosor.toFixed(2);
      enPuntadas(nodo, p.largo / largoDeDias(1)); // las mismas puntadas: una por día
      viajes.push({ nodo, desde, hasta, p });
    }
  }
  // El orden de partida es el orden en que se tejieron.
  viajes.sort((a, b) => telar.tejidos.indexOf(a.p) - telar.tejidos.indexOf(b.p));
  viajes.forEach((viaje, i) => {
    viaje.parte = viajes.length > 1 ? (TIEMPOS.escalonado * i) / (viajes.length - 1) : 0;
  });

  // El hilo se descose tirado desde su punta: cada punto parte un poco después que el anterior, así el
  // hilo se desenreda de a poco y sigue a su punta, que va primero al centro del ovillo.
  const dibujarViaje = (viaje, t) => {
    const { desde, hasta } = viaje;
    const n = desde.length;
    let d = '';
    for (let i = 0; i < n; i++) {
      const retraso = (i / Math.max(1, n - 1)) * TIEMPOS.tirar;
      const e = suave(Math.min(1, Math.max(0, (t - retraso) / (1 - TIEMPOS.tirar))));
      const arco = TIEMPOS.arco * Math.sin(Math.PI * e); // en el camino, el hilo se levanta un poco
      const x = desde[i][0] + (hasta[i][0] - desde[i][0]) * e;
      const y = desde[i][1] + (hasta[i][1] - desde[i][1]) * e - arco;
      d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    viaje.nodo.setAttribute('d', d);
    viaje.nodo.style.strokeWidth = (telar.grosor + (grosor - telar.grosor) * suave(t)).toFixed(2);
  };

  // Los hilos del telar se cambian por sus copias (en el mismo lugar) y salen del cuadrado.
  for (const viaje of viajes) dibujarViaje(viaje, 0);
  telar.tejido.style.visibility = 'hidden';

  const total = TIEMPOS.escalonado + TIEMPOS.salir;
  const inicio = performance.now();
  try {
    await new Promise((resolve) => {
      const cuadro = (ahora) => {
        const t = (ahora - inicio) / 1000;
        for (const viaje of viajes) dibujarViaje(viaje, Math.min(1, Math.max(0, (t - viaje.parte) / TIEMPOS.salir)));
        if (t < total && vigente()) siguienteCuadro(cuadro);
        else resolve();
      };
      siguienteCuadro(cuadro);
    });
    if (!vigente()) return;
    for (const viaje of viajes) dibujarViaje(viaje, 1);

    // Bajo cada ovillo: su temática, cuántas veces se repite y cuánto tiempo pospuesto suma.
    for (const { tema, rotulo, cx, cy, radio } of ovillos) {
      rotulo.forEach((linea, i) => {
        const texto = el('text', { class: i ? 'ovillo-nombre ovillo-suma' : 'ovillo-nombre', x: cx, y: cy + radio + OVILLO.letra * (1 + i * 1.25) }, capa);
        texto.style.fill = tema.color;
        texto.style.fontSize = `${i ? OVILLO.letra * 0.8 : OVILLO.letra}px`;
        texto.textContent = linea;
      });
    }
    await esperarMientras(TIEMPOS.hold, vigente);
  } finally {
    // De vuelta: los ovillos se desvanecen, la simbología vuelve y el telar regresa a su lugar.
    capa.style.transition = `opacity ${TIEMPOS.fundido}s ease`;
    capa.style.opacity = '0';
    await esperar(TIEMPOS.fundido);
    capa.remove();
    planoWrap.classList.remove('replegada');
    mostrarSimbologia('telar');
    const izq1 = svg.getBoundingClientRect().left;
    await animar(TIEMPOS.mover, (e) => {
      const r = svg.getBoundingClientRect();
      const kFinal = Math.min(r.width / vista.ancho, r.height / vista.alto);
      const izqFinal = r.left + (r.width - vista.ancho * kFinal) / 2;
      verTelar(svg, vista, k0 + (kFinal - k0) * e, izq1 + (izqFinal - izq1) * e, arriba);
    }, () => true);
    svg.setAttribute('preserveAspectRatio', 'xMidYMin meet');
    telar.tejido.style.visibility = '';
    telar.congelar(false);
  }
});
