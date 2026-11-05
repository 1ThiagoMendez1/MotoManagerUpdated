# PostgreSQL y Redis en Dokploy

Este Compose prepara **el destino de un ensayo de migración**. No cambia el backend de la aplicación: `v6.8.0` usa Auth, PostgREST/RPC, Storage y Realtime de Supabase. Añadir `DATABASE_URL` no sustituye esas dependencias. Redis es opcional y todavía no está conectado a la aplicación; no contiene la fuente de verdad.

1. Crear un proyecto **separado de producción** en Dokploy con `infra/dokploy/compose.yml`. Comprobar espacio para la base restaurada, índices y respaldo. Mantener PostgreSQL 17 si el origen también usa 17; comprobar `SHOW server_version` antes de exportar.
2. Configurar `POSTGRES_PASSWORD` mediante secretos de Dokploy. Generarla fuera del repositorio; no pegar valores en tickets ni chat. Para Redis, activar el perfil `cache` y configurar `REDIS_PASSWORD` hexadecimal aleatoria de al menos 32 bytes.
3. Validar `docker compose -f infra/dokploy/compose.yml config --quiet`. PostgreSQL y Redis no publican puertos. Adjuntar los futuros servicios de aplicación a `backend`; nunca exponer la base o Redis a Internet.
4. Arrancar PostgreSQL y confirmar su healthcheck. Los volúmenes son persistentes. **No ejecutar `down -v`** sobre datos que deban conservarse.
5. Seguir [el ensayo y el corte](../../docs/production-review-v6.8.0.md). Respaldos cifrados fuera de este servidor y restauraciones verificadas son requisitos; un volumen Docker no es un respaldo. La red interna impide enviar respaldos fuera del host desde estos contenedores: usar el sistema de respaldos de Dokploy o un agente separado autorizado.

No se incluye un contenedor `app` que aparente funcionar con PostgreSQL puro. Antes del corte falta reemplazar sus APIs de identidad, archivos y tiempo real, y comprobar las sesiones existentes. Mientras tanto, desplegar los cambios de rendimiento y QR con la conexión actual de Supabase y sus dos migraciones aditivas.
