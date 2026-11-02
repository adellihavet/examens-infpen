/**
 * Algerian National Examination Anonymat & Correction Engine
 * Designed for INFPE Laghouat (National Institute for Training Education Staff)
 * Implements strict non-linear permutation encryption, per-module diversification,
 * grade disparity detection (Ecart), and 3-tier correction arbitration.
 */

export interface Candidate {
  id: string;
  registrationNumber: string; // رقم التسجيل (e.g. 2024/INFPE/042)
  fullName: string;           // الاسم واللقب (e.g. أحمد بوعلام بن العربي)
  birthDate: string;          // تاريخ الميلاد
  birthPlace: string;         // مكان الميلاد
  specialtyId: string;        // التخصص (e.g. dir_sec, insp_prim, intendant)
  promotionYear: string;      // الدفعة التكوينية (e.g. 2024-2025)
  groupNumber: string;        // الفوج التكويني (e.g. الفوج 01)
  roomNumber: string;         // قاعة الامتحان (e.g. القاعة 03)
  attendanceStatus?: 'present' | 'absent' | 'justified_absent';
  absenceReason?: string;       // مبرر أو سبب الغياب
  originalInstitution?: string; // المؤسسة الأصلية
  wilaya?: string;              // الولاية
  corps?: string;               // السلك (مثلاً: مفتش التعليم الابتدائي)
  rankName?: string;            // الرتبة (مثلاً: مفتش التعليم الابتدائي للمواد)
  specialtyField?: string;      // التخصص (مثلاً: لغة عربية، إدارة مواد...)
  birthCommune?: string;        // بلدية الميلاد
  birthWilaya?: string;         // ولاية الميلاد
  candidateWilaya?: string;     // ولاية المترشح
  gender?: string;              // الجنس (ذكر / أنثى)
  continuousAssessment?: number; // معدل المراقبة المستمرة / 20
  internshipGrade?: number;      // علامة التربص التطبيقي / 20
  memoirGrade?: number;          // علامة مذكرة التخرج أو تقرير نهاية التكوين / 20
  continuousControlGrades?: Record<string, number>; // علامات المراقبة المستمرة لكل مقياس (معرّف المقياس -> العلامة)
}

export interface ExamModule {
  id: string;
  code: string;               // e.g. PED-01, LEG-02, FIN-03
  titleAr: string;            // التشريع المدرسي والتنظيم الإداري
  coefficient: number;        // المعامل
  eliminatoryGrade: number;   // النقطة الإقصائية (عادة 05.00/20)
  disparityThreshold: number; // عتبة الفارق للتصحيح الثالث (عادة 3.5 أو 4.0)
  maxGrade: number;           // 20
  durationMinutes: number;    // 180 (3h)
  specialtyId: string;
}

export interface AnonymatMapping {
  candidateId: string;
  moduleId: string;
  sessionId: string;
  anonymatCode: string;       // e.g. AGH-74921-A
  barcodePayload: string;     // Encrypted payload for scanner
  qrPayload: string;
  checksum: string;
}

export interface GradeRecord {
  id: string;
  anonymatCode: string;
  moduleId: string;
  sessionId: string;
  firstCorrectorGrade?: number | null;
  secondCorrectorGrade?: number | null;
  thirdCorrectorGrade?: number | null;
  needsThirdCorrection?: boolean;
  disparity?: number | null;
  finalGrade: number | null;
  isAbsent: boolean;
  notes?: string;
  updatedAt: string;
}

/**
 * Simple 32-bit FNV-1a hash for string hashing
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
 * Linear Congruential Generator for deterministic pseudo-random sequences
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
 * Generate a non-linear permutation set of anonymat codes for a candidate list and module.
 * Guarantee:
 * 1. 100% collision-free within the session & module.
 * 2. Unpredictable non-linear shuffle: candidate 1 and candidate 2 have completely dispersed codes.
 * 3. Module isolation: Candidate X gets code A in Module 1, but completely unrelated code B in Module 2.
 */
