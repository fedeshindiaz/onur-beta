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
  smooth_pursuit: 'Seguimiento ocular suave',
  saccades: 'Sacadas',
  optokinetic: 'Estimulación optocinética',
  visual_habituation: 'Habituación a movimiento visual',
  guided_functional: 'Tarea física o funcional guiada',
}

const purposeInstructions: Record<ExercisePurpose, string> = {
  gaze_stabilization: 'Mantené el blanco nítido mientras movés la cabeza según la indicación profesional.',
  smooth_pursuit: 'Mantené la cabeza quieta y seguí el blanco únicamente con los ojos.',
  saccades: 'Mantené la cabeza quieta y llevá la mirada al blanco cada vez que cambie de posición.',
  optokinetic: 'Sentado y con la cabeza quieta, observá el patrón en movimiento sin perseguir un punto particular.',
  visual_habituation: 'Sentado y con la cabeza quieta, observá el movimiento visual durante el tiempo indicado.',
  guided_functional: 'Realizá la tarea indicada fuera de cualquier visor y con la supervisión prescripta.',
}

export function applyExercisePurpose(config: ExerciseConfig, purpose: ExercisePurpose): ExerciseConfig {
  const common = { ...config, purpose, patientInstruction: purposeInstructions[purpose] }
  if (purpose === 'guided_functional') {
    return {
      ...common,
      kind: 'guided_physical',
      displayMode: 'standard',
      doseMode: 'repetitions',
      advanceMode: 'manual',
    }
  }
  if (purpose === 'gaze_stabilization') {
    return {
      ...common,
      kind: 'visual_stimulus',
      displayMode: 'standard',
      backgroundSpeed: 0,
      objectEnabled: true,
      objectMode: 'fixed',
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

  if (config.purpose === 'guided_functional') {
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

  if (headset && config.kind === 'visual_stimulus' && config.posture !== 'seated') {
    issues.push(issue('headset-posture', `Los estímulos visuales en ${deviceName} están limitados a posición sentada en esta versión.`, 'Elegí posición sentada o usá Pantalla 2D.'))
  }

  if (config.displayMode === 'vr_box' && config.doseMode !== 'time') issues.push(issue('vr-dose', 'VR Box solo admite ejercicios por tiempo porque el paciente no puede confirmar repeticiones con el celular dentro del visor.', 'Elegí Por tiempo o Pantalla 2D.'))
  if (config.displayMode === 'vr_box' && config.advanceMode !== 'automatic') issues.push(issue('vr-advance', 'VR Box debe finalizar automáticamente porque no usa botones, mirada ni controles externos.', 'Elegí avance automático.'))

  let explanation = 'La configuración técnica coincide con el objetivo seleccionado.'
  if (config.purpose === 'gaze_stabilization' && config.displayMode === 'standard') explanation = 'El blanco queda fijo en una pantalla inmóvil mientras el paciente mueve la cabeza: la referencia espacial es coherente con RVO x1.'
  if ((config.purpose === 'smooth_pursuit' || config.purpose === 'saccades') && headset) explanation = `El blanco se mueve respecto de los ojos dentro de ${deviceName}; el paciente debe mantener la cabeza quieta.`
  if ((config.purpose === 'optokinetic' || config.purpose === 'visual_habituation') && headset) explanation = `El patrón se mueve respecto de los ojos dentro de ${deviceName}; no necesita estar anclado al ambiente y se realiza sentado, con la cabeza quieta.`
  if (config.purpose === 'guided_functional' && config.displayMode === 'standard') explanation = 'La tarea se realiza fuera del visor, con el entorno visible y confirmación manual cuando corresponde.'

  const clinicalNote = config.purpose === 'smooth_pursuit' || config.purpose === 'saccades'
    ? 'No debe presentarse como sustituto de la estabilización de mirada: el seguimiento y las sacadas con la cabeza quieta no equivalen a un ejercicio de adaptación del RVO.'
    : config.purpose === 'optokinetic' || config.purpose === 'visual_habituation'
      ? 'La intensidad y el tiempo deben respetar el techo de síntomas y las reglas de detención definidas por el profesional.'
      : undefined

  if (issues.length > 0) explanation = 'La finalidad declarada, el estímulo y el dispositivo no representan la misma tarea.'
  return { valid: issues.length === 0, issues, explanation, clinicalNote }
}
