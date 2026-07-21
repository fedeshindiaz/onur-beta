# Ciclos y sesiones

## Flujo profesional

1. El profesional abre el perfil del paciente e inicia o selecciona un ciclo activo.
2. Crea una sesión presencial o domiciliaria.
3. Ordena ejercicios visuales o físicos guiados.
4. Para cada ejercicio declara su finalidad y define dosis por tiempo o repeticiones, descanso, vueltas, dispositivo, postura, superficie, supervisión y modo de avance.
5. Revisa las reglas de seguridad y asigna la sesión.

El `plan_definition` se guarda como JSON versionado dentro de `session_plans`. La asignación referencia esa versión, por lo que cambios futuros no alteran una sesión ya entregada.

## Flujo del paciente

- Solo ve una asignación disponible y vigente.
- Las fases nuevas fuera de VR Box esperan confirmación manual antes de continuar.
- En dosis por repeticiones, informa “objetivo completo”, una cantidad parcial o “no pude completar”.
- El descanso tiene cuenta regresiva; al llegar a cero muestra “Iniciar siguiente fase”.
- Los ejercicios VR Box son siempre temporizados y avanzan automáticamente.
- Fuera de VR Box puede pausar, omitir o salir. Dentro de VR Box no aparecen controles: la fase termina automáticamente y, ante malestar, la persona debe retirar el visor.
- Antes y después registra escalas descriptivas. Estas no activan recomendaciones automáticas.
- Si termina sin conexión, el resultado queda pendiente en el dispositivo y se sincroniza al volver internet.

Las asignaciones antiguas que no poseen `advanceMode` conservan continuidad automática por compatibilidad.

## Pantalla, VR Box y Quest

- Pantalla 2D: confirmación táctil, mouse o teclado.
- VR Box: presentación binocular 2D sin anclaje espacial, seguimiento de cabeza ni corrección óptica por modelo. No usa botones, mirada, controles externos ni metrónomo. Antes de colocarlo se confirma en la pantalla normal y comienza una preparación automática de 20 segundos con marcador de fusión.
- Quest navegador BETA: controlador, manos o selección compatible del navegador.

RVO x1, RVO x2 y el objetivo recordado solo se habilitan en una pantalla 2D inmóvil. VR Box fija el lienzo a la cabeza y Quest navegador todavía no ofrece a la aplicación un anclaje espacial WebXR verificado. Los visores quedan reservados para seguimiento, sacadas, optocinético, habituación visual o una configuración Libre explícita con cabeza quieta. Estas tareas oculomotoras no se presentan como equivalentes a la adaptación del RVO.

RVO x2 usa un blanco móvil y una consigna de movimiento cefálico en sentido opuesto. El objetivo recordado es una tarea de sustitución por repeticiones y confirmación manual; `RVO x3` se conserva solo como alias docente, no como progresión automática ni como ganancia triple.

El modo Libre puede guardarse como predeterminado aun cuando no satisfaga las reglas clínicas de una finalidad cerrada. La asignación sigue bloqueando combinaciones técnicamente inexequibles y condiciones domiciliarias sin la supervisión necesaria.

Las repeticiones y cualquier tarea 2D se realizan con el celular fuera del visor. Si la sesión mezcla ambos modos, el constructor advierte y ofrece ordenar primero todas las tareas sin visor y luego un único bloque VR. Cada entrada o salida de VR agrega 20 segundos; también se retira el visor antes del autorreporte final.

VR Box queda restringido a seguimiento, sacadas, optocinético, habituación visual o Libre visual; siempre por tiempo, con avance automático, sentado y en superficie firme. Antes de empezar, el paciente debe percibir los dos marcadores como uno solo y nítido. Ver doble, ver borroso o no poder fusionarlos impide iniciar esa modalidad.

No se habilitan tareas físicas dentro de VR Box ni Quest: deben ejecutarse fuera del visor, con el entorno visible. Las superficies inestables requieren ayudante entrenado o supervisión directa; la marcha domiciliaria no se asigna como independiente.

Una sesión Quest no puede mezclarse con Pantalla 2D o VR Box porque la versión actual no implementa continuidad entre dispositivos. Quest sí conserva la confirmación por controlador o puntero para dosis por tiempo o repeticiones dentro de una sesión exclusivamente Quest.

## Seguridad y trazabilidad

El inicio se registra mediante `start_session_assignment` y la finalización mediante `complete_session_assignment_v2`. El paciente no escribe ejecuciones directamente.

El `event_log` conserva por fase: ejercicio, vuelta, tipo, modo de dosis, dispositivo, tiempo activo, objetivo de repeticiones, cantidad informada, transiciones de colocación/retiro de VR Box y resultado completo/parcial/omitido. La finalización agrega los autorreportes y actualiza el estado en una transacción.
