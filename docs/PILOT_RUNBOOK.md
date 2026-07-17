# Puesta en marcha de la Beta

## 0. Publicar el repositorio privado

Con GitHub CLI instalado y autenticado, un único comando crea `fedeshindiaz/onur-beta` como repositorio privado, conecta `origin` y publica `main`:

```bash
gh auth login
npm run github:publish
```

## 1. Verificación local

```bash
npm ci
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Abrir la demo y recorrer profesional, paciente, sesión completa, omisión, documento, cuestionario e informe. Usar solo los datos ficticios incluidos.

## 2. Backend de staging

Crear un proyecto Supabase separado y seguir `STAGING_DEPLOYMENT.md`. Mantener deshabilitado el registro público, configurar `PATIENT_AUTH_PEPPER` y limitar `ALLOWED_ORIGIN` al dominio HTTPS exacto.

En Auth agregar como URL permitida:

```text
https://fedeshindiaz.github.io/onur-beta/restablecer-clave
```

Aplicar migraciones y funciones:

```bash
npm run staging:deploy
npm run staging:smoke
```

Cuando todas las variables de `STAGING_DEPLOYMENT.md` estén cargadas, el flujo completo puede ejecutarse en una sola operación:

```bash
npm run staging:bootstrap
```

No avanzar si el smoke test falla.

## 3. Frontend

El flujo de GitHub Pages publica automáticamente cada cambio de `main` en:

```text
https://fedeshindiaz.github.io/onur-beta/
```

Sin secretos, esa URL funciona únicamente como demostración con datos ficticios. Para conectarla al staging, configurar estos dos secretos del repositorio:

```dotenv
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

GitHub Pages compila con `/onur-beta/` como ruta base y genera `404.html` para recuperar las rutas de la SPA. En Supabase, `ALLOWED_ORIGIN` debe ser exactamente `https://fedeshindiaz.github.io` (sin ruta final).

## 4. Cuenta profesional

Crear o actualizar la única identidad profesional con el comando incluido. La contraseña se lee desde la terminal y nunca se escribe en el repositorio:

```bash
export SUPABASE_URL="https://PROYECTO.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="..."
export PROFESSIONAL_EMAIL="correo-del-profesional"
export PROFESSIONAL_DISPLAY_NAME="nombre-del-profesional"
read -s PROFESSIONAL_PASSWORD
export PROFESSIONAL_PASSWORD
npm run admin:create
unset PROFESSIONAL_PASSWORD SUPABASE_SERVICE_ROLE_KEY
```

El comando crea la identidad confirmada con `app_metadata.role = professional`, actualiza su perfil y se detiene si encuentra otro profesional. Probar ingreso, cierre de sesión y recuperación de contraseña antes de crear pacientes.

## 5. Matriz física mínima

Probar y documentar:

- computadora + HDMI;
- celular Android y iPhone en 2D;
- el teléfono concreto dentro de VR Box, en horizontal;
- navegador del Meta Quest 3S;
- audio permitido y bloqueado;
- toque para mostrar controles, pausa, omitir y salir;
- pérdida y recuperación de red justo al finalizar.

En VR Box comprobar tamaño, centrado y separación visual antes de colocar el teléfono. No describir Quest navegador como WebXR.

## 6. Criterio de entrada a piloto

- checklist de staging completo;
- segunda revisión profesional de textos y flujos;
- aviso de privacidad y retención revisados;
- respaldo y restauración probados;
- responsable de soporte e incidentes identificado;
- primer paciente de prueba ficticio completado de punta a punta.

Si falta cualquiera de estos puntos, mantener la Beta en demostración sin datos clínicos reales.
