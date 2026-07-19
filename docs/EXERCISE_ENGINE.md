# Motor de ejercicios

## Tipos y dosis

El mismo modelo admite dos tipos de contenido:

- `visual_stimulus`: fondo y blanco visual configurables;
- `guided_physical`: consigna física, postura, superficie y supervisión explícitas.

Además, cada ejercicio declara una finalidad obligatoria: estabilización de mirada RVO x1, seguimiento ocular suave, sacadas, estimulación optocinética, habituación a movimiento visual o tarea física/funcional. La finalidad gobierna los parámetros compatibles; el nombre del ejercicio por sí solo no determina su comportamiento.

La dosis puede definirse por tiempo o por repeticiones. La plataforma no afirma detectar movimientos: en dosis por repeticiones el paciente informa si completó el objetivo, hizo menos o no pudo completar. El registro conserva objetivo y cantidad informada por cada vuelta.

Los ejercicios nuevos usan avance manual. Al terminar una fase, el descanso puede descontarse solo, pero el ejercicio siguiente no comienza hasta una confirmación. Las asignaciones antiguas sin este campo se normalizan como automáticas para no alterar tratamientos ya entregados.

## Estímulos visuales

El motor usa Canvas 2D y `requestAnimationFrame`. El tiempo de animación se acumula únicamente mientras el ejercicio está activo; al pausar, fondo, objeto y temporizador quedan congelados.

Fondos: color sólido, barras optocinéticas, espiral, damero y campo de puntos.

Objetos: blanco fijo, seguimiento suave sinusoidal y sacadas horizontales, verticales o pseudoaleatorias deterministas.

Fondo y objeto usan parámetros independientes. Los movimientos se calculan como funciones continuas del tiempo o pasos por Hz, de modo que el patrón no termina antes de la fase.

## Reproductor y dispositivos

- pausa, continuación, omisión, salida y pantalla completa;
- preparación inicial una sola vez;
- tiempo activo sin pausas ni descansos;
- metrónomo configurable;
- confirmación táctil, mouse o teclado en pantalla 2D;
- VR Box con dos vistas sincronizadas, exclusivamente para ejercicios por tiempo y con finalización automática;
- Quest en navegador BETA con selección mediante controlador, manos o puntero compatible.

Antes de entrar a VR Box aparece un aviso en pantalla normal. Al confirmar, comienza una transición de 20 segundos para colocar el celular y el visor. Al terminar el bloque VR se reservan otros 20 segundos para retirarlos. No se implementa ningún mecanismo de confirmación dentro del visor.

Cuando una sesión mezcla repeticiones y VR Box, el constructor recomienda realizar primero las repeticiones y dejar los ejercicios temporizados VR al final. Si se conserva otro orden, se inserta una transición por cada cambio de equipamiento.

Quest navegador todavía no equivale a una escena WebXR controlada por la aplicación. Por ese motivo, una sesión Quest debe contener únicamente ejercicios Quest: la versión actual no transfiere una ejecución activa entre el visor y otro dispositivo.

## Compatibilidad espacial obligatoria

| Finalidad | Pantalla 2D inmóvil | VR Box | Quest navegador actual | Acción del paciente |
| --- | --- | --- | --- | --- |
| RVO x1 / estabilización de mirada | Sí | No | No, hasta validar anclaje WebXR | Fijar el blanco y mover la cabeza |
| Seguimiento ocular suave | Sí | Sí | Sí | Mantener cabeza quieta y seguir el blanco con los ojos |
| Sacadas | Sí | Sí | Sí | Mantener cabeza quieta y cambiar la mirada |
| Optocinético | Sí | Sí | Sí | Sentado, cabeza quieta, observar el patrón móvil |
| Habituación visual | Sí | Sí | Sí | Sentado, cabeza quieta, observar el movimiento dosificado |
| Tarea física o funcional | Sí | No | No | Ejecutar fuera del visor con el entorno visible |

En VR Box, un blanco fijo en el celular acompaña la cabeza y no representa un blanco fijo en el ambiente. En Quest, la aplicación actual no inicia una sesión WebXR ni controla o verifica la referencia espacial del blanco; por criterio conservador no habilita RVO x1. Seguimiento y sacadas con cabeza quieta son tareas oculomotoras y no se rotulan como sustitutos de la estabilización de mirada.

## Límites clínicos y técnicos

- Los rangos de velocidad son controles técnicos, no dosis clínicamente validadas.
- El generador visual no mide técnica, postura, velocidad cefálica ni repeticiones reales.
- El sonido puede requerir una primera interacción si el navegador bloquea audio automático.
- VR Box duplica el estímulo 2D; no simula profundidad ni seguimiento de cabeza.
- Quest navegador muestra el lienzo 2D; el código actual no solicita `XRSession`, poses ni espacios de referencia WebXR.
- Las tareas físicas se bloquean en ambos visores, incluso con supervisión, porque el entorno queda oculto y el reproductor no controla la ejecución corporal.
- Se requieren pruebas físicas en celulares, VR Box, tablets, HDMI y Meta Quest antes del piloto.

## Pruebas

Las funciones de seguimiento y sacadas se prueban separadas del Canvas. Las posiciones aleatorias son deterministas. La matriz automática cubre las seis finalidades en Pantalla 2D, VR Box y Quest, además de dosis, avance, preparación, confirmación de fases y trazabilidad de repeticiones. El reproductor vuelve a validar una configuración heredada antes de mostrarla al paciente.
