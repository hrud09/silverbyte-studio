/**
 * Dependency-free QR Code encoder (byte mode, ISO/IEC 18004).
 *
 * Deliberately local rather than the api.qrserver.com URL the storefront's ShareModal
 * reaches for: a Quick Share link is the only thing standing between a private build
 * and the open internet, so handing that link to a third-party image service to draw
 * a picture of it would publish the secret in the act of sharing it.
 *
 * Returns a plain boolean matrix, so the same code renders identically on the server,
 * in the admin console, and on the public share page.
 */

export const EC_LEVELS = { L: 0, M: 1, Q: 2, H: 3 };

// Reed-Solomon codewords per block, indexed [ecLevel][version]. Index 0 is unused
// because QR versions run 1-40.
const ECC_CODEWORDS_PER_BLOCK = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];

const NUM_EC_BLOCKS = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 5, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

// ——— GF(256) arithmetic, primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 ———

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x = (x << 1) ^ (x & 0x80 ? 0x11d : 0);
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/** Reed-Solomon generator polynomial of the given degree, highest power first. */
function generatorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

/** Remainder of dividing `data` (shifted left by ecLen bytes) by the generator. */
function reedSolomon(data, ecLen) {
  const gen = generatorPoly(ecLen);
  const buf = new Uint8Array(data.length + ecLen);
  buf.set(data);
  for (let i = 0; i < data.length; i++) {
    const factor = buf[i];
    if (factor === 0) continue;
    for (let j = 0; j < gen.length; j++) buf[i + j] ^= gfMul(gen[j], factor);
  }
  return buf.slice(data.length);
}

// ——— Capacity ———

/** Total modules available for data + EC before function patterns are subtracted. */
function numRawDataModules(version) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function numDataCodewords(version, ecl) {
  return (
    Math.floor(numRawDataModules(version) / 8) -
    ECC_CODEWORDS_PER_BLOCK[ecl][version] * NUM_EC_BLOCKS[ecl][version]
  );
}

function alignmentPatternPositions(version) {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const positions = [6];
  for (let pos = version * 4 + 10; positions.length < count; pos -= step) positions.splice(1, 0, pos);
  return positions;
}

// ——— Bit packing ———

function appendBits(bits, value, length) {
  for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
}

function getBit(value, i) {
  return ((value >>> i) & 1) !== 0;
}

function chooseVersion(byteLength, ecl) {
  for (let version = 1; version <= 40; version++) {
    const charCountBits = version <= 9 ? 8 : 16;
    if (4 + charCountBits + byteLength * 8 <= numDataCodewords(version, ecl) * 8) return version;
  }
  throw new Error('Data is too long to fit in a QR code');
}

function buildDataCodewords(bytes, version, ecl) {
  const bits = [];
  appendBits(bits, 0b0100, 4); // byte mode
  appendBits(bits, bytes.length, version <= 9 ? 8 : 16);
  for (const byte of bytes) appendBits(bits, byte, 8);

  const capacityBits = numDataCodewords(version, ecl) * 8;
  appendBits(bits, 0, Math.min(4, capacityBits - bits.length)); // terminator
  appendBits(bits, 0, (8 - (bits.length % 8)) % 8); // pad to a byte boundary

  const codewords = new Uint8Array(capacityBits / 8);
  for (let i = 0; i < bits.length; i++) codewords[i >>> 3] |= bits[i] << (7 - (i & 7));
  // Alternating 0xEC / 0x11 filler, as the spec requires.
  for (let i = bits.length / 8, pad = 0xec; i < codewords.length; i++, pad ^= 0xec ^ 0x11) {
    codewords[i] = pad;
  }
  return codewords;
}

