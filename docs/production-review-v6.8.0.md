# Revisión de producción v6.8.0

Base revisada: rama `v6.8.0`, commit `e6deb5d759e0c93c859379f9e4dea3531a537398`. Trabajo local; no se han modificado servicios ni datos de producción. Fecha: 22 de octubre de 2026.

## Qué cambia

- Dashboard: una RPC con respuesta acotada reemplaza once consultas de negocio, incluidas siete consultas diarias consecutivas. La base agrega importes y devuelve siete días, cinco productos y los métodos de pago. La sesión y el cliente SSR se deduplican **por petición** con React `cache`, sin compartir sesiones ni datos entre clientes.
- Se usa el calendario de Bogotá, se suman existencias por ubicación, se respeta un stock mínimo de cero y se excluyen ventas canceladas del ranking y órdenes canceladas del contador de actividad. Son correcciones respecto a los indicadores anteriores; contrastar cierres reales antes del despliegue.
- Excel y generación de PDF se descargan bajo demanda; el perfil recibe sus datos desde el servidor. Las recargas de Realtime se agrupan y se posponen mientras la pestaña está oculta. Las suscripciones con `organization_id` se filtran por taller. Las tablas hijas conservan su RLS.
- Next pasa de 15.3.3 a 15.5.28. Se alinea `eslint-config-next` con Next 15, se actualizan dependencias compatibles y se retira `ngrok`, que no se usa en `src` y hacía fallar la instalación al descargar un binario innecesario.
- La autorización de superadministrador usa `app_metadata` controlada por el servidor o las dos cuentas explícitas ya reconocidas por la aplicación. Se elimina la concesión de privilegios por prefijo `admin@` o por `user_metadata` editable. Las acciones administrativas validan permisos dentro de cada acción, además del layout. `/debug` también requiere superadministrador. Se retiran logs que imprimían contraseñas en el AuthProvider heredado.

## Resultados de rendimiento

Comparación de dos compilaciones locales de producción antes y después de separar Excel/PDF, ambas en Next 15.3.3. Son tamaños de **First Load JS informados por Next**, no tiempos ni percentiles de producción:

| Ruta | Antes | Después | Reducción aproximada |
| --- | ---: | ---: | ---: |
| Ventas | 540 kB | 231 kB | 57% |
| Dashboard | 414 kB | 275 kB | 34% |
| Clientes | 314 kB | 175 kB | 44% |
| Inventario | 385 kB | 251 kB | 35% |
| Motocicletas | 347 kB | 213 kB | 39% |
| Servicios | 340 kB | 202 kB | 41% |
| Técnicos | 403 kB | 269 kB | 33% |

En el build final con Next 15.5.28, ventas marca 232 kB y el dashboard 276 kB; la diferencia frente a la tabla es de aproximadamente 1 kB por la actualización del framework.

No se han medido latencias, concurrencia, p95/p99 ni planes sobre datos reales. Medir en staging con una copia protegida: tiempo de respuesta por pantalla, filas leídas, tamaño transferido, conexiones, CPU y consultas lentas. Ejecutar `EXPLAIN (ANALYZE, BUFFERS)` en staging con usuarios representativos. El ranking de productos todavía agrega el histórico de ventas pagadas: si domina el coste, el siguiente paso es un resumen incremental con conciliación, no un caché global de datos de talleres.

Redis se deja opcional en el Compose como infraestructura disponible. **La aplicación no lo usa todavía.** Las primeras mejoras eliminan consultas y descargas innecesarias; introducir caché de inventario, permisos o facturación sin invalidación sería arriesgado. Si las mediciones justifican Redis: claves por organización, TTL explícito, invalidación tras confirmar transacciones y respaldo a PostgreSQL ante fallos. Separar límites de acceso de una caché con política de expulsión.

## Vitrina y registro QR

En **Perfil → Tu vitrina conecta**, propietario o administrador activa las inscripciones, descarga QR SVG o cartel vectorial en proporción A4, copia el enlace y abre la página pública `/talleres/<slug>`.

El QR se genera localmente; ninguna API externa recibe la URL ni los datos del taller. Contiene solo la URL pública. Generarlo desde el dominio HTTPS definitivo, probar varios teléfonos y no recortar el margen blanco al imprimir. Si cambia el dominio o el slug hay que reimprimir. No hay códigos con credenciales.

El cliente verifica su correo mediante un enlace de Supabase Auth, vuelve a la página del taller y confirma nombre, apellidos, teléfono y consentimiento de servicio. No se inscribe en publicidad. Queda en `customers` y en `workshop_customer_accounts`, nunca en `organization_members`. Se conserva fecha y versión del consentimiento. El teléfono es contacto declarado, **no un teléfono verificado**.

Un correo verificado coincidente puede vincular una ficha existente del mismo taller sin sobrescribir sus datos. Si existen varias fichas con ese correo, o la ficha ya pertenece a otra cuenta, se pide revisión del taller. Los reintentos son idempotentes y se serializan en PostgreSQL. Desactivar inscripciones invalida nuevos registros incluso con carteles antiguos; conserva clientes y asociaciones existentes. Solo se publica nombre, slug, teléfono público, ciudad y dirección.

