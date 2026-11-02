import test from 'node:test';
import assert from 'node:assert';
import { 
  OFFICIAL_RANKS, 
  TRAINING_TRACKS, 
  getRankById, 
  getRankTotalCoefficients,
  SPECIALIZED_EVALUATION,
  PRE_PROMOTION_EVALUATION
} from '../data/promotionsData';
import { 
  generateCandidateTemplateExcel, 
  parseCandidatesExcel 
} from './excel-handler';

test('Promotions Master Data: Catalog integrity and legal references', () => {
  // Check tracks
  assert.ok(TRAINING_TRACKS.specialized);
  assert.ok(TRAINING_TRACKS.pre_promotion);
  assert.strictEqual(TRAINING_TRACKS.specialized.ranks.length >= 8, true);
  assert.strictEqual(TRAINING_TRACKS.pre_promotion.ranks.length >= 7, true);

  // Check evaluation coefficients
  assert.strictEqual(SPECIALIZED_EVALUATION.continuousControl, 1);
  assert.strictEqual(SPECIALIZED_EVALUATION.internship, 1);
  assert.strictEqual(SPECIALIZED_EVALUATION.memoir, 1);
  assert.strictEqual(SPECIALIZED_EVALUATION.finalExam, 3);

  assert.strictEqual(PRE_PROMOTION_EVALUATION.continuousControl, 1);
  assert.strictEqual(PRE_PROMOTION_EVALUATION.internship, 1);
  assert.strictEqual(PRE_PROMOTION_EVALUATION.memoir, 2);
  assert.strictEqual(PRE_PROMOTION_EVALUATION.finalExam, 3);

  // Check مدير ثانوية modules
  const dirSec = getRankById('dir_sec');
  assert.ok(dirSec);
  assert.strictEqual(dirSec.modules.length, 14);
  assert.strictEqual(dirSec.totalHours, 420);

  // Check مدير مدرسة ابتدائية
  const dirPrim = getRankById('dir_prim');
  assert.ok(dirPrim);
  assert.strictEqual(dirPrim.modules.length, 13);
  assert.strictEqual(dirPrim.totalHours, 420);

  // Check مشرف التربية
  const surv = getRankById('surveillant');
  assert.ok(surv);
  assert.strictEqual(surv.modules.length, 10);
  assert.strictEqual(surv.totalHours, 336);

  // Check coefficients calculation
  const coeff = getRankTotalCoefficients('dir_sec');
  assert.strictEqual(coeff >= 20, true);
});

test('Excel Handler: Generate template and parse candidate records', () => {
  const templateBuf = generateCandidateTemplateExcel('مدير ثانوية');
  assert.ok(templateBuf instanceof Uint8Array);
  assert.ok(templateBuf.length > 500);

  // Parse the generated sample template
  const parseRes = parseCandidatesExcel(templateBuf, 'dir_sec', '2024-2025');
  assert.strictEqual(parseRes.totalParsed >= 5, true);
  assert.strictEqual(parseRes.candidates.length >= 5, true);
  assert.strictEqual(parseRes.duplicates.length, 0);

  const firstCand = parseRes.candidates[0];
  assert.strictEqual(firstCand.registrationNumber, '03010001');
  assert.ok(firstCand.fullName.includes('بن عيسى مصطفى'));
  assert.ok(firstCand.birthPlace.includes('الأغواط'));
  assert.strictEqual(firstCand.specialtyId, 'dir_sec');
});
