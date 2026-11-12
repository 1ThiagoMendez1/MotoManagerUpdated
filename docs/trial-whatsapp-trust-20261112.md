# WhatsApp y avance por campo en la prueba

El acceso pide primero correo y contraseña; después muestra el WhatsApp con una
explicación visible: se solicita la bienvenida con el enlace al taller. Registrar
un número no conecta la cuenta de WhatsApp ni permite leer chats. No se anuncian
avisos de inventario por WhatsApp: el código heredado aún contiene un destinatario
de prueba y no demuestra una entrega operativa al propietario.

Los consejos y promociones tienen una casilla opcional, inicialmente desmarcada.
La prueba puede activarse sin marcarla. La acción registra por separado la
solicitud de bienvenida y la preferencia comercial, con fecha, origen y versión
del texto. No se envían campañas desde este cambio.

## Medición

La variante `trial-v2-fields-v1` empieza una medición nueva. Los hitos permitidos
son códigos `field_v1:<campo>:<etapa>`; nunca contienen valores escritos.

- Ver: al menos el 55 % del bloque del campo visible.
- Editar: una interacción de escritura al pasar a un campo, sin eventos por tecla.
- Válido: el formato del dato es válido; no verifica identidad ni titularidad.
- Corrección: se mostró un error del campo al intentar avanzar o enviar.

El RPC `web_trial_signup_field_diagnostics` agrega navegaciones (`session_id`,
`page_id`) por campo. Deduplica hitos repetidos y separa filtros de fecha, canal y
página. Cuenta el último campo editado en navegaciones sin envío medido en ese
periodo. Pueden seguir abiertas o continuar después; no demuestra abandono ni
desconfianza. Si varios campos se editaron con la misma fecha exacta, no atribuye
un último campo. El autocompletado puede producir datos válidos sin escritura.

La medición respeta DNT/GPC y no enlaza los hitos con cuentas. El historial anterior
permanece intacto y no puede reconstruirse por campo. El panel y CSV son exclusivos
del superadministrador. El RPC usa `SECURITY INVOKER`, `search_path` vacío y permiso
solo para `service_role`.

## Despliegue y pruebas

Aplicar `20261112215121_trial_field_progress.sql` antes de publicar el cliente. La
actualización amplía una restricción y crea un RPC; no elimina ni reescribe eventos.
El cliente anterior sigue siendo compatible. El panel tolera que falte el RPC.

Las pruebas SQL comprueban deduplicación, nuevas navegaciones, fechas simultáneas,
envíos, filtros y rechazo de roles/valores arbitrarios. El ensayo de navegador
intercepta todas las escrituras y recorre datos manuales, autocompletados y mixtos,
incluyendo la elección comercial y una corrección de teléfono. No crea cuentas,
envía mensajes ni publica estadísticas de prueba en producción.
