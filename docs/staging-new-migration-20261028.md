# MotoManager New Migration — staging aislado

**VPS:** vmi3462336  
**Compose project:** `motomanagernew-motomanagernewmigration-ogl915`  
**Ubicación:** `/opt/motomanagernewmigration-staging`  
**Entorno:** SOLO STAGING. No aloja cuentas ni datos de clientes de producción.

## Servicios efectivamente desplegados

- `postgres`: PostgreSQL 17.11, base `motomanager_stage`, datos ficticios, volumen persistente **exclusivo de staging**, puerto 5432 no publicado.
- `redis-cache`: Redis 7.4.8 con autenticación hexadecimal, alias `motomanager-read-cache`, TTL y `/data` temporal. No hay volúmenes ni puerto 6379 publicado.
- `rest`: PostgREST 14.12 en red privada y rol `authenticator` sin privilegios de superusuario; probado con JWT de staging contra `public.workshop_technicians`.
- `keycloak`: Keycloak 26.8.1, realm `motomanager-stage`, cliente OIDC `motomanager-staging`, dos identidades ficticias obligadas a `UPDATE_PASSWORD`. Usa base `keycloak_stage` y un usuario de BD sin privilegios de superusuario.

**Red:** `motomanagernew-motomanagernewmigration-ogl915_staging_private` (`internal: true`). Sin endpoints expuestos a Internet.

## Pruebas realizadas

1. PostgreSQL 17.11 y base separada; bootstrap de esquema/regresión de la rama Redis sin datos reales.
2. Migración `20261028200000_scoped_technician_directory.sql`, ejecutada en el PostgreSQL de staging por propietario de esquema.
3. Dos organizaciones de prueba (`staging-fixture-a`, `staging-fixture-b`) y cinco usuarios de prueba con dominio `.invalid`.
4. Permisos `EXECUTE`: `authenticated=true`, `anon=false`.
5. Regresión SQL de directorio: filtra mecánicos activos, paginación y aislamiento.
6. PostgREST HTTP: dueño A -> 200 (una fila, total dos); técnico B intentando ver A -> 403; anónimo -> 401.
7. Membresía real desactivada en el fixture: JWT válido pasa de permitido a 403; se restauró la membresía después.
8. Redis PONG autenticado, rechazo anónimo, clave de prueba compartida entre dos contenedores y expiración.
9. Keycloak OIDC realm discovery y dos identidades ficticias, confirmado tras recrear servicios.
10. Producción siguió en 1/1; cero cambios en redes o PostgreSQL de producción.

## Secretos y comandos

Los valores sensibles existen únicamente en `/opt/motomanagernewmigration-staging/.env` (**0600**), dentro de una carpeta **0700**. No publicarlos ni copiarlos al repositorio. El Compose usa interpolación obligatoria para contraseñas.

Gestión temporal por Docker Compose:

```bash
cd /opt/motomanagernewmigration-staging
docker compose --profile auth --profile api --env-file .env -f compose.yml ps
docker compose --profile auth --profile api --env-file .env -f compose.yml up -d
docker compose --profile auth --profile api --env-file .env -f compose.yml stop
```

**No ejecutar `down -v`**: destruye el volumen de staging. Hacer backups incluso si solo contiene datos de prueba. Nunca ejecutar `FLUSHALL` en Redis compartido.

## Transferencia al Compose creado en Dokploy

El despliegue actual se realizó **directamente mediante Docker Compose en el VPS**, con el nombre del proyecto coincidiendo con el recurso que indicó el usuario. Esto NO garantiza que Dokploy haya guardado el contenido y secretos de este Compose en su propia configuración.

Para que Dokploy gestione actualizaciones, importar cuidadosamente `compose.yml` al recurso `motomanagernewmigration` y configurar allí los seis secretos de `.env` mediante el gestor de entorno. Antes de pulsar Deploy, verificar nombres, network y volúmenes para **adoptar** los contenedores existentes y evitar un stack duplicado. No copiar secretos por chat.

## Lo que NO está migrado / pendiente

- La web Next.js real **no está desplegada en staging**: todavía depende de Supabase Auth/GoTrue, Storage, Realtime y endpoints públicos de una instalación aislada, no disponibles en este stack parcial.
- Keycloak prueba OIDC y `UPDATE_PASSWORD`, pero **no se ha integrado con Supabase Auth** ni se han convertido usuarios, contraseñas o sesiones existentes. HTTP interno solo es admisible en esta red aislada; para un login accesible desde navegador hace falta dominio HTTPS y redirects exactos.
- La tabla mínima `auth.users` y `auth.uid()` son **fixtures de prueba**, no un servidor GoTrue real.
- No configurar `SUPABASE_INTERNAL_URL` ni `REDIS_URL` en producción todavía.
- El endpoint superadmin `/api/admin/performance`, navegación real y fallback de la web tras caída de Redis siguen pendientes de un entorno staging con Auth, Storage y gateway completos.
- No se ha modificado el PostgreSQL 16 de Dokploy ni el PostgreSQL 17 de Supabase en producción.

## Notas de compatibilidad

La regresión SQL del repositorio utiliza un fixture antiguo de `auth.uid()`; en staging se modificó **solo ese fixture** para leer la forma de JWT que envía PostgREST actual, sin alterar la función de negocio `workshop_technicians`. El código actual de MotoManager sigue usando Supabase; este ensayo **no** es una migración completa a PostgreSQL puro.
