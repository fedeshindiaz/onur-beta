# Motor visual de ejercicios

## Implementado

El motor usa Canvas 2D y `requestAnimationFrame`. El tiempo de animación se acumula únicamente mientras el ejercicio está activo; al pausar, fondo, objeto y temporizador quedan congelados.

Fondos disponibles:

- color sólido;
- barras optocinéticas;
- espiral;
- damero;
- campo de puntos.

Objetos disponibles:

- pelota fija;
- seguimiento suave sinusoidal;
- sacadas horizontales;
- sacadas verticales;
- sacadas pseudoaleatorias deterministas.

Fondo y objeto usan parámetros independientes. Todos los movimientos se calculan como funciones continuas del tiempo o como pasos por Hz, por lo que el patrón no termina antes del tiempo asignado.

## Reproductor

- pausa y continuación;
- omitir;
- salir;
- solicitud de pantalla completa;
- controles ocultos después de tres segundos;
- reaparición al tocar o mover el puntero;
- cuenta regresiva activa solo durante reproducción.
- tiempo activo acumulado sin pausas ni descansos;
- metrónomo audible entre 0,2 y 3 Hz, detenido durante la pausa;
- salida 2D estándar;
- salida VR Box con dos canvases sincronizados y controles auto-ocultables;
- salida Quest navegador BETA en pantalla completa.

## Límites actuales

- Los rangos de velocidad son controles técnicos iniciales y no están clínicamente validados.
- El sonido puede requerir una primera interacción si el navegador bloquea audio automático.
- VR Box duplica el estímulo 2D de forma sincronizada; no simula profundidad ni seguimiento de cabeza.
- Quest navegador no equivale todavía a WebXR inmersivo ni usa seguimiento de cabeza.
- Se requieren pruebas físicas en celulares, VR Box, tablets, HDMI y Meta Quest 3S antes del piloto.

## Pruebas

Las funciones de seguimiento y sacadas se prueban separadas del Canvas. Las posiciones aleatorias son deterministas para que una ejecución pueda reproducirse y auditarse.
