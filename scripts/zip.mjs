// scripts/zip.mjs
//
// Minimal, dependency-free ZIP archive writer.
//
// Produces valid ZIP archives using the "stored" (uncompressed) method and
// CRC-32 checksums. Factorio loads these without issue, and writing the format
// by hand means the build needs no native `zip` binary and no npm packages —
// it runs anywhere Node does.

const encoder = new TextEncoder();

// Precompute the CRC-32 lookup table.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Convert a JS Date to the MS-DOS time/date pair stored in ZIP headers.
function dosDateTime(date) {
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    (date.getSeconds() >> 1);
  const datePart =
    ((Math.max(date.getFullYear(), 1980) - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  return { time, date: datePart };
}

// files: Array<{ name: string, data: Uint8Array, mtime?: Date }>
// Returns a Uint8Array containing the complete ZIP archive.
export function createZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = file.data;
    const crc = crc32(data);
    const { time, date } = dosDateTime(file.mtime ?? new Date(0));
    const size = data.length;
    const localHeaderOffset = offset;

    // --- Local file header (30 bytes + name) ---
    const localHeader = new DataView(new ArrayBuffer(30));
    localHeader.setUint32(0, 0x04034b50, true); // signature
    localHeader.setUint16(4, 20, true); // version needed to extract
    localHeader.setUint16(6, 0x0800, true); // general purpose flags (UTF-8 names)
    localHeader.setUint16(8, 0, true); // compression method: stored
    localHeader.setUint16(10, time, true);
    localHeader.setUint16(12, date, true);
    localHeader.setUint32(14, crc, true);
    localHeader.setUint32(18, size, true); // compressed size
    localHeader.setUint32(22, size, true); // uncompressed size
    localHeader.setUint16(26, nameBytes.length, true);
    localHeader.setUint16(28, 0, true); // extra field length

    const local = new Uint8Array(30 + nameBytes.length);
    local.set(new Uint8Array(localHeader.buffer), 0);
    local.set(nameBytes, 30);

    chunks.push(local, data);
    offset += local.length + size;

    // --- Central directory entry (46 bytes + name) ---
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true); // signature
    cd.setUint16(4, 20, true); // version made by
    cd.setUint16(6, 20, true); // version needed to extract
    cd.setUint16(8, 0x0800, true); // general purpose flags (UTF-8 names)
    cd.setUint16(10, 0, true); // compression method: stored
    cd.setUint16(12, time, true);
    cd.setUint16(14, date, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, size, true); // compressed size
    cd.setUint32(24, size, true); // uncompressed size
    cd.setUint16(28, nameBytes.length, true);
    cd.setUint16(30, 0, true); // extra field length
    cd.setUint16(32, 0, true); // file comment length
    cd.setUint16(34, 0, true); // disk number start
    cd.setUint16(36, 0, true); // internal file attributes
    cd.setUint32(38, 0, true); // external file attributes
    cd.setUint32(42, localHeaderOffset, true); // offset of local header

    const entry = new Uint8Array(46 + nameBytes.length);
    entry.set(new Uint8Array(cd.buffer), 0);
    entry.set(nameBytes, 46);
    central.push(entry);
  }

  const centralSize = central.reduce((sum, entry) => sum + entry.length, 0);
  const centralOffset = offset;

  // --- End of central directory record (22 bytes) ---
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true); // signature
  eocd.setUint16(4, 0, true); // number of this disk
  eocd.setUint16(6, 0, true); // disk where central directory starts
  eocd.setUint16(8, files.length, true); // entries on this disk
  eocd.setUint16(10, files.length, true); // total entries
  eocd.setUint32(12, centralSize, true);
  eocd.setUint32(16, centralOffset, true);
  eocd.setUint16(20, 0, true); // comment length

  const output = new Uint8Array(offset + centralSize + 22);
  let pos = 0;
  for (const chunk of chunks) {
    output.set(chunk, pos);
    pos += chunk.length;
  }
  for (const entry of central) {
    output.set(entry, pos);
    pos += entry.length;
  }
  output.set(new Uint8Array(eocd.buffer), pos);
  return output;
}
