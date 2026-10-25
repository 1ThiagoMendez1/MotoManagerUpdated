# Estados simplificados y WhatsApp de diagnóstico

## Estados disponibles
En el selector de órdenes de trabajo únicamente:
1. Diagnosticando
2. Reparado
3. Entregado
4. Moto entregada por cotización rechazada

Las nuevas órdenes comienzan en Diagnosticando. Ingreso a revisión y En proceso
ya no se pueden seleccionar, tampoco mediante
un formulario enviado directamente al servidor. Los estados antiguos received
e in_progress se conservan en PostgreSQL y se pueden seguir leyendo en
órdenes históricas, evitando borrados de información.

El servidor rechaza las actualizaciones al mismo estado, para impedir
notificaciones duplicadas.

## Meta Cloud API: Diagnóstico
Según la captura proporcionada por el usuario en WhatsApp Manager:

- Nombre de plantilla: actualizacion_estado_diagnosticando
- Categoría: Utilidad
- Idioma: Spanish (COL) -> es_CO
- Encabezado: «Actualización de estado - {{1}}»
  - Variable {{1}}: Diagnosticando
- Cuerpo con siete variables (su numeración reinicia en el cuerpo):
  1. Nombre de cliente
  2. Nombre del taller
  3. Marca y modelo de la motocicleta
  4. Placa de la motocicleta
  5. Número de la orden
  6. Dirección del taller
  7. Nombre del taller otra vez
- Pie de página y botón «Más información»: estáticos en Meta, no se envían
  como componentes de plantilla.
- No se incluyen horarios, pues esta plantilla de diagnóstico no los utiliza.

El envío se resuelve desde la organización de la orden, no del perfil del
cliente ni de un nombre fijo. Conserva la cuota de mensajes del taller.
Si Meta rechaza el envío, la orden permanece guardada y se informa al usuario
sin intentar mandar duplicados ante fallos de red inciertos.

«Reparado» mantiene su plantilla separada estado_reparado del PR #6,
con es_CO y ocho variables en el cuerpo, y horarios de cada taller.

## Seguridad y publicación
- No ejecutar migraciones SQL: este cambio solo modifica código.
- Probar en staging con el modelo de datos actual y las pruebas unitarias de
  1 encabezado + 7 variables de cuerpo, campos correctos y aislamiento.
- Verificar plantilla APPROVED dentro de la WABA del número emisor.
- Meta puede rechazar con 132001 si está en revisión o en otra WABA;
  la captura del editor no demuestra la aprobación.
- No enviar WhatsApps de prueba a clientes reales sin consentimiento.
