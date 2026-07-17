/* oxlint-disable react/only-export-components -- el hook y el proveedor comparten el mismo contexto */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'

export type AppRole = 'professional' | 'patient'
interface AuthState { ready:boolean; role:AppRole|null; user:User|null; displayName:string; enterDemo:(role:AppRole)=>void; signOut:()=>Promise<void> }
const AuthContext=createContext<AuthState|null>(null)

export function AuthProvider({children}:{children:ReactNode}) {
  const [ready,setReady]=useState(!isSupabaseConfigured); const [role,setRole]=useState<AppRole|null>(()=>localStorage.getItem('onur-demo-role') as AppRole|null); const [user,setUser]=useState<User|null>(null);const[displayName,setDisplayName]=useState(()=>localStorage.getItem('onur-demo-role')==='professional'?'Federico Díaz':'')
  useEffect(()=>{const client=supabase;if(!client)return;const apply=async(next:User|null)=>{setUser(next);if(!next){setRole(null);setDisplayName('');setReady(true);return}const {data}=await client.from('profiles').select('role, display_name').eq('id',next.id).maybeSingle();setRole(data?.role as AppRole|null);setDisplayName(String(data?.display_name??'Profesional'));setReady(true)};client.auth.getSession().then(({data})=>apply(data.session?.user??null));const {data:listener}=client.auth.onAuthStateChange((_event,session)=>{void apply(session?.user??null)});return()=>listener.subscription.unsubscribe()},[])
  const value=useMemo<AuthState>(()=>({ready,role,user,displayName,enterDemo:(next)=>{localStorage.setItem('onur-demo-role',next);setRole(next);setDisplayName(next==='professional'?'Federico Díaz':'Paciente demo')},signOut:async()=>{localStorage.removeItem('onur-demo-role');if(supabase)await supabase.auth.signOut();setRole(null);setUser(null);setDisplayName('')}}),[displayName,ready,role,user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error('AuthProvider no disponible.');return value}
