/**
 * Algerian National Education & INFPE Deliberation Engine
 * محرك المداولات الرسمي لقطاع التربية الوطنية والمعهد الوطني لتكوين موظفي قطاع التربية
 * 
 * يختص بـ:
 * 1. حساب المعدلات العامة الموزونة بتطبيق المعاملات القانونية.
 * 2. تطبيق قواعد العلامات الإقصائية (Notes Éliminatoires).
 * 3. المعالجة القانونية للغيابات (المبررة وغير المبررة).
 * 4. الفرز الآلي الدقيق للمترشحين المعنيين بالامتحان الاستدراكي (Rattrapage) وتحديد المقاييس المعنية.
 * 5. تحديد قرارات لجنة المداولات والتقديرات والترتيب الرسمي.
 */

export type AttendanceStatus = 'present' | 'absent_unjustified' | 'absent_justified';

export type DeliberationDecision = 
  | 'ناجح'                  // Admis
  | 'معني بالاستدراك'       // Admis au Rattrapage
  | 'مؤجل بغياب مبرر'      // Ajourné avec justification légale
  | 'راسب'                  // Ajourné définitif
  | 'مقصى بعلامة إقصائية'   // Éliminé par note éliminatoire
  | 'مقصى لغياب غير مبرر';  // Éliminé pour absence non justifiée

export interface ModuleConfig {
  id: string;
  code: string;               // e.g. LEG-01, PED-02, FIN-03
  titleAr: string;            // اسم المقياس
  coefficient: number;        // المعامل
  eliminatoryGrade: number;   // النقطة الإقصائية (عادة 05.00/20)
  maxGrade?: number;          // عادة 20.00
  isRattrapable?: boolean;    // هل المقياس معني بالاستدراك (افتراضياً نعم)
}

export interface CandidateModuleScore {
  moduleId: string;
  grade: number | null;       // النقطة المحصل عليها من 20
  isAbsent?: boolean;         // هل غاب عن هذا الاختبار تحديداً
  isJustified?: boolean;      // هل غيابه مبرر قانوناً
  rattrapageGrade?: number | null; // علامة الدورة الاستدراكية إن وجدت
}

export interface CandidateInput {
  id: string;
  registrationNumber: string; // رقم التسجيل
  fullName: string;           // اللقب والاسم
  birthDate?: string;
  groupNumber?: string;
  roomNumber?: string;
  attendanceStatus?: AttendanceStatus; // حالة الحضور العامة
  scores: CandidateModuleScore[];
}

export interface DetailedModuleResult {
  module: ModuleConfig;
  rawGrade: number | null;
  effectiveGrade: number | null;
  coefficient: number;
  weightedScore: number | null;
  isEliminated: boolean;      // هل النقطة إقصائية (< eliminatoryGrade)
  isNeedsRattrapage: boolean; // هل هذا المقياس تحديداً يستوجب الاستدراك
  statusNote: string;
}

export interface CandidateDeliberationOutcome {
  candidateId: string;
  registrationNumber: string;
  fullName: string;
  groupNumber?: string;
  roomNumber?: string;
  moduleResults: DetailedModuleResult[];
  
  // المجاميع والمعادلات
  totalCoefficients: number;
  totalWeightedScore: number;
  generalAverage: number | null; // المعدل العام المحسوب
  
  // قرارات الاستدراك والإقصاء
  decision: DeliberationDecision;
  mention: string;               // التقدير (امتياز، جيد جداً...)
  rank: number;                  // الترتيب التنازلي بين الناجحين
  
  // تفاصيل الاستدراك
  isEligibleForRattrapage: boolean;
  rattrapageModules: {
    moduleId: string;
    moduleCode: string;
    titleAr: string;
    currentGrade: number | null;
    coefficient: number;
  }[];
  
  // أسباب القرار بالتفصيل
  decisionRationale: string;
}

export interface DeliberationSessionStats {
  totalRegistered: number;
  totalPresent: number;
  totalAbsentUnjustified: number;
  totalAbsentJustified: number;
  passedCount: number;
  rattrapageCount: number;
  eliminatedByGradeCount: number;
  failedCount: number;
  successRate: number; // نسبة النجاح المئوية
  moduleStats: {
    moduleId: string;
    titleAr: string;
    averageGrade: number;
    failureCount: number; // عدد الحاصلين على أقل من 10
    eliminationCount: number; // عدد الحاصلين على علامة إقصائية
  }[];
}

