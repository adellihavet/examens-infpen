import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  generateRegistrationNumber, 
  parseRegistrationNumber, 
  validateRegistrationNumber, 
  getNextRegistrationNumber,
  getRankNumericCode,
  RANK_NUMERIC_CODES
} from './registration-number.js';

test('1. generateRegistrationNumber creates exact 8-digit format as requested by user', () => {
  // Wilaya 03 (Laghouat) + Rank 01 (Directeur Lycée) + Seq 1 -> 03010001
  const reg1 = generateRegistrationNumber('03', '01', 1);
  assert.equal(reg1, '03010001');

  // Candidate 2
  const reg2 = generateRegistrationNumber('03', '01', 2);
  assert.equal(reg2, '03010002');

  // Candidate 150
  const reg150 = generateRegistrationNumber('03', '01', 150);
  assert.equal(reg150, '03010150');

  // Rank 02 (Directeur CEM) Candidate 1
  const regCem = generateRegistrationNumber('03', '02', 1);
  assert.equal(regCem, '03020001');
});

test('2. RANK_NUMERIC_CODES preserves fixed rank order', () => {
  assert.equal(getRankNumericCode('dir_sec'), '01');
  assert.equal(getRankNumericCode('dir_cem'), '02');
  assert.equal(getRankNumericCode('dir_prim'), '03');
  assert.equal(getRankNumericCode('surveillant'), '09');
});

test('3. parseRegistrationNumber extracts Wilaya, Rank, and Sequence correctly', () => {
  const parsed = parseRegistrationNumber('03010001');
  assert.ok(parsed);
  assert.equal(parsed.wilayaCode, '03');
  assert.equal(parsed.rankCode, '01');
  assert.equal(parsed.sequenceNumber, 1);
  assert.equal(parsed.sequenceString, '0001');
  assert.equal(parsed.isValid, true);
});

test('4. validateRegistrationNumber validates 8 digits format', () => {
  assert.equal(validateRegistrationNumber('03010001').isValid, true);
  assert.equal(validateRegistrationNumber('0301000').isValid, false); // 7 digits
  assert.equal(validateRegistrationNumber('').isValid, false);
});

test('5. getNextRegistrationNumber increments based on existing candidates', () => {
  const candidates = [
    { registrationNumber: '03010001', specialtyId: 'dir_sec' },
    { registrationNumber: '03010002', specialtyId: 'dir_sec' },
    { registrationNumber: '03010003', specialtyId: 'dir_sec' }
  ];

  const nextReg = getNextRegistrationNumber(candidates, 'dir_sec', '03');
  assert.equal(nextReg, '03010004');
});
