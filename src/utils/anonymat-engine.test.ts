import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAnonymatCodes,
  encryptBarcodePayload,
  decodeAnonymatMapping,
  verifyAndLookupBarcode,
  computeChecksum,
  type CandidateIdentity
} from './anonymat-engine.js';

const mockCandidates: CandidateIdentity[] = [
  {
    id: 'cand-01',
    registrationNumber: '2025/INFPE/001',
    fullName: 'بن عيسى مصطفى',
    specialtyId: 'dir_sec'
  },
  {
    id: 'cand-02',
    registrationNumber: '2025/INFPE/002',
    fullName: 'حيدوسي خديجة',
    specialtyId: 'dir_sec'
  },
  {
    id: 'cand-03',
    registrationNumber: '2025/INFPE/003',
    fullName: 'قدور عبد القادر',
    specialtyId: 'dir_sec'
  }
];

const SECRET_KEY = 'INFPE_LAGHOUAT_SEC_KEY_2025';

test('1. generateAnonymatCodes generates strictly unique codes with valid barcode payload', () => {
  const vault = generateAnonymatCodes(
    mockCandidates,
    'mod_legislation',
    'LEG-01',
    'ses_2025_01',
    SECRET_KEY
  );

  assert.equal(vault.length, 3);

  // Uniqueness check
  const codes = vault.map(v => v.anonymatCode);
  const uniqueCodes = new Set(codes);
  assert.equal(uniqueCodes.size, 3, 'Every candidate must have a strictly unique anonymat code');

  // Format checks
  vault.forEach(v => {
    assert.match(v.anonymatCode, /^[A-Z]-\d{5}\/\d{2}$/, 'Code should follow format LETTER-5DIGITS/2CHECKSUM');
    assert.ok(v.barcodePayload.startsWith('*INFPE-'), 'Barcode payload must have official INFPE start framing');
    assert.ok(v.barcodePayload.endsWith('*'), 'Barcode payload must have official stop framing');
    assert.equal(v.checksum.length, 2, 'Checksum must be 2 digits');
  });
});

test('2. encryptBarcodePayload creates standard optical barcode string', () => {
  const code = 'B-14205/88';
  const checksum = '88';
  const payload = encryptBarcodePayload(code, checksum);

  assert.equal(payload, '*INFPE-B-14205/88#88*');
});

test('3. decodeAnonymatMapping successfully resolves candidate identity and verifies checksum', () => {
  const vault = generateAnonymatCodes(
    mockCandidates,
    'mod_legislation',
    'LEG-01',
    'ses_2025_01',
    SECRET_KEY
  );

  // Take the anonymat code of candidate 2
  const targetRecord = vault.find(v => v.candidateId === 'cand-02')!;
  
  const decoded = decodeAnonymatMapping(
    targetRecord.anonymatCode,
    vault,
    mockCandidates,
    SECRET_KEY
  );

  assert.ok(decoded !== null, 'Decoded result must not be null');
  assert.equal(decoded.candidateId, 'cand-02');
  assert.equal(decoded.registrationNumber, '2025/INFPE/002');
  assert.equal(decoded.fullName, 'حيدوسي خديجة');
  assert.equal(decoded.isChecksumValid, true, 'Cryptographic checksum must be 100% valid');
});

test('4. verifyAndLookupBarcode correctly parses optical scanner input', () => {
  const vault = generateAnonymatCodes(
    mockCandidates,
    'mod_legislation',
    'LEG-01',
    'ses_2025_01',
    SECRET_KEY
  );

  const target = vault[0];
  const scannedString = target.barcodePayload; // e.g. *INFPE-A-xxxxx/yy#yy*

  const result = verifyAndLookupBarcode(scannedString, vault, mockCandidates);

  assert.equal(result.isValidBarcode, true);
  assert.equal(result.anonymatCode, target.anonymatCode);
  assert.ok(result.candidate !== null);
  assert.equal(result.candidate.id, target.candidateId);
});
