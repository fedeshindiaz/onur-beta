# Despliegue de staging

Este procedimiento usa un proyecto Supabase exclusivo para pruebas. No debe apuntar al proyecto de producción ni contener datos clínicos reales.

## 1. Crear el proyecto

Crear un proyecto nuevo en Supabase y conservar:

- referencia del proyecto;
- contraseña de base de datos;
- access token personal para la CLI;
- URL del proyecto;
- clave pública `anon`;
- clave `service_role`, únicamente para el smoke test y secretos del entorno.

Generar una clave estable para derivar las credenciales internas de pacientes:

```bash
openssl rand -hex 32
```

No regenerar `PATIENT_AUTH_PEPPER` después de crear cuentas: cambiarlo invalidaría cédulas temporales y PIN existentes.

## 2. Configurar variables locales

Crear `.env.staging.local`, que está ignorado por Git:

```dotenv
SUPABASE_PROJECT_REF=...
SUPABASE_ACCESS_TOKEN=...
SUPABASE_DB_PASSWORD=...
SUPABASE_URL=https://....supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PATIENT_AUTH_PEPPER=...
ALLOWED_ORIGIN=https://dominio-del-frontend-staging.example
PROFESSIONAL_EMAIL=correo-del-profesional
PROFESSIONAL_PASSWORD=contraseña-segura-del-profesional
PROFESSIONAL_DISPLAY_NAME=nombre-del-profesional
```

Cargarlo solo en la terminal actual:

```bash
set -a
source .env.staging.local
set +a
```

Nunca usar prefijo `VITE_` para access token, contraseña, `service_role` o pepper. `ALLOWED_ORIGIN` puede omitirse durante el smoke test sin navegador; antes de probar el frontend debe contener su origen exacto.

Para el alojamiento incluido en este repositorio:

```dotenv
ALLOWED_ORIGIN=https://fedeshindiaz.github.io
```

En Supabase Auth autorizar la URL completa de recuperación:

```text
https://fedeshindiaz.github.io/onur-beta/restablecer-clave
```

## 3. Revisar y desplegar

```bash
npm run staging:dry-run
npm run staging:deploy
npm run admin:create
```

El despliegue vincula el repositorio, aplica migraciones y seed, configura el pepper y despliega las Edge Functions mediante la API, sin requerir Docker. El segundo comando crea o actualiza únicamente la cuenta profesional declarada en la terminal.

## 4. Ejecutar pruebas reales

```bash
npm run staging:smoke
```

El smoke test crea únicamente identidades y registros ficticios, y valida:

- autenticación profesional;
- primer acceso con cédula temporal y cambio a PIN;
- aislamiento RLS entre pacientes;
- Storage privado;
- solicitud, aprobación, descarga y revocación documental;
- finalización SHA-256 e inmutabilidad de estudios;
- confirmación de uso, bloqueo de escritura directa y auto-reporte de sesión;
- revocación de una sesión paciente ya abierta;
- auditoría de eventos críticos.

Al terminar, incluso si falla, intenta eliminar archivo, pacientes, auditorías e identidades temporales mediante la cuenta de servicio.

## 5. Configurar el frontend

Solo estas dos variables son públicas y pueden llegar a Vite:

```dotenv
VITE_SUPABASE_URL=https://....supabase.co
VITE_SUPABASE_ANON_KEY=...
```

Agregar ambas como secretos del repositorio de GitHub. El flujo `.github/workflows/pages.yml` compila y publica automáticamente el frontend. Si se usa otro alojamiento, configurar `VITE_BASE_PATH=/` o la subruta correspondiente y conservar un fallback de rutas hacia `index.html`.

Antes del piloto debe completarse también `docs/STAGING_CHECKLIST.md` desde dispositivos y navegadores reales.
