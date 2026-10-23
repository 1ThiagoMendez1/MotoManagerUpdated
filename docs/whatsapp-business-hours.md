# Horarios por taller y aviso de motocicleta lista — preparación

## Configuración por cada organización

En **Perfil → Horarios de atención**, propietarios y administradores pueden definir, para cada día,
hasta tres intervalos en horario local (HH:mm). Un día sin intervalos está **cerrado**.
Nada se rellena con el horario de otro taller. Los horarios se guardan en
`organizations.settings.business_hours` por la RPC autenticada
`set_workshop_business_hours` (migración `20261023200000_workshop_business_hours.sql`).
La actualización es atómica con `jsonb_set` y no borra las demás configuraciones del perfil.

Los talleres existentes no reciben horarios automáticos. Si aún no configuraron nada,
los avisos dinámicos indican que se debe consultar el horario. La dirección también sale
de la organización propietaria de la orden; nunca se toma de otro taller.

## Plantilla nueva obligatoria en WhatsApp Business / Meta

**La plantilla antigua `diagnosticado_reparado` NO debe utilizarse** para notificar
la entrega: contiene horarios literales y su texto no puede corregirse cambiando
parámetros en la API.

Crear y solicitar aprobación de la plantilla de utilidad:
- Nombre: `diagnosticado_reparado_horarios` (o asignar su nombre exacto a
  `WHATSAPP_READY_DYNAMIC_TEMPLATE`).
- Idioma: `es_CO`.
- **Sin encabezado** y con **ocho parámetros de cuerpo**, en este orden:

```text
Hola, {{1}}. 👋

📣 En *{{2}}* te informamos que el servicio de tu motocicleta ha finalizado y ya está lista para ser entregada.

📋 Información del vehículo
🏍️ Motocicleta: {{3}}
🪪 Placa: {{4}}
📄 Número de orden: {{5}}
📍 Dirección: {{6}}

📅 Te invitamos a acercarte al taller en el horario de atención:

⏰ {{7}}

💭 Si tienes alguna duda sobre el servicio o deseas más información, estaremos encantados de atenderte.

¡Gracias por confiar en *{{8}}*! 🏍️
```

Parámetros: (1) cliente, (2) taller, (3) moto, (4) placa, (5) orden, (6)
dirección, (7) **horarios leídos de la organización**, (8) nombre del taller.
El horario es **un único parámetro multilínea**, incluso con almuerzos,
domingos cerrados y otras variaciones. Aprobar exactamente esta estructura
antes de conectar tráfico real. Verificar que el nombre, la categoría, el idioma
y la política de Meta correspondan a la cuenta de WhatsApp utilizada.

Si Meta rechaza expresamente la plantilla y Evolution API está configurado,
el flujo puede enviar un texto con los mismos datos dinámicos. **No se reintenta
por otro proveedor ante fallos indeterminados**, para evitar mensajes duplicados.
Si no hay proveedor con plantilla válida, se registra el fallo; jamás se vuelve
a la plantilla con horario fijo. El nombre de la plantilla también se valida en el
servidor: si `WHATSAPP_READY_DYNAMIC_TEMPLATE=diagnosticado_reparado`, se prohíbe
su envío por Meta. El texto de Evolution conserva los horarios del taller.

La migración `20261023203000_atomic_whatsapp_quota.sql` añade una reserva de cuota
atómica por taller y mes. Esto evita que múltiples notificaciones simultáneas
superen el límite y, sobre todo, impide que el contador de WhatsApp sobrescriba
los horarios recién guardados, el QR o la dirección. Si no puede verificar la
cuota, la aplicación no permite el envío. El contador se reserva antes de contactar
al proveedor; **queda pendiente** una contabilidad idempotente basada en aceptación
y webhooks de entrega para no cobrar mensajes que se rechacen posteriormente.
La acción de cambio de estado de la orden ahora espera la respuesta inicial del
proveedor WhatsApp y registra rechazo sin deshacer el cambio de estado de la moto.
Esto no equivale a una confirmación final de entrega al teléfono.

## Validación antes de producción

1. Aplicar la migración nueva en staging con el rol dueño del esquema
   `supabase_admin`; no cambiar permisos de producción a ciegas.
2. Crear dos talleres de ensayo con horarios distintos, incluyendo una pausa
   para almuerzo y un día cerrado.
3. Probar propietario y administrador, empleado sin permiso y cuenta de otro
   taller. Verificar el mantenimiento de otras claves de `settings`.
4. Probar el aviso Meta aprobado en números **de prueba con consentimiento**,
   tanto con horarios registrados como sin ellos; capturar el resultado real de
   aceptación. No enviar mensajes de ensayo a clientes existentes.
5. Verificar visualmente la sección en móvil, y comprobar que el cambio de
   perfil no sobrescribe los horarios durante ediciones concurrentes.
6. Desplegar solo después de conciliar los datos de staging y revisar los demás
   bloqueos de seguridad del informe de producción.

## Resultado local

Se añadió `tests/business-hours.test.ts` y una prueba SQL sobre copia
restaurada, no sobre producción. Las pruebas no sustituyen la aprobación de
la plantilla en Meta ni el ensayo de extremo a extremo de WhatsApp.
