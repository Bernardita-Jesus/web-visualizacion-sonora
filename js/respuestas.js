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
export const temaDeRespuesta = (respuesta) => temasDeRespuesta(respuesta)[0];
/** Temáticas de un registro: la elegida a mano, o la que se detecte en su texto. */
export const temasDeRespuesta = (respuesta) =>
  respuesta.tema && !ELIMINADAS.includes(respuesta.tema) ? [respuesta.tema] : tematicasDe(respuesta.texto);

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
 * Es una clasificación simple por palabras clave: lo que no calza con ninguna va a la más cercana.
 * Incluye palabras del habla chilena (pega, pituto, pololo, tata, guagua, carrete, la u, solemne…).
 */
export const TEMATICAS = [
  { id: 'estudios', nombre: 'Estudios', color: '#e4572e', raices: ['estudi', 'tesis', 'ramo', 'prueb', 'solemne', 'ayudantia', 'facu', 'u', 'examen', 'certamen', 'carrera', 'titul', 'universidad', 'clase', 'curso', 'entrega', 'taller', 'tarea', 'nota', 'semestre', 'profe', 'apunte', 'inform', 'investig', 'portafolio', 'bitacora', 'beca', 'intercambio'] },
  { id: 'trabajo', nombre: 'Trabajo', color: '#1f5fd1', raices: ['trabaj', 'pega', 'jef', 'pituto', 'pegita', 'chamba', 'turno', 'boleta', 'honorario', 'empleo', 'sueldo', 'cliente', 'oficina', 'contrato', 'renunci', 'practica', 'postul', 'curriculum', 'freelance', 'encargo'] },
  { id: 'vinculos', nombre: 'Vínculos', color: '#e0317a', raices: ['mama', 'papa', 'padre', 'madre', 'herman', 'abuel', 'tata', 'mami', 'papi', 'mamit', 'papit', 'guagua', 'suegr', 'cunad', 'nieto', 'nieta', 'hijo', 'hija', 'familia', 'tia', 'tio', 'prim', 'sobrin', 'amig', 'pareja', 'polol', 'yunta', 'companer', 'compadre', 'amigui', 'cabros', 'carrete', 'junta', 'perdon', 'disculp', 'convers', 'hablar', 'hable', 'decirle', 'carta', 'llamar', 'llamad', 'relacion', 'amor', 'agradec', 'gracias', 'reencontr', 'visitar', 'escribirle', 'ex'] },
  { id: 'salud', nombre: 'Salud y cuerpo', color: '#0a9a96', raices: ['salud', 'medic', 'doctor', 'dentist', 'muela', 'kine', 'consultorio', 'cesfam', 'remedio', 'pastilla', 'ejercicio', 'gimnasio', 'gym', 'deporte', 'correr', 'nadar', 'natacion', 'dormir', 'dieta', 'comer', 'terapia', 'psicolog', 'cuerpo', 'peso', 'enferm', 'examenes', 'fumar'] },
  { id: 'proyectos', nombre: 'Proyectos', color: '#8e3fd6', raices: ['proyecto', 'emprend', 'negocio', 'pyme', 'construir', 'crear', 'idioma', 'ingles', 'viaj', 'mochile', 'mudar', 'ahorr', 'portafolio', 'web'] },
  { id: 'hobbies', nombre: 'Hobbies', color: '#2e9d3f', raices: ['hobby', 'hobbies', 'pasatiempo', 'dibuj', 'pintar', 'leer', 'lectura', 'novela', 'libro', 'banda', 'musica', 'tocar', 'guitarra', 'piano', 'instrumento', 'cantar', 'cocin', 'ceramica', 'tejer', 'bordar', 'foto', 'jardin', 'plantas', 'juego', 'serie', 'pelicula', 'bailar', 'baile'] },
];

const sinTildes = (texto) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '');

/**
 * Temática de un pendiente (en una lista de una): la que más raíces reconoce. En empate gana la primera
 * de la lista ("entregar la práctica" queda en Estudios antes que en Trabajo).
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
  if (puntajes.length) return [puntajes[0].id];
  return [tematicaMasCercana(palabras)];
}

// Si nada calza, se va a la temática más cercana.
const TEMATICA_POR_DEFECTO = 'proyectos';

/**
 * Temática más cercana para un texto que no calza con ninguna raíz: la que tenga más palabras que
 * empiecen igual que alguna de sus raíces (las primeras 4 letras: "biblioteca" se acerca a "bibliotec…").
 * Si tampoco hay ninguna, va a Proyectos (al fin y al cabo, todo pendiente es algo por hacer).
 */
