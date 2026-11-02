import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runDeliberationProcess,
  extractRattrapageBoard,
  type ModuleConfig,
  type CandidateInput
} from './deliberationEngine.js';

const testModules: ModuleConfig[] = [
  {
    id: 'm_leg',
    code: 'LEG-01',
    titleAr: 'التشريع المدرسي والتنظيم الإداري',
    coefficient: 3,
    eliminatoryGrade: 5.0
  },
  {
    id: 'm_ped',
    code: 'PED-02',
    titleAr: 'علوم التربية وهندسة التكوين',
    coefficient: 3,
    eliminatoryGrade: 5.0
  },
  {
    id: 'm_fin',
    code: 'FIN-03',
    titleAr: 'التسيير المالي والمادي',
    coefficient: 2,
    eliminatoryGrade: 5.0
  }
];
// Total coefficients = 3 + 3 + 2 = 8

test('1. Normal Success: Calculates weighted average, ranking, and correct mention', () => {
  const candidates: CandidateInput[] = [
    {
      id: 'c1',
      registrationNumber: '2025/001',
      fullName: 'بن عيسى مصطفى',
      scores: [
        { moduleId: 'm_leg', grade: 14.0 }, // 14 * 3 = 42
        { moduleId: 'm_ped', grade: 15.0 }, // 15 * 3 = 45
        { moduleId: 'm_fin', grade: 12.0 }  // 12 * 2 = 24 -> Total = 111 / 8 = 13.875 -> 13.88 (جيد)
      ]
    },
    {
      id: 'c2',
      registrationNumber: '2025/002',
      fullName: 'طاوسي عبد الحميد',
      scores: [
        { moduleId: 'm_leg', grade: 17.0 }, // 17 * 3 = 51
        { moduleId: 'm_ped', grade: 16.5 }, // 16.5 * 3 = 49.5
        { moduleId: 'm_fin', grade: 15.0 }  // 15 * 2 = 30 -> Total = 130.5 / 8 = 16.31 (امتياز)
      ]
    }
  ];

  const { results, statistics } = runDeliberationProcess(candidates, testModules);

  const c2Res = results.find(r => r.candidateId === 'c2')!;
  assert.equal(c2Res.decision, 'ناجح');
  assert.equal(c2Res.generalAverage, 16.31);
  assert.equal(c2Res.mention, 'امتياز');
  assert.equal(c2Res.rank, 1, 'Highest average must be ranked #1');

  const c1Res = results.find(r => r.candidateId === 'c1')!;
  assert.equal(c1Res.decision, 'ناجح');
  assert.equal(c1Res.generalAverage, 13.88);
  assert.equal(c1Res.mention, 'جيد');
  assert.equal(c1Res.rank, 2);

  assert.equal(statistics.passedCount, 2);
  assert.equal(statistics.successRate, 100);
});

test('2. Rattrapage Filtration: Automatic identification of candidate and modules needing makeup exam', () => {
  // Candidate has average 08.50 (between 7.00 and 9.99), so eligible for rattrapage
  const candidates: CandidateInput[] = [
    {
      id: 'c_rat',
      registrationNumber: '2025/003',
      fullName: 'قدور عبد القادر',
      scores: [
        { moduleId: 'm_leg', grade: 8.0 }, // needs rattrapage
        { moduleId: 'm_ped', grade: 9.0 }, // needs rattrapage
        { moduleId: 'm_fin', grade: 11.0 }  // >= 10, no rattrapage needed
      ]
    }
  ];

  const { results } = runDeliberationProcess(candidates, testModules);
  const res = results[0];

  assert.equal(res.decision, 'معني بالاستدراك');
  assert.equal(res.isEligibleForRattrapage, true);
  assert.equal(res.rattrapageModules.length, 2, 'Should flag exactly the 2 modules below 10/20');
  assert.equal(res.rattrapageModules[0].moduleId, 'm_leg');
  assert.equal(res.rattrapageModules[1].moduleId, 'm_ped');

  const board = extractRattrapageBoard(results);
  assert.equal(board.length, 1);
  assert.equal(board[0].modulesCount, 2);
});

test('3. Eliminatory Grade: Candidate with high average but eliminatory score (< 5.0) is routed to rattrapage or eliminated', () => {
  const candidates: CandidateInput[] = [
    {
      id: 'c_elim',
      registrationNumber: '2025/004',
      fullName: 'سعودي مريم',
      scores: [
        { moduleId: 'm_leg', grade: 18.0 },
        { moduleId: 'm_ped', grade: 16.0 },
        { moduleId: 'm_fin', grade: 4.0 } // Eliminatory (< 5.0)!
      ]
    }
  ];

  const { results } = runDeliberationProcess(candidates, testModules, {
    successThreshold: 10.0,
    rattrapageMinAverage: 7.0,
    allowEliminatedToRattrapage: true,
    rattrapageCapAt10: false
  });

  const res = results[0];
  // Average is high (18*3 + 16*3 + 4*2)/8 = (54+48+8)/8 = 110/8 = 13.75, but has eliminatory grade
  assert.equal(res.generalAverage, 13.75);
  assert.equal(res.decision, 'معني بالاستدراك');
  assert.equal(res.rattrapageModules.length, 1);
  assert.equal(res.rattrapageModules[0].moduleId, 'm_fin');
});

test('4. Absences: Unjustified vs Legally Justified Absences', () => {
  const candidates: CandidateInput[] = [
    {
      id: 'c_abs_unjust',
      registrationNumber: '2025/005',
      fullName: 'مترشح غائب غير مبرر',
      attendanceStatus: 'absent_unjustified',
      scores: [
        { moduleId: 'm_leg', grade: 0 },
        { moduleId: 'm_ped', grade: 0 },
        { moduleId: 'm_fin', grade: 0 }
      ]
    },
    {
      id: 'c_abs_just',
      registrationNumber: '2025/006',
      fullName: 'مترشح غائب بمبرر قانوني',
      attendanceStatus: 'absent_justified',
      scores: [
        { moduleId: 'm_leg', grade: null, isAbsent: true, isJustified: true },
        { moduleId: 'm_ped', grade: null, isAbsent: true, isJustified: true },
        { moduleId: 'm_fin', grade: null, isAbsent: true, isJustified: true }
      ]
    }
  ];

  const { results } = runDeliberationProcess(candidates, testModules);

  const rUnjust = results.find(r => r.candidateId === 'c_abs_unjust')!;
  assert.equal(rUnjust.decision, 'مقصى لغياب غير مبرر');
  assert.equal(rUnjust.isEligibleForRattrapage, false);

  const rJust = results.find(r => r.candidateId === 'c_abs_just')!;
  assert.equal(rJust.decision, 'مؤجل بغياب مبرر');
  assert.equal(rJust.isEligibleForRattrapage, true, 'Justified absence must be allowed for makeup session');
});
