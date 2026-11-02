/**
 * Official Master Data for INFPE Laghouat (National Institute for Training Education Staff)
 * Grounded in:
 * 1. Décret Interministériel du 17 Mars 2026 (J.O. N° 35) - التكوين المتخصص للترقية (امتحان مهني)
 * 2. Décret Interministériel du 18 Janvier 2026 (J.O. N° 21) - التكوين قبل الترقية
 * 3. Décision ministérielle fixant les codes des unités de formation - الرموز الرسمية لوحدات التكوين
 */

import type { ExamModule } from '../utils/crypto-anonymat';

export type TrainingTrackId = 'specialized' | 'pre_promotion';

export interface EvaluationCoefficients {
  continuousControl: number; // المراقبة المستمرة
  internship: number;        // التربص التطبيقي
  memoir: number;            // مذكرة أو تقرير نهاية التكوين
  finalExam: number;         // الامتحان النهائي الشامل
  totalCoeff: number;        // المجموع (6 في التكوينين)
  successThreshold: number;  // 10.00 / 20
  eliminatoryGrade: number;  // 05.00 / 20
}

export interface PromotionRank {
  id: string;
  code: string;
  titleAr: string;
  titleFr: string;
  trackId: TrainingTrackId;
  category: string;
  theoreticalDuration: string; // e.g. "سنة تكوينية (420 ساعة)" أو "05 أشهر (336 ساعة)"
  internshipDuration: string;  // e.g. "شهران تربص تطبيقي" أو "شهر واحد"
  totalHours: number;
  decreeReference: string;
  evaluation: EvaluationCoefficients;
  modules: ExamModule[];
}

export interface TrainingTrack {
  id: TrainingTrackId;
  titleAr: string;
  titleFr: string;
  decreeTitle: string;
  journalOfficial: string;
  decreeDate: string;
  evaluation: EvaluationCoefficients;
  ranks: PromotionRank[];
}

// Evaluation formula constants based on Articles 16 & 17
export const SPECIALIZED_EVALUATION: EvaluationCoefficients = {
  continuousControl: 1, // المراقبة المستمرة: معامل 1
  internship: 1,        // التربص التطبيقي: معامل 1
  memoir: 1,            // مذكرة نهاية التكوين: معامل 1
  finalExam: 3,         // الامتحان النهائي: معامل 3
  totalCoeff: 6,        // 1 + 1 + 1 + 3 = 6
  successThreshold: 10.0,
  eliminatoryGrade: 5.0
};

export const PRE_PROMOTION_EVALUATION: EvaluationCoefficients = {
  continuousControl: 1, // المراقبة المستمرة: معامل 1
  internship: 1,        // التربص التطبيقي: معامل 1
  memoir: 2,            // مذكرة أو تقرير نهاية التكوين: معامل 2 (المادة 17 من مرسوم 18 جانفي 2026)
  finalExam: 3,         // الامتحان النهائي: معامل 3
  totalCoeff: 7,        // 1 + 1 + 2 + 3 = 7
  successThreshold: 10.0,
  eliminatoryGrade: 5.0
};

// ==========================================
// 1. مسار التكوين المتخصص (امتحان مهني)
// ==========================================

