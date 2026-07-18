import { parseBapSerialFrame, type BapQuaternion } from './bapDirect'

interface SerialPortLike {
  readable?: ReadableStream<Uint8Array> | null
  writable?: WritableStream<Uint8Array> | null
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
}

interface SerialNavigatorLike {
  requestPort(): Promise<SerialPortLike>
}

function serialNavigator() {
  if (typeof navigator === 'undefined') return undefined
  return (navigator as Navigator & { serial?: SerialNavigatorLike }).serial
}

export function supportsBapWebSerial() {
  return Boolean(serialNavigator())
}

export interface BapWebSerialConnection {
  close(): Promise<void>
}

/**
 * Conecta directamente al mismo puerto serie que usa BAP 2.32.
 * El navegador debe ser Chrome o Edge de escritorio y el ejecutable BAP no
 * puede estar usando el puerto al mismo tiempo.
 */
export async function connectBapWebSerial(options: {
  onFrame: (frame: BapQuaternion) => void
  onError: (message: string) => void
  onDisconnected: () => void
}): Promise<BapWebSerialConnection> {
  const serial = serialNavigator()
  if (!serial) throw new Error('Este navegador no permite conectarse al puerto serie. Usá Chrome o Edge de escritorio.')
  const port = await serial.requestPort()
  await port.open({ baudRate: 115200 })
  let closed = false
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null

  try {
    const writer = port.writable?.getWriter()
    if (!writer) throw new Error('No fue posible abrir la salida del equipo BAP.')
    await writer.write(new TextEncoder().encode('1'))
    writer.releaseLock()

    if (!port.readable) throw new Error('No fue posible abrir la entrada del equipo BAP.')
    reader = port.readable.getReader()
    const activeReader = reader
    void (async () => {
      const decoder = new TextDecoder()
      let buffer = ''
      try {
        while (!closed) {
          const { value, done } = await activeReader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split(/\r?\n/)
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (!line.trim()) continue
            try { options.onFrame(parseBapSerialFrame(line)) }
            catch { options.onError('Se descartó una trama BAP inválida. Verificá cable, batería y puerto seleccionado.') }
          }
        }
      } catch (error) {
        if (!closed) options.onError(error instanceof Error ? error.message : 'Se perdió la conexión con el equipo BAP.')
      } finally {
        if (!closed) options.onDisconnected()
      }
    })()
  } catch (error) {
    await port.close().catch(() => undefined)
    throw error
  }

  return {
    async close() {
      if (closed) return
      closed = true
      if (reader) {
        await reader.cancel().catch(() => undefined)
        reader.releaseLock()
      }
      await port.close().catch(() => undefined)
    },
  }
}
