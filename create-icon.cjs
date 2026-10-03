const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create 256x256 PNG with green emerald gradient and CA letters
function createPng(width, height) {
  const bytesPerPixel = 4;
  const rawData = Buffer.alloc(height * (1 + width * bytesPerPixel));

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const cx = x - width / 2;
      const cy = y - height / 2;
      const dist = Math.sqrt(cx * cx + cy * cy);
      const maxR = width * 0.46;

      // Rounded rectangle / badge mask
      const isInsideBadge = Math.abs(cx) < width * 0.44 && Math.abs(cy) < height * 0.44 &&
        (Math.pow(Math.abs(cx) / (width * 0.44), 6) + Math.pow(Math.abs(cy) / (height * 0.44), 6) <= 1.0);

      if (isInsideBadge) {
        // Emerald gradient background
        const grad = (y / height) * 40;
        let r = Math.floor(16 - grad * 0.2);
        let g = Math.floor(185 - grad * 0.5);
        let b = Math.floor(129 - grad * 0.3);
        let a = 255;

        // Dark border
        if (Math.abs(cx) > width * 0.41 || Math.abs(cy) > height * 0.41) {
          r = 15;
          g = 23;
          b = 42;
        }

        // Draw "CA" letters in dark navy
        // Simple pixel font / pattern for 'C' and 'A'
        // 'C' box: x: 50..110, y: 80..176
        // 'A' box: x: 130..200, y: 80..176
        const nx = x;
        const ny = y;
        let isText = false;

        // Letter C
        if (nx >= 50 && nx <= 115 && ny >= 80 && ny <= 176) {
          const inC = (nx <= 75 || ny <= 105 || ny >= 151) && !(nx > 75 && ny > 105 && ny < 151 && nx < 115);
          if (inC) isText = true;
        }

        // Letter A
        if (nx >= 135 && nx <= 205 && ny >= 80 && ny <= 176) {
          const inA = (nx <= 155 || nx >= 185 || ny <= 105 || (ny >= 125 && ny <= 145));
          if (inA) isText = true;
        }

        if (isText) {
          r = 15;
          g = 23;
          b = 42;
        }

        rawData[offset++] = Math.max(0, Math.min(255, r));
        rawData[offset++] = Math.max(0, Math.min(255, g));
        rawData[offset++] = Math.max(0, Math.min(255, b));
        rawData[offset++] = a;
      } else {
        // Transparent outside
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Create ICO containing the 256x256 PNG
function createIco(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(1, 4); // 1 image

  const directoryEntry = Buffer.alloc(16);
  directoryEntry[0] = 0; // 256 width = 0
  directoryEntry[1] = 0; // 256 height = 0
  directoryEntry[2] = 0; // Color count
  directoryEntry[3] = 0; // Reserved
  directoryEntry.writeUInt16LE(1, 4); // Color planes
  directoryEntry.writeUInt16LE(32, 6); // Bits per pixel
  directoryEntry.writeUInt32LE(pngBuffer.length, 8); // Size of image data
  directoryEntry.writeUInt32LE(22, 12); // Offset to image data (6 header + 16 entry)

  return Buffer.concat([header, directoryEntry, pngBuffer]);
}

const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

const pngBuf = createPng(256, 256);
fs.writeFileSync(path.join(buildDir, 'icon.png'), pngBuf);

const icoBuf = createIco(pngBuf);
fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuf);

console.log('Successfully generated build/icon.png and build/icon.ico');
