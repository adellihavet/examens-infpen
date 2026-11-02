/**
 * Official Candidate Registration Number Management System
 * نظام ترقيم وتسجيل المترشحين المعتمد في المعهد الوطني
 *
 * هيكل رقم التسجيل: 8 أرقام
 * [رمز ولاية المعهد (رقمين)] + [رمز الرتبة (رقمين)] + [الرقم التسلسلي (4 أرقام تبدأ بـ 0001)]
 * مثال:
 * رمز ولاية المعهد: 03 (الأغواط)
 * رمز الرتبة: 01 (مدير ثانوية)
 * الرقم التسلسلي: 0001
 * الناتج: 03010001
 */

export const DEFAULT_INSTITUTE_WILAYA_CODE = '03'; // ولاية الأغواط

/**
 * الخريطة الثابتة لرموز الرتب الرسمية (ترتيب ثابت غير متغير)
 */
export const RANK_NUMERIC_CODES: Record<string, string> = {
  // 1. مسار التكوين المتخصص (امتحان مهني)
  dir_sec: '01',               // مدير ثانوية
  dir_cem: '02',               // مدير متوسطة
  dir_prim: '03',              // مدير مدرسة ابتدائية
  insp_admin_prim: '04',       // مفتش التعليم الابتدائي - إدارة
  insp_ped_prim_ar: '05',      // مفتش التعليم الابتدائي - لغة عربية
  insp_nourr_prim: '06',       // مفتش التعليم الابتدائي - التغذية المدرسية
  insp_admin_cem: '07',        // مفتش التعليم المتوسط - إدارة
  insp_admin_sec: '08',        // مفتش التعليم الثانوي - إدارة

  // 2. مسار التكوين قبل الترقية
  surveillant: '09',           // مشرف التربية
  surveillant_princ: '10',     // مشرف رئيسي للتربية
  surveillant_general: '11',   // مشرف عام للتربية
  sous_intendant: '12',        // نائب مقتصد
  sous_intendant_gest: '13',   // نائب مقتصد مسير
  adjoint_labo: '14',          // معاون تقني للمخابر
  attache_labo: '15'           // ملحق رئيسي بالمخابر
};

/**
 * استخراج رمز الرتبة الرقمي الثابت (مكون من رقمين)
 */
export function getRankNumericCode(specialtyId?: string | null): string {
  if (!specialtyId) return '01';
  return RANK_NUMERIC_CODES[specialtyId] || '01';
}

/**
 * توليد رقم التسجيل الرسمي الموحد المكون من 8 أرقام
 *
 * @param wilayaCode رمز ولاية المعهد (مثال: '03')
 * @param rankCode رمز الرتبة (مثال: '01')
 * @param sequenceNumber الرقم التسلسلي (مثال: 1 -> '0001')
 */
export function generateRegistrationNumber(
  wilayaCode: string = DEFAULT_INSTITUTE_WILAYA_CODE,
  rankCode: string = '01',
  sequenceNumber: number = 1
): string {
  const cleanWilaya = String(wilayaCode).trim().padStart(2, '0').slice(-2);
  const cleanRank = String(rankCode).trim().padStart(2, '0').slice(-2);
  const cleanSeq = String(Math.max(1, sequenceNumber)).padStart(4, '0').slice(-4);

  return `${cleanWilaya}${cleanRank}${cleanSeq}`;
}

/**
 * تحليل وتفكيك رقم التسجيل إلى مكوناته الثلاثة
 */
export interface ParsedRegistrationNumber {
  raw: string;
  wilayaCode: string;
  rankCode: string;
  sequenceNumber: number;
  sequenceString: string;
  isValid: boolean;
  formattedDisplay: string;
}

export function parseRegistrationNumber(regNum?: string | null): ParsedRegistrationNumber | null {
  if (!regNum) return null;
  const clean = String(regNum).trim().replace(/\D/g, ''); // retain digits

  if (clean.length === 8) {
    const wilayaCode = clean.slice(0, 2);
    const rankCode = clean.slice(2, 4);
    const sequenceString = clean.slice(4, 8);
    const sequenceNumber = parseInt(sequenceString, 10);

    return {
      raw: regNum,
      wilayaCode,
      rankCode,
      sequenceNumber: isNaN(sequenceNumber) ? 1 : sequenceNumber,
      sequenceString,
      isValid: true,
      formattedDisplay: `${wilayaCode} - ${rankCode} - ${sequenceString}`
    };
  }

  // Fallback for non-standard or partial inputs
  return {
    raw: regNum,
    wilayaCode: clean.slice(0, 2) || DEFAULT_INSTITUTE_WILAYA_CODE,
    rankCode: clean.slice(2, 4) || '01',
    sequenceNumber: parseInt(clean.slice(4), 10) || 1,
    sequenceString: clean.slice(4).padStart(4, '0') || '0001',
    isValid: false,
    formattedDisplay: regNum
  };
}

/**
 * التحقق من صحة رقم التسجيل المدخل يدوياً
 */
export function validateRegistrationNumber(regNum?: string | null): { isValid: boolean; message?: string } {
  if (!regNum || !regNum.trim()) {
    return { isValid: false, message: 'يرجى إدخال رقم التسجيل.' };
  }

  const clean = regNum.trim().replace(/\D/g, '');
  if (clean.length !== 8) {
    return { 
      isValid: false, 
      message: `رقم التسجيل يجب أن يتكون من 8 أرقام [ولاية (رقمين) + رتبة (رقمين) + تسلسل (4 أرقام)]، الحالي: ${clean.length} أرقام.` 
    };
  }

  return { isValid: true };
}

/**
 * حساب رقم التسجيل التالي آلياً للمترشح الجديد بناءً على المترشحين المسجلين حالياً
 */
export function getNextRegistrationNumber(
  existingCandidates: { registrationNumber: string; specialtyId?: string }[],
  specialtyId: string,
  wilayaCode: string = DEFAULT_INSTITUTE_WILAYA_CODE
): string {
  const rankCode = getRankNumericCode(specialtyId);
  const cleanWilaya = String(wilayaCode).trim().padStart(2, '0').slice(-2);
  const prefix = `${cleanWilaya}${rankCode}`;

  let maxSequence = 0;

  for (const cand of existingCandidates) {
    const cleanReg = String(cand.registrationNumber || '').trim().replace(/\D/g, '');
    if (cleanReg.startsWith(prefix) && cleanReg.length === 8) {
      const seqStr = cleanReg.slice(4, 8);
      const seqNum = parseInt(seqStr, 10);
      if (!isNaN(seqNum) && seqNum > maxSequence) {
        maxSequence = seqNum;
      }
    }
  }

  const nextSeq = maxSequence + 1;
  return generateRegistrationNumber(cleanWilaya, rankCode, nextSeq);
}
