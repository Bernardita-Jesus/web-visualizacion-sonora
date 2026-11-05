import { lanzarRespuesta } from './main.js';
import { TEMATICAS, diasPospuesto, guardarBorrador, guardarRespuesta, leerBorrador, limpiarDictado, temaPorId, tematicasDe, tiempoEnPalabras } from './respuestas.js';

// Una sola pantalla: registro a la izquierda y visualización (el telar) a la derecha.

/* ---------- Formulario de registro ---------- */

const form = document.querySelector('#form-registro');
const campo = document.querySelector('#respuesta');
const aviso = document.querySelector('#registro-aviso');

function enviar() {
  // Se guarda sin muletillas del habla chilena ("eh", "o sea", "cachai", "po"…).
  const texto = limpiarDictado(campo.value);
  if (!texto) {
    aviso.textContent = 'Dicta tu pendiente antes de enviar.';
    return;
  }

  // Anónimo: solo se guarda el texto y la hora, nunca quién habla. La temática va solo si se eligió a mano.
  const respuesta = guardarRespuesta(texto, temaManual);
  if (!respuesta) {
    aviso.textContent = 'No se pudo guardar el pendiente en este navegador.';
    return;
  }

  lanzarRespuesta(respuesta);
  // Deja de escuchar sin que un resultado tardío vuelva a escribir en el campo ya limpio.
  if (reconocimiento) reconocimiento.onresult = null;
  detenerDictado();
  // Recién al enviar (ya registrado) se limpia lo dictado, para la siguiente persona.
  const nombres = nombreTemas(temasDelCampo(texto));
  limpiarCampo();
  estado.textContent = 'Aprieta el botón y cuenta tu pendiente.';
  aviso.textContent = `¡Gracias! Tu testimonio quedó en ${nombres}. Mira cómo se teje en el telar →`;
}

/** Vacía el campo, su borrador y la temática elegida (solo al enviar o al presionar Eliminar). */
function limpiarCampo() {
  campo.value = '';
  guardarBorrador('');
  elegirTemaManual(null);
  actualizarBorrar();
  colorearSegunTema();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  enviar();
});

/* ---------- Dictado por voz (Web Speech API) ---------- */

const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
const botonDictar = document.querySelector('#btn-dictar');
const textoBoton = document.querySelector('#btn-dictar-texto');
const estado = document.querySelector('#dictado-estado');

let reconocimiento = null;
let escuchando = false;

function mostrarEscucha(activo) {
  escuchando = activo;
  botonDictar.classList.toggle('escuchando', activo);
  botonDictar.setAttribute('aria-pressed', String(activo));
  textoBoton.textContent = activo ? 'Escuchando… toca para terminar' : 'Dictar pendiente';
}

function iniciarDictado() {
  if (!Reconocimiento || escuchando) return;

  reconocimiento = new Reconocimiento();
  reconocimiento.lang = 'es-CL';
  reconocimiento.interimResults = true; // muestra el texto mientras se habla
  reconocimiento.continuous = true; // sigue escuchando hasta que se toca el botón o se envía

  // Lo dictado se va sumando a lo que ya había en el campo y nunca se reemplaza: cada resultado final
  // se agrega una sola vez, aunque el navegador reinicie su lista de resultados en medio del dictado.
  const textoPrevio = campo.value.trim();
  const finales = [];
  let vistos = new Set();
  let largoAnterior = 0;

  reconocimiento.onstart = () => {
    mostrarEscucha(true);
    estado.textContent = 'Habla ahora: tu pendiente se escribirá abajo. Puedes dictar varias veces antes de enviar.';
  };

  reconocimiento.onresult = (event) => {
    // Si la lista de resultados se achica, el navegador la reinició: los índices vuelven a empezar.
    if (event.results.length < largoAnterior) vistos = new Set();
    largoAnterior = event.results.length;

    let parcial = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const resultado = event.results[i];
      const texto = resultado[0].transcript.trim();
      if (!texto) continue;
      if (resultado.isFinal) {
        if (!vistos.has(i)) {
          vistos.add(i);
          finales.push(texto);
        }
      } else {
        parcial += ` ${texto}`;
      }
    }
    const nuevo = [textoPrevio, ...finales, parcial.trim()].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    // Nunca se reemplaza por algo más corto que lo que ya había (no se pierde nada de lo dictado).
    if (nuevo.length >= textoPrevio.length) campo.value = nuevo;
    guardarBorrador(campo.value);
    actualizarBorrar();
    colorearSegunTema();
  };

  reconocimiento.onerror = (event) => {
    const mensajes = {
      'not-allowed': 'Permite el uso del micrófono en el navegador para dictar.',
      'service-not-allowed': 'Este navegador no permite dictar aquí.',
      'no-speech': 'No te escuché. Toca el micrófono e intenta de nuevo.',
      'audio-capture': 'No se encontró un micrófono.',
      network: 'Sin conexión: el dictado necesita internet.',
    };
    estado.textContent = mensajes[event.error] ?? 'No se pudo dictar. Intenta de nuevo.';
  };

  reconocimiento.onend = () => {
    mostrarEscucha(false);
    reconocimiento = null;
    guardarBorrador(campo.value);
    // El texto queda en el campo hasta que se presione Enviar.
    if (campo.value.trim()) estado.textContent = 'Revisa tu pendiente y presiona Enviar. Puedes volver a grabar para agregar más.';
  };

  try {
    reconocimiento.start();
  } catch {
    mostrarEscucha(false);
  }
}

