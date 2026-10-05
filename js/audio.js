/**
 * Motor de audio: gestiona el AudioContext, la fuente activa
 * (micrófono o archivo) y el AnalyserNode del que lee el visualizador.
 */
export class AudioEngine {
  constructor({ fftSize = 2048, smoothing = 0.8 } = {}) {
    this.context = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
    this.audioElement = null;
    this.fftSize = fftSize;
    this.smoothing = smoothing;
  }

  /** Crea el contexto de forma perezosa (los navegadores exigen un gesto del usuario). */
  async #ensureContext() {
    if (!this.context) {
      this.context = new AudioContext();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = this.smoothing;
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.fftSize);
    }
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  async useMicrophone() {
    await this.#ensureContext();
    this.stop();
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.context.createMediaStreamSource(this.stream);
    // El micrófono no se conecta a la salida para evitar retroalimentación.
    this.source.connect(this.analyser);
  }

  async useFile(file) {
    await this.#ensureContext();
    this.stop();
    this.audioElement = new Audio(URL.createObjectURL(file));
    this.source = this.context.createMediaElementSource(this.audioElement);
    this.source.connect(this.analyser);
    this.analyser.connect(this.context.destination);
    await this.audioElement.play();
  }

  stop() {
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    if (this.audioElement) {
      this.audioElement.pause();
      URL.revokeObjectURL(this.audioElement.src);
    }
    this.source = null;
    this.stream = null;
    this.audioElement = null;
  }

  get isActive() {
    return this.source !== null;
  }

  /** Espectro de frecuencias (0–255 por banda). */
  getFrequencyData() {
    this.analyser.getByteFrequencyData(this.frequencyData);
    return this.frequencyData;
  }

  /** Forma de onda en el dominio del tiempo (128 = silencio). */
  getTimeData() {
    this.analyser.getByteTimeDomainData(this.timeData);
    return this.timeData;
  }
}
