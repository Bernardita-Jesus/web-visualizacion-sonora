import { alTerminarTelar, enPuntadas, largoDeDias, pintura } from './main.js';
import { TEMATICAS, tiempoEnPalabras } from './respuestas.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/*
 * Los ovillos: cuando el telar termina de tejerse, la columna de la simbología se repliega hacia la
 * izquierda y desaparece, el telar completo se corre a la izquierda (con su mismo tamaño; si hace falta,
 * queda en parte fuera del borde) dejando espacio a la derecha, y sus hilos salen del cuadrado hacia ese espacio, donde se enrollan en un ovillo por temática. Cada ovillo es un solo hilo en espiral que parte en el centro con el primer pendiente
 * registrado y se enrolla hacia afuera. Cada hilo conserva su largo (el tiempo que lleva pospuesto, una
 * puntada por día), así que el tamaño del ovillo dice cuánto tiempo se ha postergado en esa temática.
 * Ya formados, quedan un momento a la vista; el rectángulo del telar se va del todo por la izquierda y,
 * en ese espacio, entra un ovillo a la vez: su hilo se despliega y borda, en puntadas, las palabras más
 * usadas en su temática (el ovillo se achica a medida que borda), y luego se va por la izquierda, de vuelta
 * al telar. Cuando se han ido todos, el telar regresa con todos sus hilos y vuelve la simbología.
 */

export const OVILLO = {
  centro: 4, // radio donde empieza el hilo de cada ovillo
  gap: 6, // separación entre un pendiente y el siguiente en el mismo hilo (la misma del telar)
  margen: 28, // aire entre ovillos
  etiqueta: 84, // espacio bajo cada ovillo para su nombre y lo que suma
  letra: 24, // tamaño del nombre de cada ovillo
  palabras: 4, // cuántas de las palabras más usadas escribe cada ovillo
  paso: 0.02, // resolución de la espiral (radianes)
};

