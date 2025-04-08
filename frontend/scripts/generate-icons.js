import fs from 'fs';
import { createCanvas } from 'canvas';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [16, 32, 48, 128];
const iconDir = resolve(__dirname, '../public/icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// Generate icons for each size
sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Draw background
  ctx.fillStyle = '#1e293b'; // slate-800
  ctx.fillRect(0, 0, size, size);

  // Draw folder icon
  ctx.fillStyle = '#60a5fa'; // blue-400
  const margin = size * 0.2;
  const width = size - (margin * 2);
  const height = width * 0.75;
  
  // Folder tab
  ctx.fillRect(
    margin,
    margin,
    width * 0.4,
    height * 0.2
  );
  
  // Folder body
  ctx.fillRect(
    margin,
    margin + (height * 0.2),
    width,
    height * 0.8
  );

  // Save the icon
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`${iconDir}/icon${size}.png`, buffer);
});

console.log('Icons generated successfully!'); 