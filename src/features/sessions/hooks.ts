import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { completeSessionAssignment, createSessionAssignment, createTreatmentCycle, getCurrentPatientAssignment, listProfessionalAssignments, listSessionAssignments, listTreatmentCycles, startSessionAssignment, type SessionAssignmentRecord, type SessionCompletionInput } from './repository'
import { flushPendingSessionCompletions, isLikelyNetworkFailure, queueSessionCompletion } from './offlineQueue'
import { isSupabaseConfigured } from '../../lib/supabase'

export const sessionKeys={cycles:(id:string)=>['cycles',id] as const,assignments:(id:string)=>['assignments',id] as const,all:['assignments'] as const,current:['patient-current-assignment'] as const}
export function useTreatmentCycles(patientId:string){return useQuery({queryKey:sessionKeys.cycles(patientId),queryFn:()=>listTreatmentCycles(patientId),enabled:Boolean(patientId)})}
export function useSessionAssignments(patientId:string){return useQuery({queryKey:sessionKeys.assignments(patientId),queryFn:()=>listSessionAssignments(patientId),enabled:Boolean(patientId)})}
export function useCreateTreatmentCycle(patientId:string){const client=useQueryClient();return useMutation({mutationFn:(values:Parameters<typeof createTreatmentCycle>[1])=>createTreatmentCycle(patientId,values),onSuccess:()=>client.invalidateQueries({queryKey:sessionKeys.cycles(patientId)})})}
export function useCreateSessionAssignment(patientId:string){const client=useQueryClient();return useMutation({mutationFn:(values:Parameters<typeof createSessionAssignment>[1])=>createSessionAssignment(patientId,values),onSuccess:()=>client.invalidateQueries({queryKey:sessionKeys.assignments(patientId)})})}
export function useCurrentPatientAssignment(){return useQuery({queryKey:sessionKeys.current,queryFn:getCurrentPatientAssignment})}
export function useProfessionalAssignments(){return useQuery({queryKey:sessionKeys.all,queryFn:listProfessionalAssignments})}
export function useCompleteSession(){const client=useQueryClient();return useMutation({mutationFn:async(input:SessionCompletionInput)=>{if(isSupabaseConfigured&&!navigator.onLine){queueSessionCompletion(input);return{queued:true}}try{await completeSessionAssignment(input);return{queued:false}}catch(error){if(isSupabaseConfigured&&isLikelyNetworkFailure(error)){queueSessionCompletion(input);return{queued:true}}throw error}},onSuccess:()=>client.invalidateQueries({queryKey:sessionKeys.current})})}
export function useStartSession(){return useMutation({mutationFn:(assignment:SessionAssignmentRecord)=>startSessionAssignment(assignment)})}

export function usePendingSessionSync(){
  const client=useQueryClient()
  useEffect(()=>{
    const sync=async()=>{const count=await flushPendingSessionCompletions();if(count>0)await client.invalidateQueries({queryKey:sessionKeys.current})}
    void sync()
    window.addEventListener('online',sync)
    return()=>window.removeEventListener('online',sync)
  },[client])
}
