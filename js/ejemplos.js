/**
 * Pendientes de ejemplo para la maqueta, repartidos en todas las temáticas y a lo largo de la jornada.
 * Son frases largas, como se cuentan en voz alta. No corresponden a datos reales.
 * Para el día de Diseño Abierto, cambiar MOSTRAR_EJEMPLOS a false.
 */
export const MOSTRAR_EJEMPLOS = true;

// hora: hora del día con decimales (9.5 = 9:30). La temática se detecta del texto, como con los reales.
// Hay medias horas sin pendientes (franjas vacías) y otras muy conversadas, como la hora de almuerzo.
export const EJEMPLOS = [
  // Estudios
  { hora: 8.1, texto: 'tengo pendiente terminar la tesis, la vengo arrastrando desde el semestre pasado y cada vez que abro el documento me da más miedo seguir escribiendo' },
  { hora: 13.05, texto: 'estudiar para el certamen de la próxima semana, porque llevo días diciendo que mañana empiezo y todavía no he abierto los apuntes de la clase' },
  { hora: 13.1, texto: 'entregar el informe del taller que debo hace un mes, el profe ya me dio otro plazo y me da vergüenza pedirle uno más' },
  { hora: 16.05, texto: 'ponerme al día con las lecturas y las tareas del curso, siento que voy siempre atrasada y que nunca alcanzo a estudiar con calma' },
  { hora: 19.6, texto: 'cerrar el portafolio del semestre y ordenar todos los proyectos de la carrera antes de que se me olviden las entregas' },

  // Trabajo
  { hora: 9.1, texto: 'renunciar a la pega que no me gusta, llevo dos años diciendo que este mes lo hago y sigo yendo todos los días a la misma oficina' },
  { hora: 13.2, texto: 'postular a la práctica profesional, tengo el curriculum listo hace meses pero nunca me atrevo a mandarlo' },
  { hora: 16.1, texto: 'pedirle un aumento a mi jefe, trabajo más horas que antes y el sueldo es el mismo desde que me contrataron' },
  { hora: 18.6, texto: 'terminar el encargo de un cliente que me pidió un logo hace tiempo, le dije que estaba casi listo y la verdad ni lo empiezo' },

  // Familia
  { hora: 9.6, texto: 'llamar a mi abuela más seguido, siempre me dice que la llame y yo lo dejo para el fin de semana y el fin de semana se me pasa' },
  { hora: 11.1, texto: 'visitar a mi hermano en el sur, hace como tres años que no lo veo y mis sobrinos ya están grandes' },
  { hora: 13.3, texto: 'decirle a mi mamá que la quiero, en mi familia no somos de decir esas cosas y me cuesta mucho' },
  { hora: 17.6, texto: 'arreglar las cosas con mi papá, peleamos por una tontera y ya pasó demasiado tiempo como para hacer como que no pasó nada' },

  // Vínculos
  { hora: 9.15, texto: 'pedirle perdón a un amigo con el que dejé de hablar, nunca supe bien cómo acercarme y ahora siento que es tarde' },
  { hora: 11.2, texto: 'responderle a una amiga que me escribió hace meses, leí su mensaje y lo dejé para después y después nunca llegó' },
  { hora: 13.4, texto: 'tener una conversación pendiente con mi pareja sobre lo que queremos, la vamos postergando porque nos da miedo lo que podamos decir' },
  { hora: 16.2, texto: 'agradecerle a una amiga que me ayudó cuando estaba mal, nunca le dije lo importante que fue para mí' },
  { hora: 19.7, texto: 'reencontrarme con mis amigos del colegio, siempre armamos el grupo para juntarnos y nunca nos juntamos' },

  // Uno mismo
  { hora: 8.2, texto: 'volver a dibujar por gusto y no solo por obligación, antes lo hacía todo el tiempo y ahora me cuesta tomar el lápiz' },
  { hora: 12.1, texto: 'aprender a soltar lo que no puedo controlar y dejar de darle vueltas a todo en la noche' },
  { hora: 15.1, texto: 'ordenar mi pieza de una vez, organizar mis cosas y botar lo que ya no uso, aunque me cueste soltar' },
  { hora: 18.7, texto: 'tenerme más paciencia y confianza, aceptar que no todo me tiene que salir perfecto a la primera' },

  // Salud y cuerpo
  { hora: 10.6, texto: 'ir al dentista, tengo una muela que me duele hace meses y lo voy dejando porque me da miedo y no tengo tiempo' },
  { hora: 12.2, texto: 'volver al gimnasio y hacer deporte de nuevo, pagué la matrícula en marzo y fui solo dos veces' },
  { hora: 16.3, texto: 'dormir más de seis horas, me acuesto tarde todas las noches y ando con sueño y cansado todo el día' },
  { hora: 17.7, texto: 'empezar terapia con una psicóloga, sé que me haría bien pero siempre encuentro una excusa para no pedir la hora' },

  // Sueños y proyectos
  { hora: 9.7, texto: 'viajar a Japón algún día, lo sueño desde chica y tengo una lista de lugares que quiero conocer' },
  { hora: 13.45, texto: 'aprender inglés de verdad y por fin hablarlo, es un sueño que tengo hace años y siempre lo dejo para el próximo verano' },
  { hora: 15.2, texto: 'armar una banda de música y tocar en vivo, tengo canciones escritas en un cuaderno que nadie ha escuchado' },
  { hora: 18.8, texto: 'emprender mi propio negocio de cerámica, tengo el proyecto pensado pero me da miedo dar el primer paso' },

  // Pendientes cortos, solos en su media hora: quedan como un hilo grueso de una sola pasada.
  { hora: 14.6, texto: 'dormir una siesta sin culpa' },
  { hora: 17.1, texto: 'volver a nadar' },

  // Otros
  { hora: 10.7, texto: 'devolver un libro de la biblioteca que saqué el año pasado, ya debe tener una multa enorme' },
  { hora: 11.3, texto: 'sacar el carnet de conducir, tengo la hora tomada en la municipalidad y la he cambiado tres veces' },
  { hora: 15.3, texto: 'pagar las cuentas que se me acumularon y revisar los correos que tengo sin abrir desde hace semanas' },
  { hora: 19.8, texto: 'nada importante, creo, aunque quizás lo pendiente es justamente darme el tiempo de pensar qué tengo pendiente' },
];
