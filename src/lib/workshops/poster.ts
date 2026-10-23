export function escapeXML(value: string) {
  return value.replace(/[<>&"']/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[character]!));
}

// The QR SVG comes exclusively from the local qrcode encoder, never from input.
export function workshopPoster(name: string, url: string, qrSVG: string) {
  const qr = qrSVG.replace(/<\?xml[^>]*>/g, '').replace(/<svg\b[^>]*viewBox="([^"]+)"[^>]*>/,
    '<svg x="154" y="360" width="592" height="592" viewBox="$1">');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1273" viewBox="0 0 900 1273">
    <rect width="900" height="1273" fill="#0c1420"/>
    <rect x="48" y="48" width="804" height="1177" rx="32" fill="#121f30" stroke="#34516a"/>
    <text x="450" y="133" text-anchor="middle" font-family="sans-serif" font-size="20" letter-spacing="5" fill="#67e8c9">MI TALLER · MOTOMANAGER</text>
    <text x="450" y="218" text-anchor="middle" font-family="sans-serif" font-size="34" font-weight="bold" fill="white" textLength="710" lengthAdjust="spacingAndGlyphs">${escapeXML(name)}</text>
    <text x="450" y="292" text-anchor="middle" font-family="sans-serif" font-size="30" fill="white">Tu moto tiene un lugar.</text>
    <rect x="130" y="336" width="640" height="640" rx="24" fill="white"/>
    ${qr}
    <text x="450" y="1035" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="bold" fill="#67e8c9">ESCANEA Y CONECTA CON TU TALLER</text>
    <text x="450" y="1082" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#c1cfdd">Verifica tu correo · Regístrate · ¡Listo!</text>
    <text x="450" y="1145" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#c1cfdd" textLength="710" lengthAdjust="spacingAndGlyphs">${escapeXML(url)}</text>
    <text x="450" y="1190" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#91a4b7">Registro de clientes. Sin permisos de administración.</text>
  </svg>`;
}
