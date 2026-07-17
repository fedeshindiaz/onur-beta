import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ExerciseConfig } from '../exercise/types'
import { deleteExerciseTemplate, listExerciseTemplates, saveExerciseTemplate } from './repository'
const key=['exercise-templates'] as const
export function useExerciseTemplates(){return useQuery({queryKey:key,queryFn:listExerciseTemplates})}
export function useSaveExerciseTemplate(){const client=useQueryClient();return useMutation({mutationFn:(config:ExerciseConfig)=>saveExerciseTemplate(config),onSuccess:()=>client.invalidateQueries({queryKey:key})})}
export function useDeleteExerciseTemplate(){const client=useQueryClient();return useMutation({mutationFn:deleteExerciseTemplate,onSuccess:()=>client.invalidateQueries({queryKey:key})})}
