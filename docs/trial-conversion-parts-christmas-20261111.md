# Registro de prueba, rentabilidad de repuestos y Navidad interna

## Alcance

Base de producción: `90f0050fe8074b570f869b673739a648deb1731a`. Esta entrega conserva el cobro por servicio y la nómina desplegados anteriormente.

### Registro y web comercial

La captura de Analítica del 11 de noviembre, hasta las 14:42 de Bogotá, muestra 101 visitas, 87 desde anuncios, 31 navegaciones que llegaron al registro, 36 vistas de esa página y 0 activaciones registradas. El 84 % del tráfico corresponde a celular, con 28 segundos de actividad media y 52,5 % de rebote. Una navegación se reinicia al recargar: estas cifras no equivalen a personas únicas. La captura del mapa corresponde a una sola vista/navegación, por lo que sus clics no se extrapolan a las 101 visitas.

Hallazgos verificables:

- El formulario anterior recibía foco al abrirse. El tracker contaba ese foco como inicio: los 31 inicios no demuestran que 31 personas escribieran datos.
- El formulario pedía seis datos en tres pantallas dentro de un modal. Ahora se muestran dos pasos en la página: taller y nombre; luego WhatsApp, correo y contraseña. La ciudad se completa en el perfil.
- La solicitud de bienvenida y las condiciones viajan como campos explícitos del envío final, incluso al usar Enter. Se mantiene el texto visible de aceptación y no hay casillas adicionales.
- Los errores se presentan junto al campo, en español, conservando lo escrito. Los errores de cuenta ofrecen inicio de sesión y recuperación. El registro no espera la entrega de WhatsApp para dar acceso.
- La limitación de intentos usa el mismo resolutor de IP verificada que Analítica; evita agrupar usuarios por una IP compartida de Cloudflare. Se conservan las restricciones y el límite existente. Esto era un riesgo del código, no una causa comprobada de los abandonos de la captura.
- Ante una respuesta de aprovisionamiento perdida no se elimina el usuario: la transacción podría haberse confirmado. Solo un fallo explícito de la operación atómica permite deshacer la cuenta recién creada.
- El mensaje principal explica seguimiento de la moto y control del taller. La prueba es la acción principal. La demo conserva su recorrido, se carga al abrirla y al terminar conduce a crear el taller. No se añaden cifras, testimonios, urgencia ni escasez ficticios.

### Diagnóstico del registro

`web_trial_signup_diagnostics` separa las cohortes nuevas (`trial-v2`) de las antiguas. Muestra llegadas, escritura real, paso de acceso, navegaciones con envío, cantidad de intentos y errores permitidos. No recibe datos de los campos ni mensajes del proveedor. Se respetan DNT y GPC.

Las pruebas realmente creadas se cuentan en `motomanager_private.workshop_trial_claims`, independientemente del registro de accesos de Analítica. Son un total del periodo de todos los canales; no se atribuyen a navegaciones ni campañas. Los errores operativos del servidor se guardan como contadores por día de Bogotá y código, sin identidad, IP ni datos del formulario. No se suman con los errores del navegador, porque podrían representar el mismo intento. No se reconstruyen etapas que no se midieron antes.

La captura y los cambios no prueban causalidad ni garantizan una tasa de conversión. La medición nueva permite comprobar dónde se pierde la siguiente cohorte.

### Contabilidad: rentabilidad de repuestos

Nueva pestaña **Rentabilidad de repuestos**, sujeta al permiso de Contabilidad y al taller de la sesión. Permite consultar un periodo de hasta 366 días, buscar por nombre/SKU/categoría, ordenar y paginar. Incluye:

- Venta neta, unidades, costo vendido, utilidad bruta y margen por repuesto.
- Rankings de unidades vendidas y utilidad positiva.
- Stock actual, unidades por día, última venta del periodo, cobertura estimada y repuestos sin salida.

