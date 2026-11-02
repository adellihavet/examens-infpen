import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAnonymatCodes,
  calculateFinalGrade,
  computeDeliberation,
  type Candidate,
  type ExamModule
} from './crypto-anonymat.js';

test('Anonymat Generation: 100% collision-free within a module', () => {
  const dummyCandidates: Candidate[] = Array.from({ length: 50 }, (_, i) => ({
    id: `cand-${i + 1}`,
    registrationNumber: `2024/INFPE/${(i + 1).toString().padStart(3, '0')}`,
    fullName: `مترشح رقم ${i + 1}`,
    birthDate: '1985-05-12',
    birthPlace: 'الأغواط',
    specialtyId: 'dir_sec',
    promotionYear: '2024-2025',
    groupNumber: 'الفوج 01',
    roomNumber: 'القاعة 02'
  }));

  const mappings = generateAnonymatCodes(dummyCandidates, 'mod_legislation', 'session_2025_01');
  assert.equal(mappings.length, 50);

  const codeSet = new Set(mappings.map(m => m.anonymatCode));
  assert.equal(codeSet.size, 50, 'All anonymat codes in module must be strictly unique');

  // Also verify barcode and checksum exist
  mappings.forEach(m => {
    assert.ok(m.barcodePayload.length > 5);
    assert.ok(m.checksum.length === 2);
  });
});

test('Anonymat Generation: Module isolation (different codes for different modules)', () => {
  const dummyCandidates: Candidate[] = [
    {
      id: 'cand-1',
      registrationNumber: '2024/INFPE/001',
      fullName: 'عمر بن بلقاسم',
      birthDate: '1982-01-01',
      birthPlace: 'الأغواط',
      specialtyId: 'dir_sec',
      promotionYear: '2024-2025',
      groupNumber: 'الفوج 01',
      roomNumber: 'القاعة 01'
    }
  ];

  const mapMod1 = generateAnonymatCodes(dummyCandidates, 'module_pedagogy', 'session_01');
  const mapMod2 = generateAnonymatCodes(dummyCandidates, 'module_legislation', 'session_01');

  assert.notEqual(
    mapMod1[0].anonymatCode,
    mapMod2[0].anonymatCode,
    'The same candidate must have completely different anonymat codes across different modules'
  );
});

test('Grade Disparity: Normal difference does not trigger 3rd correction', () => {
  // Diff is 2.0 <= threshold (3.5)
  const result = calculateFinalGrade(14.0, 16.0, null, 3.5);
  assert.equal(result.needsThirdCorrection, false);
  assert.equal(result.disparity, 2.0);
  assert.equal(result.finalGrade, 15.0);
});

test('Grade Disparity: Disparity exceeding threshold triggers 3rd correction', () => {
  // Diff is 4.0 > 3.5
  const result = calculateFinalGrade(11.0, 15.0, null, 3.5);
  assert.equal(result.needsThirdCorrection, true);
  assert.equal(result.disparity, 4.0);
  assert.equal(result.finalGrade, null, 'Grade remains null until 3rd correction is entered');
});

test('3rd Correction Arbitration: selects average with closer previous grade', () => {
  // G1=10, G2=15 (Diff=5). G3 entered as 14.
  // G3 (14) is closer to G2 (15) [diff=1] than to G1 (10) [diff=4]
  // Final = (15 + 14) / 2 = 14.5
  const res = calculateFinalGrade(10.0, 15.0, 14.0, 3.5);
  assert.equal(res.needsThirdCorrection, true);
  assert.equal(res.finalGrade, 14.5);
});

test('3rd Correction Arbitration: equidistant takes 3-way average', () => {
  // G1=10, G2=14, G3=12 (diff with G1 is 2, diff with G2 is 2)
  // Final = (10 + 14 + 12) / 3 = 12
  const res = calculateFinalGrade(10.0, 14.0, 12.0, 3.5);
  assert.equal(res.finalGrade, 12.0);
});

