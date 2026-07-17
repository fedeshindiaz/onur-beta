export const assessmentDomains = [
  { label: 'Síntomas y sensaciones', start: 0, end: 6 },
  { label: 'Actividades y seguridad', start: 6, end: 12 },
  { label: 'Vida cotidiana y bienestar', start: 12, end: 18 },
] as const

export const assessmentQuestions = [
  '¿Cuánto le molestaron el mareo, el vértigo o la sensación de inestabilidad?',
  '¿Cuánto aumentaron sus molestias al mover la cabeza?',
  '¿Cuánto le molestaron los cambios de posición, por ejemplo levantarse o acostarse?',
  '¿Cuánto le molestaron los supermercados, las pantallas o los lugares con mucho movimiento visual?',
  '¿Cuánto le molestó sentir que la imagen saltaba, se movía o se veía borrosa?',
  '¿Cuánto le molestaron las náuseas u otras sensaciones físicas asociadas?',
  '¿Cuánta dificultad tuvo para caminar con seguridad dentro de su casa?',
  '¿Cuánta dificultad tuvo para caminar en la calle o sobre superficies irregulares?',
  '¿Cuánta dificultad tuvo para subir o bajar escaleras?',
  '¿Cuánta dificultad tuvo para girar o mover la cabeza mientras caminaba?',
  '¿Cuánto temor sintió de perder el equilibrio o caerse?',
  '¿Cuánto necesitó apoyarse o pedir ayuda para desplazarse?',
  '¿Cuánto interfirieron sus molestias con las tareas del hogar, el trabajo o el estudio?',
  '¿Cuánto interfirieron sus molestias con compras, trámites o traslados?',
  '¿Cuánto redujo sus actividades sociales o recreativas por sus molestias?',
  '¿Cuánta dificultad tuvo para concentrarse por sus molestias?',
  '¿Cuánto cansancio le generaron sus molestias o el esfuerzo por mantener el equilibrio?',
  '¿Cuánto afectaron estas molestias su bienestar y confianza para realizar actividades?',
] as const

export const assessmentOptions = [
  { value: 0, label: 'Nada' },
  { value: 1, label: 'Poco' },
  { value: 2, label: 'Bastante' },
  { value: 3, label: 'Mucho' },
  { value: 'not_applicable', label: 'No aplica' },
] as const

export const assessmentPhaseLabels = { initial: 'Inicial', final: 'Final', follow_up: 'Seguimiento' } as const