/** Split into blocks, error-correct each, then interleave as the spec requires. */
function interleaveBlocks(data, version, ecl) {
  const numBlocks = NUM_EC_BLOCKS[ecl][version];
  const ecLen = ECC_CODEWORDS_PER_BLOCK[ecl][version];
  const rawCodewords = Math.floor(numRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const blocks = [];
  for (let i = 0, offset = 0; i < numBlocks; i++) {
    const dataLen = shortBlockLen - ecLen + (i < numShortBlocks ? 0 : 1);
    const chunk = data.slice(offset, offset + dataLen);
    offset += dataLen;
    blocks.push({ data: chunk, ec: reedSolomon(chunk, ecLen) });
  }

  const result = [];
  for (let i = 0; i <= shortBlockLen - ecLen; i++) {
    for (const block of blocks) if (i < block.data.length) result.push(block.data[i]);
  }
  for (let i = 0; i < ecLen; i++) {
    for (const block of blocks) result.push(block.ec[i]);
  }
  return Uint8Array.from(result);
}

// ——— Module placement ———

function makeGrid(size, fill) {
  return Array.from({ length: size }, () => new Array(size).fill(fill));
}

function drawFormatBits(modules, isFunction, size, ecl, mask) {
  const set = (x, y, dark) => {
    modules[y][x] = dark;
    isFunction[y][x] = true;
  };

  // The format field does not carry the numeric EC level: L=01, M=00, Q=11, H=10.
  const data = ([1, 0, 3, 2][ecl] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;

  // First copy, wrapped around the top-left finder
  for (let i = 0; i <= 5; i++) set(8, i, getBit(bits, i));
  set(8, 7, getBit(bits, 6));
  set(8, 8, getBit(bits, 7));
  set(7, 8, getBit(bits, 8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, getBit(bits, i));

  // Second copy, split between the other two finders
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, getBit(bits, i));
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, getBit(bits, i));
  set(8, size - 8, true); // always-dark module
}

function drawFunctionPatterns(modules, isFunction, version, size, ecl) {
  const set = (x, y, dark) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    modules[y][x] = dark;
    isFunction[y][x] = true;
  };

  // Timing patterns
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }

  // Finder patterns, drawn together with their separators: the ring at distance 4
  // is the separator, and stays light.
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        set(cx + dx, cy + dy, dist !== 2 && dist !== 4);
      }
    }
  }

  // Alignment patterns, skipping the three corners already held by finders
  const positions = alignmentPatternPositions(version);
  const last = positions.length - 1;
  for (let i = 0; i <= last; i++) {
    for (let j = 0; j <= last; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          set(positions[i] + dx, positions[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  // Version information (two 18-bit copies), only present from version 7 up
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = getBit(bits, i);
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, bit);
      set(b, a, bit);
    }
  }

  // Claim the format-info strips so drawCodewords skips them. The values written
  // here are provisional; the real ones land once a mask has been chosen.
  drawFormatBits(modules, isFunction, size, ecl, 0);
}

/** Zigzag the codeword bits up and down two-column strips, skipping function modules. */
function drawCodewords(modules, isFunction, size, data) {
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // the vertical timing pattern is not a data column
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y][x] && i < data.length * 8) {
          modules[y][x] = getBit(data[i >>> 3], 7 - (i & 7));
          i++;
        }
      }
    }
  }
}

function maskBit(mask, x, y) {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

function applyMask(modules, isFunction, size, mask) {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!isFunction[y][x] && maskBit(mask, x, y)) modules[y][x] = !modules[y][x];
    }
  }
}

// ——— Mask selection (the spec's four penalty rules) ———

function finderPenaltyCountPatterns(history) {
  const n = history[1];
  const core =
    n > 0 && history[2] === n && history[3] === n * 3 && history[4] === n && history[5] === n;
  return (
    (core && history[0] >= n * 4 && history[6] >= n ? 1 : 0) +
    (core && history[6] >= n * 4 && history[0] >= n ? 1 : 0)
  );
}

function finderPenaltyAddHistory(runLength, history, size) {
  // The quiet zone counts as light space in front of the very first run.
  if (history[0] === 0) runLength += size;
  history.pop();
  history.unshift(runLength);
}

function finderPenaltyTerminate(runColor, runLength, history, size) {
  if (runColor) {
    finderPenaltyAddHistory(runLength, history, size);
    runLength = 0;
  }
  finderPenaltyAddHistory(runLength + size, history, size);
  return finderPenaltyCountPatterns(history);
}

