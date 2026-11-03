# Analítica web de MotoManager

El administrador de la plataforma abre **Analítica web** desde `/admin` o desde el menú Plataforma. Ruta: `/admin/analitica-web`. Los dueños de talleres y usuarios normales no tienen acceso al informe ni a su exportación.

## Qué mide

- Actividad anónima en los últimos cinco minutos; navegaciones estimadas, páginas vistas, tiempo activo y rebote. No representa personas únicas ni navegadores únicos persistentes.
- Evolución por hora/día, fuentes, buscadores/IA, redes sociales, anuncios y etiquetas UTM.
- Dispositivos, países y ciudades aproximadas; mapa geográfico local sin servicios externos de mapas.
- Clics y profundidad de desplazamiento por página, tamaño de pantalla y variante de contenido. Se conservan coordenadas normalizadas y medidas reales del documento; distintas versiones no se superponen.
- Navegación, llegada al registro, inicio del formulario y prueba Full activada. Las activaciones se cuentan como totales verificados sin atribuirlas a una visita individual.
- Navegaciones anónimas y, separadamente, accesos y activaciones de cuentas verificadas por Supabase Auth. Las identidades no se asocian a mapas de calor o visitas.
- Filtros de fecha, página y canal; actualización cada 30 segundos, pausa y exportación CSV agregada.

Una navegación usa un UUID generado solamente en memoria durante la vida del tracker activo. No se guarda en cookies ni en localStorage o sessionStorage ni sobrevive una recarga; las cifras de visitantes son sesiones efímeras estimadas, no personas o navegadores únicos. Una visita expira tras 30 minutos sin actividad. El tiempo activo cuenta la pestaña visible; el rebote significa una sola vista y menos de 10 segundos activos. Las conversiones se informan como totales verificados independientes sin atribución personal.

## Privacidad y exactitud

La analítica básica no muestra un aviso de aceptación propio ni almacena cookies o identificadores persistentes en el navegador. Se respetan DNT/GPC. No se guardan valores de formularios, contraseñas, texto escrito, movimientos del cursor, grabaciones, URL con parámetros, IP sin procesar ni identificadores publicitarios. Login y registro de talleres no recopilan clics. Admin, operaciones internas y portales de clientes quedan excluidos. Las cookies y las claves históricas de analítica se eliminan oportunistamente.

La publicidad de Meta permanece desactivada hasta autorización explícita y guarda su preferencia por separado. La opción «Privacidad» permite activarla sin tapar la portada de MotoManager.

Los accesos a cuentas y las altas de talleres se registran después de confirmar Auth/provisionamiento, sin enlazarse a visitas anónimas. Las consultas privadas siguen validando getUser() y isSuperAdmin(). La ausencia de cookies no establece una exención universal de las obligaciones de privacidad; evaluar la normativa aplicable antes de comercializar esta forma de medición.

El mapa de clics es un plano de las secciones medidas, no una captura o reproducción de la pantalla. Se separa cada cohorte de diseño; máximo 40 cohortes y 10.000 puntos por consulta, con aviso cuando hay muestra. Una ciudad por IP es una aproximación del proveedor de Internet o VPN, **no GPS, domicilio ni posición exacta de una persona**. Las ubicaciones no disponibles se muestran como tales. No se reconstruyen visitas anteriores a la activación.

## Instalación

