# Continuar la revisión de rendimiento y QR

Esta rama conserva los cambios preparados en Codex para que puedan recuperarse sin descargar el ZIP del chat.

- Repositorio: `1ThiagoMendez1/MotoManagerUpdated`.
- Rama de revisión: `codex/v6.8.0-rendimiento-qr-20261023`.
- Base de producción revisada: `v6.8.0`, commit `e6deb5d759e0c93c859379f9e4dea3531a537398`.
- La entrega original contiene 69 archivos afectados; este documento se añade como guía de recuperación.
- No se ha desplegado esta rama, aplicado sus migraciones a producción ni migrado clientes. La rama de producción no forma parte del push de esta entrega.

## Primeros pasos

1. Recuperar esta rama en un clon o directorio de revisión separado del despliegue. Inspeccionar su diferencia frente al commit base. Si producción avanzó, integrar sin descartar cambios posteriores.
2. Leer `docs/production-review-v6.8.0.md` y `tests/README.md` antes de ejecutar migraciones o preparar despliegues.
3. Continuar el inventario de solo lectura a través de la conexión Remote Desktop Commander que el usuario ya tiene en ChatGPT normal. El entorno cloud de Codex anterior no recibió las herramientas de ese complemento y no logró autenticar por SSH. Los datos de acceso los proporciona el usuario en su conversación, no este repositorio.
4. Inspeccionar respaldos reales y verificar una restauración antes de preparar el corte. Supabase ya está autoalojado en el VPS del usuario con PostgreSQL 17; el PostgreSQL 16 de Dokploy es independiente y no se debe migrar como si fuera MotoManager.

## Trabajo implementado

- Agregación SQL del dashboard en una RPC autenticada, deduplicación de sesión SSR por petición, correcciones de calendario/stock/estados y preparación de índices concurrentes.
- Excel y PDF bajo demanda, datos del perfil desde SSR y agrupación de recargas de Realtime.
- Autorización administrativa mediante metadata del servidor o cuentas explícitas; comprobaciones dentro de las acciones y retirada de logs de credenciales.
- Perfil del taller con activación de registros, QR y cartel vectorial, página pública y registro con correo verificado/consentimiento. El cliente nunca se convierte en miembro del equipo.
- Tres migraciones nuevas, pruebas de aplicación y SQL, Compose de ensayo PostgreSQL/Redis e informe de migración y reversión.

Las pruebas locales pasaron: instalación congelada, cinco pruebas unitarias, regresión SQL en PostgreSQL 17 aislado, build final con Next 15.5.28, TypeScript, lint con avisos, registro completo con Auth/PostgREST/Mailpit reales locales y prueba de propietario/descarga/activación. El Compose pasó healthchecks y conservación de un dato tras reinicio. No equivalen a validación sobre datos reales de producción.

First Load JS: ventas 540 a 232 kB, dashboard 414 a 276 kB. Falta medir latencia y concurrencia reales.

## Pendientes que no deben omitirse

El informe describe vulnerabilidades heredadas del portal por placa y OTP móvil, carreras en cotizaciones/inventario, proxies simulados, deriva de esquema y 74 avisos de dependencias de producción tras las correcciones compatibles, incluidos dos críticos. La solución propuesta no declara resueltos esos problemas.

Supabase sigue siendo dependencia de Auth, PostgREST/RPC, Storage y Realtime. El Compose no convierte la aplicación a PostgreSQL puro y Redis todavía no está integrado. Antes de retirar componentes, medir su uso real, preservar cuentas, permisos, objetos binarios, URLs, funciones y datos, y ensayar la conciliación y reversión.

Continuar de forma autónoma con acciones reversibles; coordinar el corte real después de tener un resultado revisable, respaldo restaurable y plan para las nuevas escrituras. No imprimir `.env`, JWT ni claves. No ejecutar resets o borrados de volúmenes en producción.
