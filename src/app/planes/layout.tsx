import type { Metadata } from 'next';

/**
 * Layout propio para la landing page de /planes.
 * Supera el layout raíz con su propio fondo oscuro y sin el header del taller.
 * El layout raíz sigue renderizando el Header y el fondo de imagen,
 * pero este layout los oculta via CSS (overflow hidden + propio background).
 */
export default function PlanesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Override global background & header with a full-screen fixed overlay */}
      <style>{`
        /* Ocultar el header del taller en la landing page */
        body > div > header,
        [data-header="app-header"] {
          display: none !important;
        }
        /* Resetear el padding-top que el layout root pone para el header */
        .planes-root-override {
          position: fixed;
          inset: 0;
          z-index: 50;
          background: #080b14;
          overflow-y: auto;
          overflow-x: hidden;
        }
      `}</style>
      <div className="planes-root-override bg-background">
        {children}
      </div>
    </>
  );
}
