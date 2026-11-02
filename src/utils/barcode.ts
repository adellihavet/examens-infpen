/**
 * Offline Vector Barcode & Matrix Generator
 * Generates Code 128 barcodes as pure vector SVGs without external dependencies
 * High resolution, optimized for sharp 300+ DPI physical laser printing on exam papers.
 */

// Code 128 subset B table
const CODE128_PATTERNS: { [char: string]: string } = {
  ' ': '11011001100', '!': '11001101100', '"': '11001100110', '#': '10010011000',
  '$': '10010001100', '%': '10001001100', '&': '10011001000', "'": '10011000100',
  '(': '10001100100', ')': '11001001000', '*': '11001000100', '+': '11000100100',
  ',': '10110011100', '-': '10011011100', '.': '10011001110', '/': '10111001100',
  '0': '10011101100', '1': '10011100110', '2': '11001110010', '3': '11001011100',
  '4': '11001001110', '5': '11011100100', '6': '11001110100', '7': '11101101110',
  '8': '11101001100', '9': '11100101100', ':': '11100100110', ';': '11101100100',
  '<': '11100110100', '=': '11100110010', '>': '11011011000', '?': '11011000110',
  '@': '11000110110', 'A': '10100011000', 'B': '10001011000', 'C': '10001000110',
  'D': '10110001000', 'E': '10001101000', 'F': '10001100010', 'G': '11010001000',
  'H': '11000101000', 'I': '11000100010', 'J': '10110111000', 'K': '10110001110',
  'L': '10001101110', 'M': '10111011000', 'N': '10111000110', 'O': '10001110110',
  'P': '11101110110', 'Q': '11010001110', 'R': '11000101110', 'S': '11011101000',
  'T': '11011100010', 'U': '11011101110', 'V': '11101011000', 'W': '11101000110',
  'X': '11100010110', 'Y': '11101101000', 'Z': '11101100010', '[': '11100011010',
  '\\': '11101111010', ']': '11001000010', '^': '11110001010', '_': '10100110000'
};

const START_B = '11010010000';
const STOP = '1100011101011';

/**
 * Generate a 100% offline SVG string for a Code128 barcode
 */
export function generateBarcodeSvg(
  text: string,
  options: {
    height?: number;
    barWidth?: number;
    showText?: boolean;
    className?: string;
  } = {}
): string {
  const height = options.height || 48;
  const barWidth = options.barWidth || 1.8;
  const showText = options.showText !== false;

  // Clean text to allowed subset B
  const clean = text.toUpperCase().replace(/[^A-Z0-9\-\.\ \/\$\%\+\:\_\*]/g, '-');
  
  // Build bit pattern
  let pattern = START_B;
  let checksum = 104; // Start B value
  let weight = 1;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const pat = CODE128_PATTERNS[char] || CODE128_PATTERNS['-'];
    pattern += pat;
    // calculate checksum value based on ASCII
    const charVal = (char.charCodeAt(0) - 32);
    checksum += (charVal * weight);
    weight++;
  }

  // Checksum pattern
  const checkCharVal = checksum % 103;
  const checkChar = String.fromCharCode(checkCharVal + 32);
  pattern += CODE128_PATTERNS[checkChar] || '11001100110';
  pattern += STOP;

  // Render SVG bars
  let svgBars = '';
  let currentX = 10;
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      svgBars += `<rect x="${currentX}" y="4" width="${barWidth}" height="${height}" fill="#0f172a" />`;
    }
    currentX += barWidth;
  }

  const totalWidth = currentX + 10;
  const totalHeight = showText ? height + 20 : height + 8;

  const textSvg = showText
    ? `<text x="${totalWidth / 2}" y="${height + 16}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="600" fill="#334155" letter-spacing="1.5">${clean}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}" class="${options.className || ''}">
    <rect width="${totalWidth}" height="${totalHeight}" fill="#ffffff" />
    ${svgBars}
    ${textSvg}
  </svg>`;
}

/**
 * Generate a visual 2D QR matrix SVG offline
 */
export function generateQrMatrixSvg(data: string, size = 80): string {
  // Deterministic 21x21 QR-like matrix grid with standard finder patterns
  const grid = 21;
  const cells: boolean[][] = Array.from({ length: grid }, () => Array(grid).fill(false));

  // Add 3 corner finder patterns (7x7)
  const addFinder = (r: number, c: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (
          i === 0 || i === 6 || j === 0 || j === 6 ||
          (i >= 2 && i <= 4 && j >= 2 && j <= 4)
        ) {
          cells[r + i][c + j] = true;
        }
      }
    }
  };

  addFinder(0, 0);
  addFinder(0, 14);
  addFinder(14, 0);

  // Timing patterns
  for (let i = 8; i < 13; i++) {
    cells[6][i] = i % 2 === 0;
    cells[i][6] = i % 2 === 0;
  }

  // Hash data into data payload cells
  let h = 0;
  for (let i = 0; i < data.length; i++) {
    h = (h * 31 + data.charCodeAt(i)) >>> 0;
  }

  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      // Don't overwrite finders or timing
      const inFinder1 = r < 8 && c < 8;
      const inFinder2 = r < 8 && c > 12;
      const inFinder3 = r > 12 && c < 8;
      const isTiming = r === 6 || c === 6;

      if (!inFinder1 && !inFinder2 && !inFinder3 && !isTiming) {
        h = (h * 1664525 + 1013904223) >>> 0;
        cells[r][c] = (h % 3) === 0;
      }
    }
  }

  const cellSize = size / grid;
  let rects = '';
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      if (cells[r][c]) {
        rects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="#0f172a" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="#ffffff" />
    ${rects}
  </svg>`;
}
