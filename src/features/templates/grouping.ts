import type { ExerciseTemplateRecord } from './repository'

export interface ExerciseTemplateGroup {
  id: string
  label: string
  templates: ExerciseTemplateRecord[]
}

export function groupExerciseTemplates(templates: ExerciseTemplateRecord[]): ExerciseTemplateGroup[] {
  const definitions = [
    { id: 'pppd-habituation', label: 'PPPD · Habituación visual', matches: (item: ExerciseTemplateRecord) => item.config.clinicalProtocol === 'pppd' && item.config.purpose === 'visual_habituation' },
    { id: 'pppd-optokinetic', label: 'PPPD · Optocinético', matches: (item: ExerciseTemplateRecord) => item.config.clinicalProtocol === 'pppd' && item.config.purpose === 'optokinetic' },
    { id: 'pppd-functional', label: 'PPPD · Funcional', matches: (item: ExerciseTemplateRecord) => item.config.clinicalProtocol === 'pppd' && item.config.purpose === 'guided_functional' },
    { id: 'personal', label: 'Mis plantillas', matches: (item: ExerciseTemplateRecord) => !item.id.startsWith('template-') },
    { id: 'general', label: 'Plantillas generales', matches: (item: ExerciseTemplateRecord) => item.id.startsWith('template-') && item.config.clinicalProtocol !== 'pppd' },
  ]

  return definitions
    .map(({ id, label, matches }) => ({ id, label, templates: templates.filter(matches) }))
    .filter((group) => group.templates.length > 0)
}