const TIEMPOS = {
  mover: 2.5, // segundos en que la simbología se repliega y el telar se corre a la izquierda (y al volver)
  espacio: 0.5, // parte del ancho que queda libre a la derecha para los ovillos (el telar se sale por la izquierda)
  salir: 26, // segundos que tarda cada hilo en salir del cuadrado y quedar enrollado
  llegar: 0.18, // parte de ese tiempo en que el hilo llega al ovillo (rápido); el resto, el ovillo lo enrolla (lento)
  escalonado: 6, // los hilos no salen todos juntos: el último parte estos segundos después del primero
  tirar: 0.25, // el hilo sale tirado desde su punta: el final parte esta fracción del viaje después que la punta
  antesDePalabras: 5, // segundos que los ovillos quedan a la vista, recién formados, antes de bordar
  salirTelar: 2.5, // segundos en que el rectángulo del telar se va por la izquierda (y vuelve)
  llevar: 1.6, // segundos en que cada ovillo va al espacio del telar (y en que se va por la izquierda)
  letrasPorSegundo: 7, // velocidad con que el hilo borda las palabras
  porOvillo: 2.5, // segundos que las palabras bordadas quedan a la vista antes de que el ovillo vuelva
  hold: 3, // segundos que los ovillos quedan a la vista después de bordar, antes de volver al telar
  fundido: 1.5, // segundos en que las palabras y los nombres se desvanecen al volver
  enTelar: 12, // segundos que el telar, ya de vuelta y completo, queda a la vista antes de volver a tejerse
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
const muySuave = (t) => (1 - Math.cos(Math.PI * t)) / 2; // sin aceleraciones bruscas: para los hilos

/* ---------- La espiral ---------- */

/**
 * Espiral de Arquímedes con `vuelta` de separación entre giros, recorrida en sentido horario. Devuelve
 * dónde queda un punto según cuánto hilo lleva enrollado, en coordenadas polares (`polarEn(s)`: radio y
 * ángulo acumulado, que sigue creciendo vuelta a vuelta).
 */
export function espiral(vuelta) {
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
    polarEn: (s) => {
      const theta = anguloEn(s);
      return [radioEn(theta), theta];
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
export function armarOvillos(telar) {
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

/* ---------- Las palabras más usadas ---------- */

// Palabras que no dicen de qué trata un pendiente: conectores (y, pero, aunque, porque, entonces…),
// preposiciones, artículos, pronombres, adverbios y lo que se dice del tiempo (eso ya está en el largo del
// hilo). Se comparan sin tildes.
const VACIAS = new Set(`
  ademas ahi ahora algo alguien algun alguna algunas alguno algunos alla alli antes aqui aquel aquella
  asi aun aunque bajo bastante bien cada casi cerca como conmigo contigo contra cual cuales cualquier
  cuando cuanto cuantos debajo dentro desde despues donde durante ella ellas ellos encima entonces entre
  esas ese eso esos esta estas este esto estos hacia hasta incluso jamas lejos luego mal mas mediante
  menos mientras mismo misma mismos mucha muchas mucho muchos nada nadie ninguna ninguno nosotros nuestra
  nuestro nunca otra otras otro otros para pero poco pocos porque pues quien quienes quiza quizas segun
  siempre sino sobre solamente solo tambien tampoco tanto tanta tantos tras todavia toda todas todo todos
  unas unos usted ustedes vosotros sea osea entonces igual demasiado tal tales cierto cierta verdad
  cosa cosas vida vez veces tiempo hora horas manera forma parte rato poquito harto
  anos ano meses semanas semana dias hoy ayer manana temprano tarde noche pronto
  dos tres cuatro cinco seis siete ocho nueve diez once doce quince veinte treinta medio media
  enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre verano invierno
  entero entera enorme grande grandes nuevo nueva primer primera primero ultimo ultima
`.split(/\s+/).filter(Boolean));
const sinTildes = (texto) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '');

// Sin verbos. No es un análisis gramatical: se descartan las formas que delatan a un verbo por cómo
// terminan (infinitivos: terminar, decir, dormir, también con "le", "lo", "me"…; gerundios: estudiando;
// pasados y plurales verbales: llamaron, dejamos, quería, pospuse…) y una lista de formas comunes al
// contar un pendiente. Algunas palabras terminan como verbo pero no lo son (taller, lugar, carrera…):
// esas se quedan.
const ENCLITICOS = '(me|te|se|le|les|lo|la|los|las|nos)?';
const TERMINACIONES_VERBALES = [
  new RegExp(`(ar|er|ir)${ENCLITICOS}$`), // infinitivo
  new RegExp(`(ando|iendo|yendo)${ENCLITICOS}$`), // gerundio
  /(aron|ieron|amos|emos|imos|aste|iste|asteis|isteis|aban|abas|aba|ais|eis|ian|ias)$/, // pasados y personas verbales
  /(aria|eria|iria|arian|erian|irian|aremos|eremos|iremos|ara|era|ira|aran|eran|iran)$/, // futuro y condicional
  /(ase|iese|ara|iera|asen|iesen|aran|ieran)$/, // subjuntivo
];
const NO_SON_VERBOS = new Set(`
  taller lugar hogar mujer ayer celular familiar escolar militar popular particular auxiliar similar
  regular dolar collar altar azucar caracter placer cancer chofer bachiller sur
  carrera pera tijera bandera cartera escalera madera primavera frontera manera sera cera era
  hora mira para clara cara vara barra guitarra jarra tiara
  ceramica musica fisica quimica clinica tecnica practica
  examenes amigas amigos idiomas temas problemas programas ruinas oficinas
  dias tias mias guias via
`.split(/\s+/).filter(Boolean));
const VERBOS = new Set(`
  voy vas van vamos fui fue fuimos fueron iba iban hice hizo hago hace hacen puedo pude puede pueden
  siento senti creo crei dije dijo digo dices llamo llame veo vi ve doy di sale salgo pongo puse empiezo
  empece empieza termino termine aprendo aprendi leo lei escribo escribi tomo tome ando anda tengo tienes
  tiene tienen tenia tuve quise quiero quieres quiere prometi prometio debo debes debe deberia necesito
  llevo lleva llevan sigo sigue siguen dejo deje queda quedo estoy esta estan estaba estuve soy eres es
  son fue sido estado he has ha hemos han habia hubo gusta gustaria cuesta costo duele dice dicen pospuse
  pospongo pospone pospuesto pospuesta posponiendo postergo postergue encuentro encontre abro abri paso pase
  vuelvo volvi conozco conoci se sabe sabia pienso pense espero espere intento intente trato trate
`.split(/\s+/).filter(Boolean));
const esVerbo = (palabra) =>
  !NO_SON_VERBOS.has(palabra) && (VERBOS.has(palabra) || TERMINACIONES_VERBALES.some((regla) => regla.test(palabra)));

/** Las palabras que más se repiten en los pendientes de un ovillo (de 4 letras o más, sin las vacías ni verbos). */
function palabrasFrecuentes(lista, cuantas) {
  const conteo = new Map();
  for (const { texto } of lista) {
    for (const palabra of texto.toLowerCase().split(/[^\p{L}]+/u)) {
      const simple = sinTildes(palabra);
      if (palabra.length < 4 || VACIAS.has(simple) || esVerbo(simple)) continue;
      conteo.set(palabra, (conteo.get(palabra) ?? 0) + 1);
    }
  }
  return [...conteo.entries()].sort((a, b) => b[1] - a[1]).slice(0, cuantas).map(([palabra]) => palabra);
}

/** Ubica un ovillo en (x, y) con escala `escala` (sin moverlo de verdad: con una transformación). */
function ubicarOvillo(ovillo, x, y, escala) {
  ovillo.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${escala.toFixed(3)}) translate(${-ovillo.cx} ${-ovillo.cy})`);
}

/**
 * Un ovillo va al espacio que dejó el telar y su hilo se despliega bordando, en puntadas y letra a letra,
 * las palabras más usadas en su temática (una por línea). Un hilo une el ovillo con la aguja, y el ovillo
 * se achica a medida que borda. Al terminar, las palabras quedan un momento y el ovillo se va por la
 * izquierda, de vuelta al telar (hasta `xSalida`). Su nombre desaparece apenas el ovillo se mueve.
 */
async function bordarPalabras(capa, ovillo, espacio, xSalida, vigente) {
  const palabras = palabrasFrecuentes(ovillo.lista, OVILLO.palabras);
  if (!palabras.length) return;
  const color = ovillo.tema.color;

  // El ovillo a la izquierda del espacio; las palabras a su derecha, tan grandes como quepan.
  const ox = espacio.x + espacio.ancho * 0.16;
  const oy = espacio.y + espacio.alto / 2;
  const escala = Math.min(1.6, (espacio.ancho * 0.13) / ovillo.radio, (espacio.alto * 0.35) / ovillo.radio);
  const x0 = espacio.x + espacio.ancho * 0.34;
  const ancho = espacio.x + espacio.ancho - x0;
  const largo = Math.max(...palabras.map((palabra) => palabra.length));
  const letra = Math.min(140, (espacio.alto * 0.85) / (palabras.length * 1.15), ancho / (largo * 0.56));
  const y0 = oy - ((palabras.length - 1) * letra * 1.15) / 2;

  // Apenas el ovillo se mueve, su nombre de abajo desaparece.
  ovillo.rotuloG.style.transition = 'opacity 0.5s ease';
  ovillo.rotuloG.style.opacity = '0';
  await animar(TIEMPOS.llevar, (e) => {
    ubicarOvillo(ovillo, ovillo.cx + (ox - ovillo.cx) * e, ovillo.cy + (oy - ovillo.cy) * e, 1 + (escala - 1) * e);
  }, vigente);

  // Las palabras bordadas: solo su contorno, en puntadas, que se destapa de izquierda a derecha.
  const bordado = el('g', { class: 'bordado' }, capa);
  const hilo = el('path', { class: 'hilo-aguja' }, capa);
  hilo.style.stroke = color;
  const lineas = palabras.map((palabra, i) => {
    const id = `bordado-${ovillo.tema.id}-${i}`;
    const recorte = el('clipPath', { id }, bordado);
    const rect = el('rect', { x: x0 - letra, y: y0 + i * letra * 1.15 - letra, width: 0, height: letra * 2 }, recorte);
    const texto = el('text', { x: x0, y: y0 + i * letra * 1.15, 'clip-path': `url(#${id})` }, bordado);
    texto.textContent = palabra;
    texto.style.stroke = color;
    texto.style.fontSize = `${letra.toFixed(1)}px`;
    texto.style.strokeWidth = (letra * 0.045).toFixed(2);
    texto.style.strokeDasharray = `${(letra * 0.07).toFixed(2)} ${(letra * 0.045).toFixed(2)}`;
    return { palabra, rect, y: y0 + i * letra * 1.15, largo: texto.getComputedTextLength() };
  });
  const totalLetras = palabras.join('').length;
  let bordadas = 0;
  for (const linea of lineas) {
    const segundos = linea.palabra.length / TIEMPOS.letrasPorSegundo;
    await animar(segundos, (e) => {
      const xAguja = x0 + linea.largo * e;
      linea.rect.setAttribute('width', (letra + linea.largo * e + 2).toFixed(1));
      // El ovillo se achica a medida que su hilo se despliega.
      const avance = (bordadas + linea.palabra.length * e) / totalLetras;
      const s = escala * (1 - 0.55 * avance);
      ubicarOvillo(ovillo, ox, oy, s);
      const borde = ox + ovillo.radio * s;
      hilo.setAttribute('d', `M ${borde.toFixed(1)} ${oy.toFixed(1)} C ${((borde + xAguja) / 2).toFixed(1)} ${oy.toFixed(1)} ${((borde + xAguja) / 2).toFixed(1)} ${linea.y.toFixed(1)} ${xAguja.toFixed(1)} ${linea.y.toFixed(1)}`);
    }, vigente);
    bordadas += linea.palabra.length;
    if (!vigente()) break;
  }
  hilo.remove();
  await esperarMientras(TIEMPOS.porOvillo, vigente);

  // Las palabras se desvanecen y el ovillo se va por la izquierda, de vuelta al telar.
  bordado.style.transition = `opacity ${TIEMPOS.fundido}s ease`;
  bordado.style.opacity = '0';
  const sFinal = escala * 0.45;
  ovillo.g.style.transition = '';
  await animar(TIEMPOS.llevar, (e) => {
    ubicarOvillo(ovillo, ox + (xSalida - ox) * e, oy, sFinal);
    ovillo.g.style.opacity = (1 - e).toFixed(3);
  }, () => true);
  bordado.remove();
}

/** Mueve el rectángulo del telar `dx` unidades a la izquierda y lo desvanece (o lo trae de vuelta). */
function correrCuadrado(cuadrado, dx, opacidad) {
  for (const nodo of cuadrado) {
    nodo.setAttribute('transform', `translate(${(-dx).toFixed(1)} 0)`);
    nodo.style.opacity = opacidad.toFixed(3);
  }
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
  const { polarEn } = espiral(vuelta);

  // Cada hilo: dónde está en el telar y dónde quedará en su ovillo, con la misma cantidad de puntos.
  const capa = el('g', { class: 'tejido ovillos' }, svg);
  capa.dataset.tema = telar.tejido.dataset.tema ?? '';
  const viajes = [];
  for (const ovillo of ovillos) {
    ovillo.g = el('g', { class: 'ovillo' }, capa);
    for (const p of ovillo.lista) {
      const cuantos = Math.max(12, Math.min(900, Math.round(p.largo / 8)));
      const desde = puntosEnTelar(p, cuantos);
      const hasta = Array.from({ length: cuantos }, (_, i) =>
        polarEn(p.enOvillo.s0 + ((p.enOvillo.s1 - p.enOvillo.s0) * i) / (cuantos - 1)));
      // El viaje se hace en coordenadas polares alrededor del centro del ovillo: cada punto gira mientras
      // se acerca, así el hilo se enrolla en curvas redondas. Los ángulos se "desenrollan" a lo largo del
      // hilo para que todos sus puntos giren juntos, y el giro total es el más corto.
      const polares = desde.map(([x, y]) => [Math.hypot(x - ovillo.cx, y - ovillo.cy), Math.atan2(y - ovillo.cy, x - ovillo.cx)]);
      for (let i = 1; i < cuantos; i++) {
        while (polares[i][1] - polares[i - 1][1] > Math.PI) polares[i][1] -= 2 * Math.PI;
        while (polares[i][1] - polares[i - 1][1] < -Math.PI) polares[i][1] += 2 * Math.PI;
      }
      const giros = polares.map(([, a], i) => hasta[i][1] - a);
      const medio = giros.reduce((suma, g) => suma + g, 0) / cuantos;
      const ajuste = -2 * Math.PI * Math.round(medio / (2 * Math.PI));
      const camino = polares.map(([r0, a0], i) => ({ r0, a0, r1: hasta[i][0], giro: giros[i] + ajuste }));
      const nodo = el('path', { class: 'hebra cosida', 'data-temas': p.temas[0].id }, ovillo.g);
      nodo.style.stroke = pintura(p.temas);
      nodo.style.strokeWidth = telar.grosor.toFixed(2);
      enPuntadas(nodo, p.largo / largoDeDias(1)); // las mismas puntadas: una por día
      viajes.push({ nodo, camino, p, ovillo });
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
    const { camino, ovillo } = viaje;
    const n = camino.length;
    const puntos = [];
    for (let i = 0; i < n; i++) {
      const retraso = (i / Math.max(1, n - 1)) * TIEMPOS.tirar;
      const local = Math.min(1, Math.max(0, (t - retraso) / (1 - TIEMPOS.tirar)));
      // Primero el hilo llega rápido, casi en línea recta, hasta su vuelta en el ovillo; después el ovillo
      // gira despacio y lo enrolla hasta su lugar. Como el giro empieza cuando el hilo ya está cerca, no da
      // vueltas grandes ni se sale de la pantalla.
      const llegada = muySuave(Math.min(1, local / TIEMPOS.llegar));
      const giroHecho = muySuave(Math.min(1, Math.max(0, (local - TIEMPOS.llegar * 0.8) / (1 - TIEMPOS.llegar * 0.8))));
      const { r0, a0, r1, giro } = camino[i];
      const r = r0 + (r1 - r0) * llegada;
      const a = a0 + giro * giroHecho;
      puntos.push([ovillo.cx + r * Math.cos(a), ovillo.cy + r * Math.sin(a)]);
    }
    // Los puntos se unen con curvas (cada punto es el control entre los puntos medios vecinos): el hilo
    // queda redondo aunque los puntos estén separados.
    const f = (v) => v.toFixed(1);
    let d = `M${f(puntos[0][0])} ${f(puntos[0][1])}`;
    for (let i = 1; i < n - 1; i++) {
      const [x, y] = puntos[i];
      const [x2, y2] = puntos[i + 1];
      d += `Q${f(x)} ${f(y)} ${f((x + x2) / 2)} ${f((y + y2) / 2)}`;
    }
    d += `L${f(puntos[n - 1][0])} ${f(puntos[n - 1][1])}`;
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
    const rotulos = el('g', { class: 'rotulos' }, capa);
    for (const ovillo of ovillos) {
      const { tema, rotulo, cx, cy, radio } = ovillo;
      ovillo.rotuloG = el('g', {}, rotulos);
      rotulo.forEach((linea, i) => {
        const texto = el('text', { class: i ? 'ovillo-nombre ovillo-suma' : 'ovillo-nombre', x: cx, y: cy + radio + OVILLO.letra * (1 + i * 1.25) }, ovillo.rotuloG);
        texto.style.fill = tema.color;
        texto.style.fontSize = `${i ? OVILLO.letra * 0.8 : OVILLO.letra}px`;
        texto.textContent = linea;
      });
    }
    await esperarMientras(TIEMPOS.antesDePalabras, vigente);

    // El rectángulo del telar se va del todo por la izquierda y desaparece.
    const salida = vista.x + vista.ancho - v.x + 40; // cuánto se corre para quedar fuera de la vista
    await animar(TIEMPOS.salirTelar, (e) => correrCuadrado(telar.cuadrado, salida * e, 1 - e), vigente);

    // En ese espacio, un ovillo a la vez: los demás se atenúan y su hilo borda sus palabras.
    const espacio = { x: v.x + margen, y: area.y, ancho: area.x - v.x - margen * 2, alto: area.alto };
    // Al terminar, cada ovillo se va por la izquierda, de vuelta al telar.
    const pendientesDeBordar = new Set(ovillos);
    const atenuar = (destacado) => {
      for (const ovillo of pendientesDeBordar) {
        ovillo.g.style.transition = 'opacity 0.8s ease';
        ovillo.g.style.opacity = destacado && ovillo !== destacado ? '0.25' : '';
      }
    };
    const xSalida = v.x - 400;
    for (const ovillo of ovillos) {
      if (!vigente()) break;
      atenuar(ovillo);
      await bordarPalabras(capa, ovillo, espacio, xSalida, vigente);
      pendientesDeBordar.delete(ovillo);
    }
    await esperarMientras(TIEMPOS.hold, vigente);
    if (!vigente()) return;

    // El telar regresa desde la izquierda con todos sus hilos (los que se fueron en los ovillos).
    const conHilos = [...telar.cuadrado, telar.tejido];
    correrCuadrado(conHilos, salida, 0);
    telar.tejido.style.visibility = '';
    await animar(TIEMPOS.salirTelar, (e) => correrCuadrado(conHilos, salida * (1 - e), e), vigente);
    capa.remove();

  } finally {
    // De vuelta: los hilos ya están en el telar; la simbología vuelve y el telar se centra en su lugar.
    capa.style.transition = `opacity ${TIEMPOS.fundido}s ease`;
    if (!vigente()) capa.style.opacity = '0';
    correrCuadrado([...telar.cuadrado, telar.tejido], 0, 1);
    for (const nodo of [...telar.cuadrado, telar.tejido]) nodo.removeAttribute('transform');
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
    // Los hilos del telar vuelven a verse en lugar de sus copias (están en el mismo lugar).
    telar.tejido.style.visibility = '';
    capa.remove();
    telar.congelar(false);
    await esperarMientras(TIEMPOS.enTelar, vigente);
  }
});