export interface DeliberationSettings {
  successThreshold: number;       // معدل النجاح الأدنى (10.00)
  rattrapageMinAverage: number;   // المعدل الأدنى للقبول في الاستدراك (مثلاً 07.00)
  allowEliminatedToRattrapage: boolean; // هل يُسمح للمقصى بنقطة إقصائية بدخول الاستدراك في ذلك المقياس؟ (نعم في التنظيم الجزائري)
  rattrapageCapAt10: boolean;     // هل تُسقف نقطة الاستدراك عند 10/20 أم تُعتمد النقطة الأفضل؟
}

export const DEFAULT_DELIBERATION_SETTINGS: DeliberationSettings = {
  successThreshold: 10.00,
  rattrapageMinAverage: 7.00,
  allowEliminatedToRattrapage: true,
  rattrapageCapAt10: false
};

/**
 * محرك المداولات الرئيسي: يقوم بمعالجة كافة المترشحين وفق التشريع المدرسي الجزائري
 */
export function runDeliberationProcess(
  candidates: CandidateInput[],
  modules: ModuleConfig[],
  settings: DeliberationSettings = DEFAULT_DELIBERATION_SETTINGS
): {
  results: CandidateDeliberationOutcome[];
  statistics: DeliberationSessionStats;
} {
  const totalCoeffs = modules.reduce((sum, m) => sum + m.coefficient, 0);

  const results: CandidateDeliberationOutcome[] = candidates.map((cand) => {
    let hasUnjustifiedAbsence = cand.attendanceStatus === 'absent_unjustified';
    let hasJustifiedAbsence = cand.attendanceStatus === 'absent_justified';
    let hasEliminatoryGrade = false;
    let hasIncompleteScores = false;
    let sumWeightedScores = 0;

    const moduleResults: DetailedModuleResult[] = modules.map((mod) => {
      const scoreEntry = cand.scores.find((s) => s.moduleId === mod.id);
      let grade = scoreEntry?.grade ?? null;

      // فحص غياب خاص بالمقياس
      if (scoreEntry?.isAbsent) {
        if (scoreEntry.isJustified) {
          hasJustifiedAbsence = true;
        } else {
          hasUnjustifiedAbsence = true;
          grade = 0; // الغياب غير المبرر يرصد صفراً
        }
      }

      // إذا كانت هناك علامة استدراك سابقة
      if (scoreEntry?.rattrapageGrade !== undefined && scoreEntry.rattrapageGrade !== null) {
        const ratGrade = scoreEntry.rattrapageGrade;
        if (settings.rattrapageCapAt10) {
          grade = Math.max(grade ?? 0, Math.min(10.0, ratGrade));
        } else {
          grade = Math.max(grade ?? 0, ratGrade);
        }
      }

      let weightedScore: number | null = null;
      let isEliminated = false;
      let isNeedsRattrapage = false;
      let statusNote = 'عادي';

      if (grade === null) {
        hasIncompleteScores = true;
        statusNote = 'غير مرصود';
      } else {
        weightedScore = Math.round(grade * mod.coefficient * 100) / 100;
        sumWeightedScores += weightedScore;

        if (grade < mod.eliminatoryGrade) {
          isEliminated = true;
          hasEliminatoryGrade = true;
          statusNote = `علامة إقصائية (${grade.toFixed(2)} < ${mod.eliminatoryGrade})`;
        } else if (grade < 10.0) {
          statusNote = `أقل من المعدل (${grade.toFixed(2)})`;
        }

        // المقياس يحتاج استدراك إذا كانت النقطة أقل من 10 أو إقصائية
        if (grade < 10.0 && mod.isRattrapable !== false) {
          isNeedsRattrapage = true;
        }
      }

      return {
        module: mod,
        rawGrade: scoreEntry?.grade ?? null,
        effectiveGrade: grade,
        coefficient: mod.coefficient,
        weightedScore,
        isEliminated,
        isNeedsRattrapage,
        statusNote
      };
    });

    // حساب المعدل العام
    let generalAverage: number | null = null;
    if (!hasIncompleteScores && totalCoeffs > 0) {
      generalAverage = Math.round((sumWeightedScores / totalCoeffs) * 100) / 100;
    }

    // فرز المقاييس المعنية بالاستدراك
    const rattrapageModules = moduleResults
      .filter((mr) => mr.isNeedsRattrapage)
      .map((mr) => ({
        moduleId: mr.module.id,
        moduleCode: mr.module.code,
        titleAr: mr.module.titleAr,
        currentGrade: mr.effectiveGrade,
        coefficient: mr.module.coefficient
      }));

    // تحديد القرار النهائي بناءً على القوانين الرسمية للتربية الوطنية
    let decision: DeliberationDecision = 'راسب';
    let mention = '—';
    let isEligibleForRattrapage = false;
    let decisionRationale = '';

    if (hasUnjustifiedAbsence) {
      decision = 'مقصى لغياب غير مبرر';
      mention = 'إقصاء بالغياب';
      decisionRationale = 'سُجل غياب غير مبرر في أحد الاختبارات الإلزامية طبقاً للقرار الوزاري.';
    } else if (hasJustifiedAbsence && (generalAverage === null || generalAverage < settings.successThreshold)) {
      decision = 'مؤجل بغياب مبرر';
      mention = 'غياب مبرر قانوناً';
      isEligibleForRattrapage = true;
      decisionRationale = 'المترشح معذور بمبرر قانوني معتمد لدى إدارة المعهد ويُحال إلى الدورة الاستدراكية.';
    } else if (hasIncompleteScores) {
      decision = 'راسب';
      mention = 'ملف غير مكتمل';
      decisionRationale = 'عدم اكتمال حجز نقاط كافة المقاييس الإلزامية لدورة التخرج.';
    } else if (generalAverage !== null) {
      // الحالة 1: حقق المعدل بدون أي علامة إقصائية -> ناجح مباشرة
      if (generalAverage >= settings.successThreshold && !hasEliminatoryGrade) {
        decision = 'ناجح';
        isEligibleForRattrapage = false;
        decisionRationale = `حقق معدل النجاح العام (${generalAverage.toFixed(2)}/20) دون وجود أي علامة إقصائية.`;

        // حساب التقدير (Mention)
        if (generalAverage >= 16.0) mention = 'امتياز';
        else if (generalAverage >= 14.0) mention = 'جيد جداً';
        else if (generalAverage >= 12.0) mention = 'جيد';
        else mention = 'مقبول';
      }
      // الحالة 2: حقق المعدل العام ولكن لديه علامة إقصائية
      else if (generalAverage >= settings.successThreshold && hasEliminatoryGrade) {
        if (settings.allowEliminatedToRattrapage) {
          decision = 'معني بالاستدراك';
          mention = 'استدراك العلامة الإقصائية';
          isEligibleForRattrapage = true;
          decisionRationale = `حقق المعدل العام (${generalAverage.toFixed(2)}) ولكن لديه علامة إقصائية تستوجب الاستدراك حصراً في المقياس المقصي.`;
        } else {
          decision = 'مقصى بعلامة إقصائية';
          mention = 'إقصاء بعلامة موجبة للرسوب';
          isEligibleForRattrapage = false;
          decisionRationale = `حصول المترشح على علامة إقصائية تقل عن الحد الأدنى المحدد للمقياس.`;
        }
      }
      // الحالة 3: لم يحقق المعدل العام (بين عتبة الاستدراك 07.00 و 09.99)
      else if (generalAverage >= settings.rattrapageMinAverage && generalAverage < settings.successThreshold) {
        decision = 'معني بالاستدراك';
        mention = 'دورة استدراكية';
        isEligibleForRattrapage = true;
        decisionRationale = `المعدل العام (${generalAverage.toFixed(2)}) يقع ضمن مجال الاستدراك القانوني [${settings.rattrapageMinAverage.toFixed(2)} - 09.99].`;
      }
      // الحالة 4: معدل أقل من عتبة الاستدراك
      else {
        decision = hasEliminatoryGrade ? 'مقصى بعلامة إقصائية' : 'راسب';
        mention = 'لم يحقق المعدل الأدنى';
        isEligibleForRattrapage = false;
        decisionRationale = `المعدل العام (${generalAverage.toFixed(2)}) دون عتبة الاستدراك المسموح بها (${settings.rattrapageMinAverage.toFixed(2)}).`;
      }
    }

    return {
      candidateId: cand.id,
      registrationNumber: cand.registrationNumber,
      fullName: cand.fullName,
      groupNumber: cand.groupNumber,
      roomNumber: cand.roomNumber,
      moduleResults,
      totalCoefficients: totalCoeffs,
      totalWeightedScore: Math.round(sumWeightedScores * 100) / 100,
      generalAverage,
      decision,
      mention,
      rank: 0,
      isEligibleForRattrapage,
      rattrapageModules,
      decisionRationale
    };
  });

  // الترتيب التنازلي للناجحين (Ranking)
  results.sort((a, b) => {
    if (a.generalAverage === null) return 1;
    if (b.generalAverage === null) return -1;
    return b.generalAverage - a.generalAverage;
  });

  let currentRank = 1;
  results.forEach((res) => {
    if (res.decision === 'ناجح' && res.generalAverage !== null) {
      res.rank = currentRank++;
    } else {
      res.rank = 0;
    }
  });

  // إحصائيات المداولات الشاملة
  const totalRegistered = candidates.length;
  const passedCount = results.filter((r) => r.decision === 'ناجح').length;
  const rattrapageCount = results.filter((r) => r.decision === 'معني بالاستدراك' || r.decision === 'مؤجل بغياب مبرر').length;
  const eliminatedByGradeCount = results.filter((r) => r.decision === 'مقصى بعلامة إقصائية').length;
  const totalAbsentUnjustified = results.filter((r) => r.decision === 'مقصى لغياب غير مبرر').length;
  const totalAbsentJustified = results.filter((r) => r.decision === 'مؤجل بغياب مبرر').length;
  const failedCount = results.filter((r) => r.decision === 'راسب').length;
  const totalPresent = totalRegistered - totalAbsentUnjustified - totalAbsentJustified;
  const successRate = totalRegistered > 0 ? Math.round((passedCount / totalRegistered) * 10000) / 100 : 0;

  // إحصائيات كل مقياس
  const moduleStats = modules.map((mod) => {
    let validGradesCount = 0;
    let sumGrades = 0;
    let failureCount = 0;
    let eliminationCount = 0;

    results.forEach((res) => {
      const mr = res.moduleResults.find((m) => m.module.id === mod.id);
      if (mr && mr.effectiveGrade !== null) {
        validGradesCount++;
        sumGrades += mr.effectiveGrade;
        if (mr.effectiveGrade < 10.0) failureCount++;
        if (mr.effectiveGrade < mod.eliminatoryGrade) eliminationCount++;
      }
    });

    const averageGrade = validGradesCount > 0 ? Math.round((sumGrades / validGradesCount) * 100) / 100 : 0;

    return {
      moduleId: mod.id,
      titleAr: mod.titleAr,
      averageGrade,
      failureCount,
      eliminationCount
    };
  });

  return {
    results,
    statistics: {
      totalRegistered,
      totalPresent,
      totalAbsentUnjustified,
      totalAbsentJustified,
      passedCount,
      rattrapageCount,
      eliminatedByGradeCount,
      failedCount,
      successRate,
      moduleStats
    }
  };
}

/**
 * دالة مساعدة: استخراج كشف المترشحين المعنيين بالامتحان الاستدراكي بصيغة ملائمة للطباعة والتعليق
 */
export function extractRattrapageBoard(results: CandidateDeliberationOutcome[]): {
  candidateId: string;
  registrationNumber: string;
  fullName: string;
  generalAverage: number | null;
  modulesCount: number;
  modulesList: string;
}[] {
  return results
    .filter((r) => r.isEligibleForRattrapage && r.rattrapageModules.length > 0)
    .map((r) => ({
      candidateId: r.candidateId,
      registrationNumber: r.registrationNumber,
      fullName: r.fullName,
      generalAverage: r.generalAverage,
      modulesCount: r.rattrapageModules.length,
      modulesList: r.rattrapageModules.map((m) => `${m.titleAr} (${m.currentGrade !== null ? m.currentGrade.toFixed(2) : 'غ.م'})`).join(' • ')
    }));
}
