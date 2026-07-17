# Seguridad y privacidad

## Clasificación

ONUr manejará datos de salud e identidad. Antes del uso real requiere revisión de seguridad, privacidad y cumplimiento jurídico aplicable en Uruguay.

## CI temporal y PIN

El requisito de producto mantiene la experiencia acordada sin almacenar la cédula:

1. El profesional crea el usuario e introduce la CI como secreto temporal.
2. La Edge Function normaliza el usuario y genera un secreto HMAC con un `pepper` exclusivo del servidor.
3. Supabase Auth recibe el secreto derivado, no la CI.
4. La CI se descarta al finalizar la solicitud.
5. En el primer acceso el paciente crea un PIN de cuatro dígitos.
6. Otra Edge Function deriva el nuevo secreto y reemplaza la credencial temporal.

El PIN de cuatro dígitos tiene un espacio reducido. Por eso se aplican obligatoriamente:

- cinco intentos como máximo;
- bloqueo de 15 minutos;
- errores genéricos;
- transporte HTTPS;
- `pepper` del servidor;
- registro de auditoría;
- desactivación manual por el profesional;
- verificación de cuenta habilitada en cada política de acceso del paciente;
- revisión futura de CAPTCHA o vínculo por dispositivo.

## Prohibiciones

- No registrar cuerpos de solicitudes de acceso.
- No guardar CI, PIN ni secreto derivado en tablas públicas.
- No exponer `auth_login_email` al paciente.
- No usar la clave `service_role` en React.
- No alojar documentos clínicos en buckets públicos.
- No actualizar ni eliminar originales directamente desde el cliente; la limpieza de una carga fallida pasa por una función auditada.
- No incluir sugerencias sin revisar en respuestas del portal del paciente.
- No usar el auto-reporte de una sesión para tomar decisiones clínicas automáticas.

## Acceso por rol

El profesional accede solo a pacientes cuyo `professional_id` coincide con su usuario. El paciente accede solo a:

- su perfil básico;
- sus ciclos;
- planes que le fueron asignados;
- sus ejecuciones;
- documentos con permiso activo.

Valores métricos crudos, problemas de calidad y sugerencias permanecen restringidos al profesional.
Las notas profesionales privadas se guardan en una tabla separada y no comparten política de lectura con el perfil visible para el paciente.

La importación estructurada se confirma mediante una función transaccional que vuelve a validar rol, propiedad del paciente y estado del estudio. Los valores bloqueados o en cuarentena no participan en sugerencias. Cada confirmación y cada decisión profesional sobre una sugerencia deja un evento de auditoría sin copiar el contenido clínico completo al evento.

## Documentos

La ruta de Storage comienza con el UUID del profesional y el bucket es privado. Un permiso de paciente puede ser `view` o `view_download` y permanece activo hasta que `revoked_at` tenga una fecha.

El navegador calcula SHA-256 del original y registra tamaño, MIME y fecha clínica. La limpieza de cargas incompletas usa `cleanup-clinical-upload`, que vuelve a validar profesional, paciente y ruta antes de eliminar.

Los documentos bloqueados se enumeran mediante `list_my_document_catalog`, una función que devuelve únicamente metadatos seguros y nunca `storage_path`. `request_document_access` valida que la cuenta paciente siga habilitada y que el documento le pertenezca. La resolución profesional se ejecuta de forma transaccional y una aprobación crea o reactiva el permiso elegido.

Antes de generar una vista o descarga se registra el evento mediante una función que vuelve a validar propiedad y permiso. El nivel `view_download` controla el botón y la disposición del enlace. No se afirma que `view` impida técnicamente toda copia, porque cualquier visor web necesita recibir el contenido.

## Estudios finalizados

Un estudio solo puede finalizarse desde estado `reviewed`, con métricas y una importación confirmada. El cierre guarda profesional, fecha y SHA-256 de un snapshot canónico. Triggers de base de datos bloquean cambios y eliminaciones posteriores en el estudio, métricas, incidencias e importación. Un bloqueo transaccional por estudio evita que una escritura concurrente quede fuera de la huella.

La revisión de sugerencias estadísticas no modifica el snapshot del estudio: es una capa profesional posterior y auditable.

## Acceso y confirmación del portal

El paciente debe aceptar una confirmación de uso versionada antes de abrir sesiones o documentos. Se registra código, versión, fecha y cuenta autenticada; el evento no sustituye un consentimiento clínico o aviso de privacidad revisado jurídicamente.

La recuperación de contraseña se ofrece solo para profesionales. El enlace regresa a una ruta específica y la aplicación vuelve a comprobar el rol antes de actualizar la clave. El formulario responde de forma genérica para no confirmar si un correo existe. En Supabase se debe autorizar explícitamente la URL de retorno del ambiente.

El paciente no puede insertar o actualizar `session_executions` directamente. Las funciones de inicio y cierre verifican cuenta activa, vigencia, estado y rangos; el comentario se limita a 500 caracteres y el registro técnico tiene límite de tamaño.

Si falla la red al finalizar, el navegador conserva temporalmente solo el identificador de asignación y los datos mínimos del cierre, no el plan ni documentos. La cola se elimina después de sincronizar. Al ser almacenamiento local del dispositivo, el piloto debe usar dispositivos con bloqueo de pantalla y evitar equipos compartidos.

La eliminación controlada por retención, privacidad o limpieza de staging queda reservada a `service_role`. Esa clave nunca se entrega al frontend y el smoke test la usa solo para crear y eliminar datos ficticios temporales.

## Pendiente antes de producción

- evaluación de amenazas;
- respaldo y restauración probados;
- política de retención;
- contratos y avisos de privacidad;
- respuesta a incidentes;
- verificación de logs sin datos sensibles;
- pruebas de RLS y Edge Functions en CI;
- revisión profesional y jurídica de todos los textos clínicos.
