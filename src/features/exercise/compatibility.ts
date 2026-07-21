import type { ExerciseConfig, ExercisePurpose } from './types'

export interface ExerciseCompatibilityIssue {
  code: string
  message: string
  correction: string
}

export interface ExerciseCompatibilityAnalysis {
  valid: boolean
  issues: ExerciseCompatibilityIssue[]
  explanation: string
  clinicalNote?: string
}

export const exercisePurposeLabels: Record<ExercisePurpose, string> = {
  gaze_stabilization: 'Estabilización de mirada · RVO x1',
  gaze_stabilization_x2: 'Estabilización de mirada · RVO x2',
  gaze_substitution_remembered: 'Objetivo recordado · sustitución (alias RVO x3)',
  smooth_pursuit: 'Seguimiento ocular suave',
  saccades: 'Sacadas',
  optokinetic: 'Estimulación optocinética',
  visual_habituation: 'Habituación a movimiento visual',
  cognitive_visual: 'Tarea cognitivo-visual',
  guided_functional: 'Tarea física o funcional guiada',
  custom_free: 'Libre · configuración profesional no validada',
}

export const exercisePurposeDefaultNames: Record<ExercisePurpose, string> = {
  gaze_stabilization: 'RVO X1 · Punto fijo 2D',
  gaze_stabilization_x2: 'RVO X2 · Blanco y cabeza opuestos',
  gaze_substitution_remembered: 'Objetivo recordado · sustitución',
  smooth_pursuit: 'Seguimiento ocular suave',
  saccades: 'Sacadas visuales',
  optokinetic: 'Estimulación optocinética',
  visual_habituation: 'Habituación a movimiento visual',
  cognitive_visual: 'Tarea cognitivo-visual',
  guided_functional: 'Tarea funcional guiada',
  custom_free: 'Libre · configuración profesional',
}

export const vrBoxPurposeCompatibility: Record<ExercisePurpose, { supported: boolean; reason: string }> = {
  gaze_stabilization: { supported: false, reason: 'El blanco acompaña al celular y a la cabeza; no queda fijo en el ambiente.' },
  gaze_stabilization_x2: { supported: false, reason: 'El movimiento del blanco no puede interpretarse respecto de una pantalla inmóvil.' },
  gaze_substitution_remembered: { supported: false, reason: 'Necesita una referencia estable, abrir/cerrar los ojos y confirmar cada repetición.' },
  smooth_pursuit: { supported: true, reason: 'El blanco se mueve respecto de los ojos mientras la cabeza permanece quieta.' },
  saccades: { supported: true, reason: 'El blanco cambia de posición respecto de los ojos mientras la cabeza permanece quieta.' },
  optokinetic: { supported: true, reason: 'El patrón se mueve respecto de los ojos y no necesita estar anclado al ambiente.' },
  visual_habituation: { supported: true, reason: 'El campo visual móvil puede presentarse como estímulo binocular 2D.' },
  cognitive_visual: { supported: false, reason: 'La consigna y la respuesta necesitan una pantalla accesible fuera del visor.' },
  guided_functional: { supported: false, reason: 'El visor oculta el entorno necesario para realizar la tarea física.' },
  custom_free: { supported: true, reason: 'Admite estímulos visuales técnicamente ejecutables, sin equivalencia clínica automática.' },
}

export function isVrBoxPurposeSupported(purpose: ExercisePurpose) {
  return vrBoxPurposeCompatibility[purpose].supported
}

