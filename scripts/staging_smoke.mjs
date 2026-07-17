import { createClient } from '@supabase/supabase-js'

const required=['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY']
for(const key of required)if(!process.env[key])throw new Error(`Falta ${key}`)

const url=process.env.SUPABASE_URL
const anonKey=process.env.SUPABASE_ANON_KEY
const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
const token=`${Date.now()}-${crypto.randomUUID().slice(0,8)}`
const professionalEmail=`onur-staging-prof-${token}@example.invalid`
const professionalPassword=`Onur!${crypto.randomUUID()}aA1`
const username=`staging${token.replace(/\D/g,'').slice(-10)}${crypto.randomUUID().replace(/-/g,'').slice(0,6)}`.slice(0,38)
const temporaryCi='45678901'
const pin='2468'
const created={professionalUserId:'',patientUserId:'',patientId:'',otherPatientId:'',storagePath:''}

function assert(condition,message){if(!condition)throw new Error(message)}
function assertNoError(result,label){if(result.error)throw new Error(`${label}: ${result.error.message}`);return result.data}
function client(){return createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}})}
function log(message){process.stdout.write(`✓ ${message}\n`)}

async function patientLogin(secret){
  const response=await fetch(`${url}/functions/v1/patient-login`,{method:'POST',headers:{apikey:anonKey,'Content-Type':'application/json'},body:JSON.stringify({username,secret})})
  const body=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(`patient-login (${response.status}): ${body.error??'error desconocido'}`)
  return body
}

async function cleanup(){
  const failures=[]
  async function attempt(label,operation){
    try{
      const result=await operation()
      if(result?.error)failures.push(`${label}: ${result.error.message}`)
    }catch(error){failures.push(`${label}: ${error instanceof Error?error.message:String(error)}`)}
  }

  if(created.storagePath)await attempt('archivo de Storage',()=>admin.storage.from('clinical-documents').remove([created.storagePath]))
  if(created.patientId)await attempt('paciente principal',()=>admin.from('patients').delete().eq('id',created.patientId))
  if(created.otherPatientId)await attempt('paciente aislado',()=>admin.from('patients').delete().eq('id',created.otherPatientId))
  if(created.professionalUserId){
    await attempt('planes de sesión',()=>admin.from('session_plans').delete().eq('professional_id',created.professionalUserId))
    await attempt('plantillas de ejercicio',()=>admin.from('exercise_templates').delete().eq('professional_id',created.professionalUserId))
  }
  const actorIds=[created.patientUserId,created.professionalUserId].filter(Boolean)
  if(actorIds.length)await attempt('auditorías',()=>admin.from('audit_events').delete().in('actor_user_id',actorIds))
  if(created.patientUserId)await attempt('identidad paciente',()=>admin.auth.admin.deleteUser(created.patientUserId))
  if(created.professionalUserId)await attempt('identidad profesional',()=>admin.auth.admin.deleteUser(created.professionalUserId))
  if(failures.length)throw new Error(`La limpieza de staging falló:\n- ${failures.join('\n- ')}`)
}

