/**
 * Respuestas del modo registro. Por ahora se guardan en el navegador (localStorage):
 * solo se ven en la visualización abierta en el mismo computador o tablet.
 */
const KEY = 'entrada-faad:respuestas';

// Palabras demasiado comunes para mostrarse solas.
const VACIAS = new Set(`
  a al algo algún alguna ante antes así aun aunque bien cada como con contra cual cuando de del desde donde
  durante e el ella ellas ellos en entre era es esa ese eso esta este esto estoy fue ha hay hoy la las le les lo los
  más me mi mis mucho muy nada ni no nos nuestra nuestro o otra otro para pero poco por porque que quien se ser si
  sin sobre solo son su sus también tan te tener tengo ti todo todos tu tus un una uno unos unas vez y ya yo
`.trim().split(/\s+/));

export function cargarRespuestas() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
}

export function guardarRespuesta(texto, grupo) {
  const respuestas = cargarRespuestas();
  const respuesta = { texto, grupo, fecha: new Date().toISOString() };
  respuestas.push(respuesta);
  try {
    localStorage.setItem(KEY, JSON.stringify(respuestas));
    return respuesta;
  } catch {
    return null;
  }
}

/** Palabras con significado de una respuesta, en minúsculas y sin puntuación. */
export function palabrasDe(texto) {
  return texto
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((palabra) => palabra.length >= 3 && !VACIAS.has(palabra));
}

/** Hora del día (con decimales) en que se registró una respuesta. */
export function horaDe(respuesta) {
  const fecha = new Date(respuesta.fecha);
  return fecha.getHours() + fecha.getMinutes() / 60;
}