function detenerDictado() {
  reconocimiento?.stop();
}

if (Reconocimiento) {
  botonDictar.addEventListener('click', () => (escuchando ? detenerDictado() : iniciarDictado()));
} else {
  botonDictar.hidden = true;
  estado.textContent = 'Este navegador no permite dictar. Abre la página en Chrome, Edge o Safari.';
}

/* ---------- Eliminar el pendiente dictado (antes de enviarlo) ---------- */

const botonBorrar = document.querySelector('#btn-borrar');

function actualizarBorrar() {
  botonBorrar.disabled = !campo.value.trim();
}

botonBorrar.addEventListener('click', () => {
  // Deja de escuchar sin que un resultado tardío vuelva a escribir lo borrado.
  if (reconocimiento) reconocimiento.onresult = null;
  detenerDictado();
  limpiarCampo();
  estado.textContent = 'Aprieta el botón y cuenta tu pendiente.';
  aviso.textContent = 'Pendiente eliminado. Puedes volver a dictarlo.';
  setTimeout(() => (aviso.textContent = ''), 3000);
});

/* ---------- Temática: se muestra antes de enviar, y solo si no es la correcta se elige a mano ---------- */

const temaPrevio = document.querySelector('#tema-previo');
const temaPrevioNombre = document.querySelector('#tema-previo-nombre');
const tiempoPrevio = document.querySelector('#tiempo-previo');
const botonOtraTema = document.querySelector('#btn-otra-tema');
const elegirTema = document.querySelector('#elegir-tema');
const CLAVE_TEMA_MANUAL = 'diseno-abierto:borrador-tema';

// Temática elegida a mano para el pendiente que se está dictando (null: la detectada en el texto).
let temaManual = null;
try {
  temaManual = localStorage.getItem(CLAVE_TEMA_MANUAL) || null;
} catch {
  // Sin almacenamiento.
}

function elegirTemaManual(temaId) {
  temaManual = temaId;
  try {
    if (temaId) localStorage.setItem(CLAVE_TEMA_MANUAL, temaId);
    else localStorage.removeItem(CLAVE_TEMA_MANUAL);
  } catch {
    // Sin almacenamiento: la elección vale igual mientras no se recargue la página.
  }
  elegirTema.hidden = true;
  botonOtraTema.setAttribute('aria-expanded', 'false');
  colorearSegunTema();
}

/** Temáticas del pendiente que se está dictando: la elegida a mano, o la detectada. */
const temasDelCampo = (texto) => (temaManual ? [temaManual] : tematicasDe(texto)).map(temaPorId);
const nombreTemas = (temas) => temas.map((tema) => tema.nombre).join(' y ');

