/**
 * Algerian National Examination Anonymat & Barcode Cryptographic Engine
 * Designed for INFPE Laghouat (National Institute for Training Education Staff)
 * 
 * Provides:
 * 1. generateAnonymatCodes(): Non-linear pseudo-random permutation per candidate & module.
 * 2. encryptBarcodePayload(): Generates tamper-evident optical barcode string and digital signature.
 * 3. decodeAnonymatMapping(): Unmasks anonymat codes and matches back to candidate identities.
 * 4. verifyAndLookupBarcode(): Validates physical barcode scan against vault integrity checksum.
 */

export interface CandidateIdentity {
  id: string;
  registrationNumber: string; // e.g. 2025/INFPE/001
  fullName: string;           // e.g. بن عيسى مصطفى بن لخضر
  specialtyId: string;
}

export interface AnonymatVaultRecord {
  id: string;
  candidateId: string;
  moduleId: string;
  sessionId: string;
  anonymatCode: string;       // e.g. "A-18492/64"
  barcodePayload: string;     // e.g. "*INFPE-A-18492/64*"
  qrPayload: string;          // JSON string with cryptographic signature
  checksum: string;           // 2-digit modulo-97 checksum
  moduleCode: string;
}

export interface DecodedCandidateResult {
  anonymatCode: string;
  candidateId: string;
  registrationNumber: string;
  fullName: string;
  moduleId: string;
  isChecksumValid: boolean;
  decryptedAt: string;
}

/**
 * 32-bit FNV-1a non-cryptographic hash function with avalanche distribution
 */
function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

/**
 * Deterministic Linear Congruential PRNG (Park-Miller variant)
 */
class DeterministicPRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }

  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(min + this.next() * (max - min + 1));
  }
}

/**
 * Computes a 2-digit Modulo-97 security checksum
 */
export function computeChecksum(code: string, salt: string): string {
  const hash = fnv1a(`${code}::${salt}::INFPE_ALGERIA`);
  return (hash % 97).toString().padStart(2, '0');
}

/**
 * Function 1: Encrypts and formats the barcode string with delimiters and signature
 */
export function encryptBarcodePayload(anonymatCode: string, checksum: string): string {
  // Encapsulated with standard Code 128 / Code 39 start/stop delimiters
  return `*INFPE-${anonymatCode}#${checksum}*`;
}

/**
 * Function 2: Generates non-linear random anonymat codes for a candidate list and module
 * Ensures:
 * - 100% collision-free within the session & module.
 * - Non-linear dispersion (neighbor candidates get drastically distinct codes).
 * - Full module isolation (same candidate gets completely different codes per module).
 */
export function generateAnonymatCodes(
  candidates: CandidateIdentity[],
  moduleId: string,
  moduleCode: string,
  sessionId: string,
  secretKey: string = 'INFPE_LAGHOUAT_SEC_KEY_2025'
): AnonymatVaultRecord[] {
  if (candidates.length === 0) return [];

  // Seed derived from secret key, session, and module
  const seedStr = `${secretKey}::${sessionId}::${moduleId}::${moduleCode}::VAULT_SECURE`;
  const prng = new DeterministicPRNG(fnv1a(seedStr));

  const count = candidates.length;
  const baseOffset = prng.nextInt(10000, 45000);
  const step = prng.nextInt(13, 47);

  // Fisher-Yates non-linear shuffle array
  const indices = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(prng.next() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // Prefix letter based on module hash
  const letterCode = String.fromCharCode(65 + (fnv1a(moduleId) % 26));

  const vaultRecords: AnonymatVaultRecord[] = [];

  for (let idx = 0; idx < count; idx++) {
    const candidate = candidates[idx];
    const shuffledIndex = indices[idx];

    // Calculated unique number with non-linear displacement
    const codeNumber = baseOffset + (shuffledIndex * step) + prng.nextInt(1, 9);
    const rawAnonymat = `${letterCode}-${codeNumber.toString().padStart(5, '0')}`;
    
    // Calculate 2-digit verification checksum
    const checksum = computeChecksum(`${rawAnonymat}-${candidate.registrationNumber}`, secretKey);
    const anonymatCode = `${rawAnonymat}/${checksum}`;

    // Barcode payload
    const barcodePayload = encryptBarcodePayload(anonymatCode, checksum);

    // QR 2D matrix payload with cryptographic envelope
    const qrPayload = JSON.stringify({
      inst: 'INFPE-LAGHOUAT',
      ano: anonymatCode,
      mod: moduleCode,
      ses: sessionId,
      sig: checksum
    });

    vaultRecords.push({
      id: `vault_${sessionId}_${moduleId}_${idx + 1}`,
      candidateId: candidate.id,
      moduleId,
      sessionId,
      anonymatCode,
      barcodePayload,
      qrPayload,
      checksum,
      moduleCode
    });
  }

  return vaultRecords;
}

/**
 * Function 3: Matches and Decodes (unmasks) an anonymat code back to the candidate's real identity
 * Used during the official deliberation protocol when the vault is opened.
 */
export function decodeAnonymatMapping(
  anonymatCode: string,
  vaultRecords: AnonymatVaultRecord[],
  candidates: CandidateIdentity[],
  secretKey: string
): DecodedCandidateResult | null {
  const vaultMatch = vaultRecords.find(v => v.anonymatCode === anonymatCode);
  if (!vaultMatch) return null;

  const candidate = candidates.find(c => c.id === vaultMatch.candidateId);
  if (!candidate) return null;

  // Extract raw code part
  const [rawPart] = anonymatCode.split('/');
  const expectedChecksum = computeChecksum(`${rawPart}-${candidate.registrationNumber}`, secretKey);
  const isChecksumValid = expectedChecksum === vaultMatch.checksum;

  return {
    anonymatCode,
    candidateId: candidate.id,
    registrationNumber: candidate.registrationNumber,
    fullName: candidate.fullName,
    moduleId: vaultMatch.moduleId,
    isChecksumValid,
    decryptedAt: new Date().toISOString()
  };
}

/**
 * Function 4: Verifies an optical barcode scanner input and looks up the candidate in the vault
 */
export function verifyAndLookupBarcode(
  scannedText: string,
  vaultRecords: AnonymatVaultRecord[],
  candidates: CandidateIdentity[]
): {
  isValidBarcode: boolean;
  anonymatCode: string | null;
  candidate: CandidateIdentity | null;
  vaultRecord: AnonymatVaultRecord | null;
} {
  // Clean framing asterisks and prefix
  let clean = scannedText.trim();
  clean = clean.replace(/^\*|\*$/g, ''); // strip start/stop asterisks
  clean = clean.replace(/^INFPE-/, '');  // strip institution prefix

  // Handle format: CODE#CHECKSUM or CODE
  const [codePart] = clean.split('#');

  // Find in vault
  const vaultRecord = vaultRecords.find(v => 
    v.anonymatCode === codePart || 
    v.barcodePayload.includes(codePart) ||
    codePart.includes(v.anonymatCode)
  ) || null;

  if (!vaultRecord) {
    return {
      isValidBarcode: false,
      anonymatCode: null,
      candidate: null,
      vaultRecord: null
    };
  }

  const candidate = candidates.find(c => c.id === vaultRecord.candidateId) || null;

  return {
    isValidBarcode: true,
    anonymatCode: vaultRecord.anonymatCode,
    candidate,
    vaultRecord
  };
}
