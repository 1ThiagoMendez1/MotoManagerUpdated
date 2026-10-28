# Navegación y Redis — 28 de octubre de 2026

Base: `codex/v6.8.0-horarios-quota-hardening-20261023`, sincronizada con `6aeba4615ec17338e7f26b52fc4f7e187cbb55fb` antes de entregar (incluye los últimos cambios de demo y consentimiento de marketing). El objetivo es reducir el tiempo entre apartados conservando clientes, funciones y límites por taller. Esta entrega no retira Supabase ni migra producción.

## Cuellos encontrados en código

- Cada lectura de órdenes volvía a leer técnicos y a listar usuarios globales de Auth para sus correos. Ventas también realizaba esa consulta secundaria; la página de órdenes repetía el proceso para cada grupo y selector.
- La pantalla de motos descargaba hasta 1.000 órdenes completas para los diálogos de diez filas, además del lector ligero de estados. La página principal cargaba opciones de creación de órdenes aunque no se abriera el formulario.
- Ventas descargaba hasta 1.000 ventas con relaciones para exportaciones antes de mostrar la página. Los filtros de fecha no se aplicaban en el lector.
- Dashboard esperaba la hidratación y después dos Server Actions de lectura. Las notificaciones del encabezado también usaban Server Actions y podían coincidir con acciones interactivas.
- No había `loading.tsx` compartido: las rutas dinámicas no tenían una transición visible mientras sus consultas terminaban.
- Las peticiones SSR usaban siempre la URL pública de Supabase. Si el VPS devuelve ese tráfico por HTTPS/Traefik, hay un recorrido externo innecesario. Debe comprobarse la ruta real en Dokploy; no se ha medido su coste en producción desde Codex.

## Cambios

1. Redis real, con `ioredis`, conectado a lectores de clientes, motos, inventario, órdenes, ventas, movimientos, técnicos, servicios, estados de motos y resumen del dashboard. Cada lectura exige primero sesión y membresía actuales. Las claves incluyen taller, usuario, rol, permisos, filtros y paginación. No se cachean JWT, sesiones ni autorizaciones.
2. TTL predeterminado 15 segundos, configurable entre 1 y 30; tamaño máximo por entrada 512 KiB; coalescencia de cargas simultáneas por proceso. Si Redis no está configurado o falla, se usa la base. No hay cola offline que bloquee indefinidamente las operaciones.
3. Transporte de Supabase común a clientes SSR y clientes administrativos del servidor. Tras una mutación REST/RPC exitosa invalida la generación del taller cuando puede identificarlo; si el destino es ambiguo o compartido, invalida todas las generaciones. Las RPC conocidas de lectura no invalidan. Las generaciones aleatorias impiden que una clave vieja reaparezca tras una expulsión de Redis. Una carga que empieza antes de una escritura no puede rellenar la generación posterior con datos antiguos.
4. Los clientes del servidor pueden utilizar `SUPABASE_INTERNAL_URL` como destino de transporte. **El SDK sigue creado con `NEXT_PUBLIC_SUPABASE_URL`**, preservando claves de almacenamiento/cookies y URLs públicas de Auth/Storage. El navegador continúa con la URL pública. No se desactiva TLS.
5. Una sola RPC `workshop_technicians` devuelve técnicos activos del taller y sus correos; verifica membresía en SQL. Las órdenes y ventas incluyen el perfil asignado en la consulta principal, sin otra llamada de técnicos ni un listado global de Auth. Sesión y datos del taller se resuelven en la misma consulta de membresía/organización.
6. Historial de cada moto bajo demanda al abrir su diálogo; conserva paginación completa y filtros del técnico. Opciones de nueva orden en el menú principal bajo demanda. Las exportaciones de ventas se solicitan al pulsar, por páginas y con filtros, sin el corte previo de 1.000 filas. Se conservan las pestañas y conteos de motos y su historial.
7. Dashboard recibe las métricas y recordatorios desde SSR. Notificaciones se consultan por GET, se agrupan si ya hay una petición activa y no se consultan en pestañas ocultas. Carga visual inmediata compartida y precarga por intención de navegación, sin precargar todos los módulos pesados a la vez.
8. El saludo del menú usa un HTML inicial estable. El servidor fuerza la zona de Bogotá y el navegador puede usar otra; calcular ambos saludos durante render provocaba un error de hidratación y reconstrucción del menú. La personalización horaria ahora se aplica después de hidratar.

