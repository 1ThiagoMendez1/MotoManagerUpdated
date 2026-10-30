# Registro QR + recepción de clientes + estados de WhatsApp

## Cliente
1. Escanea el QR del taller, verifica el celular por código WhatsApp (o entra con tu contraseña anterior) y acepta el tratamiento de datos.
2. Captura la placa (recomendada), marca y modelo (opcionales).
3. La solicitud se crea **pendiente**, no se vincula ninguna moto automáticamente.
4. La cuenta ya vinculada puede informar otra moto sin volver a registrarse.
5. El portal /clientes muestra únicamente motos de esa cuenta verificadas por el taller.

## Taller
1. El dueño/administrador recibe una notificación interna `Nuevo cliente desde QR`.
2. Dashboard y Directorio de clientes enlazan a `/customers/intake`.
3. La bandeja muestra clientes con placa sugerida. El personal confirma marca, modelo, año y placa.
4. `confirm_customer_intake` bloquea solicitudes repetidas y motos de otras fichas. Es atómica: crea el vehículo y marca la solicitud atendida en la misma transacción.
5. `/motorcycles` permite continuar recepción de la moto y gestionar la orden.

**No** se envía un WhatsApp automático al dueño por el QR; la notificación aparece en MotoManager. El WhatsApp de código de acceso se envía al **cliente**, mediante la plantilla de Autenticación `codigo_registro_qr`; ver `docs/qr-whatsapp-enrollment-20261025.md`.

## Meta Cloud API: plantilla para estados distintos de Reparado

El servidor ya dispone de WHATSAPP_API_TOKEN y WHATSAPP_PHONE_NUMBER_ID,
pero **no** de Evolution API. Para notificar *Ingreso a revisión*,
*Diagnosticando*, *En proceso* o *Entregado* fuera de las 24 horas de
atención, crear en el mismo WABA que envía los mensajes una plantilla
**Utilidad**, **Español (Colombia), es_CO**, sin encabezado ni botones:

Nombre EXACTO: `actualizacion_estado_moto`

Cuerpo EXACTO:

Hola {{1}}, te informamos que en {{2}} la motocicleta {{3}}, correspondiente a la orden {{4}}, cambió al estado: {{5}}.

Para más información o aclarar dudas, comunícate directamente con nuestro taller.

¡Gracias por confiar en nosotros!

Orden de variables:
1. Nombre del cliente — `Ana Pérez`
2. Nombre del taller — `FrankorMotos`
3. Modelo y placa — `Yamaha FZ (ABC12D)`
4. Número de orden — `123`
5. Estado — `Diagnosticando`

La plantilla `actualizacion_estado_reparado` (8 parámetros) se utiliza
**solamente** cuando una orden pasa a estado `completed` (Reparado).
El sistema nunca envía un mensaje de reparación para Diagnóstico/En proceso.

Una solicitud a Meta aceptada no garantiza la entrega al dispositivo;
los estados finales se deben verificar con webhooks. Sin plantilla aprobada
ni Evolution API no existe una forma legítima de iniciar una conversación
fuera de la ventana de atención de 24 horas. En caso de fallo, la UI
expone un botón **Abrir WhatsApp** para el envío manual mediante WhatsApp Web;
no declara que fue enviado automáticamente.

## Seguridad
- La placa informada por un QR es una **propuesta**, nunca prueba titularidad.
- RLS y permisos: el cliente no tiene acceso directo a solicitudes ni puede
  modificar la tabla de motos; las RPC solo le permiten crear solicitudes
  para una cuenta ya vinculada con acceso verificado.
- Las RPC de administración vuelven a comprobar que el actor es propietario
  o administrador activo del taller de la solicitud.
- Los IDs de taller y cliente de una moto siempre coinciden; otra ficha con
  la misma placa exige revisión manual.
- Idempotencia: una solicitud por combinación organización/cliente/placa.
- Validación: longitud, formato de placa, marca, modelo, año y límites de solicitudes.

## Despliegue
1. Respaldo actual con restauración comprobada; no tocar Dokploy PG16.
2. Aplicar la migración SQL `20261024190000_customer_qr_intake.sql`
   con transacción + ON_ERROR_STOP; requiere las migraciones QR previas.
3. Compilar y publicar el código nuevo; no desinstalar Supabase.
4. Comprobar `/talleres/frankormotos`, registrar cliente ficticio solo
   contra staging, recepción y notificaciones.
5. Crear y conseguir aprobación de plantilla `actualizacion_estado_moto`.
6. Comprobar primer envío real **solo con consentimiento expreso del destinatario**.