Configurar en Supabase Auth la URL principal y la URL permitida `https://DOMINIO/auth/callback` con los parámetros de retorno de los talleres (o el patrón autorizado equivalente para ese dominio), proveedor SMTP, confirmación de correo y límites de envío. El callback solo admite rutas `/talleres/<slug>`. El navegador que solicita el correo debe abrir el enlace para conservar el verificador PKCE. No se han añadido servicios de correo ni claves reales al repositorio.

## Orden de despliegue del cambio compatible

1. Ensayar con copia de staging y respaldo restaurado. Inventariar esquemas reales con `scripts/database-inventory.sql`. No imprimir datos de usuarios, contraseñas, sesiones ni claves.
2. Confirmar la lista de superadministradores: las cuentas adicionales legítimas deben tener `app_metadata.is_super_admin=true` asignada mediante una operación administrativa confiable. No copiar automáticamente `user_metadata` a privilegios. Verificar al menos una cuenta de administración antes de publicar el código.
3. Aplicar **solo** estas nuevas migraciones, en orden: `20261022215000_membership_policy.sql`, `20261022220000_dashboard_summary.sql`, `20261022221000_workshop_enrollment.sql`. Son aditivas salvo la corrección de la política recursiva conocida. Revisar las políticas efectivas si producción difiere del esquema del repositorio. Las funciones públicas tienen concesiones explícitas, `search_path` fijo y comprobaciones de usuario/taller.
4. Ejecutar `scripts/performance-indexes.sql` con `psql` en autocommit. Usa `CREATE INDEX CONCURRENTLY`; no envolver en una transacción. Vigilar espacio, actividad y posibles índices inválidos antes de reintentar.
5. Ejecutar `npm ci`, `npm test`, `npm run test:db`, `npm run typecheck` y `npm run build`. El proyecto necesita Node >=22. El build usa Google Fonts; el constructor necesita acceso verificado a sus hosts. Los tests de base usan Docker y una base desechable aislada, no `DATABASE_URL`.
6. Desplegar primero en staging con las variables de Supabase existentes y luego probar datos reales anonimizados: ventas, cobros, devolución de inventario, cierres, permisos, dos talleres, registro existente/nuevo y desactivación del QR. Configurar SMTP y las URLs de retorno antes de probar el correo.
7. Publicar gradualmente en Dokploy conservando el artefacto anterior y observar errores, métricas y consultas. Mantener inscripciones desactivadas hasta terminar la revisión de autorización y datos.

Para revertir la aplicación, recuperar el artefacto anterior. Desactivar el QR desde el perfil; no borrar `customers` ni `workshop_customer_accounts`. Las funciones e índices aditivos pueden permanecer. No restaurar vulnerabilidades de autorización como mecanismo de reversión. No ejecutar `supabase db reset`, reinicializaciones ni `down -v` en producción.

## Salida de Supabase: qué falta para PostgreSQL puro

Supabase ya usa PostgreSQL, pero esta aplicación también llama directamente a sus APIs de Auth, PostgREST/RPC, Storage y Realtime. **El Compose no elimina estas dependencias y esta entrega no corta producción a PostgreSQL puro.** No hay credenciales, copia de producción ni acceso a Dokploy en este entorno.

Destino inicial: [Compose para Dokploy](../infra/dokploy/README.md) con PostgreSQL 17, volumen persistente, checksums y red privada; Redis opcional con autenticación y sin puertos públicos. Aún no hay contenedor de aplicación que funcione sobre PostgreSQL puro.

Ensayo necesario antes del corte:

1. Inventario autorizado de versión de PostgreSQL, extensiones, tablas, secuencias, triggers, funciones, políticas y publicaciones; tamaños, cargas, número de talleres y ventanas de mantenimiento. Comparar base efectiva con el repositorio, que contiene modificaciones históricas y dos migraciones con el mismo prefijo `20260825000000`.
2. Obtener respaldo consistente y cifrado de **datos y esquema**, incluidas referencias de `auth` y metadatos de `storage`, con herramientas compatibles con la versión del servidor. Usar archivos protegidos y un gestor de secretos; un volcado puede contener hashes y sesiones. No exportarlo al repositorio ni mostrarlo en chat. Restaurar en el destino aislado y registrar conteos exactos por tabla/taller, integridad referencial, secuencias, importes y archivos. Una copia solo de `public` no es una migración completa.
3. Copiar los objetos binarios de Storage a almacenamiento compatible (S3 o equivalente). Comprobar inventario, rutas, permisos y hashes. Los metadatos SQL **no incluyen los archivos**. Reescribir o redirigir URLs antiguas solo con un mapa completo y verificado.
4. Implementar y ensayar la capa de identidad propia: contraseñas/hash compatible, correo, recuperación, MFA si existe, revocación, sesiones web y tokens móviles. Exportar `auth.users` por sí solo no conserva el servicio de login. Decidir y comunicar si será necesario volver a iniciar sesión. No inventar contraseñas ni prometer conservar sesiones sin verificarlo.
5. Sustituir consultas PostgREST y RPC por un repositorio SQL con parámetros, transacciones y pool limitado; mantener aislamiento por organización y pruebas equivalentes a RLS. Implementar almacenamiento privado y canal de eventos autenticado para reemplazar Storage y Realtime. Pasar las pruebas de ventas, inventario, cobros, portal, evidencias y roles sobre esta capa antes de conectar producción.
6. Elegir copia final durante una pausa de escrituras controlada o replicación lógica/CDC supervisada. No operar dos fuentes de verdad sin un protocolo de consistencia. Conciliar conteos, totales, fechas, blobs y permisos; hacer canary con un taller y disponer de reversión sin perder escrituras nuevas. El corte necesita acceso y una ventana acordada.