## Despliegue en la infraestructura existente

Preparar y validar primero en staging. No crear otra base ni tocar PostgreSQL 16 de Dokploy. La aplicación todavía usa PostgreSQL 17 del Supabase autoalojado.

1. Aplicar `supabase/migrations/20261028200000_scoped_technician_directory.sql` con el propietario de esquema autorizado. Es una función de lectura con privilegios explícitos; debe existir antes de desplegar el código nuevo. Ensayar su aislamiento entre dos talleres y sus permisos.
2. Confirmar en Dokploy la red Docker privada de la aplicación y la del Kong de Supabase. **No cambiar ni desconectar redes de producción a ciegas.** Usar nombres y alias reales, sin imprimir variables o secretos completos.
3. Desplegar `infra/dokploy/redis.compose.yml`. Configurar `MOTOMANAGER_NETWORK` con la red privada real y `REDIS_PASSWORD` hexadecimal aleatoria de al menos 64 caracteres en el gestor de secretos de Dokploy. No publica el puerto 6379 ni necesita volúmenes: Redis es caché, PostgreSQL conserva la fuente de verdad. El alias DNS es `motomanager-read-cache`.
4. En el **runtime** de la aplicación, configurar de forma segura:

   ```text
   REDIS_URL=redis://:CLAVE_CONFIGURADA@motomanager-read-cache:6379/0
   CACHE_ENABLED=true
   CACHE_TTL_SECONDS=15
   CACHE_NAMESPACE=motomanager:reads:v1
   SUPABASE_INTERNAL_URL=http://ALIAS_REAL_DE_KONG:8000
   ```

   `CLAVE_CONFIGURADA` y `ALIAS_REAL_DE_KONG` son marcadores, no valores para copiar literalmente. La URL interna solo se usa si la aplicación llega a Kong por la red privada verificada. Si no comparten red, dejarla sin configurar hasta establecer conectividad válida. No usar una IP de PostgreSQL como URL de Supabase. No cambiar la URL pública ni la clave de Auth para «activar Redis».
5. Reconstruir/desplegar la aplicación y confirmar que se ejecuta en modo producción (`next start` o standalone), nunca `next dev`. Comparar rutas frías/calientes, navegación, escritura seguida de lectura, dos talleres, permisos, paginación y caída de Redis.
6. `GET /api/admin/performance` requiere superadministrador y devuelve únicamente estado de caché y contadores del proceso. Verificar hits tras navegar dos veces, invalidaciones tras escribir y fallback al detener Redis en staging. En varias réplicas, los contadores son por proceso, mientras que la caché y las generaciones son compartidas.

## Coherencia y límites

La caché acelera lecturas de interfaz; las mutaciones siguen en la base y sus transacciones son la autoridad. Las escrituras que pasan por el transporte común invalidan después de recibir éxito. Escrituras SQL directas o clientes externos que no usan este transporte pueden dejar el resultado visible hasta el TTL, como máximo 30 segundos configurables. No se promete invalidación inmediata de esos canales. En fallos de red durante invalidación también puede existir esa ventana acotada. Desactivar con `CACHE_ENABLED=false` restaura lecturas directas sin borrar datos.

Cambios de roles, bajas y permisos se leen de la membresía activa en cada petición; una respuesta de datos cacheada no evita esa validación. Cambiar SQL/RLS/forma de DTO requiere invalidar globalmente o cambiar `CACHE_NAMESPACE` al desplegar; nunca reutilizar caches de staging en producción. No usar `FLUSHALL` en un Redis compartido.

