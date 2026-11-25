# Landing Navidad y prueba Full de 30 días

Referencia solicitada: https://claude.ai/artifact/AyLitdnVetYFZRXsavgPS2#play-15dd8cd198dd

## Experiencia

- Nueva edición `navidad-2026-v3`: navegación flotante, tipografía Anton local, fotografía navideña, luces, nieve opcional y cuenta regresiva a Nochebuena en Colombia.
- Portal con ejemplos identificados como ficticios, primeros pasos, demostración real existente cargada bajo demanda, regalo interactivo, comparación antes/después, módulos y galería.
- Los precios y sus periodos siguen leyendo el catálogo y usando los mismos modales y validación de pagos Wompi. No se modifica el precio de ningún plan.
- El directorio usa exclusivamente `PublicWorkshop[]` del servidor, sus reseñas verificadas, filtros por ciudad y enlaces de contacto. No se publican talleres ficticios ni distancias calculadas sin coordenadas.
- Se conservan las rutas reales `/prueba-gratis`, `/login`, `/clientes`, `/dashboard/subscription`, privacidad y eliminación de datos. Los CTA principales mantienen sus identificadores de analítica; los primeros pasos añaden dos etiquetas cerradas. La nueva variante permite distinguir su mapa de calor.
- El movimiento se reduce con `prefers-reduced-motion`. La nieve se puede apagar y la selección persiste localmente. No hay rotación automática de módulos ni contenido oculto esperando una animación.

Las fotografías proceden de los recursos públicos del artefacto entregado por el usuario. El logo oficial se conserva. Anton se sirve localmente e incluye su licencia OFL. La edición visual conserva la ventana estacional existente; los 30 días de prueba son la nueva duración general autorizada por el usuario.

## Duración y compatibilidad

`20261125210547_workshop_trial_thirty_days.sql` cambia el valor por defecto de las nuevas reclamaciones y las dos funciones de alta (correo y WhatsApp). El servidor fija 30 días y registra `trialDurationDays: 30`; el visitante no puede elegir fechas. Se conservan las restricciones de reutilización y los permisos exclusivos de `service_role`.

La migración no actualiza organizaciones, reclamaciones previas, pausas ni suscripciones pagadas. Sus vencimientos continúan determinados por las fechas almacenadas, no por la nueva constante comercial. Se actualizan formularios, consentimiento fechado `2026-11-25`, metadatos, preguntas frecuentes, mensajes de promoción y demo.

La plantilla `bienvenida_prueba_gratis_30_dias` (`1504308411596129`, `es_CO`) fue creada como copia de la bienvenida anterior con la duración corregida y Meta confirmó `APPROVED`. Las altas nuevas seleccionan esta plantilla por su oferta almacenada; las pruebas anteriores conservan `bienvenida_prueba_gratis_15_dias`. No se envían mensajes reales de prueba a clientes.

## Validación y despliegue

- Typecheck y suite existente, más regresión PostgreSQL/PGlite que ejecuta ambos RPC: 30 días exactos, restricciones de acceso, reintentos, protección contra reutilización, fechas antiguas y altas pagadas.
- Verificación de la compilación y de la interfaz en escritorio y móvil antes de concluir el despliegue.
- Compilación candidata aislada en `/opt/motomanager-landing-20261125`; respaldo de funciones, configuración de rutas e imagen previa antes de aplicar la migración.
- Conservar el archivo de Compose modificado en producción. Actualizar únicamente el servicio web y restaurar la política previa de despliegue automático al terminar.
- La migración es transaccional. Si se revierte la imagen, las pruebas nuevas conservan sus 30 días almacenados; el código anterior ya calcula vencimiento desde las fechas por taller.

No se modifican el login por código, las claves de Meta, el piloto de coexistencia ni la lógica de firma y conciliación de Wompi.
