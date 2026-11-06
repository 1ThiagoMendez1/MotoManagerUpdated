# Actualización del MotoManager nuevo — 5 de noviembre de 2026

## Ramas y alcance

- Principal incorporado: `codex/v6.8.0-horarios-quota-hardening-20261023`, `f750d1d40d950f02d9094f8cea4a62abf6b1fd0a`.
- Destino: `codex/v6.8.0-redis-navigation-20261028`, partiendo de `6f013908e8f4221ab0dd63041eb1f2bcbcb23fa2`.
- Ancestro común: `6aeba4615ec17338e7f26b52fc4f7e187cbb55fb`.

Se integran los 34 commits del principal que faltaban en el destino. El merge conserva la historia de ambas ramas, Redis, las lecturas diferidas y los manifiestos de staging. No sustituye producción ni transfiere datos de clientes por sí mismo.

Quedan incorporados Mi Garaje y sus vínculos por taller, OTP y sus límites, protección de cotizaciones y de inventario frente a respuestas repetidas, prueba Full de 15 días, contratación/verificación del pago, bienvenida y reenvío de WhatsApp, analítica/heatmaps, consentimiento de Meta y cambios de la landing. Se conservan los controles de expiración de pruebas en autorización.

## Resolución y ajustes de integración

- Portal móvil: se conserva la autorización nueva por pares taller/cliente y el transporte privado con invalidación del destino. La consulta del año se corrige a `year:model_year`, manteniendo el campo `year` del contrato móvil. Sobre el esquema versionado, pedir `motorcycles.year` devolvía PostgreSQL `42703` y el endpoint respondía 503.
- Suscripciones: se conserva la activación nueva mediante pago verificado y solicitudes autorizadas; se eliminan imports antiguos duplicados.
- Bienvenida de prueba: el cliente administrativo nuevo usa el transporte común y la misma invalidación que las demás escrituras.
- Las cinco RPC exclusivas de analítica no invalidan la caché operativa de talleres. Sus escrituras afectan únicamente a tablas de analítica; invalidar globalmente por cada visita de la landing eliminaba el beneficio de Redis. Las mutaciones de negocio y RPC desconocidas mantienen la invalidación conservadora.
- `.npmrc` hace que `npm ci` use la resolución `legacy-peer-deps` con la que ya trabajan Docker y CI. El lockfile del principal no admite instalación estándar sin esa configuración. No se actualizan versiones transitivas para sortearlo.
- GitHub Actions valida también la rama de destino.

## Actualizar el staging existente

El manifiesto `infra/dokploy/motomanager-staging-full.compose.yml` montaba una compilación antigua concreta bajo `/opt`; subir código a Git no actualizaba ese directorio. Ahora exige **`STAGING_WEB_RELEASE_DIR`**, ruta absoluta de la nueva compilación standalone validada. Registrar la ruta anterior para reversión y mantener la nueva en una carpeta distinta. Conservar `public` y `.next/static` junto al standalone, como hace el Dockerfile.

La web requiere además `MOBILE_OTP_PEPPER` aislado de staging, aleatorio y de al menos 32 caracteres. No reutilizar secretos de clientes en ensayos. Se añaden `NEXT_PUBLIC_APP_URL`, la selección de encabezado IP y las variables opcionales `STAGING_WHATSAPP_API_TOKEN` / `STAGING_WHATSAPP_PHONE_NUMBER_ID`; por defecto no se configura un emisor real. No se realizaron envíos WhatsApp, cobros ni correos externos durante estas pruebas.

Antes de actualizar la web, inspeccionar la base **runtime** que usa GoTrue/PostgREST, no la base de fixtures SQL ni PostgreSQL 16 de Dokploy. En el staging anterior pueden faltar:

- `20261028200000_scoped_technician_directory.sql` (directorio acotado de técnicos).
- `20261030014156_workshop_full_trial.sql` (provisión/prueba/cuotas/activación).
- `20261030220017_web_analytics.sql` (analítica y sus permisos).

Aplicar únicamente lo que falte, con respaldo y propietario autorizado. Una copia restaurada de producción puede contener ya las dos últimas; no repetir indiscriminadamente todas las migraciones históricas. El bootstrap de pruebas es para una base descartable y no sirve para actualizar una base real.

Conservar el nombre de proyecto, las redes y los volúmenes existentes. Revisar la configuración efectiva de Dokploy antes de recrear solo la web de staging. `docker compose ... config --quiet` valida interpolación/sintaxis; no comprueba que la ruta de release exista, que PostgreSQL tenga todas las funciones ni que un dominio llegue al servicio correcto. Los dominios y routers temporales documentados en `staging-adoption-20261029.md` requieren comprobación en el VPS.

## Traspaso de datos: siguiente ejecución en el servidor

