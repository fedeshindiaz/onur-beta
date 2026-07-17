# Ciclos y sesiones

## Flujo profesional

1. El profesional abre el perfil del paciente.
2. Inicia un ciclo con fecha, contexto y objetivos privados.
3. Crea una sesión presencial o domiciliaria dentro del ciclo.
4. Ordena uno o más ejercicios; cada ejercicio conserva su fondo, objeto, tiempo, descanso y vueltas.
5. Define la vigencia y asigna la sesión.

El `plan_definition` se guarda como JSON versionado dentro de `session_plans`. La asignación referencia esa versión, por lo que los cambios futuros no alteran una sesión ya entregada.

## Flujo del paciente

- Solo ve una asignación disponible y vigente.
- La continuación entre vueltas, descansos y ejercicios es automática.
- Puede pausar, omitir o salir.
- Si sale, la siguiente reproducción comienza desde el principio.
- Si omite ejercicios, el resultado queda como parcial; si termina todo, queda completado.
- Antes de comenzar registra malestar percibido de 0 a 10.
- Al finalizar registra malestar de 0 a 10, dificultad de 1 a 5 y un comentario opcional.
- Las escalas son descriptivas y no activan decisiones ni recomendaciones automáticas.
- Si termina sin conexión, el resultado queda pendiente en el dispositivo y se sincroniza al volver internet.

## Seguridad y trazabilidad

El inicio se registra mediante `start_session_assignment` y la finalización mediante `complete_session_assignment_v2`. Ambas funciones validan identidad, cuenta activa, asignación y rangos. El paciente no tiene permisos directos de inserción o actualización sobre ejecuciones. La finalización crea la ejecución con los auto-reportes, actualiza el estado y agrega el evento de auditoría en una sola transacción.
