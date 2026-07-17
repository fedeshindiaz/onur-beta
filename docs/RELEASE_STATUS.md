# Estado de release · ONUr 0.1.0-beta.13

Fecha de corte: 17 de julio de 2026.

## Resultado

El repositorio contiene una Beta funcional y verificable para un único profesional. La demostración local funciona sin cuentas externas y el camino a Supabase staging está automatizado. No debe afirmarse que existe un ambiente clínico publicado hasta crear el proyecto Supabase, alojar el frontend y completar las pruebas físicas.

## Cerrado en el código

- acceso profesional y portal paciente con CI temporal y PIN;
- recuperación de contraseña profesional;
- alta segura e idempotente del único profesional mediante variables de servidor;
- publicación privada de GitHub y bootstrap completo de staging mediante comandos reproducibles;
- despliegue HTTPS automatizado en GitHub Pages, con rutas SPA y PWA preparadas para `/onur-beta/`;
- alta, edición, ciclos, sesiones e informes por paciente;
- documentos privados, solicitudes, permisos hasta revocación y auditoría;
- Posturografía, vHIT, cuestionario físico, valores estructurados y calidad de datos;
- sugerencias estadísticas descriptivas sujetas a revisión profesional obligatoria;
- constructor y reproductor de ejercicios con continuidad automática;
- pausa, omitir, salir, reinicio, descansos, vueltas y controles auto-ocultables;
- metrónomo, tiempo activo real, 2D, VR Box y Quest navegador BETA;
- auto-reporte pre/post sin decisiones automáticas;
- sincronización diferida de una finalización sin conexión;
- confirmación de uso versionada;
- RLS, Storage privado, Edge Functions, migraciones, seed y smoke test;
- PWA instalable, tests y compilación de producción.

## Dependencias externas inevitables

1. Crear un proyecto Supabase de staging y obtener sus credenciales.
2. Autorizar las URL del frontend y de recuperación de contraseña.
3. Habilitar el flujo incluido de GitHub Pages y configurar las dos variables públicas.
4. Ejecutar el despliegue y smoke test ya incluidos.
5. Validar físicamente audio, fullscreen, VR Box, HDMI y Meta Quest 3S.
6. Revisar textos de privacidad, confirmación de uso, retención e incidentes con asesoría aplicable.
7. Cargar únicamente datos ficticios hasta completar lo anterior.

## Alcance honesto

El modo Quest actual abre el estímulo en el navegador del visor. No implementa una escena WebXR inmersiva ni seguimiento de cabeza. VR Box ofrece dos vistas sincronizadas del estímulo 2D y requiere calibración física del teléfono y prueba de tolerancia bajo criterio profesional.

ONUr organiza ejercicios e información. No diagnostica, no prescribe y no reemplaza la valoración de un profesional habilitado.
