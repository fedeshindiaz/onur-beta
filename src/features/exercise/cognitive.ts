import type { CognitiveResponseMode, CognitiveSymbol, ExerciseConfig } from './types'

export const cognitiveSymbolLabels: Record<CognitiveSymbol, string> = {
  circle: 'círculo',
  square: 'cuadrado',
  triangle: 'triángulo',
  diamond: 'rombo',
  star: 'estrella',
}

export function cognitiveSymbolPhrase(symbol: CognitiveSymbol) {
  return `${symbol === 'star' ? 'la' : 'el'} ${cognitiveSymbolLabels[symbol]}`
}

const symbols: CognitiveSymbol[] = ['circle', 'square', 'triangle', 'diamond', 'star']

function baseSymbol(step: number, excluded?: CognitiveSymbol): CognitiveSymbol {
  const available = excluded ? symbols.filter((symbol) => symbol !== excluded) : symbols
  const value = Math.abs(Math.sin((step + 1) * 12.9898) * 43758.5453)
  return available[Math.floor((value - Math.floor(value)) * available.length) % available.length]
}

export function cognitiveStepAt(elapsedSeconds: number, intervalSeconds: number) {
  return Math.max(0, Math.floor(elapsedSeconds / Math.max(0.75, intervalSeconds)))
}

export function cognitiveSymbolAtStep(config: ExerciseConfig, step: number): CognitiveSymbol {
  if (config.cognitiveTaskMode === 'short_memory') {
    const span = Math.max(1, Math.min(3, config.cognitiveMemorySpan))
    if (step >= span && step % 4 === 3) return cognitiveSymbolAtStep(config, step - span)
    return baseSymbol(step)
  }
  if (config.cognitiveTaskMode === 'rare_target') {
    return step % 5 === 3 ? config.cognitiveTargetSymbol : baseSymbol(step, config.cognitiveTargetSymbol)
  }
  if (config.cognitiveTaskMode === 'go_no_go') {
    return step % 4 === 2 ? config.cognitiveTargetSymbol : baseSymbol(step, config.cognitiveTargetSymbol)
  }
  return 'circle'
}

export function isCognitiveTargetStep(config: ExerciseConfig, step: number) {
  if (config.cognitiveTaskMode === 'none') return false
  const current = cognitiveSymbolAtStep(config, step)
  if (config.cognitiveTaskMode === 'short_memory') {
    const span = Math.max(1, Math.min(3, config.cognitiveMemorySpan))
    return step >= span && current === cognitiveSymbolAtStep(config, step - span)
  }
  return current === config.cognitiveTargetSymbol
}

export function cognitiveResponseModeFor(config: ExerciseConfig): CognitiveResponseMode {
  return config.cognitiveTaskMode === 'rare_target' ? 'count_at_end' : config.cognitiveResponseMode
}

export function cognitiveInstruction(config: ExerciseConfig) {
  const target = cognitiveSymbolPhrase(config.cognitiveTargetSymbol)
  if (config.cognitiveTaskMode === 'rare_target') return `Contá mentalmente cuántas veces aparece ${target}. Al terminar, ingresá el total que recordás.`
  if (config.cognitiveTaskMode === 'go_no_go') return config.cognitiveResponseMode === 'screen_tap'
    ? `Tocá “Responder” solamente cuando aparezca ${target}. No toques ante las demás figuras.`
    : `Decí “sí” solamente cuando aparezca ${target}. No respondas ante las demás figuras.`
  if (config.cognitiveTaskMode === 'short_memory') {
    const reference = config.cognitiveMemorySpan === 1 ? 'la figura anterior' : `la figura de ${config.cognitiveMemorySpan} posiciones atrás`
    return config.cognitiveResponseMode === 'screen_tap'
      ? `Tocá “Responder” solamente cuando la figura actual sea igual a ${reference}.`
      : `Decí “igual” solamente cuando la figura actual sea igual a ${reference}.`
  }
  return 'Sin tarea cognitiva adicional.'
}

export function cognitiveTaskLabel(config: ExerciseConfig) {
  if (config.cognitiveTaskMode === 'rare_target') return 'Detección de objetivo raro'
  if (config.cognitiveTaskMode === 'go_no_go') return 'Go/No-Go'
  if (config.cognitiveTaskMode === 'short_memory') return 'Memoria breve'
  return 'Sin tarea cognitiva'
}
