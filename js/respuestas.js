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

export function guardarRespuesta(texto) {
  const respuestas = cargarRespuestas();
  const respuesta = { texto, fecha: new Date().toISOString() };
  respuestas.push(respuesta);
  try {
    localStorage.setItem(KEY, JSON.stringify(respuestas));
    return respuesta;
  } catch {
    return null;
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
 */
export const TEMATICAS = [
  { id: 'estudios', nombre: 'Estudios', color: '#e4572e', raices: ['estudi', 'tesis', 'ramo', 'prueba', 'examen', 'certamen', 'carrera', 'titul', 'universidad', 'clase', 'curso', 'entrega', 'taller', 'tarea', 'nota', 'semestre', 'profe', 'apunte', 'inform', 'investig', 'portafolio', 'bitacora'] },
  { id: 'trabajo', nombre: 'Trabajo', color: '#1f5fd1', raices: ['trabaj', 'pega', 'jefe', 'empleo', 'sueldo', 'cliente', 'oficina', 'contrato', 'renunci', 'practica', 'postul', 'curriculum', 'freelance', 'encargo'] },
  { id: 'familia', nombre: 'Familia', color: '#d18f00', raices: ['mama', 'papa', 'padre', 'madre', 'herman', 'abuel', 'hijo', 'hija', 'familia', 'tia', 'tio', 'prim', 'sobrin'] },
  { id: 'vinculos', nombre: 'Vínculos', color: '#e0317a', raices: ['amig', 'pareja', 'polol', 'perdon', 'disculp', 'convers', 'hablar', 'hable', 'decirle', 'carta', 'llamar', 'llamad', 'relacion', 'amor', 'agradec', 'gracias', 'reencontr', 'visitar', 'escribirle', 'ex'] },
  { id: 'uno-mismo', nombre: 'Uno mismo', color: '#2e9d3f', raices: ['mismo', 'misma', 'soltar', 'perdonarme', 'cuidarme', 'quererme', 'aceptar', 'dibuj', 'pintar', 'escribir', 'leer', 'descans', 'medit', 'hobby', 'paciencia', 'confianza', 'ordenar', 'organiz'] },
  { id: 'salud', nombre: 'Salud y cuerpo', color: '#0a9a96', raices: ['salud', 'medic', 'doctor', 'dentist', 'ejercicio', 'gimnasio', 'gym', 'deporte', 'correr', 'dormir', 'dieta', 'comer', 'terapia', 'psicolog', 'cuerpo', 'peso', 'enferm', 'examenes', 'fumar'] },
  { id: 'suenos', nombre: 'Sueños y proyectos', color: '#8e3fd6', raices: ['viaj', 'sueno', 'sonar', 'proyecto', 'emprend', 'idioma', 'ingles', 'banda', 'musica', 'tocar', 'instrumento', 'mudar', 'construir', 'crear', 'negocio', 'conocer'] },
  { id: 'otros', nombre: 'Otros', color: '#5a6472', raices: [] },
];

const sinTildes = (texto) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '');

/**
 * Temática más probable de un pendiente: la que más raíces reconoce. En empate gana la primera de la lista,
 * por eso Familia va antes que Vínculos ("llamar a mi abuela" es de familia).
 */
export function tematicaDe(texto) {
  const palabras = sinTildes(texto.toLowerCase()).split(/[^a-z0-9ñ]+/).filter(Boolean);
  let mejor = 'otros';
  let puntos = 0;
  for (const { id, raices } of TEMATICAS) {
    // "ex" y otras raíces de 2 letras solo cuentan como palabra completa, para no confundir "examen" con "ex".
    const coincide = (palabra, raiz) => (raiz.length <= 2 ? palabra === raiz : palabra.startsWith(raiz));
    const n = palabras.filter((palabra) => raices.some((raiz) => coincide(palabra, raiz))).length;
    if (n > puntos) {
      mejor = id;
      puntos = n;
    }
  }
  return mejor;
}

/** Datos de una temática por su id (nombre y color). */
export const temaPorId = (id) => TEMATICAS.find((tema) => tema.id === id) ?? TEMATICAS.at(-1);
