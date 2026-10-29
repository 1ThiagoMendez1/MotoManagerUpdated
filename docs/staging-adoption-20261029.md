# MotoManager staging — Adopción en Dokploy (2026-10-29)

## Infraestructura verificada
VPS vmi3462336. Nombre de proyecto Docker Compose: motomanagernew-motomanagernewmigration-ogl915.
Nueve servicios: postgres (PG17.11), redis-cache (7.4.8), gotrue, rest-runtime,
rest, storage-runtime, stage-gateway (Kong), keycloak (26.8.1), staging-web (Next standalone).
Red motomanagernew-motomanagernewmigration-ogl915_staging_private: internal=true y sin puertos públicos.
Los contenedores fueron lanzados con Docker Compose en el VPS; NO se ha confirmado que el
recurso del panel Dokploy los administre todavía.

## Archivos locales
- dokploy-ready.compose.yml: manifiesto unificado de nueve servicios, SIN secretos literales.
- .env: credenciales aisladas, permisos 0600. NO copiar a Git, ni mostrar en el chat.
- gateway-kong.yml: configuración privada de Kong; contiene secretos, NO copiar a Git.
- web/standalone: build Next.js producción, guardado en /opt, montado solo lectura.
- Los archivos *.compose.yml separados son la fuente de las capas de staging.

## Bases separadas dentro del contenedor PostgreSQL de staging
- motomanager_stage: fixture SQL de regresión.
- motomanager_runtime_stage: GoTrue, PostgREST y pruebas reales de navegador.
- keycloak_stage: Keycloak.
La base PG17.6 de Supabase en producción NO se ha modificado.

## Pruebas completadas
- Browser Chromium: login ficticio, dos recorridos de ocho módulos, opciones perezosas,
  historial, exportación y denegación del endpoint superadmin al dueño.
- Se resolvió el error de Inventario recargando solo la caché de esquema PostgREST
  de motomanager_runtime_stage mediante pg_notify('pgrst','reload schema').
  La base runtime ya tenía las tablas; no se modificó su estructura.
- Redis detenido temporalmente: cuatro lecturas autenticadas funcionaron; restaurado saludable.
- SQL y PostgREST: aislamiento entre dos talleres ficticios, paginación, rechazo
  anónimo y desactivación de membresía incluso con JWT aún válido.
- Keycloak OIDC disponible con dos cuentas ficticias (UPDATE_PASSWORD).
  Keycloak NO está conectado al login real de MotoManager.

## Pasos seguros de adopción en la interfaz Dokploy
1. Abrir el recurso Compose existente motomanagernewmigration; NO crear otro.
2. Elegir Docker Compose, no Docker Stack. Copiar el contenido de
   dokploy-ready.compose.yml (no necesita perfiles).
3. Cargar las credenciales desde .env en Environment/Secrets del panel autorizado.
   No pegarlas en Git ni chat. El YAML usa referencias a variables.
4. Comprobar antes de Deploy que el nombre de proyecto, labels, redes y volúmenes
   coinciden con los contenedores existentes, evitando duplicar recursos.
5. Confirmar montaje persistente de gateway-kong.yml en la ruta host absoluta y
   web/standalone bajo /opt. Nunca usar docker compose down -v.
6. Hacer un respaldo de las bases ficticias y luego desplegar SOLAMENTE staging.
7. Repetir Chromium, Redis offline y los controles de aislamiento.

## Faltantes antes de abrir staging al público o pasar a producción
- Realtime no está instalado aún; varias pantallas lo utilizan.
- Falta dominio HTTPS independiente y configuración de URLs del gateway
  accesibles desde navegador; actualmente los nombres son DNS internos.
- Falta prueba positiva de métricas con un superadministrador ficticio;
  se comprobó 401 anónimo y 403 para el dueño.
- Falta conexión Keycloak -> Supabase Auth; NO cambiar contraseñas ni identidades reales.
- En producción primero se debe aplicar la RPC SQL con propietario autorizado,
  validar los permisos y solo entonces considerar el deploy de la nueva app.
