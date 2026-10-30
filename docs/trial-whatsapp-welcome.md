# Bienvenida por WhatsApp de la prueba Full

El registro en `/prueba-gratis` permite solicitar una única bienvenida por WhatsApp. La casilla es opcional y no está marcada de antemano. Su texto, fecha y origen se conservan en los metadatos de la cuenta creada. No se utiliza ese dato para permisos de acceso.

Después de crear correctamente la cuenta y el taller, `after()` consulta las fechas reales de la prueba y procesa el mensaje sin retrasar el acceso. No envía contraseñas, no llama a la bienvenida de planes pagados y no consume la cuota de mensajes del taller.

## Plantilla de WhatsApp Manager

- Nombre: `bienvenida_prueba_gratis_15_dias`
- Identificador de la captura: `152539709393366`
- Idioma: `es_CO`
- Encabezado de texto fijo, sin parámetros
- Botón URL fijo: `https://www.motomanager.com.co/login`
- Correo fijo (como en la captura): cuerpo con 4 variables, nombre / taller / inicio / vencimiento
- Correo como variable: cuerpo con 5 variables, nombre / taller / correo / inicio / vencimiento

El emisor consulta los componentes y el estado de la plantilla antes de enviar. Solo acepta `APPROVED` y las estructuras anteriores; no prueba diferentes combinaciones de parámetros. Un cambio de encabezado, botón o numeración incompatible requiere revisar el adaptador. Las fechas se formatean con `America/Bogota`, incluida la hora.

La captura aportada el 30 de octubre muestra `En revisión` y categoría Marketing. El esquema real debe verificarse contra Meta antes de dar por comprobado el envío en producción. El código no transmite el mensaje mientras Meta no confirme su aprobación. Las activaciones ocurridas sin autorización de WhatsApp o mientras la plantilla esté pendiente no se envían después de forma retroactiva.

## Configuración y validación

Se reutilizan `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` y `WHATSAPP_GRAPH_API_VERSION` del servidor. Sin versión configurada usa `v23.0`, igual que el emisor QR existente. El token necesita acceso de lectura a esa plantilla y permiso de envío en el número. No añadir secretos a variables `NEXT_PUBLIC_`.

Un rechazo o un fallo de consulta no revierte el registro. Si el POST pierde la respuesta, su resultado queda como no confirmado y no se reintenta: Meta podría haber aceptado el primer mensaje. Los logs solo contienen motivos internos, estado HTTP y códigos numéricos; nunca tokens, contraseñas ni datos de registro.

Pruebas con HTTP simulado, sin mensajes reales:

```sh
node --import tsx --test tests/whatsapp-trial.test.ts
npm run typecheck
```

Antes de publicar, verificar nombre, idioma, estado aprobado, componentes y URL del botón desde el servidor. La aceptación de la solicitud por Meta no equivale a entrega confirmada; esta última requiere el webhook de estado.
