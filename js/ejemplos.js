/**
 * Pendientes de ejemplo para la maqueta, repartidos en todas las temáticas y a lo largo de la jornada.
 * Son frases largas, como se cuentan en voz alta. No corresponden a datos reales.
 * Se ven al activar "Simular registros" en la visualización; también fijan el alto de cada media hora
 * (el molde del telar), para que el telar y sus costuras tengan las mismas dimensiones en ambos modos.
 */

// hora: hora del día con decimales (9.5 = 9:30). La temática se detecta del texto, como con los reales.
// Hay medias horas sin pendientes (franjas vacías) y otras muy conversadas, como la hora de almuerzo.
// La jornada termina a las 19:30 (la última franja es la de las 7 PM).
export const EJEMPLOS = [
  // Estudios
  { hora: 8.1, texto: 'tengo pendiente terminar la tesis, la vengo arrastrando desde el semestre pasado y cada vez que abro el documento me da más miedo seguir escribiendo' },
  { hora: 13.05, texto: 'estudiar para el certamen de la próxima semana, porque llevo días diciendo que mañana empiezo y todavía no he abierto los apuntes de la clase' },
  { hora: 13.1, texto: 'entregar el informe del taller que debo hace un mes, el profe ya me dio otro plazo y me da vergüenza pedirle uno más' },
  { hora: 16.05, texto: 'ponerme al día con las lecturas y las tareas del curso, siento que voy siempre atrasada y que nunca alcanzo a estudiar con calma' },
  { hora: 18.6, texto: 'cerrar el portafolio del semestre y ordenar todos los proyectos de la carrera antes de que se me olviden las entregas' },

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
  { hora: 18.7, texto: 'reencontrarme con mis amigos del colegio, siempre armamos el grupo para juntarnos y nunca nos juntamos' },

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

  // Momentos muy conversados: a media mañana, a la hora de almuerzo y a la salida, la franja se llena de líneas.
  { hora: 11.05, texto: 'terminar la entrega del taller de esta semana, llevo noches sin dormir y todavía no tengo clara la idea del proyecto ni qué le voy a mostrar al profe' },
  { hora: 11.15, texto: 'hablar con mi mejor amiga, nos distanciamos sin pelear, simplemente dejamos de escribirnos y cada día que pasa me cuesta más dar el primer paso para conversar' },
  { hora: 11.25, texto: 'ir al médico a hacerme los exámenes que me pidieron hace meses, tengo la orden guardada en la mochila y siempre encuentro una razón para no ir a la consulta' },
  { hora: 11.35, texto: 'organizar mis cosas y aprender a decir que no, me comprometo con todo el mundo y al final no me queda tiempo para mí ni para descansar un poco' },
  { hora: 11.45, texto: 'viajar sola por primera vez, tengo ahorrado para el pasaje hace un año y me da miedo dar el paso y conocer un lugar sin nadie que me acompañe' },

  { hora: 13.02, texto: 'llamar a mi papá para su cumpleaños, no hablamos desde hace mucho y no sé bien qué decirle después de todo lo que pasó en la familia este último tiempo' },
  { hora: 13.12, texto: 'rendir el examen que reprobé el semestre pasado, tengo que estudiar de nuevo toda la materia del ramo y siento que no avanzo nada cuando abro los apuntes' },
  { hora: 13.22, texto: 'buscar otro trabajo de medio tiempo, el sueldo no me alcanza para el arriendo y mi jefe no me da más horas aunque se lo he pedido varias veces' },
  { hora: 13.32, texto: 'decirle a una persona lo que siento, la conozco hace años y nunca me he atrevido porque me da miedo perder la amistad que tenemos ahora' },
  { hora: 13.42, texto: 'empezar a hacer ejercicio y comer mejor, siento el cuerpo cansado todo el día y sé que me haría bien moverme aunque sea un poco cada mañana' },

  { hora: 17.52, texto: 'terminar el proyecto de cerámica que empecé en el verano, tengo las piezas a medio hacer en una caja y cada vez que las veo me dan ganas de crear algo nuevo' },
  { hora: 17.62, texto: 'visitar a mi abuela en el hogar, mi mamá me dice que pregunta por mí y yo siempre digo que voy el próximo domingo y el domingo nunca llega' },
  { hora: 17.72, texto: 'escribirle a un amigo que se fue a vivir afuera, prometimos mantener el contacto y ya pasaron dos años sin que ninguno de los dos mande un mensaje' },
  { hora: 17.82, texto: 'entregar la práctica y postular a un trabajo de verdad, tengo miedo de salir de la universidad y no saber qué hacer después de la carrera' },
  { hora: 17.92, texto: 'perdonarme a mí misma por los errores del año pasado, sigo pensando en lo que hice mal y no me dejo tranquila para seguir adelante con calma' },

  // A las 7 PM, cuando se cierra la jornada.
  { hora: 19.05, texto: 'llegar temprano a la casa y cenar con mi familia, siempre llego cuando ya todos se acostaron' },
  { hora: 19.15, texto: 'aprender a cocinar algo más que fideos, mi mamá me dice que ya es hora' },
  { hora: 19.25, texto: 'terminar de leer la novela que empecé en el verano, la tengo en el velador con el marcador en la mitad' },
  { hora: 19.4, texto: 'mandar la postulación a la beca de intercambio antes de que cierre el plazo el viernes' },

  // Pendientes cortos, solos en su media hora: quedan como un hilo grueso de una sola pasada.
  { hora: 14.6, texto: 'dormir una siesta sin culpa' },
  { hora: 17.1, texto: 'volver a nadar' },

  // Otros
  { hora: 10.7, texto: 'devolver un libro de la biblioteca que saqué el año pasado, ya debe tener una multa enorme' },
  { hora: 11.3, texto: 'sacar el carnet de conducir, tengo la hora tomada en la municipalidad y la he cambiado tres veces' },
  { hora: 15.3, texto: 'pagar las cuentas que se me acumularon y revisar los correos que tengo sin abrir desde hace semanas' },
  { hora: 18.8, texto: 'nada importante, creo, aunque quizás lo pendiente es justamente darme el tiempo de pensar qué tengo pendiente' },
];