// El texto toma el color de su temática (el mismo con que se tejerá) y se muestra en cuál quedará.
function colorearSegunTema() {
  const texto = campo.value.trim();
  if (!texto) {
    campo.style.color = '';
    campo.style.caretColor = '';
    temaPrevio.hidden = true;
    return;
  }
  const temas = temasDelCampo(texto);
  campo.style.color = temas[0].color;
  campo.style.caretColor = temas[0].color;
  // La temática con su color.
  temaPrevioNombre.replaceChildren(temas.length === 1 ? 'la temática ' : 'las temáticas ');
  temas.forEach((tema, i) => {
    if (i) temaPrevioNombre.append(' y ');
    const nombre = document.createElement('span');
    nombre.textContent = tema.nombre;
    nombre.style.color = tema.color;
    temaPrevioNombre.append(nombre);
  });
  if (temaManual) temaPrevioNombre.append(' (elegida por ti)');
  // Cuánto lleva pospuesto (el largo de su hilo); si no se dice, se teje un hilo corto.
  const dias = diasPospuesto(texto);
  tiempoPrevio.textContent = dias == null
    ? 'No dijiste cuánto tiempo lo has pospuesto: cuéntalo (por ejemplo, "hace dos meses") para que su hilo tenga ese largo.'
    : `Lo has pospuesto ${tiempoEnPalabras(dias)}.`;
  for (const boton of elegirTema.querySelectorAll('button')) {
    boton.setAttribute('aria-pressed', String(temas.some((tema) => tema.id === boton.dataset.tema)));
  }
  temaPrevio.hidden = false;
}

// Botones de temáticas para elegir a mano (solo se muestran si se pide).
for (const tema of TEMATICAS) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'tema-opcion';
  boton.dataset.tema = tema.id;
  const muestra = document.createElement('span');
  muestra.className = 'tema-color';
  muestra.style.background = tema.color;
  boton.append(muestra, tema.nombre);
  // Si se elige la misma que se detectó, no queda como "elegida a mano".
  boton.addEventListener('click', () => {
    const detectadas = tematicasDe(campo.value);
    elegirTemaManual(detectadas.length === 1 && detectadas[0] === tema.id ? null : tema.id);
  });
  elegirTema.append(boton);
}

botonOtraTema.addEventListener('click', () => {
  elegirTema.hidden = !elegirTema.hidden;
  botonOtraTema.setAttribute('aria-expanded', String(!elegirTema.hidden));
});

// Si había un borrador sin enviar (por ejemplo, se recargó la página), vuelve al campo.
campo.value = leerBorrador();
actualizarBorrar();
colorearSegunTema();

if (Reconocimiento) estado.textContent = campo.value ? 'Tu pendiente sigue aquí: revísalo y presiona Enviar.' : 'Aprieta el botón y cuenta tu pendiente.';

/* ---------- Pestaña: el modo registro se puede ocultar ---------- */

const escenario = document.querySelector('.escenario');
const pestana = document.querySelector('#pestana-registro');
const contenidoRegistro = document.querySelector('#contenido-registro');
const botonOcultar = document.querySelector('#btn-ocultar-registro');
const CLAVE_OCULTO = 'diseno-abierto:registro-oculto';

function mostrarRegistro(visible) {
  escenario.classList.toggle('registro-oculto', !visible);
  contenidoRegistro.hidden = !visible;
  pestana.hidden = visible;
  pestana.setAttribute('aria-expanded', String(visible));
  botonOcultar.setAttribute('aria-expanded', String(visible));
  if (!visible) detenerDictado();
  // Se recuerda en este navegador si se dejó oculto (es solo una comodidad: si falla, no pasa nada).
  try {
    localStorage.setItem(CLAVE_OCULTO, visible ? '' : '1');
  } catch {
    // Sin almacenamiento disponible.
  }
}

botonOcultar.addEventListener('click', () => mostrarRegistro(false));
pestana.addEventListener('click', () => mostrarRegistro(true));

try {
  if (localStorage.getItem(CLAVE_OCULTO)) mostrarRegistro(false);
} catch {
  // Sin almacenamiento disponible: el registro empieza visible.
}

/* ---------- Lienzo: la página se ve igual en cualquier pantalla ---------- */

// Tamaño del lienzo en que está diseñada la página (el mismo de .lienzo en css/styles.css).
const LIENZO = { ancho: 1600, alto: 900 };
const lienzo = document.querySelector('#lienzo');

/**
 * Escala el lienzo completo para que quepa en la ventana, sin deformarlo y sin scroll, y lo centra: si la
 * ventana es más alargada o más alta que el lienzo, el espacio que sobra queda como fondo.
 */
function ajustarLienzo() {
  const escala = Math.min(window.innerWidth / LIENZO.ancho, window.innerHeight / LIENZO.alto);
  const x = (window.innerWidth - LIENZO.ancho * escala) / 2;
  const y = (window.innerHeight - LIENZO.alto * escala) / 2;
  lienzo.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${escala.toFixed(4)})`;
}

ajustarLienzo();
window.addEventListener('resize', ajustarLienzo);