## Hallazgos que siguen pendientes

- El portal web heredado `src/app/clientes/actions.ts` consulta datos mediante service role usando una placa como identificador y permite mutaciones por ID sin prueba de titularidad. La API móvil utiliza OTP en metadata, `Math.random`, contraseña temporal fija al crear cuentas y `listUsers` sin paginación. Requieren un cambio de autenticación específico, límites de intentos y un plan para los clientes existentes; el registro QR nuevo no corrige esos flujos heredados.
- La aprobación pública de cotizaciones descuenta inventario en varias operaciones y permite carreras. Cierres y mutaciones de inventario/facturación necesitan pruebas de concurrencia y transacciones antes de considerarse conciliados para una migración.
- Hay 15 proxies simulados (`new Proxy`) en suscripciones, tickets, técnicos y componentes; varios devuelven éxito sin persistir o consultan nombres de tablas heredados. `Database = any` oculta deriva de esquema. La interfaz no prueba que esas funciones funcionen.
- La página de órdenes descarga hasta 1.000 órdenes adicionales para filtrar motos, y los selectores también están limitados a 1.000 registros. Hay `select('*')` y relaciones amplias en consultas operativas. Sustituirlos por búsquedas/paginación con proyecciones concretas tras pruebas de regresión; no truncar datos silenciosamente.
- Se corrigieron 26 caracteres sin escapar en texto JSX, conservando el texto mostrado. Los avisos heredados de dependencias de hooks y exportación anónima siguen visibles; no se deshabilitaron reglas.
- Tras correcciones compatibles, `npm audit --omit=dev` aún informa 74 hallazgos: 63 moderados, 9 altos y 2 críticos. Los críticos restantes son `jspdf` y `maplibre-gl`; las soluciones propuestas implican cambios mayores. `xlsx` no tiene corrección en su versión de npm y debe sustituirse o aislarse de entradas no confiables. Evaluar actualización de Tailwind/PostCSS y telemetría/Genkit. No se declara este código listo para un despliegue sin revisar estos hallazgos.

## Evidencia y límites

Pruebas unitarias: cinco casos, incluida decodificación del QR rasterizado del cartel y validación de entradas, retorno y privilegios. Pruebas SQL: migraciones nuevas sobre PostgreSQL 17 con esquemas base y fixture mínimo de stock, consultas reales y comprobaciones que lanzan error ante fallos; se cubren denegación de cliente y taller ajeno, consentimiento, correo no confirmado, idempotencia, bajas del QR, totales y RLS de asociaciones. También se crean los índices concurrentes.

Este ensayo SQL no reproduce todas las migraciones históricas ni todos los servicios de producción. La instalación reproducible con `npm ci` y la compilación final de producción con Next 15.5.28 pasaron. TypeScript y lint también pasaron por separado, después del build: Next regenera `.next/types`, por lo que no deben ejecutarse en paralelo con él. El conjunto completo local de Supabase agotó el disco durante la descarga y se detuvo; las imágenes no necesarias se retiraron. El ensayo reducido con Auth y PostgREST reales, PostgreSQL y Mailpit local pasó el flujo móvil completo: envío de correo local, verificación, callback PKCE, registro y denegación de administración al cliente. También pasó inicio de sesión de propietario, perfil, descarga del cartel, desactivación (HTTP 404) y reactivación (HTTP 200). La prueba de navegador está en `tests/workshop-browser.mjs`; los requisitos y límites están en `tests/README.md`.

El Compose de Dokploy pasó validación, arranque y healthchecks de PostgreSQL y Redis. Se insertó un dato de prueba, se reiniciaron los contenedores y se confirmó su conservación y la respuesta PONG. El proceso Redis corre como usuario `redis`. Esto valida la infraestructura local de ensayo, no un despliegue ni una migración real en Dokploy.

Se actualizaron los campos `install_script` y `start_skill` del borrador del entorno para retirar las instrucciones obsoletas de main/Prisma/Node 20 y describir el flujo v6.8.0. El guardado no publica el entorno ni cambia la configuración de producción.
