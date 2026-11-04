# Registro guiado y bienvenida WhatsApp — 4 de noviembre de 2026

## Registro

La página pública /prueba-gratis abre un diálogo accesible de tres pasos, optimizado para móviles. Primero pide taller y ciudad, luego datos del dueño, y finalmente contraseña y confirmación. La prueba es Full por 15 días, sin tarjeta ni cobros automáticos.

No existen casillas de términos ni WhatsApp en el flujo. El cliente ve un aviso breve antes de activar, indicando el tratamiento de datos y las reglas de la prueba. El botón principal «Activar mis 15 días y recibir mi bienvenida» manifiesta la solicitud expresa de recibir un mensaje de activación por WhatsApp desde MotoManager; el servidor conserva fecha, texto y origen del consentimiento de esa categoría. Un botón secundario permite activar sin WhatsApp. NO se autoriza ni se envía publicidad por el registro de prueba.

El backend valida en el servidor los seis campos, el reconocimiento de condiciones y la elección yes/no sobre WhatsApp. Se mantiene honeypot, límite de intentos por IP, unicidad de prueba, provisionamiento atómico, registro de analytics y acceso inmediato. Nada depende solo de controles del navegador.

## Diagnóstico de bienvenida

En producción, 4 de noviembre, el GET de plantilla por ID 152539709393366 respondió HTTP 400, Meta código 100, subcódigo 33. Logs de registro indicaron trial-whatsapp: provider_rejected HTTP 400. Un número y token emisor MotoManager estuvieron configurados y la consulta del número fue HTTP 200. Esta consulta a un ID de plantilla que no es accesible impedía TODOS los envíos antes de ejecutar POST. También bloqueaba el flujo la casilla opcional.

Cambio: se elimina la consulta obligatoria al ID anterior y se envía UNA SOLA VEZ al endpoint oficial /messages por nombre de plantilla bienvenida_prueba_gratis_15_dias, idioma es_CO, cuatro parámetros de cuerpo según la plantilla descrita por el proyecto. Opcionalmente WHATSAPP_TRIAL_WELCOME_VAR_COUNT=5 si la plantilla de esa WABA tiene 5 variables. Meta decide si esa plantilla existe y está aprobada; se guarda en logs el resultado estructurado (HTTP/código Meta), sin datos privados ni tokens. No hay reintento automático, porque un timeout podría producir duplicados.

## Comprobaciones necesarias antes de prometer entrega

1. En WhatsApp Manager de la WABA del número emisor, confirmar plantilla de nombre bienvenida_prueba_gratis_15_dias, es_CO, estado APPROVED, categoría correcta y exactamente 4 variables, encabezado y botón estáticos. Si se encuentra PENDING/REJECTED, aprobar/corregir en Meta; ningún código puede saltarse esa aprobación.
2. Realizar prueba con un número propio autorizado. Verificar POST de Meta y webhook de estado delivered; HTTP 200 con wamid no demuestra entrega.
3. Verificar que la aceptación se almacene por cada solicitud yes y que no se envíe cuando el usuario eligió «sin WhatsApp». No enviar publicidad ni mensajes a clientes no autorizados.
4. Probar en 360, 390 y 430 px, teclado móvil, retorno entre pasos, validación, cierre y reanudación, dos tipos de submit.
5. Revisar política de datos y opt-in de WhatsApp para Colombia; el botón es una acción explícita y la persona ve claramente qué mensaje recibirá.

Fuentes: Política de mensajes de WhatsApp Business, septiembre 2026; Ley 1581 de Colombia.
