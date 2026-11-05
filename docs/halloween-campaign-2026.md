# MotoManager · Edición Halloween 2026

Concepto comercial: **Entierra el desorden. Dale vida a tu taller.** La portada, la oferta Full, el cierre comercial y el registro comparten una escena de garaje, naranja MotoManager, tonos oscuros, marfil y detalles lilas. Telarañas, murciélagos, calabazas, dulces, calaveras y un ataúd acompañan el contenido.

La campaña es solo visual. Conserva el registro, la demo, el catálogo, los precios, las condiciones de la prueba y el checkout existentes. No añade descuentos, fechas límite de compra, contadores ni actividad comercial simulada. La bienvenida por WhatsApp conserva su flujo y autorización opcional.

La edición se activa en el servidor del 30 de octubre de 2026 a las 00:00 al 3 de noviembre de 2026 a las 00:00, hora de Colombia. Después vuelve la portada habitual automáticamente. Los 15 días de prueba siguen disponibles. Ver `src/lib/seasonal-campaign.ts`.

## Accesibilidad y rendimiento

- Decoraciones SVG sin interacción, ocultas para lectores de pantalla.
- Ilustración con descripción y dimensiones reservadas, optimizada a WebP de 256.018 bytes.
- Pausa explícita para los dos murciélagos animados; se respeta `prefers-reduced-motion`.
- Navegación móvil, botones con foco visible y contenido sin desbordamiento horizontal en los tamaños revisados.
- Ninguna dependencia nueva ni cambio de esquema, autenticación, pagos o credenciales.

## Arte original

Herramienta: generación de imágenes integrada, mediante la habilidad `imagegen`. El archivo optimizado de la web es `public/campaigns/halloween-garage-2026.webp`. No se sustituye el logo de MotoManager.

Prompt usado:

> Use case: stylized-concept. Asset type: premium commercial website hero illustration for MotoManager, motorcycle workshop management software. Create a visually stunning, expertly art-directed premium 3D Halloween motorcycle garage diorama, isolated on a genuinely transparent background. Main subject: a beautiful realistic black-and-orange scrambler motorcycle in three-quarter view pointing left, a friendly ivory skeleton mechanic in a dark navy work jacket and orange gloves leaning confidently next to it, wearing a matte black full-face motorcycle helmet with visor raised enough to reveal smiling skull. The skull must be charming and stylized rather than horrifying. Surround the motorcycle in a carefully arranged compact composition with large carved glowing orange jack-o-lantern pumpkins in front, a small dark wooden coffin leaning in the far rear, tiny skull at ground level, a scattering of orange and lilac wrapped candies. One subtle cobweb on the coffin. Halloween with premium product photography and tactile stylized 3D, beautiful rubber, painted metal, bone, rough wood and ribbed pumpkins. Crisp detail and rich depth, warm amber pumpkin glow with soft lavender rim light. Restrained palette midnight navy #080c16, MotoManager saturated orange #ff831b, warm ivory, small muted lilac accents. Composition slightly wider than tall, full diorama and wheels and pumpkin silhouettes within frame, high readability when displayed on dark navy website. Deliberate hierarchy: motorcycle and mechanic primary, pumpkins secondary, coffin/candy tiny charming accents. No UI, no screens, no text, no lettering, no logos, no brand marks, no watermark, no blood, no gore. Clean edges with beautiful subtle grounding shadows, sophisticated cinematic advertising look, not a flat vector illustration, not clip art.

## Validación

TypeScript, las 82 pruebas existentes y compilación de producción. Revisión visual de los componentes reales en navegador, con adaptadores de imagen/enlaces para el primer pase aislado; revisión adicional del build Next.js con credenciales ficticias. No se crean cuentas ni se contacta Meta durante esta revisión. La publicación en GitHub no demuestra por sí sola que el VPS haya desplegado la versión: comprobar el sitio público o el estado del servicio antes de comunicarlo como publicado.
