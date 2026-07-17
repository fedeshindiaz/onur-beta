import { useQuery } from '@tanstack/react-query'
import { getPatientAcknowledgement, PATIENT_ACKNOWLEDGEMENT } from './patientAcknowledgement'

export const acknowledgementKey = ['patient-acknowledgement', PATIENT_ACKNOWLEDGEMENT.version] as const

export function usePatientAcknowledgement() {
  return useQuery({ queryKey: acknowledgementKey, queryFn: getPatientAcknowledgement })
}