function penaltyScore(modules, size) {
  const N1 = 3;
  const N2 = 3;
  const N3 = 40;
  const N4 = 10;
  let result = 0;

  // Rules 1 and 3, scanned once across every row and once down every column
  for (const horizontal of [true, false]) {
    for (let a = 0; a < size; a++) {
      let runColor = false;
      let runLength = 0;
      const history = [0, 0, 0, 0, 0, 0, 0];
      for (let b = 0; b < size; b++) {
        const value = horizontal ? modules[a][b] : modules[b][a];
        if (value === runColor) {
          runLength++;
          if (runLength === 5) result += N1;
          else if (runLength > 5) result++;
        } else {
          finderPenaltyAddHistory(runLength, history, size);
          if (!runColor) result += finderPenaltyCountPatterns(history) * N3;
          runColor = value;
          runLength = 1;
        }
      }
      result += finderPenaltyTerminate(runColor, runLength, history, size) * N3;
    }
  }

  // Rule 2 — solid 2x2 blocks
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = modules[y][x];
      if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) {
        result += N2;
      }
    }
  }

  // Rule 4 — deviation from a 50/50 dark ratio
  let dark = 0;
  for (const row of modules) for (const cell of row) if (cell) dark++;
  const total = size * size;
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
  return result + k * N4;
}

/**
 * Encode text into a QR Code module matrix.
 *
 * @param {string} text
 * @param {Object} [options]
 * @param {'L'|'M'|'Q'|'H'} [options.ecLevel='M'] - error-correction level
 * @returns {{ size: number, version: number, modules: boolean[][] }} `modules[y][x]` is true when dark
 */
export function encodeQr(text, { ecLevel = 'M' } = {}) {
  const ecl = EC_LEVELS[ecLevel] ?? EC_LEVELS.M;
  const bytes = Array.from(new TextEncoder().encode(String(text ?? '')));
  const version = chooseVersion(bytes.length, ecl);
  const size = version * 4 + 17;

  const codewords = interleaveBlocks(buildDataCodewords(bytes, version, ecl), version, ecl);

  const modules = makeGrid(size, false);
  const isFunction = makeGrid(size, false);
  drawFunctionPatterns(modules, isFunction, version, size, ecl);
  drawCodewords(modules, isFunction, size, codewords);

  // Try all eight masks and keep the least penalised, as the spec prescribes.
  let bestMask = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(modules, isFunction, size, mask);
    drawFormatBits(modules, isFunction, size, ecl, mask);
    const score = penaltyScore(modules, size);
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
    }
    applyMask(modules, isFunction, size, mask); // XOR is its own inverse — undo
  }

  applyMask(modules, isFunction, size, bestMask);
  drawFormatBits(modules, isFunction, size, ecl, bestMask);

  return { size, version, modules };
}

/**
 * Render a QR matrix as a self-contained SVG string.
 *
 * Used where React cannot render for us — chiefly the HTML email body, which has to
 * carry its own markup.
 *
 * @param {string} text
 * @param {Object} [options]
 * @param {number} [options.scale=4] - pixels per module
 * @param {number} [options.margin=4] - quiet-zone width in modules (4 is the spec minimum)
 * @returns {string}
 */
export function qrToSvg(text, { scale = 4, margin = 4, dark = '#000000', light = '#FFFFFF', ecLevel = 'M' } = {}) {
  const { size, modules } = encodeQr(text, { ecLevel });
  const dimension = (size + margin * 2) * scale;

  let rects = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!modules[y][x]) continue;
      rects += `<rect x="${(x + margin) * scale}" y="${(y + margin) * scale}" width="${scale}" height="${scale}"/>`;
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dimension}" height="${dimension}" ` +
    `viewBox="0 0 ${dimension} ${dimension}" shape-rendering="crispEdges">` +
    `<rect width="${dimension}" height="${dimension}" fill="${light}"/>` +
    `<g fill="${dark}">${rects}</g></svg>`
  );
}
