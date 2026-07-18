import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(process.cwd(), 'tests/fixtures/synthetic-clinical')
const names = ['bap_clear_synthetic.pdf', 'bap_perspective_synthetic.jpg', 'bap_screen_synthetic.png', 'mixed_multipage_synthetic.pdf', 'unrecognized_synthetic.pdf', 'vestibular_report_synthetic.pdf', 'vhit_rotated_partial_synthetic.png']

describe('fixtures clínicos sintéticos', () => {
  it('incluye solo artefactos marcados como sintéticos y reproducibles', () => {
    for (const name of names) {
      expect(name).toContain('synthetic')
      expect(existsSync(join(root, name))).toBe(true)
      expect(statSync(join(root, name)).size).toBeGreaterThan(1000)
    }
    const generator = readFileSync(join(process.cwd(), 'scripts/generate_synthetic_clinical_fixtures.py'), 'utf8')
    expect(generator).toContain('DOCUMENTO SINTÉTICO')
    expect(generator).toContain('SIN DATOS PERSONALES')
  })

  it('mantiene un corpus OCR BAP variado y sin datos clínicos', () => {
    const manifest = JSON.parse(readFileSync(join(root, 'bap_ocr_corpus_synthetic.json'), 'utf8')) as {
      synthetic: boolean
      clinical_use: boolean
      cases: Array<{ file: string; variant: string; expected: Record<string, string> }>
    }
    expect(manifest.synthetic).toBe(true)
    expect(manifest.clinical_use).toBe(false)
    expect(manifest.cases.length).toBeGreaterThanOrEqual(9)
    expect(new Set(manifest.cases.map((item) => item.variant)).size).toBeGreaterThanOrEqual(6)
    for (const fixture of manifest.cases) {
      expect(fixture.file).toContain('synthetic')
      expect(existsSync(join(root, fixture.file))).toBe(true)
      expect(Object.keys(fixture.expected)).toHaveLength(11)
    }
  })
})