Solo se incluyen ventas pagadas, numeradas y que no sean abonos. Los ingresos se obtienen de las líneas de la factura, no del saldo cobrado después del abono. Los descuentos se distribuyen proporcionalmente: en ventas por servicio corresponden a los repuestos; en venta directa se reparten sobre las líneas correspondientes. Se corrige el centavo residual para conservar el descuento total.

El costo de referencia es el último costo registrado en Inventario al emitir la venta; no calcula FIFO ni distribuye lotes de compra. Queda en un registro privado al facturar, sin agregar campos de costo a `sale_items`, que puede ser consultada por otros roles. Un cambio posterior en Inventario no reescribe el costo de la venta. La captura de costos no modifica totales, facturas, existencias, órdenes ni nómina. La interfaz explica este método para que el taller interprete la utilidad correctamente.

Para históricos se usa la última compra recibida antes de la venta cuando existe evidencia. Si solo hay costo actual, se conserva como **estimación histórica**, excluida por defecto y disponible con una opción explícita. Sin costo comprobable no se inventa utilidad ni margen. Una compra de costo cero documentada sí es válida; cero por defecto en Inventario se trata como costo desconocido. Una factura pendiente conserva su costo al emitirse, pero solo aparece cuando está pagada.

La utilidad es bruta, antes de nómina y gastos operativos. El margen se calcula sobre ingresos de las unidades con costo incluido. La cobertura usa stock actual y el promedio de venta del periodo; no es una promesa de demanda futura.

El resumen previo llamaba «Utilidad neta» a entradas menos salidas registradas, incluyendo abonos, sin medir el costo vendido. Se corrigen esas etiquetas y se añade una explicación del alcance, conservando los importes existentes. El detalle de utilidad de repuestos utiliza su propio cálculo de ingresos y costos, sin confundir caja con rentabilidad.

### Navidad interna

Del 1 de noviembre al 6 de enero, según el calendario de Bogotá, se muestran ramas de pino, luces estáticas cálidas y acentos dorados en la cabecera privada. Se conservan el logo y los colores funcionales. Cada navegador puede ocultar y volver a mostrar la decoración. Las páginas públicas no usan esta decoración; conservan su campaña propia. La impresión oculta los adornos.

## Migraciones

1. `20261111193529_parts_profitability_cost_snapshots.sql`
2. `20261111200459_trial_signup_conversion_diagnostics.sql`

El reporte financiero usa `SECURITY INVOKER`, permisos explícitos y aislamiento por organización. Únicamente el trigger privado que captura costos utiliza `SECURITY DEFINER`, con `search_path` vacío y ejecución revocada para clientes. Los diagnósticos de registro solo pueden ejecutarse desde el servidor con rol de servicio; la ruta administrativa mantiene su autorización.

## Validación de desarrollo

- TypeScript sin errores.
- Suite de 193 pruebas: 191 aprobadas y 2 omitidas por Redis local no disponible.
- PostgreSQL aislado con PGlite: costos históricos, descuentos, costo inmutable, facturación con abonos, exclusión de ventas pendientes/anuladas, búsqueda/rotación/paginación y permisos financieros.
- Pruebas de registro: validación, normalización, sesión existente, limitación, duplicados, limpieza únicamente tras fallo confirmado y protección frente a respuesta perdida.
- PostgreSQL de diagnósticos: separación de cohortes, reintentos, conteo real de pruebas, filtros, códigos permitidos y denegación de acceso a roles del navegador.
- Integración DOM del formulario real usando la versión de React incluida por Next: navegación con Enter, errores, conservación de datos, envío único y telemetría sin valores de campos. Esta comprobación no verifica pintura ni diseño en un navegador.

## Publicación

Pendiente de completar la validación con PostgreSQL 17 y navegador en el entorno aislado del VPS, y registrar aquí el resultado del despliegue. No se deben aplicar datos ficticios ni enviar WhatsApp a clientes durante las pruebas.