test('Deliberation Engine: computes weighted averages and eliminatory grades', () => {
  const candidates: Candidate[] = [
    {
      id: 'c1',
      registrationNumber: '001',
      fullName: 'أحمد سعيد',
      birthDate: '1980-01-01',
      birthPlace: 'الأغواط',
      specialtyId: 'dir_sec',
      promotionYear: '2024-2025',
      groupNumber: '01',
      roomNumber: '01'
    },
    {
      id: 'c2',
      registrationNumber: '002',
      fullName: 'فاطمة الزهراء',
      birthDate: '1985-02-02',
      birthPlace: 'الأغواط',
      specialtyId: 'dir_sec',
      promotionYear: '2024-2025',
      groupNumber: '01',
      roomNumber: '01'
    }
  ];

  const modules: ExamModule[] = [
    {
      id: 'm1',
      code: 'M1',
      titleAr: 'التشريع المدرسي',
      coefficient: 3,
      eliminatoryGrade: 5.0,
      disparityThreshold: 3.5,
      maxGrade: 20,
      durationMinutes: 180,
      specialtyId: 'dir_sec'
    },
    {
      id: 'm2',
      code: 'M2',
      titleAr: 'هندسة التكوين',
      coefficient: 2,
      eliminatoryGrade: 5.0,
      disparityThreshold: 3.5,
      maxGrade: 20,
      durationMinutes: 180,
      specialtyId: 'dir_sec'
    }
  ];

  const grades = new Map<string, number | null>();
  // c1: m1=12 (coeff 3), m2=14 (coeff 2) -> (12*3 + 14*2) / 5 = (36 + 28) / 5 = 64/5 = 12.80
  grades.set('c1::m1', 12);
  grades.set('c1::m2', 14);

  // c2: m1=16 (coeff 3), m2=4 (coeff 2 - below eliminatory 5.0!)
  grades.set('c2::m1', 16);
  grades.set('c2::m2', 4);

  const results = computeDeliberation(candidates, modules, grades);
  
  const r1 = results.find(r => r.candidate.id === 'c1')!;
  assert.equal(r1.average, 12.8);
  assert.equal(r1.decision, 'ناجح');
  assert.equal(r1.rank, 1);

  const r2 = results.find(r => r.candidate.id === 'c2')!;
  assert.equal(r2.decision, 'مقصى'); // Eliminatory grade!
});

test('Ministerial Formula Track A (Specialized Promotion: Divisor 6, Memoir Coeff 1)', () => {
  const candidate: Candidate = {
    id: 'cand_trackA',
    registrationNumber: '2026/INFPE/01',
    fullName: 'مدير مدرسة ابتدائية مترشح',
    birthDate: '1982-05-15',
    birthPlace: 'الأغواط',
    specialtyId: 'dir_prim',
    promotionYear: '2026 / 2027',
    groupNumber: '01',
    roomNumber: '01',
    continuousAssessment: 14.0, // 14 * 1 = 14
    internshipGrade: 16.0,      // 16 * 1 = 16
    memoirGrade: 15.0           // 15 * 1 = 15
  };

  const module: ExamModule = {
    id: 'm1',
    code: 'LEG',
    titleAr: 'التشريع المدرسي',
    coefficient: 1,
    eliminatoryGrade: 5.0,
    disparityThreshold: 3.5,
    maxGrade: 20,
    durationMinutes: 180,
    specialtyId: 'dir_prim'
  };

  const grades = new Map<string, number | null>();
  grades.set('cand_trackA::m1', 12.0); // Exam note: 12.0 -> Exam Avg = 12.0 (12 * 3 = 36)

  // Track A calculation:
  // General Avg = (14*1 + 16*1 + 15*1 + 12*3) / 6 = (14 + 16 + 15 + 36) / 6 = 81 / 6 = 13.50
  const results = computeDeliberation([candidate], [module], grades, 10.0, 'specialized', true);
  const r = results[0];

  assert.equal(r.examAverage, 12.0);
  assert.equal(r.generalAverage, 13.5);
  assert.equal(r.decision, 'ناجح');
});

test('Ministerial Formula Track B (Pre-Promotion: Divisor 7, Memoir Coeff 2)', () => {
  const candidate: Candidate = {
    id: 'cand_trackB',
    registrationNumber: '2026/INFPE/02',
    fullName: 'مشرف التربية مترشح',
    birthDate: '1988-10-20',
    birthPlace: 'آفلو',
    specialtyId: 'educ_sup',
    promotionYear: '2026 / 2027',
    groupNumber: '01',
    roomNumber: '01',
    continuousAssessment: 13.0, // 13 * 1 = 13
    internshipGrade: 14.0,      // 14 * 1 = 14
    memoirGrade: 15.0           // 15 * 2 = 30
  };

  const module: ExamModule = {
    id: 'm1',
    code: 'PED',
    titleAr: 'التسيير التربوي',
    coefficient: 1,
    eliminatoryGrade: 5.0,
    disparityThreshold: 3.5,
    maxGrade: 20,
    durationMinutes: 180,
    specialtyId: 'educ_sup'
  };

  const grades = new Map<string, number | null>();
  grades.set('cand_trackB::m1', 11.0); // Exam note: 11.0 -> Exam Avg = 11.0 (11 * 3 = 33)

  // Track B calculation:
  // General Avg = (13*1 + 14*1 + 15*2 + 11*3) / 7 = (13 + 14 + 30 + 33) / 7 = 90 / 7 = 12.86
  const results = computeDeliberation([candidate], [module], grades, 10.0, 'pre_promotion', true);
  const r = results[0];

  assert.equal(r.examAverage, 11.0);
  assert.equal(r.generalAverage, 12.86);
  assert.equal(r.decision, 'ناجح');
});

