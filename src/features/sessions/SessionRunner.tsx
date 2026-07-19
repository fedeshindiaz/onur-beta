import { Clock3, SkipForward } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ExercisePlayer } from '../exercise/ExercisePlayer'
import type { ExerciseConfig } from '../exercise/types'
import type { SessionAssignmentRecord } from './repository'

type Unit={type:'exercise';config:ExerciseConfig;label:string}|{type:'rest';seconds:number;label:string}

function buildUnits(exercises:ExerciseConfig[]):Unit[]{
  const phases:{config:ExerciseConfig;label:string}[]=[]
  exercises.forEach((exercise,exerciseIndex)=>{for(let round=1;round<=exercise.rounds;round++)phases.push({config:exercise,label:`Ejercicio ${exerciseIndex+1} · Vuelta ${round}/${exercise.rounds}`})})
  const units:Unit[]=[];phases.forEach((phase,index)=>{units.push({type:'exercise',...phase});if(index<phases.length-1&&phase.config.restSeconds>0)units.push({type:'rest',seconds:phase.config.restSeconds,label:'Descanso antes de continuar'})});return units
}

function RestUnit({seconds,label,onComplete,onExit}:{seconds:number;label:string;onComplete:()=>void;onExit:()=>void}){
  const[remaining,setRemaining]=useState(seconds)
  useEffect(()=>{if(remaining<=0){onComplete();return}const timer=window.setTimeout(()=>setRemaining(value=>value-1),1000);return()=>window.clearTimeout(timer)},[remaining,onComplete])
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-[#171717] p-6 text-white"><div className="w-full max-w-md text-center"><Clock3 className="mx-auto text-[#E49A02]" size={38}/><p className="mt-6 text-xs font-black uppercase tracking-[.18em] text-[#E49A02]">{label}</p><p className="mt-5 text-7xl font-black tabular-nums">{remaining}</p><p className="mt-3 text-sm text-white/60">La sesión continuará automáticamente.</p><button type="button" onClick={onComplete} className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/12 px-5 py-3 text-xs font-black"><SkipForward size={16}/> Omitir descanso</button><button type="button" onClick={onExit} className="mt-3 block w-full text-xs font-bold text-white/55">Salir de la sesión</button></div></div>
}

export function SessionRunner({session,onFinish,onExit}:{session:SessionAssignmentRecord;onFinish:(activeSeconds:number,skippedExercises:number)=>void;onExit:()=>void}){
  const units=useMemo(()=>buildUnits(session.exercises),[session.exercises]);const[index,setIndex]=useState(0);const skippedRef=useRef(0);const activeSecondsRef=useRef(0);const finishingRef=useRef(false);const unit=units[index]
  const advance=(activeSeconds=0,skipped=false)=>{activeSecondsRef.current+=Math.max(0,activeSeconds);if(skipped)skippedRef.current+=1;if(index>=units.length-1){if(!finishingRef.current){finishingRef.current=true;onFinish(activeSecondsRef.current,skippedRef.current)}return}setIndex(value=>value+1)}
  useEffect(()=>{if(units.length===0&&!finishingRef.current){finishingRef.current=true;onFinish(0,0)}},[onFinish,units.length])
  if(!unit)return null
  if(unit.type==='rest')return <RestUnit seconds={unit.seconds} label={unit.label} onComplete={()=>advance()} onExit={onExit}/>
  const progress=units.slice(0,index+1).filter(item=>item.type==='exercise').length
  return <><div className="fixed left-4 top-20 z-[110] rounded-full bg-black/55 px-3 py-2 text-[10px] font-black text-white backdrop-blur">{unit.label} · {progress}/{session.exercises.reduce((n,e)=>n+e.rounds,0)}</div><ExercisePlayer key={index} config={{...unit.config,rounds:1}} preparationSeconds={index===0 ? unit.config.preparationSeconds : 0} onComplete={(seconds)=>advance(seconds)} onSkip={(seconds)=>advance(seconds,true)} onExit={onExit}/></>
}
