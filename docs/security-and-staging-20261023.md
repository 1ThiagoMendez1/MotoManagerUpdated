# Continuación de staging — horarios y endurecimiento (23/10/2026)

## Alcance y compatibilidad
Rama base recuperada: `codex/v6.8.0-rendimiento-qr-20261023`, commit
`294d6826540a06347576d5cb63c3471481ef7249`.
Este cambio existe solo en el clon `/srv/motomanager-review-294d682`;
**no** se aplicó sobre el checkout productivo.

### Incorporado
1. Perfil de taller con edición independiente por día y hasta tres franjas de
   apertura/cierre, sin valores predeterminados. Los horarios no definidos
   se muestran como no configurados y jamás se sustituyen por los de otro taller.
2. Función SQL autenticada `set_workshop_business_hours`: valida franjas y
   permisos propietario/administrador, y actualiza solo `settings.business_hours`
   de forma atómica.
3. Nueva plantilla Meta `diagnosticado_reparado_horarios`, documentada en
   [whatsapp-business-hours.md](whatsapp-business-hours.md). La aplicación
   nunca intenta la plantilla anterior con horarios literales. El envío de
   texto por Evolution, si está configurado, utiliza los mismos horarios
   dinámicos del taller propietario de la orden.
4. RPC `update_workshop_profile_fields` para actualizar nombre, teléfono y
   ubicación sin perder cambios simultáneos en horarios, QR o preferencias.
5. Validación de sesión, taller y permiso `/accounting` en 14 acciones de
   contabilidad antes de operaciones con privilegios de servicio.
6. Portal por placa protegido por sesión Auth con email verificado y vínculo
   comprobado en `workshop_customer_accounts`; citas/cancelaciones verifican
   cliente, organización y propiedad. Los clientes conservan sus registros,
   pero usuarios del portal antiguo sin vínculo deberán inscribirse/verificar
   su cuenta para acceder a datos sensibles.
7. Invitaciones del equipo con contraseña aleatoria, sin impresión ni
   almacenamiento en metadata; cambio de roles/permisos limitado a propietarios,
   membresía de la organización comprobada antes de editar perfiles y
   revocación sin borrar la cuenta Auth global.
8. OTP móvil usa generación criptográfica, HMAC-SHA256 con
   `MOBILE_OTP_PEPPER`, tabla de desafíos sin políticas públicas, máximo
   cinco intentos, caducidad de cinco minutos, un minuto mínimo entre reenvíos
   y consumo único. Se conservaron las cuentas fake-email móviles existentes;
   no se cambian contraseñas de cuentas QR/correo real.

### Migraciones nuevas en orden
- `20261023200000_workshop_business_hours.sql`
- `20261023201000_mobile_otp_challenges.sql`
- `20261023202000_atomic_workshop_profile.sql`

Aplicar **solo después de una restauración y conciliación** y con el
propietario adecuado del esquema. No ejecutar `supabase db reset` ni
`docker compose down -v` en producción.

### Ensayo ejecutado
- PostgreSQL 17 de staging restaurado, contenedor con `network=none`, sin
  servicios externos y sin cambios en producción.
- Las tres migraciones de octubre 22 y sus índices fueron previamente
  verificadas con el esquema real; las nuevas migraciones se aplicaron
  únicamente al contenedor de ensayo.
- Prueba SQL de horarios: edición propia, rechazo de taller ajeno, rechazo de
  intervalos inválidos, preservación de otras claves JSON y rollback.
- Prueba SQL de OTP: cooldown, cinco intentos fallidos, bloqueo y prevención
  de reutilización. Suite descartable `npm run test:db` ampliada.
- `npm test`, `npm run typecheck`, `npm run lint` y `npm run build`
  deben repetirse en la rama final tras los últimos cambios.

## Preparativos indispensables antes de publicar
- Configurar en el entorno de staging/producción una clave secreta de al
  menos 32 caracteres aleatorios para `MOBILE_OTP_PEPPER`. Sin ella, los
  endpoints de OTP responden 503; no guardar la clave en Git.
- **Aprobar en Meta** la plantilla dinámica con ocho parámetros del cuerpo,
  idioma es_CO, y probar envíos solo a números autorizados. El código no
  puede sustituir el texto fijo de una plantilla aprobada antigua.
- Reproducir registro QR, correo, callbacks, móvil, portal por placa, pagos,
  citas, altas/bajas de equipo, alertas y devoluciones con Auth/PostgREST,
  Storage, Realtime y SMTP aislados. No usar clientes reales de prueba.
- Resolver vulnerabilidades heredadas de dependencias: auditoría realizada
  con 2 críticas (`jspdf`, `maplibre-gl`), 4 altas (entre ellas `xlsx`,
  `postcss` y OpenTelemetry), además de moderadas.
- Resolver o reemplazar 15 proxies simulados y transacciones/concurrencia en
  cotizaciones, inventario, cierres y facturación antes de habilitar
  un corte hacia PostgreSQL puro. Esta rama aún **usa Supabase**.
- Exigir un backup cifrado fuera del VPS y revisar restauración allí. La
  primera restauración aislada verificó ambas bases, roles y 25 archivos,
  pero la base productiva siguió recibiendo escrituras después de la copia.
- Antes del corte: pausar escrituras o CDC, conciliar conteos, importes,
  archivos, claves, sesiones, roles, índices y delta de escrituras; ensayar
  rollback sin pérdida de operaciones.
- Hacer pruebas móviles reales de validación de OTP, incluidos casos de
  varios clientes con el mismo teléfono y rate limiting por IP/gateway,
  además del límite por número ya implementado.

**La retirada de Supabase no está realizada ni autorizada técnicamente
hasta reemplazar Auth, PostgREST/RPC, Storage y Realtime.**