const purposeInstructions: Record<ExercisePurpose, string> = {
  gaze_stabilization: 'Mantené el blanco nítido mientras movés la cabeza según la indicación profesional.',
  gaze_stabilization_x2: 'Mantené nítido el blanco y mové la cabeza en la dirección opuesta a su recorrido.',
  gaze_substitution_remembered: 'Mirá el blanco, cerrá los ojos, girá la cabeza imaginando que seguís mirándolo y abrí los ojos para comprobar la precisión.',
  smooth_pursuit: 'Mantené la cabeza quieta y seguí el blanco únicamente con los ojos.',
  saccades: 'Mantené la cabeza quieta y llevá la mirada al blanco cada vez que cambie de posición.',
  optokinetic: 'Sentado y con la cabeza quieta, observá el patrón en movimiento sin perseguir un punto particular.',
  visual_habituation: 'Sentado y con la cabeza quieta, observá el movimiento visual durante el tiempo indicado.',
  cognitive_visual: 'Mantené la cabeza quieta, observá cada figura y respondé según la consigna cognitiva.',
  guided_functional: 'Realizá la tarea indicada fuera de cualquier visor y con la supervisión prescripta.',
  custom_free: 'Realizá el ejercicio exactamente como fue indicado por el profesional.',
}

export function applyExercisePurpose(config: ExerciseConfig, purpose: ExercisePurpose): ExerciseConfig {
  const common = { ...config, purpose, name: exercisePurposeDefaultNames[purpose], patientInstruction: purposeInstructions[purpose] }
  if (purpose === 'guided_functional') {
    return {
      ...common,
      kind: 'guided_physical',
      displayMode: 'standard',
      cardboardEnabled: false,
      doseMode: 'repetitions',
      advanceMode: 'manual',
    }
  }
  if (purpose === 'gaze_stabilization') {
    return {
      ...common,
      kind: 'visual_stimulus',
      displayMode: 'standard',
      cardboardEnabled: false,
      backgroundSpeed: 0,
      objectEnabled: true,
      objectMode: 'fixed',
    }
  }
  if (purpose === 'gaze_stabilization_x2') {
    return {
      ...common,
      kind: 'visual_stimulus',
      displayMode: 'standard',
      cardboardEnabled: false,
      backgroundSpeed: 0,
      objectEnabled: true,
      objectMode: 'tracking',
    }
  }
  if (purpose === 'gaze_substitution_remembered') {
    return {
      ...common,
      kind: 'visual_stimulus',
      displayMode: 'standard',
      cardboardEnabled: false,
      doseMode: 'repetitions',
      advanceMode: 'manual',
      backgroundSpeed: 0,
      objectEnabled: true,
      objectMode: 'fixed',
    }
  }
  if (purpose === 'custom_free') {
    return { ...common, kind: 'visual_stimulus' }
  }
  if (purpose === 'cognitive_visual') {
    return {
      ...common,
      kind: 'visual_stimulus',
      displayMode: 'standard',
      cardboardEnabled: false,
      doseMode: 'time',
      advanceMode: 'manual',
      posture: 'seated',
      surface: 'firm',
      backgroundType: 'solid',
      backgroundSpeed: 0,
      objectEnabled: true,
      objectMode: 'fixed',
      metronomeEnabled: false,
      cognitiveTaskMode: config.cognitiveTaskMode === 'none' ? 'rare_target' : config.cognitiveTaskMode,
      cognitiveResponseMode: config.cognitiveTaskMode === 'go_no_go' || config.cognitiveTaskMode === 'short_memory' ? config.cognitiveResponseMode : 'count_at_end',
    }
  }
  if (purpose === 'smooth_pursuit') {
    return {
      ...common,
      kind: 'visual_stimulus',
      backgroundSpeed: 0,
      objectEnabled: true,
      objectMode: 'tracking',
    }
  }
  if (purpose === 'saccades') {
    return {
      ...common,
      kind: 'visual_stimulus',
      backgroundSpeed: 0,
      objectEnabled: true,
      objectMode: 'saccades',
    }
  }
  return {
    ...common,
    kind: 'visual_stimulus',
    backgroundType: config.backgroundType === 'solid' ? (purpose === 'optokinetic' ? 'bars' : 'checkerboard') : config.backgroundType,
    backgroundSpeed: Math.max(config.backgroundSpeed, purpose === 'optokinetic' ? 30 : 20),
    objectEnabled: false,
    objectMode: 'fixed',
  }
}

function issue(code: string, message: string, correction: string): ExerciseCompatibilityIssue {
  return { code, message, correction }
}

