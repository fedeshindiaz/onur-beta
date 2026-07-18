// @vitest-environment node

import { describe, it } from 'vitest'
import { evaluateBapOcrCorpus } from './evaluate_bap_ocr'

describe('benchmark OCR BAP sintético', () => {
  it('mantiene al menos 95 % de precisión campo por campo', async () => {
    await evaluateBapOcrCorpus()
  }, 180_000)
})