El destino documentado tiene PostgreSQL propio, pero la aplicación **todavía usa el SDK y las APIs compatibles de Auth/GoTrue, PostgREST y Storage**. Keycloak continúa sin integrar y el manifiesto no incluye Realtime. No presentar este merge como retirada completa de Supabase ni importar cuentas reales a Keycloak como si su login ya funcionara.

1. Inventariar los servicios, esquemas, identidades, roles, extensiones y almacenamiento actuales. Confirmar la versión de Auth y el mecanismo de Storage. Guardar un respaldo cifrado fuera del VPS y comprobar su restauración.
2. Preparar una base destino nueva y aislada: no restaurar encima de los clientes actuales, la base interna de Dokploy ni los fixtures de staging. Mantener UUID de usuarios, vínculos, propietarios, permisos, secuencias y relaciones. Un volcado solo de `public` omite cuentas y metadatos de archivos.
3. Ensayar restauración completa y copia del contenido binario de Storage, conservando claves/rutas y sus checksums. Revisar URLs de evidencias, imágenes y avatares; copiar metadatos no copia los archivos. Verificar funciones, políticas y permisos después de restaurar.
4. Antes de un corte final, detener las nuevas escrituras de web, móvil, webhooks y cron; obtener la copia consistente final. Una copia tomada mientras los clientes siguen escribiendo no basta para prometer ausencia de pérdidas.
5. Con servicios del destino aún detenidos y antes de aplicar cambios de esquema, ejecutar `scripts/migration-reconciliation.sql` en origen y copia con `psql -X`. Usar conexión protegida y archivos de salida privados (`umask 077`), fuera de Git. Comparar con `diff`. Requiere permisos de lectura suficientes; no concede permisos ni modifica tablas. Usa transacción de solo lectura, timeout de 60 segundos y espera de bloqueo máxima de 3 segundos.
6. El informe compara conteos exactos, columnas normalizadas, restricciones, RLS/políticas, hashes de funciones, secuencias y totales de ventas/gastos/stock por taller. No imprime contraseñas, tokens, contenido de sesiones ni identidades de clientes. No comprueba cada valor de cada fila, ACL completas ni archivos binarios; completar con controles de integridad del respaldo y checksums de Storage. Las cuentas y tablas temporales de Auth pueden cambiar si se dejan sus servicios activos.
7. Aplicar los cambios necesarios del destino después de comparar la restauración. Configurar Auth, callback, cookies, recuperación, OTP, SMTP, dominios, pagos y WhatsApp para el entorno que vaya a servir a los clientes. La compatibilidad de las sesiones y secretos de Auth debe verificarse, no suponerse. Conservar administradores y accesos a talleres. Ensayar varias organizaciones y un cliente vinculado sin membresía de equipo.
8. Medir navegación y operaciones sobre la copia con volumen representativo. Validar escrituras seguidas de lectura y Redis caído. Cambiar el tráfico solo al pasar las comprobaciones y mantener una reversión que contemple las escrituras nuevas; no volver a la base antigua después de aceptar escrituras en la nueva sin reconciliarlas.

## Evidencia local y límite operativo

- Suite general: 133 aprobadas, cero fallos; las dos pruebas Redis opcionales se ejecutan aparte.
- Redis real: pruebas aprobadas, incluida la ausencia de invalidación operativa al registrar/consultar analítica.
- PostgreSQL: regresiones del directorio acotado y de las pruebas gratuitas aprobadas. La suite general ejecuta además la regresión SQL de analítica con PGlite.
- Build de producción, TypeScript y lint completados; lint conserva avisos existentes.
- Chromium contra el standalone, PostgreSQL 17, Auth real y Redis locales: nueve apartados, incluido perfil; opciones/historial diferidos, exportación, rechazo de diagnósticos al dueño, Mi Garaje con una cuenta ficticia vinculada y API móvil (anónimo 401, dueño sin vínculo 403, cliente vinculado 200 con año de modelo). Sin errores JavaScript/hidratación en el recorrido. No se probó entrega externa de OTP.
- Ensayo de `pg_dump`/`pg_restore` con datos ficticios: manifiestos iguales entre origen y restauración. Al cambiar un peso en una venta de la copia, la conciliación detectó la diferencia conservando iguales los conteos.
- Compose unificado validado con configuración temporal ficticia; no desplegado por esta ejecución.

No se han transferido datos reales, cambiado dominios, aplicado SQL ni reiniciado producción. La comprobación de conexión del VPS `217.216.88.207:22` devolvió `Connection refused` desde este entorno, y aquí no están disponibles herramientas de Remote Desktop Commander. Continuar el tramo de servidor en la sesión que sí tenga esa conexión usando esta rama y guía; no hace falta recuperar un ZIP.