function tematicaMasCercana(palabras) {
  const prefijo = (palabra) => palabra.slice(0, 4);
  let mejor = TEMATICA_POR_DEFECTO;
  let puntos = 0;
  for (const { id, raices } of TEMATICAS) {
    const largas = raices.filter((raiz) => raiz.length >= 4);
    const n = palabras.filter((palabra) => palabra.length >= 4 && largas.some((raiz) => prefijo(raiz) === prefijo(palabra))).length;
    if (n > puntos) {
      mejor = id;
      puntos = n;
    }
  }
  return mejor;
}

/** Temática principal de un pendiente (la primera de tematicasDe). */
export const tematicaDe = (texto) => tematicasDe(texto)[0];

/** Datos de una temática por su id (nombre y color). */
// Temáticas que ya no existen, por si quedó un registro guardado con ellas: "Sueños y proyectos" pasó a
// ser "Proyectos", "Familia" se sumó a "Vínculos" y "Uno mismo" y "Otros" se eliminaron (sus registros se vuelven a clasificar por su texto).
const RENOMBRADAS = { suenos: 'proyectos', familia: 'vinculos' };
const ELIMINADAS = ['uno-mismo', 'otros'];

export const temaPorId = (id) =>
  TEMATICAS.find((tema) => tema.id === (RENOMBRADAS[id] ?? id)) ?? TEMATICAS.find((tema) => tema.id === TEMATICA_POR_DEFECTO);

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

/* ---------- Cuánto tiempo lleva pospuesto ---------- */

const NUMEROS = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, quince: 15, veinte: 20, treinta: 30, medio: 0.5, media: 0.5, par: 2, varios: 3, varias: 3,
};
// Días de cada unidad (sin tildes: "años" se compara como "anos").
const UNIDADES = { dia: 1, semana: 7, mes: 30, semestre: 182, ano: 365 };
const diasDeUnidad = (palabra) => UNIDADES[Object.keys(UNIDADES).find((unidad) => palabra.startsWith(unidad))];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
// Si no se dice cuánto, se teje un hilo corto, de un mes.
export const DIAS_SIN_DATO = 30;

/**
 * Cuántos días lleva pospuesto un pendiente, según lo que dice el texto: "lo pospuse dos meses", "hace 3
 * semanas", "un año y medio", "medio año", "desde marzo", "hace años", "toda la vida"… Si menciona varios
 * tiempos, se queda con el más largo. Devuelve null si el texto no dice cuánto.
 */
export function diasPospuesto(texto) {
  const t = sinTildes(texto.toLowerCase());
  const candidatos = [];
  const numero = `(\\d+(?:[.,]\\d+)?|${Object.keys(NUMEROS).join('|')})`;
  const unidad = '(dias?|semanas?|mes(?:es)?|semestres?|anos?)';
  // Un número y una unidad, con "y medio" opcional ("un año y medio").
  for (const [, n, u, medio] of t.matchAll(new RegExp(`\\b${numero}\\s+(?:de\\s+)?${unidad}\\b(\\s+y\\s+medi[oa])?`, 'g'))) {
    const cantidad = (NUMEROS[n] ?? parseFloat(n.replace(',', '.'))) + (medio ? 0.5 : 0);
    candidatos.push(cantidad * diasDeUnidad(u));
  }
  // Sin número: "hace años", "hace meses", "por semanas".
  for (const [, u] of t.matchAll(/\b(?:hace|por|llevo|lleva|desde hace)\s+(anos|meses|semanas|dias)\b/g)) {
    candidatos.push(3 * diasDeUnidad(u));
  }
  if (/\btoda la vida\b|\bdesde siempre\b/.test(t)) candidatos.push(20 * 365);
  if (/\bdesde (chic[oa]|nin[oa]|pequen[oa]|guagua)\b/.test(t)) candidatos.push(15 * 365);
  // "desde marzo": los meses entre ese mes y hoy.
  for (const [, mes] of t.matchAll(new RegExp(`\\bdesde (${MESES.join('|')})\\b`, 'g'))) {
    const hoy = new Date();
    const meses = (hoy.getMonth() - MESES.indexOf(mes) + 12) % 12 || 12;
    candidatos.push(meses * 30);
  }
  return candidatos.length ? Math.max(...candidatos) : null;
}

/** Cuánto lleva pospuesto, en palabras: "3 semanas", "2 meses", "1 año y medio". */
export function tiempoEnPalabras(dias) {
  if (dias == null) return 'sin tiempo dicho';
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  if (dias < 14) return plural(Math.round(dias), 'día', 'días');
  if (dias < 28) return plural(Math.round(dias / 7), 'semana', 'semanas');
  if (dias < 365) return plural(Math.round(dias / 30), 'mes', 'meses');
  const anos = Math.round((dias / 365) * 2) / 2;
  const enteros = Math.floor(anos);
  return enteros === 0 ? 'medio año' : `${plural(enteros, 'año', 'años')}${anos % 1 ? ' y medio' : ''}`;
}