La coalescencia de cargas es local al proceso; dos réplicas pueden ejecutar una carga fría simultáneamente. No se introdujeron bloqueos distribuidos ni procesos de precálculo de métricas. Las opciones del formulario de órdenes conservan el lector existente; revisar separadamente su límite heredado de 1.000 motos si la organización supera ese volumen.

## Validación

- `npm test`: aislamiento de caché por usuario/taller/permisos, filtros, TTL, expulsión de generaciones, fallos, cargas simultáneas y escritura mientras una carga está en vuelo; pruebas previas de la aplicación.
- `npm run test:cache`: Redis 7 real temporal; dos instancias de caché comparten resultados y se invalidan entre sí. Mide lecturas locales con una fuente que introduce 30 ms **simulados**: no representa la latencia de PostgreSQL ni la mejora de producción.
- `npm run test:db`: regresión existente y nueva función de directorio con roles reales, aislamiento y paginación.
- `npm run build`, después `npm run typecheck` y `npm run lint`; no ejecutar build/typecheck en paralelo por `.next/types`.
- `npm run test:navigation`: navegador Chromium contra aplicación local en modo producción, Auth real, PostgREST y PostgreSQL 17 con datos ficticios. Ver configuración en `tests/README.md`.

### Resultado obtenido en esta entrega

- Suite general: **77 pruebas aprobadas, cero fallos**; las dos pruebas Redis opcionales se omiten aquí y se ejecutaron aparte.
- Redis real: **2/2 aprobadas**, incluida la invalidación desde el transporte común. Veinte lecturas desde otra instancia solo invocaron una vez la fuente antes de invalidar. El último ensayo dio 74 ms de lectura fría y 1,54 ms de media caliente con una fuente de **30 ms simulados**; estas cifras no son un benchmark de la aplicación ni de producción.
- Regresión PostgreSQL: aprobada, incluyendo directorio de técnicos, denegación a otro taller/anon y paginación.
- Build de producción y TypeScript: aprobados. Lint sin errores; conserva avisos existentes de hooks/imágenes y otros componentes.
- Navegador: **ocho módulos**, dos recorridos completos, navegación mediante enlace sin recargar el documento, historial y opciones bajo demanda, exportación y denegación del endpoint de diagnóstico al dueño. Sin errores JavaScript/hidratación en el recorrido final con servidor Bogotá/navegador UTC. Se usaron clientes, moto, orden entregada y venta ficticios; no datos de producción.
- Después de sincronizar los últimos commits de la rama original se repitieron build, TypeScript, suite general y lint. También pasó el recorrido completo con el servidor **standalone** que utiliza el Dockerfile, copiando sus assets públicos/estáticos. Sin errores de ejecución en ese ensayo; no se probaron WhatsApp ni cobros externos.
- Los recorridos de navegador duraron 837–1.416 ms por documento en la primera ronda y 824–1.191 ms en la segunda. **Incluyen los 500 ms de espera `networkidle`, descarga e hidratación**: no equivalen a tiempo SSR, navegación interna pura ni mejora frente a la versión anterior. El tamaño del fixture es pequeño y no reproduce la carga de todos los clientes.
- `redis.compose.yml` arrancó en una red local descartable, llegó a saludable, respondió `PONG` con autenticación y rechazó una petición sin contraseña. No publicó el puerto 6379.

El trabajo requiere pruebas de navegación en staging con el stack real antes de atribuir una mejora a Redis en producción. No se tiene acceso a las herramientas de Remote Desktop Commander dentro de esta ejecución de Codex y no se ha modificado el VPS.

Retirar Supabase supone reemplazar Auth, RPC/PostgREST, Storage y Realtime. No hace falta esa migración para eliminar el trabajo repetido encontrado; primero medir estas mejoras. No presentar este cambio como una migración a PostgreSQL puro ni añadir proxies de caché delante de operaciones financieras para ocultar consultas lentas.