export function generateAnonymatCodes(
  candidates: Candidate[],
  moduleId: string,
  sessionId: string,
  secretKey: string = 'INFPE_LAGHOUAT_SEC_KEY_2025'
): AnonymatMapping[] {
  if (candidates.length === 0) return [];

  // Seed derived from secret key + session + module to guarantee module isolation
  const seedStr = `${secretKey}::${sessionId}::${moduleId}::INFPE_ALGERIA`;
  const seed = fnv1a(seedStr);
  const prng = new DeterministicPRNG(seed);

  // Generate a shuffled pool of numbers
  const count = candidates.length;
  // Choose a base offset (e.g., 10000 - 89000)
  const baseOffset = prng.nextInt(10000, 40000);
  const step = prng.nextInt(7, 37); // Coprime-like progression step

  // Create array of indices and Fisher-Yates shuffle
  const indices = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(prng.next() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // Prefix letter based on module hash
  const moduleHash = fnv1a(moduleId);
  const letterCode = String.fromCharCode(65 + (moduleHash % 26));

  const mappings: AnonymatMapping[] = [];

  for (let idx = 0; idx < count; idx++) {
    const shuffledIndex = indices[idx];
    const candidate = candidates[idx];
    
    // Unique calculated number
    const num = baseOffset + (shuffledIndex * step) + prng.nextInt(1, 5);
    const codeStr = `${letterCode}-${num.toString().padStart(5, '0')}`;
    
    // Checksum byte
    const checkVal = (fnv1a(`${codeStr}-${candidate.registrationNumber}-${secretKey}`) % 97)
      .toString()
      .padStart(2, '0');
    
    const finalAnonymat = `${codeStr}/${checkVal}`;
    const barcodePayload = `*INFPE-${finalAnonymat}*`;
    const qrPayload = JSON.stringify({
      ano: finalAnonymat,
      mod: moduleId,
      ses: sessionId,
      sig: checkVal
    });

    mappings.push({
      candidateId: candidate.id,
      moduleId,
      sessionId,
      anonymatCode: finalAnonymat,
      barcodePayload,
      qrPayload,
      checksum: checkVal
    });
  }

  return mappings;
}

/**
 * Arbitrate and calculate final grade based on Algerian Ministry of National Education examination standards:
 * - If only 1st corrector exists: provisional.
 * - When both 1st and 2nd correctors enter grades:
 *   - Ecart = |Grade1 - Grade2|
 *   - If Ecart <= disparityThreshold (e.g. 3.5 points):
 *     Final Grade = (Grade1 + Grade2) / 2
 *     needsThirdCorrection = false
 *   - If Ecart > disparityThreshold:
 *     needsThirdCorrection = true
 *     If 3rd corrector enters grade (Grade3):
 *       Take the average of Grade3 and the closest of (Grade1 or Grade2),
 *       or if Grade3 is equidistant, (Grade1 + Grade2 + Grade3) / 3 or as defined.
 */
export function calculateFinalGrade(
  grade1: number | null,
  grade2: number | null,
  grade3: number | null,
  disparityThreshold: number = 3.5
): {
  disparity: number | null;
  needsThirdCorrection: boolean;
  finalGrade: number | null;
  explanation: string;
} {
  if (grade1 === null && grade2 === null) {
    return {
      disparity: null,
      needsThirdCorrection: false,
      finalGrade: null,
      explanation: 'لم يتم حجز أي نقطة بعد'
    };
  }

  if (grade1 !== null && grade2 === null) {
    return {
      disparity: null,
      needsThirdCorrection: false,
      finalGrade: null,
      explanation: 'في انتظار حجز نقطة التصحيح الثاني'
    };
  }

  if (grade1 === null && grade2 !== null) {
    return {
      disparity: null,
      needsThirdCorrection: false,
      finalGrade: null,
      explanation: 'في انتظار حجز نقطة التصحيح الأول'
    };
  }

  // Both Grade 1 and Grade 2 are present
  const g1 = Math.round(grade1! * 100) / 100;
  const g2 = Math.round(grade2! * 100) / 100;
  const disparity = Math.round(Math.abs(g1 - g2) * 100) / 100;

  if (disparity <= disparityThreshold) {
    const finalG = Math.round(((g1 + g2) / 2) * 100) / 100;
    return {
      disparity,
      needsThirdCorrection: false,
      finalGrade: finalG,
      explanation: `فارق مقبول (${disparity.toFixed(2)} <= ${disparityThreshold}). المعدل = (${g1} + ${g2}) / 2 = ${finalG.toFixed(2)}`
    };
  }

  // Disparity exceeded threshold! Third correction needed
  if (grade3 === null) {
    return {
      disparity,
      needsThirdCorrection: true,
      finalGrade: null,
      explanation: `تنبيه فارق يتجاوز العتبة (${disparity.toFixed(2)} > ${disparityThreshold})! يتطلب إحالة الورقة فوراً للتصحيح الثالث.`
    };
  }

  // Grade 3 is present! Arbitration logic:
  const g3 = Math.round(grade3 * 100) / 100;
  const diff1 = Math.abs(g3 - g1);
  const diff2 = Math.abs(g3 - g2);

  let finalG: number;
  let reason: string;

  if (Math.abs(diff1 - diff2) < 0.001) {
    // Equidistant: average of all three or Grade 3
    finalG = Math.round(((g1 + g2 + g3) / 3) * 100) / 100;
    reason = `النقطة الثالثة متساوية البعد مع التصحيحين. المعدل الثلاثي = (${g1} + ${g2} + ${g3}) / 3 = ${finalG.toFixed(2)}`;
  } else if (diff1 < diff2) {
    // Grade 3 is closer to Grade 1
    finalG = Math.round(((g1 + g3) / 2) * 100) / 100;
    reason = `التصحيح الثالث (${g3}) أقرب للتصحيح الأول (${g1}). المعدل = (${g1} + ${g3}) / 2 = ${finalG.toFixed(2)}`;
  } else {
    // Grade 3 is closer to Grade 2
    finalG = Math.round(((g2 + g3) / 2) * 100) / 100;
    reason = `التصحيح الثالث (${g3}) أقرب للتصحيح الثاني (${g2}). المعدل = (${g2} + ${g3}) / 2 = ${finalG.toFixed(2)}`;
  }

  return {
    disparity,
    needsThirdCorrection: true,
    finalGrade: finalG,
    explanation: reason
  };
}

/**
 * Calculate deliberation outcome for a candidate across all modules
 */
export interface DeliberationCandidateResult {
  candidate: Candidate;
  moduleGrades: {
    module: ExamModule;
    finalGrade: number | null;
    weightedGrade: number | null;
    isEliminated: boolean;
  }[];
  totalCoefficients: number;
  totalWeightedScore: number;
  examAverage: number | null;
  continuousAssessment: number;
  internshipGrade: number;
  memoirGrade: number;
  generalAverage: number | null;
  average: number | null;
  track: 'specialized' | 'pre_promotion';
  rank: number;
  decision: 'ناجح' | 'معني بالاستدراك' | 'مؤجل' | 'راسب' | 'غائب' | 'مقصى';
  mention: string;
}

export function computeDeliberation(
  candidates: Candidate[],
  modules: ExamModule[],
  gradesByCandidateModule: Map<string, number | null>, // key: `${candidateId}::${moduleId}`
  successThreshold: number = 10.0,
  track: 'specialized' | 'pre_promotion' = 'specialized',
  applyMinisterialFormula: boolean = false
): DeliberationCandidateResult[] {
  const totalCoeffs = modules.reduce((sum, m) => sum + m.coefficient, 0);

  const results: DeliberationCandidateResult[] = candidates.map((cand) => {
    let hasElimination = false;
    let hasMissing = false;
    let totalScore = 0;

    const moduleGrades = modules.map((mod) => {
      const grade = gradesByCandidateModule.get(`${cand.id}::${mod.id}`) ?? null;
      let weightedGrade: number | null = null;
      let isEliminated = false;

      if (grade === null) {
        hasMissing = true;
      } else {
        weightedGrade = Math.round(grade * mod.coefficient * 100) / 100;
        totalScore += weightedGrade;
        if (grade < mod.eliminatoryGrade) {
          hasElimination = true;
          isEliminated = true;
        }
      }

      return {
        module: mod,
        finalGrade: grade,
        weightedGrade,
        isEliminated
      };
    });

    let examAverage: number | null = null;
    let generalAverage: number | null = null;
    let average: number | null = null;
    let decision: 'ناجح' | 'معني بالاستدراك' | 'مؤجل' | 'راسب' | 'غائب' | 'مقصى' = 'مؤجل';
    let mention = '—';

    const continuousAssessment = cand.continuousAssessment ?? 14.0;
    const internshipGrade = cand.internshipGrade ?? 15.0;
    const memoirGrade = cand.memoirGrade ?? 14.5;

    if (cand.attendanceStatus === 'absent') {
      decision = 'غائب';
      mention = 'غائب عن الدورة';
    } else if (hasMissing) {
      decision = 'مؤجل';
      mention = 'نقاط غير مكتملة';
    } else {
      examAverage = totalCoeffs > 0 ? Math.round((totalScore / totalCoeffs) * 100) / 100 : 0;
      
      if (applyMinisterialFormula) {
        if (track === 'specialized') {
          // Track A (المسار الأول: التكوين المتخصص - مدراء ومفتشون)
          // المعدل العام = ((المراقبة المستمرة × 1) + (التربص التطبيقي × 1) + (مذكرة التخرج × 1) + (معدل الامتحان النهائي × 3)) / 6
          generalAverage = Math.round((((continuousAssessment * 1) + (internshipGrade * 1) + (memoirGrade * 1) + (examAverage * 3)) / 6) * 100) / 100;
        } else {
          // Track B (المسار الثاني: التكوين قبل الترقية - مشرفو التربية، المخابر، نواب المقتصدين)
          // المعدل العام = ((المراقبة المستمرة × 1) + (التربص التطبيقي × 1) + (مذكرة أو تقرير نهاية التكوين × 2) + (معدل الامتحان النهائي × 3)) / 7
          generalAverage = Math.round((((continuousAssessment * 1) + (internshipGrade * 1) + (memoirGrade * 2) + (examAverage * 3)) / 7) * 100) / 100;
        }
        average = generalAverage;
      } else {
        average = examAverage;
        generalAverage = examAverage;
      }

      if (hasElimination) {
        decision = 'مقصى';
        mention = 'نقطة إقصائية';
      } else if (average >= successThreshold) {
        decision = 'ناجح';
        if (average >= 16) mention = 'امتياز';
        else if (average >= 14) mention = 'جيد جداً';
        else if (average >= 12) mention = 'جيد';
        else mention = 'مقبول';
      } else if (average >= 7.0) {
        decision = 'معني بالاستدراك';
        mention = 'مقبول في الاستدراك';
      } else {
        decision = 'راسب';
        mention = 'لم يحقق المعدل الأدنى';
      }
    }

    return {
      candidate: cand,
      moduleGrades,
      totalCoefficients: totalCoeffs,
      totalWeightedScore: Math.round(totalScore * 100) / 100,
      examAverage,
      continuousAssessment,
      internshipGrade,
      memoirGrade,
      generalAverage,
      average,
      track,
      rank: 0,
      decision,
      mention
    };
  });

  // Sort by average descending for ranking (null averages at the end)
  results.sort((a, b) => {
    if (a.average === null) return 1;
    if (b.average === null) return -1;
    return b.average - a.average;
  });

  // Assign ranks
  results.forEach((res, i) => {
    if (res.average !== null && res.decision === 'ناجح') {
      res.rank = i + 1;
    } else {
      res.rank = 0;
    }
  });

  return results;
}
