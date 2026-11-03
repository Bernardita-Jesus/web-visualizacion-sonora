/**
 * Respuestas de ejemplo para la maqueta (¿Qué tienes pendiente y hace cuánto lo pospones?), repartidas en todas las
 * temáticas y a lo largo de la jornada. Cada una dice cuánto tiempo lleva pospuesta ("lo pospuse dos meses").
 * Son frases largas, como se cuentan en voz alta. No corresponden a datos reales.
 * Se ven al activar "Simular registros" en la visualización; también fijan el alto de cada media hora
 * (el molde del telar), para que el telar y sus costuras tengan las mismas dimensiones en ambos modos.
 */

// hora: hora del día con decimales (9.5 = 9:30). La temática se detecta del texto, como con los reales.
// Hay medias horas sin pendientes (franjas vacías) y otras muy conversadas, como la hora de almuerzo.
// La jornada termina a las 19:30 (la última franja es la de las 7 PM).
export const EJEMPLOS = [
  // Estudios
  { hora: 8.1, texto: 'terminar la tesis, la he pospuesto un año entero y cada vez que abro el documento me da más miedo seguir escribiendo' },
  { hora: 13.05, texto: 'estudiar para el certamen, lo pospuse dos semanas diciendo que mañana empiezo y todavía no abro los apuntes de la clase' },
  { hora: 13.1, texto: 'entregar el informe del taller, lo pospuse un mes y el profe ya me dio otro plazo, me da vergüenza pedirle uno más' },
  { hora: 16.05, texto: 'ponerme al día con las lecturas del curso, las vengo posponiendo desde marzo, casi ocho meses, y siempre voy atrasada' },
  { hora: 18.6, texto: 'cerrar el portafolio del semestre, lo pospuse tres meses y ya se me están olvidando los proyectos de la carrera' },

  // Trabajo
  { hora: 9.1, texto: 'renunciar a la pega que no me gusta, lo he pospuesto dos años diciendo que este mes lo hago y sigo yendo a la misma oficina' },
  { hora: 13.2, texto: 'postular a la práctica profesional, pospuse mandar el curriculum seis meses porque nunca me atrevo' },
  { hora: 16.1, texto: 'pedirle un aumento a mi jefe, lo pospuse un año y medio, trabajo más horas y el sueldo es el mismo' },
  { hora: 18.6, texto: 'terminar el logo que me encargó un cliente, lo pospuse cuatro meses y le dije que estaba casi listo' },

  // Vínculos: familia
  { hora: 9.6, texto: 'llamar a mi abuela más seguido, lo pospongo cada semana hace como cinco meses, siempre lo dejo para el fin de semana' },
  { hora: 11.1, texto: 'visitar a mi hermano en el sur, lo he pospuesto tres años y mis sobrinos ya están grandes' },
  { hora: 13.3, texto: 'decirle a mi mamá que la quiero, lo pospongo hace años, en mi familia no somos de decir esas cosas' },
  { hora: 17.6, texto: 'arreglar las cosas con mi papá, peleamos hace ocho meses por una tontera y lo sigo posponiendo' },

  // Vínculos
  { hora: 9.15, texto: 'pedirle perdón a un amigo con el que dejé de hablar, lo pospuse un año y ahora siento que es tarde' },
  { hora: 11.2, texto: 'responderle a una amiga que me escribió, pospuse la respuesta cuatro meses y después nunca llegó' },
  { hora: 13.4, texto: 'tener una conversación con mi pareja sobre lo que queremos, la pospusimos medio año porque nos da miedo lo que podamos decir' },
  { hora: 16.2, texto: 'agradecerle a una amiga que me ayudó cuando estaba mal, lo pospuse dos años y nunca le dije lo importante que fue' },
  { hora: 18.7, texto: 'reencontrarme con mis amigos del colegio, llevamos tres años posponiendo la junta y nunca nos juntamos' },

  // Hobbies
  { hora: 8.2, texto: 'volver a dibujar por gusto, lo pospuse desde que entré a la carrera, hace cuatro años, y ahora me cuesta tomar el lápiz' },
  { hora: 12.1, texto: 'retomar la guitarra, la pospuse dos años y está guardada en el clóset con una cuerda cortada' },
  { hora: 15.1, texto: 'aprender a tejer a crochet, lo pospuse seis meses y tengo los palillos y la lana esperando en un cajón' },
  { hora: 18.7, texto: 'volver a sacar fotos con la cámara de mi abuelo, lo pospuse tres años y ni siquiera sé si todavía funciona' },

  // Salud y cuerpo
  { hora: 10.6, texto: 'ir al dentista, pospuse la hora cinco meses aunque me duele una muela, me da miedo y nunca tengo tiempo' },
  { hora: 12.2, texto: 'volver al gimnasio y hacer deporte, pagué la matrícula en marzo y lo pospuse siete meses, fui solo dos veces' },
  { hora: 16.3, texto: 'dormir más de seis horas, lo pospongo hace un año, me acuesto tarde y ando cansado todo el día' },
  { hora: 17.7, texto: 'empezar terapia con una psicóloga, lo pospuse dos años, siempre encuentro una excusa para no pedir la hora' },

  // Proyectos
  { hora: 9.7, texto: 'viajar a Japón, lo pospongo desde chica, como quince años, y tengo una lista de lugares que quiero conocer' },
  { hora: 13.45, texto: 'aprender inglés de verdad, lo he pospuesto cinco años y siempre lo dejo para el próximo verano' },
  { hora: 15.2, texto: 'armar una banda de música y tocar en vivo, lo pospuse tres años, tengo canciones escritas que nadie ha escuchado' },
  { hora: 18.8, texto: 'emprender mi negocio de cerámica, lo pospuse un año, tengo el proyecto pensado pero me da miedo el primer paso' },

  // Momentos muy conversados: a media mañana, a la hora de almuerzo y a la salida, la franja se llena de líneas.
  { hora: 11.05, texto: 'terminar la entrega del taller, la pospuse dos semanas, llevo noches sin dormir y todavía no tengo clara la idea del proyecto ni qué le voy a mostrar al profe' },
  { hora: 11.15, texto: 'hablar con mi mejor amiga, nos distanciamos sin pelear y lo he pospuesto seis meses, cada día que pasa me cuesta más dar el primer paso para conversar' },
  { hora: 11.25, texto: 'ir al médico a hacerme los exámenes, lo pospuse cuatro meses, tengo la orden guardada en la mochila y siempre encuentro una razón para no ir a la consulta' },
  { hora: 11.35, texto: 'organizar mis cosas y aprender a decir que no, lo pospongo hace un año, me comprometo con todo el mundo y no me queda tiempo para mí ni para descansar' },
  { hora: 11.45, texto: 'viajar sola por primera vez, tengo ahorrado el pasaje y lo pospuse un año, me da miedo dar el paso y conocer un lugar sin nadie que me acompañe' },

  { hora: 13.02, texto: 'llamar a mi papá, su cumpleaños fue hace tres semanas y lo sigo posponiendo, no hablamos hace mucho y no sé qué decirle después de lo que pasó en la familia' },
  { hora: 13.12, texto: 'rendir el examen que reprobé, lo pospuse un semestre entero, seis meses, tengo que estudiar de nuevo toda la materia del ramo y siento que no avanzo nada' },
  { hora: 13.22, texto: 'buscar otro trabajo de medio tiempo, lo pospuse tres meses, el sueldo no me alcanza para el arriendo y mi jefe no me da más horas aunque se lo pida' },
  { hora: 13.32, texto: 'decirle a una persona lo que siento, lo he pospuesto dos años porque me da miedo perder la amistad que tenemos ahora' },
  { hora: 13.42, texto: 'empezar a hacer ejercicio y comer mejor, lo pospongo cada lunes hace ocho meses, siento el cuerpo cansado y sé que me haría bien moverme un poco cada mañana' },

  { hora: 17.52, texto: 'terminar el proyecto de cerámica que empecé en el verano, lo pospuse diez meses, tengo las piezas a medio hacer en una caja y me dan ganas de crear algo nuevo' },
  { hora: 17.62, texto: 'visitar a mi abuela en el hogar, lo pospongo hace dos meses, mi mamá me dice que pregunta por mí y yo siempre digo que voy el próximo domingo' },
  { hora: 17.72, texto: 'escribirle a un amigo que se fue a vivir afuera, lo pospuse dos años, prometimos mantener el contacto y ninguno de los dos ha mandado un mensaje' },
  { hora: 17.82, texto: 'entregar la práctica y postular a un trabajo de verdad, lo pospuse cinco meses porque tengo miedo de salir de la universidad y no saber qué hacer después' },
  { hora: 17.92, texto: 'perdonarme a mí misma por los errores del año pasado, lo pospongo hace un año y no me dejo tranquila para seguir adelante con calma' },

  // A las 7 PM, cuando se cierra la jornada.
  { hora: 19.05, texto: 'llegar temprano a la casa y cenar con mi familia, lo pospongo hace meses, siempre llego cuando ya todos se acostaron' },
  { hora: 19.15, texto: 'aprender a cocinar algo más que fideos, lo pospuse tres años y mi mamá me dice que ya es hora' },
  { hora: 19.25, texto: 'terminar de leer la novela que empecé, la pospuse cuatro meses en el velador con el marcador en la mitad' },
  { hora: 19.4, texto: 'mandar la postulación a la beca de intercambio, la pospuse un mes y el plazo cierra el viernes' },

  // Pendientes cortos, solos en su media hora: quedan como un hilo grueso de una sola pasada.
  { hora: 14.6, texto: 'dormir una siesta sin culpa, pospuesta tres semanas' },
  { hora: 17.1, texto: 'volver a nadar, hace dos años' },

  // Sin palabras clave claras: van a la temática más cercana
  { hora: 10.7, texto: 'devolver un libro de la biblioteca, lo pospuse un año y ya debe tener una multa enorme' },
  { hora: 11.3, texto: 'sacar el carnet de conducir, lo pospuse ocho meses y cambié la hora en la municipalidad tres veces' },
  { hora: 15.3, texto: 'pagar las cuentas y revisar los correos sin abrir, lo pospuse tres semanas y se me acumuló todo' },
  { hora: 18.8, texto: 'nada importante, creo, aunque quizás lo que he pospuesto por años es darme el tiempo de pensar qué he pospuesto' },
];
