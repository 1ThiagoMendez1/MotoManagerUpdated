# Validaciones del registro y autocompletado

La captura del administrador muestra 15 eventos `form_error/validation` en tres
navegaciones, una llegada medida y ningún envío final ni fallo de servidor
registrado. El evento `validation` se emite cuando se intenta continuar o enviar
con datos que la validación considera pendientes de corregir. Una persona puede
repetirlo; no equivale a 15 usuarios ni a 15 fallos técnicos.

El informe SQL cuenta las llegadas solamente cuando recibió `pageview` dentro
del periodo. Los avisos incluyen todos los eventos recibidos en ese periodo,
aunque no tengan una apertura medida. Se reprodujo la misma combinación de
cifras con las migraciones originales sobre una base PGlite aislada: una llegada,
un inicio, cero pasos de acceso/envíos, 15 validaciones en tres navegaciones y
cero incidencias de servidor. Esto valida cómo se interpreta el informe; no
identifica a las personas ni la causa de esos 15 eventos de producción.

## Bloqueo reproducido

Los campos controlados podían mostrar valores puestos por el autocompletado o
un gestor de contraseñas mientras el estado de React seguía vacío, si no se
había emitido el evento `input/change`. Al validar se rechazaban esos valores;
al escribir en otro campo, el render podía incluso borrar el dato autocompletado.

Antes del cambio, una reproducción DOM de los componentes reales mostró:

- Nombre y taller visibles, pero no permitía avanzar al acceso.
- Indicaba errores en ambos campos y no llamaba a la acción de registro.
- Autocompletar el nombre y luego escribir el taller borraba el nombre.

El formulario ahora lee `FormData` de los controles actuales al validar, escribir,
mostrar la contraseña, cambiar de paso y completar la hidratación. Conserva las
mismas reglas de datos y la validación independiente en el servidor.

## Claridad del panel

Se separan los intentos que pidieron corregir datos de los demás avisos y las
incidencias del servidor. Se muestran los reintentos y navegaciones explícitamente,
con la aclaración de que el historial no registró qué campo falló. Los valores
históricos permanecen iguales; no se ocultan ni reclasifican como registros exitosos.

## Validación y límites

- Suite de regresión: 195 pruebas correctas y 2 omitidas.
- Formulario real en simulación DOM con React de Next: escritura normal,
  autocompletado completo y mixto, cambio de visibilidad de contraseña, vuelta de
  paso, un envío válido y conservación de datos ante rechazo simulado.
- Los valores de correo, celular, nombre del taller y contraseña no entraron en
  los lotes de estadísticas de esas pruebas.
- Comprobación de tipos y compilación Next.js.
- `tests/trial-signup-browser.mjs` deja el ensayo reproducible con Chromium contra
  una app local/staging, interceptando todas las escrituras. El navegador local
  no pudo iniciarse: `socket() failed: Operation not permitted`. No se considera
  una comprobación visual ni una activación real de cuenta.

No se pudo consultar ni desplegar en producción porque Desktop Commander del VPS
`vmi3462336` figuraba desconectado. El código de WhatsApp quedó fuera de esta rama.
La causa exacta de las 15 validaciones históricas no puede recuperarse del código
agregado `validation`, que no almacena campos ni valores introducidos.
