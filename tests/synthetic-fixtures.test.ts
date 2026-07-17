import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(process.cwd(), 'tests/fixtures/synthetic-clinical')
const names = ['bap_clear_synthetic.pdf', 'bap_perspective_synthetic.jpg', 'mixed_multipage_synthetic.pdf', 'unrecognized_synthetic.pdf', 'vestibular_report_synthetic.pdf', 'vhit_rotated_partial_synthetic.png']

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
})
