# Motor de ejercicios

## Tipos y dosis

El mismo modelo admite dos tipos de contenido:

- `visual_stimulus`: fondo y blanco visual configurables;
- `guided_physical`: consigna física, postura, superficie y supervisión explícitas.

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

Cuando una sesión mezcla repeticiones y VR Box, el constructor recomienda realizar primero las repeticiones y dejar los ejercicios temporizados VR al final. Si se conserva otro orden, se inserta una transición por cada cambio de equipamiento. Por seguridad, las tareas físicas domiciliarias con VR Box solo se permiten sentado. Quest navegador todavía no equivale a WebXR inmersivo.

## Límites clínicos y técnicos

- Los rangos de velocidad son controles técnicos, no dosis clínicamente validadas.
- El generador visual no mide técnica, postura, velocidad cefálica ni repeticiones reales.
- El sonido puede requerir una primera interacción si el navegador bloquea audio automático.
- VR Box duplica el estímulo 2D; no simula profundidad ni seguimiento de cabeza.
- Se requieren pruebas físicas en celulares, VR Box, tablets, HDMI y Meta Quest antes del piloto.

## Pruebas

Las funciones de seguimiento y sacadas se prueban separadas del Canvas. Las posiciones aleatorias son deterministas. El flujo de sesiones prueba preparación única, confirmación de fases y trazabilidad de repeticiones.