// أ) مدير مدرسة ابتدائية (13 مقياساً - 420 ساعة)
const MODULES_DIR_PRIM: ExamModule[] = [
  { id: 'm_dp_01', code: 'MOD-02', titleAr: 'القانون الإداري والتشريع المدرسي', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'dir_prim' },
  { id: 'm_dp_02', code: 'MOD-23', titleAr: 'التسيير التربوي والبيداغوجي', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'dir_prim' },
  { id: 'm_dp_03', code: 'MOD-06', titleAr: 'التنظيم والتسيير الإداري (المناجمنت)', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'dir_prim' },
  { id: 'm_dp_04', code: 'MOD-35', titleAr: 'التنشيط التربوي والاتصال', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'dir_prim' },
  { id: 'm_dp_05', code: 'MOD-46', titleAr: 'علم النفس التربوي والاجتماعي', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_prim' },
  { id: 'm_dp_06', code: 'MOD-57', titleAr: 'التقويم والمتابعة التربوية', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_prim' },
  { id: 'm_dp_07', code: 'MOD-60', titleAr: 'منهجية البحث وتقنيات التحرير', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_prim' },
  { id: 'm_dp_08', code: 'MOD-61', titleAr: 'هندسة التكوين والمرافقة', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_prim' },
  { id: 'm_dp_09', code: 'MOD-24', titleAr: 'التسيير المادي وحفظ الممتلكات', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_prim' },
  { id: 'm_dp_10', code: 'MOD-16', titleAr: 'النظام التربوي الجزائري وغاياته', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_prim' },
  { id: 'm_dp_11', code: 'MOD-53', titleAr: 'التاريخ الوطني والحضارة الإسلامية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_prim' },
  { id: 'm_dp_12', code: 'MOD-20', titleAr: 'الإعلام الآلي وتكنولوجيات الإعلام والاتصال', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_prim' },
  { id: 'm_dp_13', code: 'MOD-34', titleAr: 'الشفافية والوقاية من الفساد ومكافحته وأخلاقيات المهنة', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_prim' }
];

// ب) مدير متوسطة (14 مقياساً - 420 ساعة)
const MODULES_DIR_CEM: ExamModule[] = [
  { id: 'm_dc_01', code: 'MOD-02', titleAr: 'القانون الإداري والتشريع المدرسي', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'dir_cem' },
  { id: 'm_dc_02', code: 'MOD-23', titleAr: 'التسيير التربوي والبيداغوجي', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'dir_cem' },
  { id: 'm_dc_03', code: 'MOD-06', titleAr: 'التنظيم والتسيير الإداري والمناجمنت', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'dir_cem' },
  { id: 'm_dc_04', code: 'MOD-26', titleAr: 'التسيير المالي والميزانياتي', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'dir_cem' },
  { id: 'm_dc_05', code: 'MOD-25', titleAr: 'التسيير المادي وحفظ الممتلكات', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_cem' },
  { id: 'm_dc_06', code: 'MOD-28', titleAr: 'المالية العامة والصفقات العمومية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_cem' },
  { id: 'm_dc_07', code: 'MOD-29', titleAr: 'قواعد المحاسبة العمومية وتطبيقاتها', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_cem' },
  { id: 'm_dc_08', code: 'MOD-57', titleAr: 'التقويم والمتابعة البيداغوجية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_cem' },
  { id: 'm_dc_09', code: 'MOD-60', titleAr: 'منهجية البحث وإعداد المذكرات', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_cem' },
  { id: 'm_dc_10', code: 'MOD-61', titleAr: 'هندسة التكوين والتدريب المهني', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_cem' },
  { id: 'm_dc_11', code: 'MOD-16', titleAr: 'النظام التربوي الجزائري', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_cem' },
  { id: 'm_dc_12', code: 'MOD-53', titleAr: 'التاريخ الوطني والحضارة الإسلامية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_cem' },
  { id: 'm_dc_13', code: 'MOD-20', titleAr: 'الإعلام الآلي ورقمنة الإدارة', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_cem' },
  { id: 'm_dc_14', code: 'MOD-34', titleAr: 'الشفافية والوقاية من الفساد وأخلاقيات المهنة', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_cem' }
];

// ج) مدير ثانوية (14 مقياساً - 420 ساعة)
const MODULES_DIR_SEC: ExamModule[] = [
  { id: 'm_ds_01', code: 'MOD-02', titleAr: 'القانون الإداري والتشريع المدرسي والجامعي', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'dir_sec' },
  { id: 'm_ds_02', code: 'MOD-23', titleAr: 'التسيير التربوي والبيداغوجي للطور الثانوي', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'dir_sec' },
  { id: 'm_ds_03', code: 'MOD-06', titleAr: 'التنظيم والتسيير الإداري الاستراتيجي (المناجمنت)', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'dir_sec' },
  { id: 'm_ds_04', code: 'MOD-26', titleAr: 'التسيير المالي وتدقيق الحسابات', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'dir_sec' },
  { id: 'm_ds_05', code: 'MOD-25', titleAr: 'التسيير المادي والتجهيز والصيانة', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_sec' },
  { id: 'm_ds_06', code: 'MOD-28', titleAr: 'المالية العامة والصفقات العمومية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_sec' },
  { id: 'm_ds_07', code: 'MOD-29', titleAr: 'قواعد المحاسبة العمومية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_sec' },
  { id: 'm_ds_08', code: 'MOD-57', titleAr: 'التقويم والمتابعة وأنظمة الامتحانات الرسمية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_sec' },
  { id: 'm_ds_09', code: 'MOD-60', titleAr: 'منهجية البحث العلمي وإعداد المذكرات', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_sec' },
  { id: 'm_ds_10', code: 'MOD-61', titleAr: 'هندسة التكوين والقيادة البيداغوجية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_sec' },
  { id: 'm_ds_11', code: 'MOD-16', titleAr: 'النظام التربوي الجزائري والإصلاحات البيداغوجية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_sec' },
  { id: 'm_ds_12', code: 'MOD-53', titleAr: 'التاريخ الوطني والحضارة الإسلامية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_sec' },
  { id: 'm_ds_13', code: 'MOD-20', titleAr: 'الإعلام الآلي والرقمنة ونظم المعلومات', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_sec' },
  { id: 'm_ds_14', code: 'MOD-34', titleAr: 'الشفافية والوقاية من الفساد ومكافحته وأخلاقيات المهنة', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'dir_sec' }
];

// د) مفتش التعليم الابتدائي - إدارة المدارس الابتدائية (13 مقياساً - 420 ساعة)
const MODULES_INSP_ADMIN_PRIM: ExamModule[] = [
  { id: 'm_iap_01', code: 'MOD-02', titleAr: 'التشريع المدرسي والقانون الإداري المقارن', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'insp_admin_prim' },
  { id: 'm_iap_02', code: 'MOD-17', titleAr: 'تقنيات التفتيش والمراقبة الإدارية', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'insp_admin_prim' },
  { id: 'm_iap_03', code: 'MOD-23', titleAr: 'التسيير التربوي والبيداغوجي والقيادة', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'insp_admin_prim' },
  { id: 'm_iap_04', code: 'MOD-06', titleAr: 'التنظيم والتسيير الإداري والمناجمنت التربوي', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'insp_admin_prim' },
  { id: 'm_iap_05', code: 'MOD-24', titleAr: 'التسيير المادي والمالي للمدارس والمطاعم المدرسية', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_prim' },
  { id: 'm_iap_06', code: 'MOD-57', titleAr: 'التقويم المؤسساتي ومتابعة البرامج', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_prim' },
  { id: 'm_iap_07', code: 'MOD-60', titleAr: 'منهجية البحث وتقنيات إعداد التقارير التفتيشية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_prim' },
  { id: 'm_iap_08', code: 'MOD-61', titleAr: 'هندسة التكوين المستمر والندوات التربوية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_prim' },
  { id: 'm_iap_09', code: 'MOD-46', titleAr: 'علم النفس التربوي والوساطة المدرسية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_prim' },
  { id: 'm_iap_10', code: 'MOD-16', titleAr: 'النظام التربوي الجزائري والسياسات التعليمية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_prim' },
  { id: 'm_iap_11', code: 'MOD-53', titleAr: 'التاريخ الوطني والحضارة الإسلامية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_prim' },
  { id: 'm_iap_12', code: 'MOD-20', titleAr: 'الإعلام الآلي والرقمنة الإدارية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_prim' },
  { id: 'm_iap_13', code: 'MOD-34', titleAr: 'الشفافية والوقاية من الفساد وأخلاقيات الوظيفة التفتيشية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_prim' }
];

// هـ) مفتش التعليم الابتدائي - مواد بيداغوجية (لغة عربية - 15 مقياساً - 420 ساعة)
const MODULES_INSP_PED_PRIM_AR: ExamModule[] = [
  { id: 'm_ipp_01', code: 'MOD-18', titleAr: 'تقنيات التفتيش والمراقبة البيداغوجية', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'insp_ped_prim_ar' },
  { id: 'm_ipp_02', code: 'MOD-401', titleAr: 'ديداكتيك وتعليمية مادة التخصص (اللغة العربية)', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'insp_ped_prim_ar' },
  { id: 'm_ipp_03', code: 'MOD-02', titleAr: 'القانون الإداري والتشريع المدرسي', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'insp_ped_prim_ar' },
  { id: 'm_ipp_04', code: 'MOD-23', titleAr: 'التسيير التربوي والبيداغوجي ومرافقة الأساتذة', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'insp_ped_prim_ar' },
  { id: 'm_ipp_05', code: 'MOD-08', titleAr: 'اللسانيات العامة وتطبيقاتها التربوية', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_ped_prim_ar' },
  { id: 'm_ipp_06', code: 'MOD-46', titleAr: 'علم النفس التربوي وسيكولوجية التعلم', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_ped_prim_ar' },
  { id: 'm_ipp_07', code: 'MOD-57', titleAr: 'التقويم التربوي وبناء الاختبارات المعيارية', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_ped_prim_ar' },
  { id: 'm_ipp_08', code: 'MOD-60', titleAr: 'منهجية البحث العلمي والإحصاء التربوي', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_ped_prim_ar' },
  { id: 'm_ipp_09', code: 'MOD-61', titleAr: 'هندسة التكوين المستمر وتصميم البرامج', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_ped_prim_ar' },
  { id: 'm_ipp_10', code: 'MOD-06', titleAr: 'التنظيم والتسيير الإداري', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_ped_prim_ar' },
  { id: 'm_ipp_11', code: 'MOD-24', titleAr: 'التسيير المادي والمالي', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_ped_prim_ar' },
  { id: 'm_ipp_12', code: 'MOD-16', titleAr: 'النظام التربوي الجزائري', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_ped_prim_ar' },
  { id: 'm_ipp_13', code: 'MOD-53', titleAr: 'التاريخ الوطني والحضارة الإسلامية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_ped_prim_ar' },
  { id: 'm_ipp_14', code: 'MOD-20', titleAr: 'الإعلام الآلي وتطبيقات التعليم الرقمي', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_ped_prim_ar' },
  { id: 'm_ipp_15', code: 'MOD-34', titleAr: 'الشفافية والوقاية من الفساد وأخلاقيات المهنة', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_ped_prim_ar' }
];

// و) مفتش التعليم الابتدائي - التغذية المدرسية (14 مقياساً - 420 ساعة)
const MODULES_INSP_NOURR_PRIM: ExamModule[] = [
  { id: 'm_inp_01', code: 'MOD-410', titleAr: 'التغذية المدرسية وصحة وتغذية الجماعات', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'insp_nourr_prim' },
  { id: 'm_inp_02', code: 'MOD-17', titleAr: 'تقنيات التفتيش والمراقبة الصحية والغذائية', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'insp_nourr_prim' },
  { id: 'm_inp_03', code: 'MOD-02', titleAr: 'التشريع المدرسي والقانون الصحي الوقائي', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'insp_nourr_prim' },
  { id: 'm_inp_04', code: 'MOD-26', titleAr: 'التسيير المالي والمادي للمطاعم المدرسية', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_nourr_prim' },
  { id: 'm_inp_05', code: 'MOD-06', titleAr: 'التنظيم والتسيير الإداري والمناجمنت', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_nourr_prim' },
  { id: 'm_inp_06', code: 'MOD-57', titleAr: 'التقويم والمتابعة الميدانية', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_nourr_prim' },
  { id: 'm_inp_07', code: 'MOD-46', titleAr: 'علم النفس وسلوكيات الطفل في الوسط المدرسي', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_nourr_prim' },
  { id: 'm_inp_08', code: 'MOD-60', titleAr: 'منهجية البحث العلمي وإعداد الدراسات الغذائية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_nourr_prim' },
  { id: 'm_inp_09', code: 'MOD-61', titleAr: 'هندسة التكوين وتأهيل عمال المطاعم', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_nourr_prim' },
  { id: 'm_inp_10', code: 'MOD-24', titleAr: 'تسيير المخازن وشروط الأمن والسلامة', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_nourr_prim' },
  { id: 'm_inp_11', code: 'MOD-16', titleAr: 'النظام التربوي الجزائري', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_nourr_prim' },
  { id: 'm_inp_12', code: 'MOD-53', titleAr: 'التاريخ الوطني والحضارة الإسلامية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_nourr_prim' },
  { id: 'm_inp_13', code: 'MOD-20', titleAr: 'الإعلام الآلي وتطبيقات تسيير المطاعم', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_nourr_prim' },
  { id: 'm_inp_14', code: 'MOD-34', titleAr: 'الشفافية والوقاية من الفساد وأخلاقيات المهنة', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_nourr_prim' }
];

// ز) مفتش التعليم المتوسط - إدارة المتوسطات (14 مقياساً - 420 ساعة)
const MODULES_INSP_ADMIN_CEM: ExamModule[] = [
  { id: 'm_iac_01', code: 'MOD-02', titleAr: 'التشريع المدرسي والقانون الإداري', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'insp_admin_cem' },
  { id: 'm_iac_02', code: 'MOD-17', titleAr: 'تقنيات التفتيش والمراقبة والتدقيق الإداري', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'insp_admin_cem' },
  { id: 'm_iac_03', code: 'MOD-23', titleAr: 'التسيير التربوي والبيداغوجي لمؤسسات التعليم المتوسط', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'insp_admin_cem' },
  { id: 'm_iac_04', code: 'MOD-06', titleAr: 'التنظيم والتسيير الإداري وحوكمة المؤسسات', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'insp_admin_cem' },
  { id: 'm_iac_05', code: 'MOD-26', titleAr: 'التسيير المالي والميزانياتي والمحاسبة', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_cem' },
  { id: 'm_iac_06', code: 'MOD-25', titleAr: 'التسيير المادي وحفظ الممتلكات والتجهيزات', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_cem' },
  { id: 'm_iac_07', code: 'MOD-57', titleAr: 'التقويم المؤسساتي وجودة التسيير التربوي', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_cem' },
  { id: 'm_iac_08', code: 'MOD-60', titleAr: 'منهجية البحث العلمي وإعداد التحقيقات الإدارية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_cem' },
  { id: 'm_iac_09', code: 'MOD-61', titleAr: 'هندسة التكوين وتأهيل مديري المتوسطات', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_cem' },
  { id: 'm_iac_10', code: 'MOD-46', titleAr: 'علم النفس والمناخ المدرسي وحل النزاعات', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_cem' },
  { id: 'm_iac_11', code: 'MOD-16', titleAr: 'النظام التربوي الجزائري والتحولات المعاصرة', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_cem' },
  { id: 'm_iac_12', code: 'MOD-53', titleAr: 'التاريخ الوطني والحضارة الإسلامية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_cem' },
  { id: 'm_iac_13', code: 'MOD-20', titleAr: 'الإعلام الآلي والرقمنة الشاملة للقطاع', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_cem' },
  { id: 'm_iac_14', code: 'MOD-34', titleAr: 'الشفافية والوقاية من الفساد وأخلاقيات الوظيفة التفتيشية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_cem' }
];

// ح) مفتش التعليم الثانوي - إدارة الثانويات (14 مقياساً - 420 ساعة)
const MODULES_INSP_ADMIN_SEC: ExamModule[] = [
  { id: 'm_ias_01', code: 'MOD-02', titleAr: 'التشريع المدرسي والقانون الإداري المتقدم', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'insp_admin_sec' },
  { id: 'm_ias_02', code: 'MOD-17', titleAr: 'تقنيات التفتيش والتدقيق والرقابة الشاملة', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'insp_admin_sec' },
  { id: 'm_ias_03', code: 'MOD-23', titleAr: 'التسيير التربوي والبيداغوجي لمؤسسات التعليم الثانوي', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'insp_admin_sec' },
  { id: 'm_ias_04', code: 'MOD-06', titleAr: 'التنظيم والتسيير الاستراتيجي وحوكمة الثانويات', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'insp_admin_sec' },
  { id: 'm_ias_05', code: 'MOD-26', titleAr: 'التسيير المالي وتدقيق الصفقات العمومية والميزانية', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_sec' },
  { id: 'm_ias_06', code: 'MOD-25', titleAr: 'التسيير المادي والتجهيز العلمي والتقني', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_sec' },
  { id: 'm_ias_07', code: 'MOD-57', titleAr: 'التقويم المؤسساتي وأنظمة البكالوريا', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_sec' },
  { id: 'm_ias_08', code: 'MOD-60', titleAr: 'منهجية البحث العلمي وإعداد التقارير التفتيشية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_sec' },
  { id: 'm_ias_09', code: 'MOD-61', titleAr: 'هندسة التكوين المستمر والقيادة التربوية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_sec' },
  { id: 'm_ias_10', code: 'MOD-46', titleAr: 'علم النفس والمناخ المدرسي وسيكولوجية المراهقة', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_sec' },
  { id: 'm_ias_11', code: 'MOD-16', titleAr: 'النظام التربوي الجزائري والإصلاحات البيداغوجية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_sec' },
  { id: 'm_ias_12', code: 'MOD-53', titleAr: 'التاريخ الوطني والحضارة الإسلامية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_sec' },
  { id: 'm_ias_13', code: 'MOD-20', titleAr: 'الإعلام الآلي وتكنولوجيا الاتصال ورقمنة القطاع', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_sec' },
  { id: 'm_ias_14', code: 'MOD-34', titleAr: 'الشفافية والوقاية من الفساد وأخلاقيات الوظيفة التفتيشية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'insp_admin_sec' }
];

// ==========================================
// 2. مسار التكوين قبل الترقية
// ==========================================

// أ) مشرف التربية (10 مقاييس - 336 ساعة)
const MODULES_SURVEILLANT: ExamModule[] = [
  { id: 'm_surv_01', code: 'MOD-02', titleAr: 'التشريع المدرسي والقانون الداخلي للمؤسسات', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'surveillant' },
  { id: 'm_surv_02', code: 'MOD-23', titleAr: 'التسيير التربوي والبيداغوجي للحياة المدرسية', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'surveillant' },
  { id: 'm_surv_03', code: 'MOD-16', titleAr: 'النظام التربوي الجزائري وأهدافه', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant' },
  { id: 'm_surv_04', code: 'MOD-46', titleAr: 'علم النفس التربوي والاجتماعي وسيكولوجية المراهق', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant' },
  { id: 'm_surv_05', code: 'MOD-35', titleAr: 'التنشيط المدرسي والثقافي والرياضي', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant' },
  { id: 'm_surv_06', code: 'MOD-57', titleAr: 'التقويم والمتابعة التربوية وسجلات المواظبة', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant' },
  { id: 'm_surv_07', code: 'MOD-38', titleAr: 'الوقاية والأمن المدرسي والإسعافات الأولية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant' },
  { id: 'm_surv_08', code: 'MOD-20', titleAr: 'الإعلام الآلي وتطبيقات رقمنة الحياة المدرسية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant' },
  { id: 'm_surv_09', code: 'MOD-53', titleAr: 'التاريخ الوطني والحضارة الإسلامية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant' },
  { id: 'm_surv_10', code: 'MOD-34', titleAr: 'الشفافية والوقاية من الفساد وأخلاقيات المهنة', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant' }
];

// ب) مشرف رئيسي للتربية (11 مقياساً - 400 ساعة)
const MODULES_SURVEILLANT_PRINCIPAL: ExamModule[] = [
  { id: 'm_sp_01', code: 'MOD-02', titleAr: 'التشريع المدرسي والقانون التأديبي وحقوق التلميذ', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'surveillant_princ' },
  { id: 'm_sp_02', code: 'MOD-23', titleAr: 'التسيير التربوي والبيداغوجي وتنسيق الخدمات المدرسية', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'surveillant_princ' },
  { id: 'm_sp_03', code: 'MOD-06', titleAr: 'المناجمنت والتنظيم الإداري وقيادة الفرق', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'surveillant_princ' },
  { id: 'm_sp_04', code: 'MOD-46', titleAr: 'علم النفس التربوي وحل المشكلات السلوكية', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant_princ' },
  { id: 'm_sp_05', code: 'MOD-35', titleAr: 'التنشيط والتوجيه التربوي والاتصال', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant_princ' },
  { id: 'm_sp_06', code: 'MOD-57', titleAr: 'التقويم والمتابعة الإحصائية لغيابات وتمدرس التلاميذ', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant_princ' },
  { id: 'm_sp_07', code: 'MOD-16', titleAr: 'النظام التربوي الجزائري والإصلاحات التربوية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant_princ' },
  { id: 'm_sp_08', code: 'MOD-38', titleAr: 'الأمن والسلامة المدرسية وخطة الطوارئ', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant_princ' },
  { id: 'm_sp_09', code: 'MOD-20', titleAr: 'الإعلام الآلي وتسيير قواعد البيانات المدرسية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant_princ' },
  { id: 'm_sp_10', code: 'MOD-53', titleAr: 'التاريخ الوطني والحضارة الإسلامية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant_princ' },
  { id: 'm_sp_11', code: 'MOD-34', titleAr: 'الشفافية والوقاية من الفساد وأخلاقيات المهنة', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant_princ' }
];

// ج) مشرف عام للتربية (11 مقياساً - 400 ساعة)
const MODULES_SURVEILLANT_GENERAL: ExamModule[] = [
  { id: 'm_sg_01', code: 'MOD-02', titleAr: 'القانون الإداري والتشريع المدرسي وحقوق وواجبات الموظف', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'surveillant_general' },
  { id: 'm_sg_02', code: 'MOD-23', titleAr: 'التسيير التربوي والبيداغوجي والإشراف العام على الاستشارة', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'surveillant_general' },
  { id: 'm_sg_03', code: 'MOD-06', titleAr: 'المناجمنت والقيادة الإدارية وتسيير الأزمات المدرسية', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'surveillant_general' },
  { id: 'm_sg_04', code: 'MOD-46', titleAr: 'علم النفس الاجتماعي والوساطة المدرسية', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant_general' },
  { id: 'm_sg_05', code: 'MOD-35', titleAr: 'التنشيط والتوجيه والتنسيق مع أولياء التلاميذ', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant_general' },
  { id: 'm_sg_06', code: 'MOD-57', titleAr: 'التقويم المؤسساتي والتحليل البيداغوجي للنتائج المدرسية', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant_general' },
  { id: 'm_sg_07', code: 'MOD-16', titleAr: 'النظام التربوي الجزائري وغاياته الوطنية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant_general' },
  { id: 'm_sg_08', code: 'MOD-38', titleAr: 'الأمن الوقائي وحماية الوسط المدرسي', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant_general' },
  { id: 'm_sg_09', code: 'MOD-20', titleAr: 'الإعلام الآلي واستغلال الأرضية الرقمية للوزارة', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant_general' },
  { id: 'm_sg_10', code: 'MOD-53', titleAr: 'التاريخ الوطني والحضارة الإسلامية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant_general' },
  { id: 'm_sg_11', code: 'MOD-34', titleAr: 'الشفافية والوقاية من الفساد وأخلاقيات المهنة', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'surveillant_general' }
];

// د) نائب مقتصد (10 مقاييس - 336 ساعة)
const MODULES_SOUS_INTENDANT: ExamModule[] = [
  { id: 'm_si_01', code: 'MOD-29', titleAr: 'قواعد المحاسبة العمومية وتطبيقاتها في المؤسسات التربوية', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'sous_intendant' },
  { id: 'm_si_02', code: 'MOD-24', titleAr: 'التسيير المادي وحفظ الممتلكات وتسيير المخازن', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'sous_intendant' },
  { id: 'm_si_03', code: 'MOD-02', titleAr: 'التشريع المدرسي والمالي والصفقات البسيطة', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'sous_intendant' },
  { id: 'm_si_04', code: 'MOD-26', titleAr: 'التسيير المالي وتتبع تنفيذ ميزانية المؤسسة', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'sous_intendant' },
  { id: 'm_si_05', code: 'MOD-20', titleAr: 'الإعلام الآلي وتطبيقات برمجيات المحاسبة المدرسية', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'sous_intendant' },
  { id: 'm_si_06', code: 'MOD-06', titleAr: 'التنظيم والتسيير الإداري والمناجمنت', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'sous_intendant' },
  { id: 'm_si_07', code: 'MOD-28', titleAr: 'المالية العامة والتحصيل والجباية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'sous_intendant' },
  { id: 'm_si_08', code: 'MOD-16', titleAr: 'النظام التربوي الجزائري', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'sous_intendant' },
  { id: 'm_si_09', code: 'MOD-53', titleAr: 'التاريخ الوطني والحضارة الإسلامية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'sous_intendant' },
  { id: 'm_si_10', code: 'MOD-34', titleAr: 'الشفافية والوقاية من الفساد والمحاسبة المالية والأخلاقيات', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'sous_intendant' }
];

// هـ) نائب مقتصد مسير (11 مقياساً - 400 ساعة)
const MODULES_SOUS_INTENDANT_GEST: ExamModule[] = [
  { id: 'm_sig_01', code: 'MOD-29', titleAr: 'المحاسبة العمومية المعمقة ومسؤولية الآمر بالصرف والمحاسب', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'sous_intendant_gest' },
  { id: 'm_sig_02', code: 'MOD-26', titleAr: 'التسيير المالي وإعداد الميزانيات التقديرية وتعديلها', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'sous_intendant_gest' },
  { id: 'm_sig_03', code: 'MOD-28', titleAr: 'المالية العامة والصفقات العمومية', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'sous_intendant_gest' },
  { id: 'm_sig_04', code: 'MOD-25', titleAr: 'التسيير المادي وتسيير الجرد العام والدائم والمخازن', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'sous_intendant_gest' },
  { id: 'm_sig_05', code: 'MOD-02', titleAr: 'القانون الإداري والتشريع المدرسي والمالي', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'sous_intendant_gest' },
  { id: 'm_sig_06', code: 'MOD-06', titleAr: 'التنظيم والتسيير الإداري والمناجمنت القيادي', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'sous_intendant_gest' },
  { id: 'm_sig_07', code: 'MOD-20', titleAr: 'الإعلام الآلي وتطبيقات برمجيات المحاسبة والرقمنة', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'sous_intendant_gest' },
  { id: 'm_sig_08', code: 'MOD-57', titleAr: 'المتابعة والتقويم المالي والرقابة الداخلية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'sous_intendant_gest' },
  { id: 'm_sig_09', code: 'MOD-16', titleAr: 'النظام التربوي الجزائري', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'sous_intendant_gest' },
  { id: 'm_sig_10', code: 'MOD-53', titleAr: 'التاريخ الوطني والحضارة الإسلامية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'sous_intendant_gest' },
  { id: 'm_sig_11', code: 'MOD-34', titleAr: 'الشفافية والوقاية من الفساد المالي وأخلاقيات المهنة', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'sous_intendant_gest' }
];

// و) معاون تقني للمخابر (10 مقاييس - 336 ساعة)
const MODULES_ADJOINT_LABO: ExamModule[] = [
  { id: 'm_al_01', code: 'MOD-501', titleAr: 'تسيير المخابر المدرسية وتقنيات الحفظ والأمان الكيميائي', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'adjoint_labo' },
  { id: 'm_al_02', code: 'MOD-502', titleAr: 'الفيزياء والكيمياء المخبرية والتجارب التطبيقية', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'adjoint_labo' },
  { id: 'm_al_03', code: 'MOD-503', titleAr: 'علوم الطبيعة والحياة وتقنيات التحضير المجهري', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'adjoint_labo' },
  { id: 'm_al_04', code: 'MOD-02', titleAr: 'التشريع المدرسي والتنظيم الإداري للمخابر', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'adjoint_labo' },
  { id: 'm_al_05', code: 'MOD-24', titleAr: 'تسيير عتاد المخابر وجرد المواد الكيميائية الخطرة', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'adjoint_labo' },
  { id: 'm_al_06', code: 'MOD-38', titleAr: 'الوقاية والأمن المخبري والتخلص الآمن من النفايات', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'adjoint_labo' },
  { id: 'm_al_07', code: 'MOD-20', titleAr: 'الإعلام الآلي وتطبيقات تسيير مخزون المخابر', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'adjoint_labo' },
  { id: 'm_al_08', code: 'MOD-16', titleAr: 'النظام التربوي الجزائري', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'adjoint_labo' },
  { id: 'm_al_09', code: 'MOD-53', titleAr: 'التاريخ الوطني والحضارة الإسلامية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'adjoint_labo' },
  { id: 'm_al_10', code: 'MOD-34', titleAr: 'الشفافية والوقاية من الفساد وأخلاقيات المهنة', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'adjoint_labo' }
];

// ز) ملحق رئيسي بالمخابر (10 مقاييس - 336 ساعة)
const MODULES_ATTACHE_LABO: ExamModule[] = [
  { id: 'm_atl_01', code: 'MOD-501', titleAr: 'التسيير المتقدم للمخابر والبروتوكولات التجريبية', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'attache_labo' },
  { id: 'm_atl_02', code: 'MOD-502', titleAr: 'الأجهزة العلمية والقياس الدقيق والصيانة الوقائية', coefficient: 3, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 180, specialtyId: 'attache_labo' },
  { id: 'm_atl_03', code: 'MOD-503', titleAr: 'علوم المادة والأحياء وتطبيقات التجريب البيداغوجي', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'attache_labo' },
  { id: 'm_atl_04', code: 'MOD-02', titleAr: 'التشريع المدرسي وقوانين السلامة والصحة المهنية', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'attache_labo' },
  { id: 'm_atl_05', code: 'MOD-24', titleAr: 'تسيير المخازن وحوكمة التجهيزات المخبرية', coefficient: 2, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'attache_labo' },
  { id: 'm_atl_06', code: 'MOD-38', titleAr: 'إدارة مخاطر المواد الخطرة والإسعافات والإنقاذ', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'attache_labo' },
  { id: 'm_atl_07', code: 'MOD-20', titleAr: 'الإعلام الآلي وتطبيقات المحاكاة والرقمنة المخبرية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'attache_labo' },
  { id: 'm_atl_08', code: 'MOD-16', titleAr: 'النظام التربوي الجزائري', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'attache_labo' },
  { id: 'm_atl_09', code: 'MOD-53', titleAr: 'التاريخ الوطني والحضارة الإسلامية', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'attache_labo' },
  { id: 'm_atl_10', code: 'MOD-34', titleAr: 'الشفافية والوقاية من الفساد وأخلاقيات المهنة', coefficient: 1, eliminatoryGrade: 5, disparityThreshold: 3.5, maxGrade: 20, durationMinutes: 120, specialtyId: 'attache_labo' }
];

// Master list of all official promotion ranks
export const OFFICIAL_RANKS: PromotionRank[] = [
  // 1. Specialized track (الامتحان المهني)
  {
    id: 'dir_sec',
    code: 'SEC-01',
    titleAr: 'مدير ثانوية',
    titleFr: 'Directeur de Lycée',
    trackId: 'specialized',
    category: 'أسلاك التأطير والإدارة البيداغوجية',
    theoreticalDuration: 'سنة تكوينية (420 ساعة نظري)',
    internshipDuration: 'شهران تربص تطبيقي ميداني',
    totalHours: 420,
    decreeReference: 'القرار الوزاري المشترك المؤرخ في 17 مارس 2026 (الجريدة الرسمية رقم 35 لسنة 2026)',
    evaluation: SPECIALIZED_EVALUATION,
    modules: MODULES_DIR_SEC
  },
  {
    id: 'dir_cem',
    code: 'CEM-01',
    titleAr: 'مدير متوسطة',
    titleFr: 'Directeur de CEM',
    trackId: 'specialized',
    category: 'أسلاك التأطير والإدارة البيداغوجية',
    theoreticalDuration: 'سنة تكوينية (420 ساعة نظري)',
    internshipDuration: 'شهران تربص تطبيقي ميداني',
    totalHours: 420,
    decreeReference: 'القرار الوزاري المشترك المؤرخ في 17 مارس 2026 (الجريدة الرسمية رقم 35 لسنة 2026)',
    evaluation: SPECIALIZED_EVALUATION,
    modules: MODULES_DIR_CEM
  },
  {
    id: 'dir_prim',
    code: 'EP-01',
    titleAr: 'مدير مدرسة ابتدائية',
    titleFr: 'Directeur d\'École Primaire',
    trackId: 'specialized',
    category: 'أسلاك التأطير والإدارة البيداغوجية',
    theoreticalDuration: 'سنة تكوينية (420 ساعة نظري)',
    internshipDuration: 'شهران تربص تطبيقي ميداني',
    totalHours: 420,
    decreeReference: 'القرار الوزاري المشترك المؤرخ في 17 مارس 2026 (الجريدة الرسمية رقم 35 لسنة 2026)',
    evaluation: SPECIALIZED_EVALUATION,
    modules: MODULES_DIR_PRIM
  },
  {
    id: 'insp_admin_prim',
    code: 'INSP-EP-ADM',
    titleAr: 'مفتش التعليم الابتدائي - إدارة المدارس الابتدائية',
    titleFr: 'Inspecteur de l\'Enseignement Primaire - Administration',
    trackId: 'specialized',
    category: 'سلك التفتيش والمراقبة',
    theoreticalDuration: 'سنة تكوينية (420 ساعة نظري)',
    internshipDuration: 'شهران تربص تطبيقي ميداني',
    totalHours: 420,
    decreeReference: 'القرار الوزاري المشترك المؤرخ في 17 مارس 2026 (الجريدة الرسمية رقم 35 لسنة 2026)',
    evaluation: SPECIALIZED_EVALUATION,
    modules: MODULES_INSP_ADMIN_PRIM
  },
  {
    id: 'insp_ped_prim_ar',
    code: 'INSP-EP-AR',
    titleAr: 'مفتش التعليم الابتدائي - مواد (لغة عربية)',
    titleFr: 'Inspecteur de l\'Enseignement Primaire - Matières (Arabe)',
    trackId: 'specialized',
    category: 'سلك التفتيش والمراقبة',
    theoreticalDuration: 'سنة تكوينية (420 ساعة نظري)',
    internshipDuration: 'شهران تربص تطبيقي ميداني',
    totalHours: 420,
    decreeReference: 'القرار الوزاري المشترك المؤرخ في 17 مارس 2026 (الجريدة الرسمية رقم 35 لسنة 2026)',
    evaluation: SPECIALIZED_EVALUATION,
    modules: MODULES_INSP_PED_PRIM_AR
  },
  {
    id: 'insp_nourr_prim',
    code: 'INSP-EP-NOURR',
    titleAr: 'مفتش التعليم الابتدائي - التغذية المدرسية',
    titleFr: 'Inspecteur de l\'Enseignement Primaire - Cantines & Nutrition',
    trackId: 'specialized',
    category: 'سلك التفتيش والمراقبة',
    theoreticalDuration: 'سنة تكوينية (420 ساعة نظري)',
    internshipDuration: 'شهران تربص تطبيقي ميداني',
    totalHours: 420,
    decreeReference: 'القرار الوزاري المشترك المؤرخ في 17 مارس 2026 (الجريدة الرسمية رقم 35 لسنة 2026)',
    evaluation: SPECIALIZED_EVALUATION,
    modules: MODULES_INSP_NOURR_PRIM
  },
  {
    id: 'insp_admin_cem',
    code: 'INSP-CEM-ADM',
    titleAr: 'مفتش التعليم المتوسط - إدارة المتوسطات',
    titleFr: 'Inspecteur de l\'Enseignement Moyen - Administration',
    trackId: 'specialized',
    category: 'سلك التفتيش والمراقبة',
    theoreticalDuration: 'سنة تكوينية (420 ساعة نظري)',
    internshipDuration: 'شهران تربص تطبيقي ميداني',
    totalHours: 420,
    decreeReference: 'القرار الوزاري المشترك المؤرخ في 17 مارس 2026 (الجريدة الرسمية رقم 35 لسنة 2026)',
    evaluation: SPECIALIZED_EVALUATION,
    modules: MODULES_INSP_ADMIN_CEM
  },
  {
    id: 'insp_admin_sec',
    code: 'INSP-SEC-ADM',
    titleAr: 'مفتش التعليم الثانوي - إدارة الثانويات',
    titleFr: 'Inspecteur de l\'Enseignement Secondaire - Administration',
    trackId: 'specialized',
    category: 'سلك التفتيش والمراقبة',
    theoreticalDuration: 'سنة تكوينية (420 ساعة نظري)',
    internshipDuration: 'شهران تربص تطبيقي ميداني',
    totalHours: 420,
    decreeReference: 'القرار الوزاري المشترك المؤرخ في 17 مارس 2026 (الجريدة الرسمية رقم 35 لسنة 2026)',
    evaluation: SPECIALIZED_EVALUATION,
    modules: MODULES_INSP_ADMIN_SEC
  },

  // 2. Pre-promotion track (التكوين قبل الترقية)
  {
    id: 'surveillant',
    code: 'SURV-01',
    titleAr: 'مشرف التربية',
    titleFr: 'Surveillant de l\'Éducation',
    trackId: 'pre_promotion',
    category: 'سلك موظفي الإشراف التربوي',
    theoreticalDuration: '05 أشهر تكوين نظري (336 ساعة)',
    internshipDuration: 'شهر واحد تربص تطبيقي ميداني',
    totalHours: 336,
    decreeReference: 'القرار الوزاري المشترك المؤرخ في 18 جانفي 2026 (الجريدة الرسمية رقم 21 لسنة 2026)',
    evaluation: PRE_PROMOTION_EVALUATION,
    modules: MODULES_SURVEILLANT
  },
  {
    id: 'surveillant_princ',
    code: 'SURV-PRIN',
    titleAr: 'مشرف رئيسي للتربية',
    titleFr: 'Surveillant Principal de l\'Éducation',
    trackId: 'pre_promotion',
    category: 'سلك موظفي الإشراف التربوي',
    theoreticalDuration: '06 أشهر تكوين نظري (400 ساعة)',
    internshipDuration: 'شهر واحد تربص تطبيقي ميداني',
    totalHours: 400,
    decreeReference: 'القرار الوزاري المشترك المؤرخ في 18 جانفي 2026 (الجريدة الرسمية رقم 21 لسنة 2026)',
    evaluation: PRE_PROMOTION_EVALUATION,
    modules: MODULES_SURVEILLANT_PRINCIPAL
  },
  {
    id: 'surveillant_general',
    code: 'SURV-GEN',
    titleAr: 'مشرف عام للتربية',
    titleFr: 'Surveillant Général de l\'Éducation',
    trackId: 'pre_promotion',
    category: 'سلك موظفي الإشراف التربوي',
    theoreticalDuration: '06 أشهر تكوين نظري (400 ساعة)',
    internshipDuration: 'شهر واحد تربص تطبيقي ميداني',
    totalHours: 400,
    decreeReference: 'القرار الوزاري المشترك المؤرخ في 18 جانفي 2026 (الجريدة الرسمية رقم 21 لسنة 2026)',
    evaluation: PRE_PROMOTION_EVALUATION,
    modules: MODULES_SURVEILLANT_GENERAL
  },
  {
    id: 'sous_intendant',
    code: 'SOUS-INT',
    titleAr: 'نائب مقتصد',
    titleFr: 'Sous-Intendant',
    trackId: 'pre_promotion',
    category: 'سلك موظفي المصالح الاقتصادية والمالية',
    theoreticalDuration: '05 أشهر تكوين نظري (336 ساعة)',
    internshipDuration: 'شهر واحد تربص تطبيقي ميداني',
    totalHours: 336,
    decreeReference: 'القرار الوزاري المشترك المؤرخ في 18 جانفي 2026 (الجريدة الرسمية رقم 21 لسنة 2026)',
    evaluation: PRE_PROMOTION_EVALUATION,
    modules: MODULES_SOUS_INTENDANT
  },
  {
    id: 'sous_intendant_gest',
    code: 'SOUS-INT-GEST',
    titleAr: 'نائب مقتصد مسير',
    titleFr: 'Sous-Intendant Gestionnaire',
    trackId: 'pre_promotion',
    category: 'سلك موظفي المصالح الاقتصادية والمالية',
    theoreticalDuration: '06 أشهر تكوين نظري (400 ساعة)',
    internshipDuration: 'شهر واحد تربص تطبيقي ميداني',
    totalHours: 400,
    decreeReference: 'القرار الوزاري المشترك المؤرخ في 18 جانفي 2026 (الجريدة الرسمية رقم 21 لسنة 2026)',
    evaluation: PRE_PROMOTION_EVALUATION,
    modules: MODULES_SOUS_INTENDANT_GEST
  },
  {
    id: 'adjoint_labo',
    code: 'ADJ-LABO',
    titleAr: 'معاون تقني للمخابر',
    titleFr: 'Adjoint Technique de Laboratoire',
    trackId: 'pre_promotion',
    category: 'سلك المساعدين التقنيين للمخابر المدرسية',
    theoreticalDuration: '05 أشهر تكوين نظري (336 ساعة)',
    internshipDuration: 'شهر واحد تربص تطبيقي ميداني',
    totalHours: 336,
    decreeReference: 'القرار الوزاري المشترك المؤرخ في 18 جانفي 2026 (الجريدة الرسمية رقم 21 لسنة 2026)',
    evaluation: PRE_PROMOTION_EVALUATION,
    modules: MODULES_ADJOINT_LABO
  },
  {
    id: 'attache_labo',
    code: 'ATT-LABO',
    titleAr: 'ملحق رئيسي بالمخابر',
    titleFr: 'Attaché Principal de Laboratoire',
    trackId: 'pre_promotion',
    category: 'سلك المساعدين التقنيين للمخابر المدرسية',
    theoreticalDuration: '05 أشهر تكوين نظري (336 ساعة)',
    internshipDuration: 'شهر واحد تربص تطبيقي ميداني',
    totalHours: 336,
    decreeReference: 'القرار الوزاري المشترك المؤرخ في 18 جانفي 2026 (الجريدة الرسمية رقم 21 لسنة 2026)',
    evaluation: PRE_PROMOTION_EVALUATION,
    modules: MODULES_ATTACHE_LABO
  }
];

export const TRAINING_TRACKS: Record<TrainingTrackId, TrainingTrack> = {
  specialized: {
    id: 'specialized',
    titleAr: 'مسار التكوين المتخصص للترقية (امتحان مهني)',
    titleFr: 'Formation Spécialisée de Promotion',
    decreeTitle: 'القرار الوزاري المشترك المؤرخ في 17 مارس 2026',
    journalOfficial: 'الجريدة الرسمية رقم 35 لسنة 2026',
    decreeDate: '17 مارس 2026',
    evaluation: SPECIALIZED_EVALUATION,
    ranks: OFFICIAL_RANKS.filter(r => r.trackId === 'specialized')
  },
  pre_promotion: {
    id: 'pre_promotion',
    titleAr: 'مسار التكوين قبل الترقية',
    titleFr: 'Formation Préalable à la Promotion',
    decreeTitle: 'القرار الوزاري المشترك المؤرخ في 18 جانفي 2026',
    journalOfficial: 'الجريدة الرسمية رقم 21 لسنة 2026',
    decreeDate: '18 جانفي 2026',
    evaluation: PRE_PROMOTION_EVALUATION,
    ranks: OFFICIAL_RANKS.filter(r => r.trackId === 'pre_promotion')
  }
};

/**
 * Helper to get a rank by ID
 */
export function getRankById(rankId: string): PromotionRank | undefined {
  return OFFICIAL_RANKS.find(r => r.id === rankId);
}

/**
 * Helper to get modules for a rank
 */
export function getRankModules(rankId: string): ExamModule[] {
  const rank = getRankById(rankId);
  return rank ? rank.modules : [];
}

/**
 * Calculate total coefficients for all modules of a rank
 */
export function getRankTotalCoefficients(rankId: string): number {
  const modules = getRankModules(rankId);
  return modules.reduce((sum, m) => sum + m.coefficient, 0);
}

/**
 * Helper to determine whether a rank requires a Memoir (مذكرة) or a Report (تقرير)
 * Based on Décret interministériel 17 mars 2026 (specialized) vs 18 janvier 2026 (pre-promotion)
 */
export function getRankDeliverableInfo(rank: PromotionRank): {
  type: 'memoir' | 'report';
  labelAr: string;
  labelFr: string;
  coeff: number;
  decreeArticle: string;
} {
  const isSpecialized = rank.trackId === 'specialized';
  return {
    type: isSpecialized ? 'memoir' : 'report',
    labelAr: isSpecialized ? 'مذكرة نهاية التكوين' : 'تقرير نهاية التكوين',
    labelFr: isSpecialized ? 'Mémoire de fin de formation' : 'Rapport de fin de stage',
    coeff: isSpecialized ? 1 : 2,
    decreeArticle: isSpecialized
      ? 'المادة 16 من القرار الوزاري المشترك المؤرخ في 17 مارس 2026 (معامل 1)'
      : 'المادة 17 من القرار الوزاري المشترك المؤرخ في 18 جانفي 2026 (معامل 2)'
  };
}
