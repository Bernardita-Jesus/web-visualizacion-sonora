/**
 * Pendientes del modo registro. Son anónimos: solo se guarda el texto y la hora, nunca quién habla
 * ni su voz. Por ahora se guardan en el navegador (localStorage): solo se ven en la visualización
 * abierta en el mismo computador o tablet.
 */
const KEY = 'diseno-abierto:respuestas';

// Borra las respuestas de prueba guardadas antes con la clave anterior.
try {
  localStorage.removeItem('entrada-faad:respuestas');
} catch {
  // Sin acceso al almacenamiento: no hay nada que borrar.
}

export function cargarRespuestas() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
}

/** Guarda un registro. `tema` solo se pasa si se eligió a mano (si no, se detecta del texto). */
export function guardarRespuesta(texto, tema = null) {
  const respuestas = cargarRespuestas();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const respuesta = { id, texto, fecha: new Date().toISOString() };
  if (tema) respuesta.tema = tema;
  respuestas.push(respuesta);
  try {
    localStorage.setItem(KEY, JSON.stringify(respuestas));
    return respuesta;
  } catch {
    return null;
  }
}

/** Temática de un registro: la elegida a mano, si la hay; si no, la detectada en su texto. */
export const temaDeRespuesta = (respuesta) => respuesta.tema ?? tematicaDe(respuesta.texto);
/** Temáticas de un registro: la elegida a mano, o las que se detecten en su texto (una o dos). */
export const temasDeRespuesta = (respuesta) => (respuesta.tema ? [respuesta.tema] : tematicasDe(respuesta.texto));

/* ---------- Borrador: lo dictado y aún no enviado no se pierde ---------- */

const CLAVE_BORRADOR = 'diseno-abierto:borrador';

export function guardarBorrador(texto) {
  try {
    if (texto) localStorage.setItem(CLAVE_BORRADOR, texto);
    else localStorage.removeItem(CLAVE_BORRADOR);
  } catch {
    // Sin almacenamiento: el borrador solo vive en la página.
  }
}

export function leerBorrador() {
  try {
    return localStorage.getItem(CLAVE_BORRADOR) ?? '';
  } catch {
    return '';
  }
}

/** Borra todos los registros reales guardados en este navegador. */
export function borrarRespuestas() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Sin acceso al almacenamiento: no hay nada que borrar.
  }
}

/** Hora del día (con decimales) en que se registró una respuesta. */
export function horaDe(respuesta) {
  const fecha = new Date(respuesta.fecha);
  return fecha.getHours() + fecha.getMinutes() / 60;
}

/* ---------- Temática del pendiente ---------- */

/**
 * Temáticas de la bitácora (Escala 02), con su nombre, su color en el telar y raíces de palabras
 * que la delatan; se compara
 * sin tildes y por comienzo de palabra ("estudi" reconoce estudiar, estudios, estudiando…).
 * Es una clasificación simple por palabras clave: lo que no calza con nada queda en "otros".
 * Incluye palabras del habla chilena (pega, pituto, pololo, tata, guagua, carrete, la u, solemne…).
 */
