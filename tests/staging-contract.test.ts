import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read=(path:string)=>readFileSync(join(process.cwd(),path),'utf8')
const deploy=read('scripts/deploy_staging.sh')
const smoke=read('scripts/staging_smoke.mjs')
const config=read('supabase/config.toml')
const envExample=read('.env.example')

describe('contrato de despliegue de staging',()=>{
  it('permite revisar migraciones antes de aplicar y despliega funciones sin Docker',()=>{
    expect(deploy).toContain('db push --linked')
    expect(deploy).toContain('--include-seed --dry-run')
    expect(deploy).toContain('functions deploy')
    expect(deploy).toContain('--use-api')
  })

  it('deja público solo el endpoint que implementa su propia autenticación',()=>{
    expect(config).toContain('[functions.patient-login]')
    expect(config).toContain('verify_jwt = false')
    expect(config).not.toContain('[functions.create-patient-account]')
  })

  it('prueba controles críticos con datos ficticios y limpieza garantizada',()=>{
    expect(smoke).toContain("full_name:'Paciente Ficticio Staging'")
    expect(smoke).toContain("rpc('list_my_document_catalog')")
    expect(smoke).toContain("rpc('finalize_clinical_study'")
    expect(smoke).toContain('finally{await cleanup()}')
  })

  it('no convierte secretos de servidor en variables públicas de Vite',()=>{
    expect(envExample).not.toContain('VITE_SUPABASE_SERVICE_ROLE_KEY')
    expect(envExample).not.toContain('VITE_PATIENT_AUTH_PEPPER')
    expect(envExample).toContain('SUPABASE_SERVICE_ROLE_KEY=')
  })
})
