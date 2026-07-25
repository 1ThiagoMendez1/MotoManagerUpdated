const sharp = require('sharp');
const fs = require('fs');

async function createFavicon() {
  const size = 512;
  const padding = 48; // Aumentado para dar más margen a los costados
  const logoSize = size - padding * 2;
  const borderRadius = 80; // Bordes bien definidos (redondeados)

  // Create a light gray background with rounded corners using SVG
  const svg = `<svg width="${size}" height="${size}">
    <rect x="0" y="0" width="${size}" height="${size}" rx="${borderRadius}" ry="${borderRadius}" fill="#e5e5e5" />
  </svg>`;

  try {
    // Resize the original logo to fit inside the padded area
    const logoBuffer = await sharp('public/logo.png')
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    // Composite the logo over the white rounded background
    await sharp(Buffer.from(svg))
      .composite([{ input: logoBuffer }])
      .png()
      .toFile('public/favicon-rounded.png');
    
    console.log('Favicon created successfully.');
  } catch (err) {
    console.error('Error creating favicon:', err);
  }
}

createFavicon();
