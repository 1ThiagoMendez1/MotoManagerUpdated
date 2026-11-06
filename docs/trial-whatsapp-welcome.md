# Prueba Full y bienvenida por WhatsApp

## Registro

El formulario público de tres pasos conserva un único botón final: **Activar mis 15 días y recibir mi bienvenida**. Se eliminó la opción secundaria de activar sin WhatsApp. El aviso visible explica que esa acción solicita una bienvenida de activación y conserva su fecha, texto y origen en la cuenta. No autoriza publicidad. El backend sigue respetando una elección antigua de no recibir WhatsApp; quitar el enlace del formulario no transforma rechazos previos en autorizaciones.

## Gestión de talleres

En **Administrador → Gestión de talleres**, las pruebas gratuitas muestran **Reenviar bienvenida**. Las pruebas vencidas tienen el botón deshabilitado y los planes pagados no lo muestran.

Antes del envío se consulta en el servidor el taller, su único propietario activo y la cuenta de Auth. Se presentan el nombre, el número registrado, el inicio y el vencimiento en hora de Bogotá. La acción solo acepta identificadores de taller y solicitud; nunca acepta un teléfono elegido por el navegador. Se requiere una solicitud de bienvenida registrada y concordancia del teléfono y correo del propietario. Ambas acciones del administrador validan `requireSuperAdmin()` antes de consultar datos privilegiados.

El reenvío usa las fechas originales de los quince días. No crea otra prueba, amplía su vencimiento, cambia la contraseña ni ejecuta el envío de credenciales temporales. No realiza envíos masivos ni retroactivos al desplegar.

La activación y el reenvío comparten una reserva por taller en `organizations.settings.trialWelcomeDelivery`. La escritura compara el documento JSON completo antes de modificarlo; si hubo un cambio concurrente de plan, horarios o cuota, vuelve a leerlo. El resultado también se guarda sin sobrescribir cambios simultáneos. Este estado es diagnóstico y de coordinación; no concede permisos, prueba de pago ni identidad. No requiere migraciones SQL adicionales.

Cada solicitud usa un UUID para evitar que una repetición de la misma acción produzca otro POST. Un envío en curso bloquea otros intentos durante 90 segundos y se exige un minuto entre envíos manuales. La activación automática nunca repite una reserva existente. El administrador puede pedir deliberadamente otro envío con una nueva solicitud después de revisar el resultado anterior y respetar el intervalo.

## Plantilla y resultados

Se reutiliza `bienvenida_prueba_gratis_15_dias`, idioma `es_CO`, con encabezado y botón estáticos. El emisor actual empieza por cinco variables: nombre, taller, correo, inicio y fin. `WHATSAPP_TRIAL_WELCOME_VAR_COUNT` puede seleccionar cuatro o cinco. Únicamente un rechazo explícito Meta 132000 permite probar una vez la otra cantidad de variables. No se consulta el ID de plantilla obsoleto para poder enviar.

La configuración utiliza las variables existentes del servidor: `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` y `WHATSAPP_GRAPH_API_VERSION` (por defecto `v23.0`). El tiempo límite de cada POST es de 20 segundos.

El diálogo distingue aceptado por Meta, rechazo con código numérico y resultado no confirmado. Un HTTP exitoso con identificador de mensaje indica aceptación, no entrega; la entrega requiere confirmación del destinatario o un webhook de estado. Tras un timeout, pérdida de respuesta o fallo al guardar el resultado, no hay repetición automática. Se avisa al administrador que verifique la recepción antes de reenviar.

El estado guarda identificador de solicitud, actor, origen, fechas, estado y diagnóstico mínimo del proveedor. No almacena contraseña, token, cuerpo del mensaje ni teléfono adicional. Los errores públicos no muestran credenciales ni datos del proveedor sin filtrar.

## Validación

`npm run typecheck` y `npm test`. Las pruebas nuevas cubren dos envíos simultáneos, repetición de una solicitud, consentimiento, pruebas vencidas y pagadas, conservación de fechas, cambios concurrentes de ajustes, rechazo, timeout y fallo al guardar después de un POST. Las llamadas a Meta están simuladas: estas pruebas no contactan a propietarios de talleres.

La integración continua también se ejecuta al abrir un pull request contra la rama de producción. Ningún cambio de este módulo requiere actualizar paquetes o aplicar migraciones.
