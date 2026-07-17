import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPatient, getPatient, listPatients, updatePatient } from './repository'

export const patientKeys = { all: ['patients'] as const, detail: (id: string) => ['patients', id] as const }

export function usePatients() { return useQuery({ queryKey: patientKeys.all, queryFn: listPatients }) }
export function usePatient(id: string) { return useQuery({ queryKey: patientKeys.detail(id), queryFn: () => getPatient(id), enabled: Boolean(id) }) }
export function useCreatePatient() {
  const client = useQueryClient()
  return useMutation({ mutationFn: createPatient, onSuccess: () => client.invalidateQueries({ queryKey: patientKeys.all }) })
}
export function useUpdatePatient(id: string) {
  const client = useQueryClient()
  return useMutation({ mutationFn: (values: Parameters<typeof updatePatient>[1]) => updatePatient(id, values), onSuccess: () => { client.invalidateQueries({ queryKey: patientKeys.all }); client.invalidateQueries({ queryKey: patientKeys.detail(id) }) } })
}
