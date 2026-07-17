import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPortalAccount, getPortalAccount, managePortalAccount, type AccountAction } from './repository'
export const accessKey=(id:string)=>['portal-account',id] as const
export function usePortalAccount(patientId:string){return useQuery({queryKey:accessKey(patientId),queryFn:()=>getPortalAccount(patientId),enabled:Boolean(patientId)})}
export function useCreatePortalAccount(patientId:string){const client=useQueryClient();return useMutation({mutationFn:({username,temporaryCi}:{username:string;temporaryCi:string})=>createPortalAccount(patientId,username,temporaryCi),onSuccess:()=>client.invalidateQueries({queryKey:accessKey(patientId)})})}
export function useManagePortalAccount(patientId:string){const client=useQueryClient();return useMutation({mutationFn:({action,temporaryCi}:{action:AccountAction;temporaryCi?:string})=>managePortalAccount(patientId,action,temporaryCi),onSuccess:()=>client.invalidateQueries({queryKey:accessKey(patientId)})})}