export const TEMATICAS = [
  { id: 'estudios', nombre: 'Estudios', color: '#e4572e', raices: ['estudi', 'tesis', 'ramo', 'prueb', 'solemne', 'ayudantia', 'facu', 'u', 'examen', 'certamen', 'carrera', 'titul', 'universidad', 'clase', 'curso', 'entrega', 'taller', 'tarea', 'nota', 'semestre', 'profe', 'apunte', 'inform', 'investig', 'portafolio', 'bitacora', 'beca', 'intercambio'] },
  { id: 'trabajo', nombre: 'Trabajo', color: '#1f5fd1', raices: ['trabaj', 'pega', 'jef', 'pituto', 'pegita', 'chamba', 'turno', 'boleta', 'honorario', 'empleo', 'sueldo', 'cliente', 'oficina', 'contrato', 'renunci', 'practica', 'postul', 'curriculum', 'freelance', 'encargo'] },
  { id: 'familia', nombre: 'Familia', color: '#d18f00', raices: ['mama', 'papa', 'padre', 'madre', 'herman', 'abuel', 'tata', 'mami', 'papi', 'mamit', 'papit', 'guagua', 'suegr', 'cunad', 'nieto', 'nieta', 'hijo', 'hija', 'familia', 'tia', 'tio', 'prim', 'sobrin'] },
  { id: 'vinculos', nombre: 'Vínculos', color: '#e0317a', raices: ['amig', 'pareja', 'polol', 'yunta', 'companer', 'compadre', 'amigui', 'cabros', 'carrete', 'junta', 'perdon', 'disculp', 'convers', 'hablar', 'hable', 'decirle', 'carta', 'llamar', 'llamad', 'relacion', 'amor', 'agradec', 'gracias', 'reencontr', 'visitar', 'escribirle', 'ex'] },
  { id: 'uno-mismo', nombre: 'Uno mismo', color: '#2e9d3f', raices: ['mismo', 'misma', 'soltar', 'perdonarme', 'cuidarme', 'quererme', 'aceptar', 'dibuj', 'pintar', 'escribir', 'leer', 'descans', 'medit', 'hobby', 'paciencia', 'confianza', 'ordenar', 'organiz', 'chato', 'chata', 'bajon'] },
  { id: 'salud', nombre: 'Salud y cuerpo', color: '#0a9a96', raices: ['salud', 'medic', 'doctor', 'dentist', 'muela', 'kine', 'consultorio', 'cesfam', 'remedio', 'pastilla', 'ejercicio', 'gimnasio', 'gym', 'deporte', 'correr', 'nadar', 'natacion', 'dormir', 'dieta', 'comer', 'terapia', 'psicolog', 'cuerpo', 'peso', 'enferm', 'examenes', 'fumar'] },
  { id: 'suenos', nombre: 'Sueños y proyectos', color: '#8e3fd6', raices: ['viaj', 'mochile', 'sueno', 'sonar', 'proyecto', 'emprend', 'idioma', 'ingles', 'banda', 'musica', 'tocar', 'instrumento', 'mudar', 'construir', 'crear', 'negocio', 'conocer'] },
  { id: 'otros', nombre: 'Otros', color: '#5a6472', raices: [] },
];

const sinTildes = (texto) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '');

/**
 * Temáticas de un pendiente: la que más raíces reconoce y, si el texto también habla de otra, la segunda
 * (un pendiente puede tener dos temáticas: su hilo se teje mezclando ambos colores). En empate gana la
 * primera de la lista, por eso Familia va antes que Vínculos ("llamar a mi abuela" es de familia).
 */
export function tematicasDe(texto) {
  const palabras = sinTildes(texto.toLowerCase()).split(/[^a-z0-9ñ]+/).filter(Boolean);
  // "ex" y otras raíces de 2 letras solo cuentan como palabra completa, para no confundir "examen" con "ex".
  const coincide = (palabra, raiz) => (raiz.length <= 2 ? palabra === raiz : palabra.startsWith(raiz));
  const puntajes = TEMATICAS.map(({ id, raices }) => ({
    id,
    n: palabras.filter((palabra) => raices.some((raiz) => coincide(palabra, raiz))).length,
  }))
    .filter(({ n }) => n > 0)
    .sort((a, b) => b.n - a.n); // sort es estable: en empate queda el orden de la lista
  return puntajes.length ? puntajes.slice(0, 2).map(({ id }) => id) : ['otros'];
}

/** Temática principal de un pendiente (la primera de tematicasDe). */
export const tematicaDe = (texto) => tematicasDe(texto)[0];

/** Datos de una temática por su id (nombre y color). */
export const temaPorId = (id) => TEMATICAS.find((tema) => tema.id === id) ?? TEMATICAS.at(-1);

/* ---------- Habla chilena: muletillas ---------- */

// Muletillas que no aportan a la idea del pendiente (se quitan al guardar, como dice la bitácora).
const MULETILLAS = /(^|[\s,.;])(e+h+|e+m+|m{2,}|o sea|cach[aá][iy]|po|poh|puh|pos|we[oó]n|hue[vb]?[oó]n|wn)(?=$|[\s,.;!?])/giu;

/** Quita muletillas del dictado ("eh", "o sea", "cachai", "po", "weón"…) y ordena espacios y comas. */
export function limpiarDictado(texto) {
  let limpio = texto;
  // Se repite porque una muletilla puede quedar pegada a otra ("eh, o sea, po").
  for (let i = 0; i < 3; i++) limpio = limpio.replace(MULETILLAS, '$1');
  return limpio
    .replace(/\s+([,.;!?])/g, '$1') // sin espacio antes de la puntuación
    .replace(/([,;])(\s*[,;])+/g, '$1') // comas repetidas
    .replace(/^[\s,.;]+|[\s,;]+$/g, '') // sin comas sueltas al principio o al final
    .replace(/\s{2,}/g, ' ')
    .trim();
}