1. Aplicar `supabase/migrations/20261030220017_web_analytics.sql` con el propietario de las tablas (`supabase_admin` en este VPS), usando `psql -v ON_ERROR_STOP=1`. La migración es transaccional; añade únicamente seis tablas y cinco funciones propias.
2. Desplegar la aplicación con las claves Supabase existentes. No se necesita una clave adicional. Los UUID volátiles se seudonimizan con HMAC y la clave privilegiada exclusivamente en el servidor; no se crean cookies de analítica.
3. El Dockerfile crea `/app/.analytics`, configura `ANALYTICS_GEOIP_DB=/app/.analytics/geoip.mmdb` y habilita `ANALYTICS_GEOIP_DOWNLOAD=1`. La primera consulta arranca una descarga de referencia en segundo plano. El mapa indica mientras tanto que la ubicación no está disponible. Se puede anticipar con `node scripts/analytics-geo-download.mjs --output /ruta/geoip.mmdb`.
4. Verificar que el proxy de entrada sobrescriba `x-real-ip`. Cuando ese salto pertenece a un rango publicado de Cloudflare, el servidor usa `cf-connecting-ip` (o la IPv6 original para Pseudo IPv4), sin geolocalizar el nodo CDN. Un encabezado Cloudflare enviado por un cliente directo no tiene autoridad; tampoco se atribuye la IP compartida de Workers entre zonas. Rangos comprobados el 2 de noviembre de 2026 en `https://www.cloudflare.com/ips-v4/` y `https://www.cloudflare.com/ips-v6/`. Si otro proxy usa un encabezado confiable diferente, definir `ANALYTICS_CLIENT_IP_HEADER` expresamente. No confiar en encabezados que el cliente pueda falsificar. Las IP privadas o ausentes no producen ubicaciones inventadas.
5. Comprobar 401 sin sesión, 403 para un dueño de taller, informe exclusivo del dueño de la plataforma y una navegación pública autorizada. La migración ausente produce un estado de activación pendiente y nunca interrumpe el alta o el login.

Las tablas tienen RLS habilitado y no dan permisos a `anon`, `authenticated` o `PUBLIC`. Las funciones son `SECURITY INVOKER` y solo `service_role` puede ejecutarlas. Auth no recibe nuevos permisos de lectura. El cliente no puede enviar identidades o activaciones. Límites: 32 KB, 30 eventos/8 diseños por lote; 120 peticiones/minuto por visitante y 600 por IP seudonimizada al día. Identificadores de lote y evento evitan duplicados; un bloqueo transaccional unifica lotes de la misma navegación, no pestañas independientes.

Se conservan 90 días. Si `pg_cron` ya está instalado, se agenda limpieza diaria a las 08:17 UTC. También hay limpieza oportunista desde el servidor, acotada a estas tablas. Una eliminación de usuario elimina sus accesos; las nuevas navegaciones anónimas no almacenan identidades. La exportación neutraliza fórmulas de hojas de cálculo.

## Datos geográficos y licencias

- DB-IP City Lite, [CC BY 4.0](https://db-ip.com/db/download/ip-to-city-lite); atribución visible en el panel. La base MMDB se consulta localmente: **ninguna IP de visitante se envía a DB-IP**. Descarga HTTPS mensual con límites, validación MMDB y reemplazo atómico. Edición validada inicialmente: octubre de 2026, SHA-1 publicado `df17bd24390108ed1d24dcb7718dc60f6b9abd4f`. Las siguientes ediciones se validan mediante HTTPS y estructura, sin atribuirles este checksum.
- Contornos Natural Earth, [dominio público](https://www.naturalearthdata.com/about/terms-of-use/), 177 países. Fuente: `nvkelso/natural-earth-vector/geojson/ne_110m_admin_0_countries.geojson`; SHA-256 del archivo de origen `6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f`. Proyección equirectangular determinista. El SVG no hace peticiones a proveedores de mapas.

## Validación

`npm run typecheck`, `npm run build` y `node --import tsx --test tests/*.test.ts`. Las nuevas pruebas ejecutan PostgreSQL real aislado con PGlite: RLS, permisos, RPC, deduplicación, embudo, atribución, separación de mapas y retención. También prueban ausencia de cookies, identificadores persistentes y vinculación de cuentas; limpieza de cookies antiguas, origen/tamaño, exclusión administrativa y acceso autenticado. Las pruebas locales no equivalen a una sesión real de Auth en producción.