try{
  const createdProfessional=assertNoError(await admin.auth.admin.createUser({email:professionalEmail,password:professionalPassword,email_confirm:true,app_metadata:{role:'professional'},user_metadata:{display_name:'ONUr Staging Test'}}),'crear profesional')
  created.professionalUserId=createdProfessional.user.id
  const professional=client();assertNoError(await professional.auth.signInWithPassword({email:professionalEmail,password:professionalPassword}),'login profesional')
  log('autenticación profesional y trigger de perfil')

  const patient=assertNoError(await professional.from('patients').insert({professional_id:created.professionalUserId,full_name:'Paciente Ficticio Staging',birth_date:'1960-01-01',insurer:'Prueba ONUr',status:'active'}).select().single(),'crear paciente')
  created.patientId=patient.id
  const other=assertNoError(await professional.from('patients').insert({professional_id:created.professionalUserId,full_name:'Paciente Aislado Staging',status:'active'}).select().single(),'crear segundo paciente')
  created.otherPatientId=other.id

  const accountResult=await professional.functions.invoke('create-patient-account',{body:{patient_id:created.patientId,username,temporary_ci:temporaryCi}})
  assertNoError(accountResult,'crear cuenta paciente')
  const account=assertNoError(await admin.from('patient_portal_accounts').select('auth_user_id').eq('patient_id',created.patientId).single(),'leer cuenta paciente')
  created.patientUserId=account.auth_user_id

  const firstLogin=await patientLogin(temporaryCi);assert(firstLogin.must_change_pin===true,'El primer acceso no exige cambio de PIN.')
  const patientClient=client();assertNoError(await patientClient.auth.setSession({access_token:firstLogin.session.access_token,refresh_token:firstLogin.session.refresh_token}),'establecer sesión paciente')
  const ownRows=assertNoError(await patientClient.from('patients').select('id'),'RLS pacientes')
  assert(ownRows.length===1&&ownRows[0].id===created.patientId,'El paciente pudo ver un perfil ajeno.')
  log('aislamiento RLS entre pacientes')

  const pinChange=await patientClient.functions.invoke('change-patient-pin',{body:{pin}});assertNoError(pinChange,'cambiar PIN')
  const secondLogin=await patientLogin(pin);assert(secondLogin.must_change_pin===false,'El cambio de PIN no quedó confirmado.')
  log('primer acceso con cédula temporal y PIN de cuatro dígitos')

  created.storagePath=`${created.professionalUserId}/${created.patientId}/${crypto.randomUUID()}-staging.pdf`
  const fileBytes=new TextEncoder().encode('%PDF-1.4\n% ONUr staging ficticio\n')
  assertNoError(await professional.storage.from('clinical-documents').upload(created.storagePath,fileBytes,{contentType:'application/pdf'}),'subir archivo privado')
  const document=assertNoError(await professional.from('source_documents').insert({patient_id:created.patientId,document_type:'posturography',original_filename:'posturografia-staging.pdf',storage_path:created.storagePath,mime_type:'application/pdf',sha256:'0'.repeat(64),uploaded_by:created.professionalUserId,document_date:'2026-07-16',description:'Dato ficticio de smoke test',file_size_bytes:fileBytes.byteLength}).select().single(),'crear documento')

  const lockedDirect=assertNoError(await patientClient.from('source_documents').select('id'),'documento privado')
  assert(lockedDirect.length===0,'El paciente leyó un documento sin permiso.')
  const catalog=assertNoError(await patientClient.rpc('list_my_document_catalog'),'catálogo seguro')
  assert(catalog.length===1&&!Object.hasOwn(catalog[0],'storage_path'),'El catálogo expuso storage_path o no enumeró el documento.')
  assertNoError(await patientClient.rpc('request_document_access',{target_document_id:document.id}),'solicitar acceso')
  const request=assertNoError(await professional.from('document_access_requests').select('id,status').eq('document_id',document.id).single(),'leer solicitud')
  assertNoError(await professional.rpc('resolve_document_access_request',{target_request_id:request.id,decision:'approved',granted_level:'view',professional_note:'Smoke test'}),'aprobar solo vista')
  const permitted=assertNoError(await patientClient.from('source_documents').select('id,storage_path'),'documento autorizado')
  assert(permitted.length===1,'El permiso de visualización no habilitó el documento.')
  const downloadAudit=await patientClient.rpc('record_document_access_event',{target_document_id:document.id,access_action:'download'})
  assert(downloadAudit.error,'El nivel view autorizó incorrectamente una descarga auditada.')
  assertNoError(await patientClient.rpc('record_document_access_event',{target_document_id:document.id,access_action:'view'}),'auditar vista')
  assertNoError(await professional.from('document_permissions').update({level:'view_download'}).eq('document_id',document.id),'ampliar permiso')
  assertNoError(await patientClient.rpc('record_document_access_event',{target_document_id:document.id,access_action:'download'}),'auditar descarga')
  assertNoError(await professional.from('document_permissions').update({revoked_at:new Date().toISOString()}).eq('document_id',document.id),'revocar permiso')
  const revoked=assertNoError(await patientClient.from('source_documents').select('id'),'validar revocación')
  assert(revoked.length===0,'La revocación no invalidó el acceso al documento.')
  log('Storage privado, solicitud, vista, descarga y revocación')

  const study=assertNoError(await professional.from('clinical_studies').insert({patient_id:created.patientId,source_document_id:document.id,study_type:'posturography',performed_at:'2026-07-16T12:00:00Z',device_name:'Equipo ficticio',protocol_code:'bap-a-d',protocol_version:'1',created_by:created.professionalUserId}).select().single(),'crear estudio')
  const metricPayload=[{metric_code:'condition_score',raw_value:'75,0',normalized_numeric_value:75,normalized_text_value:null,unit_code:'percent',condition_code:'A',side:null,axis:null,trial_number:1,source_method:'transcribed',source_location:'Smoke test',normalization_rule_version:'onur-normalization-1.0',quality_status:'ok',issues:[]}]
  assertNoError(await professional.rpc('replace_study_import',{target_study_id:study.id,metric_payload:metricPayload,import_quality_notes:'Revisión ficticia de staging',import_interpretable:true,parser_version:'onur-normalization-1.0'}),'confirmar importación')
  const hash=assertNoError(await professional.rpc('finalize_clinical_study',{target_study_id:study.id}),'finalizar estudio')
  assert(/^[0-9a-f]{64}$/.test(hash),'La huella final no es SHA-256 válida.')
  const metric=assertNoError(await professional.from('metric_values').select('id').eq('study_id',study.id).single(),'leer métrica final')
  const forbiddenMutation=await professional.from('metric_values').update({raw_value:'99'}).eq('id',metric.id)
  assert(forbiddenMutation.error,'Fue posible modificar una métrica finalizada.')
  log('finalización, SHA-256 e inmutabilidad de estudios')

  assertNoError(await patientClient.rpc('accept_patient_acknowledgement',{document_code_input:'PORTAL_USE',document_version_input:'1.0-beta'}),'confirmar uso del portal')
  const cycle=assertNoError(await professional.from('treatment_cycles').insert({patient_id:created.patientId,label:'Ciclo smoke',started_on:new Date().toISOString().slice(0,10),status:'active'}).select().single(),'crear ciclo de sesión')
  const plan=assertNoError(await professional.from('session_plans').insert({professional_id:created.professionalUserId,title:'Sesión smoke',instructions:'Datos ficticios',plan_definition:{mode:'home',exercises:[]}}).select().single(),'crear plan de sesión')
  const assignment=assertNoError(await professional.from('session_assignments').insert({patient_id:created.patientId,treatment_cycle_id:cycle.id,session_plan_id:plan.id,available_from:new Date(Date.now()-60000).toISOString(),status:'assigned',assigned_by:created.professionalUserId}).select().single(),'asignar sesión')
  const directExecution=await patientClient.from('session_executions').insert({assignment_id:assignment.id,patient_id:created.patientId,status:'completed',finished_at:new Date().toISOString(),active_seconds:1})
  assert(directExecution.error,'El paciente pudo insertar una ejecución sin la función validada.')
  const legacyCompletion=await patientClient.rpc('complete_session_assignment',{target_assignment_id:assignment.id,active_seconds_input:1,skipped_count_input:0,event_log_input:[]})
  assert(legacyCompletion.error,'La función de finalización anterior continúa autorizada.')
  assertNoError(await patientClient.rpc('start_session_assignment',{target_assignment_id:assignment.id}),'iniciar sesión')
  assertNoError(await patientClient.rpc('complete_session_assignment_v2',{target_assignment_id:assignment.id,active_seconds_input:42,skipped_count_input:0,initial_discomfort_input:2,final_discomfort_input:3,perceived_difficulty_input:2,patient_comment_input:'Dato ficticio',event_log_input:[{type:'finished'}]}),'finalizar sesión con auto-reporte')
  const execution=assertNoError(await professional.from('session_executions').select('active_seconds,initial_discomfort,final_discomfort,perceived_difficulty,patient_comment').eq('assignment_id',assignment.id).single(),'leer auto-reporte')
  assert(execution.active_seconds===42&&execution.initial_discomfort===2&&execution.final_discomfort===3&&execution.perceived_difficulty===2,'El auto-reporte no quedó guardado correctamente.')
  log('confirmación de uso, inicio y cierre transaccional de sesión')

  const disable=await professional.functions.invoke('manage-patient-account',{body:{patient_id:created.patientId,action:'disable'}});assertNoError(disable,'desactivar cuenta')
  const afterDisable=assertNoError(await patientClient.from('patients').select('id'),'sesión revocada')
  assert(afterDisable.length===0,'Una sesión abierta conservó acceso tras desactivar la cuenta.')
  log('revocación inmediata sobre sesión paciente abierta')

  const auditRows=assertNoError(await admin.from('audit_events').select('action').in('actor_user_id',[created.professionalUserId,created.patientUserId]),'leer auditoría')
  const audited=auditRows.map(row=>row.action)
  for(const action of ['patient_account_created','patient_pin_changed','document_access_requested','document_access_approved','document_viewed','document_downloaded','clinical_study_finalized','patient_acknowledgement_accepted','session_started','session_finished','patient_account_disable'])assert(audited.includes(action),`Falta auditoría ${action}.`)
  log('eventos críticos de auditoría')
  process.stdout.write('\nSmoke test de staging completado correctamente.\n')
}finally{await cleanup()}
