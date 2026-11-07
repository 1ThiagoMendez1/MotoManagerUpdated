# Revisión manual de pruebas gratuitas

La gestión de talleres permite pausar una prueba vigente y devolver el acceso después de comprobar los datos del negocio. Instalar esta funcionalidad no pausa ningún taller automáticamente.

## Uso

1. En **Administración → Gestión de Talleres**, busca el negocio y pulsa **Pausar prueba**.
2. Registra el motivo interno y revisa el mensaje que verá el usuario. La nota interna no se entrega al taller.
3. El taller queda **EN REVISIÓN**. Sus miembros ven `/revision-prueba`, con los datos que deben confirmar y la opción de cerrar sesión. Las sesiones abiertas comprueban el estado cada 15 segundos y al volver a la pestaña.
4. En **Revisar y reactivar**, confirma nombre del taller, ciudad, dirección, responsable y celular. Registra la evidencia revisada y las tres comprobaciones: contacto directo, ubicación y actividad real del taller.
5. **Confirmar verificación y reactivar** actualiza los datos del taller, deja constancia de quién revisó y devuelve exactamente el tiempo de prueba pendiente al pausar. No crea una nueva prueba de 15 días.

Las pruebas en revisión tienen un filtro propio. Una revisión aprobada muestra **Taller verificado**. No se exige RUT a un taller que no lo tenga: se registra evidencia comprobable, como ubicación, fachada o videollamada. La decisión sigue siendo manual.

## Control de acceso

- La revisión se guarda en tablas privadas con RLS; las acciones de administración exigen un superadministrador verificado en Auth. `user_metadata` no concede acceso.
- La consulta del usuario devuelve solo el mensaje público de su propio taller. El motivo interno, la evidencia y la bitácora no se exponen al navegador del taller.
- El bloqueo se aplica en middleware, autorización del servidor, pre-request de PostgREST, políticas restrictivas de RLS y guardas de escritura. No depende de renovar el JWT ni de la caché de Redis.
- Las políticas restrictivas también protegen los datos con RLS que consulta Realtime y Storage autenticado. Los archivos ya públicos conservan su carácter público.
- Se bloquean las Server Actions incluso si se intenta enviarlas a la página de revisión. Solo quedan disponibles el aviso, su consulta de estado y la salida de sesión.
- Los recordatorios y el reenvío de bienvenida se detienen durante la revisión. Un pago recibido mientras la revisión está pendiente conserva la suscripción, pero no levanta la pausa administrativa.
- Se mantiene el criterio actual de la aplicación: el primer taller con membresía activa, ordenado por fecha de vinculación e identificador.

## Instalación

La migración `20261107035758_workshop_trial_review.sql` es transaccional y se aplica una sola vez, antes del nuevo frontend. Requiere la migración de pruebas gratuitas ya instalada. Comprueba que no exista otro hook `pgrst.db_pre_request` antes de registrarse; no lo sobrescribe silenciosamente.

Los nuevos RPC administrativos son exclusivos de `service_role`, y el servidor comprueba al administrador antes de llamarlos. Las tablas de revisión y eventos permanecen en `motomanager_private`. Los cambios y el listado de estado no se cachean.

## Validación

- Pruebas con PostgreSQL aislado (PGlite): permisos, metadatos manipulados, sesiones existentes, miembros del equipo, políticas amplias heredadas, archivos autenticados, notas privadas, idempotencia, conversión de pago y conservación de tiempo/preferencias.
- Suite de unidad: 141 aprobadas, 2 omitidas que requieren Redis externo. TypeScript sin errores.
- Prueba HTTP en copia desechable de PostgreSQL 17: sesión existente recibe `403 PT403` al pausar; el aviso propio sigue disponible y otra cuenta conserva el acceso.
- `tests/trial-review-browser.mjs` ejecuta el flujo completo con usuarios sintéticos en el proyecto Docker desechable `mm-trial-review-validation`. Exige `MM_TRIAL_REVIEW_VALIDATION=1` y nunca utiliza un taller real para probar pausas.

Los asesores de la CLI requieren un stack local completo; en esta ejecución se revisan además privilegios, RLS, funciones y rutas en la copia PostgreSQL 17. No se ejecutan migraciones antiguas ni se reinicia la base de producción.
