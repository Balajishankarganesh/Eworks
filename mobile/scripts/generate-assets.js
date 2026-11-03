const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Standard CRC32 implementation for PNG chunks
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const typeAndData = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([len, typeAndData, crcBuf]);
}

function createPNG(width, height, drawPixel) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = createChunk('IHDR', ihdrData);

  // Raw image data with scanline filter 0
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // None filter
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawPixel(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressedData);
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Ensure assets directory exists
const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 1. Icon (1024x1024) - Dark Slate background with Orange rounded square & emblem
console.log('Generating assets/icon.png...');
const iconBuffer = createPNG(1024, 1024, (x, y, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

  // Rounded badge in center
  const badgeSize = 360;
  if (Math.abs(x - cx) < badgeSize && Math.abs(y - cy) < badgeSize) {
    // Lightning / Emblem shape
    const isLightning = (x - cx + (y - cy) * 0.4 > -60 && x - cx + (y - cy) * 0.4 < 60) ||
                        (Math.abs(x - cx) < 80 && Math.abs(y - cy) < 180);
    if (isLightning) {
      return [255, 255, 255, 255]; // Crisp White core
    }
    return [234, 88, 12, 255]; // Vibrant Orange #ea580c badge
  }

  // Dark slate background #0f172a
  return [15, 23, 42, 255];
});
fs.writeFileSync(path.join(assetsDir, 'icon.png'), iconBuffer);

// 2. Adaptive Icon (1024x1024) - Foreground with transparency
console.log('Generating assets/adaptive-icon.png...');
const adaptiveIconBuffer = createPNG(1024, 1024, (x, y, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const badgeSize = 320;

  if (Math.abs(x - cx) < badgeSize && Math.abs(y - cy) < badgeSize) {
    const isLightning = (x - cx + (y - cy) * 0.4 > -50 && x - cx + (y - cy) * 0.4 < 50) ||
                        (Math.abs(x - cx) < 70 && Math.abs(y - cy) < 160);
    if (isLightning) {
      return [255, 255, 255, 255];
    }
    return [234, 88, 12, 255];
  }
  return [0, 0, 0, 0]; // Transparent background for adaptive icon
});
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), adaptiveIconBuffer);

// 3. Splash Screen (1242x2436) - Dark Slate with centered emblem & glow
console.log('Generating assets/splash.png...');
const splashBuffer = createPNG(621, 1218, (x, y, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const badgeSize = 120;

  if (Math.abs(x - cx) < badgeSize && Math.abs(y - cy) < badgeSize) {
    const isLightning = Math.abs(x - cx) < 25 && Math.abs(y - cy) < 60;
    if (isLightning) {
      return [255, 255, 255, 255];
    }
    return [234, 88, 12, 255];
  }

  // Ambient glow around center
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  if (dist < 260) {
    const factor = (260 - dist) / 260;
    return [
      Math.floor(15 + factor * 30),
      Math.floor(23 + factor * 20),
      Math.floor(42 + factor * 10),
      255
    ];
  }

  return [15, 23, 42, 255];
});
fs.writeFileSync(path.join(assetsDir, 'splash.png'), splashBuffer);

// 4. Favicon (48x48)
console.log('Generating assets/favicon.png...');
const faviconBuffer = createPNG(48, 48, (x, y, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  if (Math.abs(x - cx) < 18 && Math.abs(y - cy) < 18) {
    return [234, 88, 12, 255];
  }
  return [15, 23, 42, 255];
});
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), faviconBuffer);

console.log('All branding assets successfully created in mobile/assets/!');
