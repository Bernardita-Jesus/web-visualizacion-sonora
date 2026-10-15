import { activarVisualizacion, hourColor, lanzarRespuesta } from './main.js';
import { guardarRespuesta } from './respuestas.js';

// Una sola pantalla: registro a la izquierda y visualización a la derecha.
activarVisualizacion(true);

/* ---------- Formulario de registro ---------- */

const form = document.querySelector('#form-registro');
const campo = document.querySelector('#respuesta');
const aviso = document.querySelector('#registro-aviso');

function grupoElegido() {
  return form.querySelector('input[name="grupo"]:checked')?.value ?? null;
}

function enviar() {
  const texto = campo.value.trim();
  const grupo = grupoElegido();

  if (!texto || !grupo) {
    aviso.textContent = !texto ? 'Dicta o escribe tu respuesta antes de enviar.' : 'Elige si eres estudiante, funcionario/a o externo/a.';
    return;
  }

  const respuesta = guardarRespuesta(texto, grupo);
  if (!respuesta) {
    aviso.textContent = 'No se pudo guardar la respuesta en este navegador.';
    return;
  }

  lanzarRespuesta(respuesta);
  // Deja de escuchar sin que un resultado tardío vuelva a escribir en el campo ya limpio.
  if (reconocimiento) reconocimiento.onresult = null;
  detenerDictado();
  // Recién al enviar se limpia lo dictado, para la siguiente persona.
  form.reset();
  actualizarBotonDictar(); // la siguiente persona vuelve a elegir rol antes de grabar
  aviso.textContent = '¡Gracias! Mira tu respuesta viajar hacia tu grupo →';
  setTimeout(() => (aviso.textContent = ''), 5000);
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
  textoBoton.textContent = activo ? 'Escuchando… toca para terminar' : 'Dictar respuesta';
}

function iniciarDictado() {
  if (!Reconocimiento || escuchando || !grupoElegido()) return;

  reconocimiento = new Reconocimiento();
  reconocimiento.lang = 'es-CL';
  reconocimiento.interimResults = true; // muestra el texto mientras se habla
  reconocimiento.continuous = true; // sigue escuchando hasta que se toca el botón o se envía

  const textoPrevio = campo.value.trim();
  let final = '';

  reconocimiento.onstart = () => {
    mostrarEscucha(true);
    estado.textContent = 'Habla ahora: tu respuesta se escribirá abajo. Puedes dictar varias veces antes de enviar.';
  };

  reconocimiento.onresult = (event) => {
    let parcial = '';
    final = '';
    for (const resultado of event.results) {
      if (resultado.isFinal) final += resultado[0].transcript;
      else parcial += resultado[0].transcript;
    }
    // Lo dictado se suma a lo que ya había en el campo; nunca lo reemplaza por un resultado vacío.
    if (final || parcial) campo.value = [textoPrevio, final, parcial].filter(Boolean).join(' ').trim();
  };

  reconocimiento.onerror = (event) => {
    const mensajes = {
      'not-allowed': 'Permite el uso del micrófono en el navegador para dictar.',
      'service-not-allowed': 'Este navegador no permite dictar aquí. Escribe tu respuesta.',
      'no-speech': 'No te escuché. Toca el micrófono e intenta de nuevo.',
      'audio-capture': 'No se encontró un micrófono.',
      network: 'Sin conexión: el dictado necesita internet.',
    };
    estado.textContent = mensajes[event.error] ?? 'No se pudo dictar. Intenta de nuevo o escribe tu respuesta.';
  };

  reconocimiento.onend = () => {
    mostrarEscucha(false);
    reconocimiento = null;
    // El texto queda en el campo hasta que se presione Enviar.
    if (campo.value.trim()) estado.textContent = 'Revisa tu respuesta y presiona Enviar. Puedes volver a grabar para agregar más.';
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
  estado.textContent = 'Este navegador no permite dictar. Escribe tu respuesta (el dictado funciona en Chrome, Edge y Safari).';
}

/* ---------- El texto de la respuesta toma el color de la hora actual ---------- */

// Es el mismo color con que la respuesta viajará en la visualización (hora real del registro).
function colorearSegunHora() {
  const ahora = new Date();
  const color = hourColor(ahora.getHours() + ahora.getMinutes() / 60);
  campo.style.color = color;
  campo.style.caretColor = color;
}

colorearSegunHora();
setInterval(colorearSegunHora, 60 * 1000);

/* ---------- El botón de grabar se habilita solo después de elegir un rol ---------- */

function actualizarBotonDictar() {
  const hayRol = grupoElegido() !== null;
  botonDictar.disabled = !hayRol;
  if (!escuchando && Reconocimiento) {
    estado.textContent = hayRol ? 'Aprieta el botón y di tu respuesta.' : 'Primero elige tu rol para poder grabar.';
  }
}

form.addEventListener('change', (event) => {
  if (event.target.name === 'grupo') actualizarBotonDictar();
});

actualizarBotonDictar();
