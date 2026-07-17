import { beforeEach, describe, expect, it } from 'vitest'
import { createPortalAccount, getPortalAccount, managePortalAccount } from './repository'

describe('gestión demo del portal',()=>{
  beforeEach(()=>localStorage.clear())
  it('crea, revoca y restablece una cuenta sin almacenar la cédula',async()=>{await createPortalAccount('patient-new','pacientenuevo','12345678');expect((await getPortalAccount('patient-new'))?.mustChangePin).toBe(true);await managePortalAccount('patient-new','disable');expect((await getPortalAccount('patient-new'))?.enabled).toBe(false);await managePortalAccount('patient-new','reset_temporary_secret','12345678');expect((await getPortalAccount('patient-new'))?.enabled).toBe(true);expect(localStorage.getItem('onur-demo-portal-accounts-v1')).not.toContain('12345678')})
})