export function analyzeExerciseCompatibility(config: ExerciseConfig): ExerciseCompatibilityAnalysis {
  const issues: ExerciseCompatibilityIssue[] = []
  const headset = config.displayMode === 'vr_box' || config.displayMode === 'quest_browser'
  const deviceName = config.displayMode === 'vr_box' ? 'VR Box' : 'Meta Quest en modo navegador'
  const free = config.purpose === 'custom_free'
  const cognitive = config.cognitiveTaskMode !== 'none'
  const headMovementPurpose = ['gaze_stabilization', 'gaze_stabilization_x2', 'gaze_substitution_remembered'].includes(config.purpose)
  const rotationalDirection = config.backgroundDirection === 'clockwise' || config.backgroundDirection === 'counterclockwise'

  if (config.cardboardEnabled && config.displayMode !== 'vr_box') {
    issues.push(issue('cardboard-display-mode', 'El perfil Cardboard pertenece a la presentación VR Box y no puede aplicarse a una pantalla 2D o a Meta Quest.', 'Elegí VR Box o desactivá Cardboard.'))
  }

  if (!free && config.backgroundType === 'spiral' && !rotationalDirection) {
    issues.push(issue('spiral-direction', 'La espiral representa una rotación y no admite una dirección lineal o diagonal.', 'Elegí sentido horario o antihorario.'))
  }
  if (!free && config.backgroundType !== 'solid' && config.backgroundType !== 'spiral' && rotationalDirection) {
    issues.push(issue('linear-pattern-direction', 'Barras, damero y puntos se desplazan linealmente y no admiten sentido horario o antihorario.', 'Elegí una dirección horizontal, vertical o diagonal.'))
  }

  if (free) {
    if (config.kind !== 'visual_stimulus') issues.push(issue('free-kind', 'El modo Libre de este constructor reproduce un estímulo visual.', 'Elegí estímulo visual o usá la finalidad funcional para una tarea física.'))
  } else if (config.purpose === 'guided_functional') {
    if (config.kind !== 'guided_physical') issues.push(issue('functional-kind', 'La finalidad funcional requiere una tarea física guiada.', 'Cambiá el tipo a ejercicio físico guiado.'))
    if (headset) issues.push(issue('functional-headset', `La tarea física no es coherente dentro de ${deviceName}: el visor oculta el entorno y la aplicación solo mostraría una instrucción.`, 'Usá Pantalla 2D y realizá la tarea fuera del visor.'))
  } else if (config.kind !== 'visual_stimulus') {
    issues.push(issue('visual-kind', 'El objetivo seleccionado requiere un estímulo visual.', 'Cambiá el tipo a estímulo visual.'))
  }

  if (config.purpose === 'gaze_stabilization') {
    if (config.displayMode === 'vr_box') issues.push(issue('gaze-headset', 'RVO x1 no funciona en VR Box con el reproductor actual: el blanco está unido al celular y acompaña la cabeza, por lo que no genera el deslizamiento retiniano previsto.', 'Usá una pantalla 2D inmóvil.'))
    if (config.displayMode === 'quest_browser') issues.push(issue('gaze-headset', 'RVO x1 no está habilitado en Quest: el reproductor actual no inicia una sesión WebXR ni controla o verifica que el blanco permanezca anclado al ambiente.', 'Usá una pantalla 2D inmóvil. Quest podrá habilitarse cuando la aplicación implemente y valide el anclaje espacial.'))
    if (!config.objectEnabled || config.objectMode !== 'fixed') issues.push(issue('gaze-target', 'RVO x1 necesita un blanco visible y fijo en la pantalla.', 'Activá el blanco y elegí comportamiento Fijo.'))
    if (config.backgroundSpeed > 0) issues.push(issue('gaze-background', 'Un fondo móvil cambia la tarea y deja de ser un RVO x1 aislado.', 'Llevá la velocidad del fondo a 0.'))
  }

  if (config.purpose === 'gaze_stabilization_x2') {
    if (headset) issues.push(issue('gaze-x2-headset', `RVO x2 no es coherente dentro de ${deviceName}: la referencia visual queda unida al visor y su movimiento ya no puede interpretarse respecto de una pantalla inmóvil.`, 'Usá una pantalla 2D inmóvil.'))
    if (!config.objectEnabled || config.objectMode !== 'tracking') issues.push(issue('gaze-x2-target', 'RVO x2 necesita un blanco visible con movimiento continuo mientras la cabeza se mueve en sentido opuesto.', 'Activá el blanco y elegí Seguimiento.'))
    if (config.backgroundSpeed > 0) issues.push(issue('gaze-x2-background', 'Un fondo móvil añade otra señal visual y deja de aislar la tarea RVO x2.', 'Llevá la velocidad del fondo a 0.'))
  }

  if (config.purpose === 'gaze_substitution_remembered') {
    if (headset) issues.push(issue('remembered-headset', `El objetivo recordado no es ejecutable dentro de ${deviceName}: requiere cerrar y abrir los ojos, comparar con una referencia estable y confirmar cada intento.`, 'Usá Pantalla 2D, por repeticiones y con confirmación manual.'))
    if (!config.objectEnabled || config.objectMode !== 'fixed') issues.push(issue('remembered-target', 'El objetivo recordado necesita un blanco visible y fijo como referencia.', 'Activá el blanco y elegí comportamiento Fijo.'))
    if (config.backgroundSpeed > 0) issues.push(issue('remembered-background', 'El objetivo recordado necesita una referencia simple y estable.', 'Llevá la velocidad del fondo a 0.'))
    if (config.doseMode !== 'repetitions' || config.advanceMode !== 'manual') issues.push(issue('remembered-dose', 'La serie de objetivos recordados debe ser contada y confirmada por la persona.', 'Elegí repeticiones y confirmación manual.'))
  }

  if (config.purpose === 'smooth_pursuit') {
    if (!config.objectEnabled || config.objectMode !== 'tracking') issues.push(issue('pursuit-target', 'El seguimiento suave necesita un blanco visible con movimiento continuo.', 'Activá el blanco y elegí Seguimiento.'))
    if (config.backgroundSpeed > 0) issues.push(issue('pursuit-background', 'El fondo móvil agrega estimulación visual y no permite aislar el seguimiento ocular.', 'Llevá la velocidad del fondo a 0.'))
  }

  if (config.purpose === 'saccades') {
    if (!config.objectEnabled || config.objectMode !== 'saccades') issues.push(issue('saccade-target', 'El ejercicio de sacadas necesita un blanco que cambie de posición.', 'Activá el blanco y elegí Sacadas.'))
    if (config.backgroundSpeed > 0) issues.push(issue('saccade-background', 'El fondo móvil agrega una demanda diferente y no permite aislar las sacadas.', 'Llevá la velocidad del fondo a 0.'))
  }

  if (config.purpose === 'optokinetic' || config.purpose === 'visual_habituation') {
    if (config.backgroundType === 'solid' || config.backgroundSpeed <= 0) issues.push(issue('visual-motion', 'Este objetivo necesita un patrón que se mueva respecto de los ojos; una imagen estática no produce el estímulo previsto.', 'Elegí barras, damero, espiral o puntos y una velocidad mayor que 0.'))
    if (config.objectEnabled) issues.push(issue('visual-fixation', 'El blanco fijo puede suprimir o distraer del estímulo de campo visual.', 'Ocultá el blanco para que el patrón móvil sea el estímulo principal.'))
  }

  if (config.purpose === 'cognitive_visual') {
    if (!cognitive) issues.push(issue('cognitive-missing', 'La finalidad cognitivo-visual necesita una tarea cognitiva definida.', 'Elegí objetivo raro, Go/No-Go o memoria breve.'))
    if (config.displayMode !== 'standard') issues.push(issue('cognitive-purpose-headset', 'La tarea cognitivo-visual se implementa en Pantalla 2D para presentar la consigna y registrar la respuesta de forma clara.', 'Usá Pantalla 2D.'))
    if (!config.objectEnabled || config.objectMode !== 'fixed') issues.push(issue('cognitive-purpose-target', 'La tarea cognitivo-visual aislada necesita figuras visibles en una posición estable.', 'Activá el blanco y elegí comportamiento Fijo.'))
    if (config.backgroundType !== 'solid' || config.backgroundSpeed > 0) issues.push(issue('cognitive-purpose-background', 'La tarea cognitiva inicial necesita un fondo simple para no añadir una segunda demanda visual.', 'Usá fondo de color sólido y velocidad 0.'))
    if (config.posture !== 'seated' || config.surface !== 'firm') issues.push(issue('cognitive-purpose-position', 'La tarea cognitiva inicial está diseñada sentado y en superficie firme.', 'Elegí postura sentada y superficie firme.'))
    if (config.metronomeEnabled) issues.push(issue('cognitive-purpose-metronome', 'La tarea cognitiva aislada no necesita una señal rítmica adicional.', 'Desactivá el metrónomo.'))
  }

  if (cognitive) {
    if (config.kind !== 'visual_stimulus') issues.push(issue('cognitive-physical', 'Esta versión no presenta figuras cognitivas durante una tarea física porque obliga a dividir la mirada entre la pantalla y el entorno.', 'Usá una tarea cognitivo-visual sentada o planificá la doble tarea presencial fuera de la plataforma.'))
    if (config.displayMode !== 'standard') issues.push(issue('cognitive-headset', 'Las tareas cognitivas necesitan mostrar la consigna y registrar o confirmar la respuesta; el flujo actual no lo resuelve de forma fiable dentro del visor.', 'Usá Pantalla 2D.'))
    if (!config.objectEnabled) issues.push(issue('cognitive-object', 'La tarea cognitiva necesita figuras visibles.', 'Activá el blanco.'))
    if (config.doseMode !== 'time' || config.advanceMode !== 'manual') issues.push(issue('cognitive-completion', 'La tarea cognitiva necesita una fase temporizada y confirmación final para registrar la respuesta.', 'Elegí Por tiempo y Confirmación manual.'))
    if (config.cognitiveTaskMode === 'rare_target' && config.cognitiveResponseMode !== 'count_at_end') issues.push(issue('cognitive-count', 'La detección de objetivo raro se completa informando el total observado.', 'Elegí Contar e informar al terminar.'))
    if (config.cognitiveResponseMode === 'screen_tap' && headMovementPurpose) issues.push(issue('cognitive-touch-head', 'Tocar la pantalla mientras se mueve la cabeza interrumpe la posición de ejecución y agrega una tarea manual no controlada.', 'Elegí respuesta verbal o usá una tarea cognitivo-visual aislada.'))
    if (config.cognitiveStimulusSeconds < 0.75 || config.cognitiveStimulusSeconds > 6) issues.push(issue('cognitive-pace', 'El intervalo de las figuras está fuera del rango técnico implementado.', 'Elegí un intervalo entre 0,75 y 6 segundos.'))
  }

  if (headset && config.kind === 'visual_stimulus' && config.posture !== 'seated') {
    issues.push(issue('headset-posture', `Los estímulos visuales en ${deviceName} están limitados a posición sentada en esta versión.`, 'Elegí posición sentada o usá Pantalla 2D.'))
  }

  if (headset && config.kind === 'visual_stimulus' && config.surface !== 'firm') {
    issues.push(issue('headset-surface', `Los estímulos visuales en ${deviceName} requieren una superficie firme en esta versión.`, 'Elegí superficie firme o usá Pantalla 2D.'))
  }

  if (config.displayMode === 'vr_box' && config.doseMode !== 'time') issues.push(issue('vr-dose', 'VR Box solo admite ejercicios por tiempo porque el paciente no puede confirmar repeticiones con el celular dentro del visor.', 'Elegí Por tiempo o Pantalla 2D.'))
  if (config.displayMode === 'vr_box' && config.advanceMode !== 'automatic') issues.push(issue('vr-advance', 'VR Box debe finalizar automáticamente porque no usa botones, mirada ni controles externos.', 'Elegí avance automático.'))
  if (config.displayMode === 'vr_box' && config.metronomeEnabled) issues.push(issue('vr-metronome', 'El audio del navegador puede quedar bloqueado después de colocar el celular en VR Box y no es necesario para estos estímulos visuales.', 'Desactivá el metrónomo en VR Box.'))

  let explanation = 'La configuración técnica coincide con el objetivo seleccionado.'
  if (config.purpose === 'gaze_stabilization' && config.displayMode === 'standard') explanation = 'El blanco queda fijo en una pantalla inmóvil mientras el paciente mueve la cabeza: la referencia espacial es coherente con RVO x1.'
  if (config.purpose === 'gaze_stabilization_x2' && config.displayMode === 'standard') explanation = 'El blanco se desplaza en una pantalla inmóvil y la persona mueve la cabeza en sentido opuesto: configuración digital coherente con RVO x2.'
  if (config.purpose === 'gaze_substitution_remembered' && config.displayMode === 'standard') explanation = 'El blanco estable permite mirar, cerrar los ojos, girar la cabeza y comprobar la precisión al reabrirlos.'
  if ((config.purpose === 'smooth_pursuit' || config.purpose === 'saccades') && headset) explanation = `El blanco se mueve respecto de los ojos dentro de ${deviceName}; el paciente debe mantener la cabeza quieta.`
  if ((config.purpose === 'optokinetic' || config.purpose === 'visual_habituation') && headset) explanation = `El patrón se mueve respecto de los ojos dentro de ${deviceName}; no necesita estar anclado al ambiente y se realiza sentado, con la cabeza quieta.`
  if (config.purpose === 'cognitive_visual' && config.displayMode === 'standard') explanation = 'Las figuras se presentan en una pantalla inmóvil, sentado, con una consigna y una respuesta definidas antes de comenzar.'
  if (config.purpose === 'guided_functional' && config.displayMode === 'standard') explanation = 'La tarea se realiza fuera del visor, con el entorno visible y confirmación manual cuando corresponde.'
  if (free) explanation = issues.length === 0
    ? 'Modo Libre: la configuración puede guardarse y ejecutarse, pero la plataforma no valida su equivalencia con un protocolo clínico.'
    : 'El modo Libre permite guardar cualquier combinación; esta combinación no puede ejecutarse con seguridad técnica en el dispositivo seleccionado.'

  const clinicalNote = free
    ? 'Revisión profesional obligatoria. “Libre” no convierte la combinación en RVO x1, RVO x2, sustitución, habituación ni estimulación optocinética.'
    : config.purpose === 'gaze_substitution_remembered'
      ? '“RVO x3” es un alias docente no estandarizado. La tarea se registra como sustitución por objetivo recordado, no como una adaptación tres veces mayor ni como progresión automática de RVO x2.'
      : config.purpose === 'smooth_pursuit' || config.purpose === 'saccades'
    ? 'No debe presentarse como sustituto de la estabilización de mirada: el seguimiento y las sacadas con la cabeza quieta no equivalen a un ejercicio de adaptación del RVO.'
      : config.purpose === 'optokinetic' || config.purpose === 'visual_habituation'
      ? 'La intensidad y el tiempo deben respetar el techo de síntomas y las reglas de detención definidas por el profesional.'
      : config.purpose === 'cognitive_visual' || cognitive
        ? 'La tarea cognitiva es un recurso de entrenamiento y doble tarea, no una prueba diagnóstica. Su combinación con una tarea vestibular requiere dominio previo de la tarea aislada.'
      : undefined

  if (issues.length > 0 && !free) explanation = 'La finalidad declarada, el estímulo y el dispositivo no representan la misma tarea.'
  return { valid: issues.length === 0, issues, explanation, clinicalNote }
}
