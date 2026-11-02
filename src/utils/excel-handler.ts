/**
 * Offline Excel (XLSX) Handler
 * Completely local, zero external network, fully supports Arabic text and RTL spreadsheets.
 */

import * as XLSX from 'xlsx';
import type { Candidate, ExamModule, DeliberationCandidateResult } from './crypto-anonymat';
import { INSTITUTION } from '../constants/branding';
import { formatArabicDate } from './date-formatter';
import { getRankNumericCode, generateRegistrationNumber, DEFAULT_INSTITUTE_WILAYA_CODE } from './registration-number';

/**
 * Generate a blank or sample template Excel file for importing candidates
 */
export interface ParseCandidateResult {
  candidates: Candidate[];
  duplicates: { registrationNumber: string; fullName: string; row: number }[];
  errors: { row: number; field: string; message: string }[];
  totalParsed: number;
}

/**
 * Generate official empty or sample template Excel file for onboarding candidates
 * Columns strictly requested:
 * [السلك | الرتبة | التخصص | إسم ولقب المتكون | تاريخ الميلاد | بلدية الميلاد | ولاية الميلاد | ولاية المترشح | الجنس]
 */
export function generateCandidateTemplateExcel(
  rankTitle: string = 'مدير ثانوية', 
  specialtyId?: string, 
  wilayaCode: string = DEFAULT_INSTITUTE_WILAYA_CODE
): Uint8Array {
  const rankNumericCode = getRankNumericCode(specialtyId);
  const instructions = [
    [INSTITUTION.republic],
    [INSTITUTION.ministry],
    [INSTITUTION.name],
    [`${INSTITUTION.deputyDirectorate} — ${INSTITUTION.service}`],
    [`استمارة استيراد وتأطير قوائم المتكونين — الرتبة: ${rankTitle} (رمز الرتبة: ${rankNumericCode})`],
    [`أعمدة النموذج الثابتة الرسمية: [السلك | الرتبة | التخصص | إسم ولقب المتكون | تاريخ الميلاد | بلدية الميلاد | ولاية الميلاد | ولاية المترشح | الجنس]`],
    ['تنبيه إداري: يرجى عدم تعديل ترتيب وعناوين الأعمدة التسعة الثابتة لضمان استيرادها المباشر في قاعدة البيانات.'],
    []
  ];

  const headers = [
    'السلك',
    'الرتبة',
    'التخصص',
    'إسم ولقب المتكون',
    'تاريخ الميلاد',
    'بلدية الميلاد',
    'ولاية الميلاد',
    'ولاية المترشح',
    'الجنس'
  ];

  const sampleRows = [
    ['موظفو الإدارة والتفتيش', rankTitle, 'إدارة المؤسسات التعليمية', 'بن عيسى مصطفى بن لخضر', '1984/03/15', 'الأغواط', 'الأغواط', 'الأغواط', 'ذكر'],
    ['موظفو الإدارة والتفتيش', rankTitle, 'إدارة المؤسسات التعليمية', 'حيدوسي خديجة بنت رابح', '1988/07/22', 'آفلو', 'الأغواط', 'الأغواط', 'أنثى'],
    ['موظفو الإدارة والتفتيش', rankTitle, 'إدارة المؤسسات التعليمية', 'قدور عبد القادر بن محمد', '1981/11/04', 'قصر الحيران', 'الأغواط', 'الجلفة', 'ذكر'],
    ['موظفو الإدارة والتفتيش', rankTitle, 'إدارة المؤسسات التعليمية', 'سعودي مريم بنت خالد', '1990/09/18', 'الأغواط', 'الأغواط', 'غرداية', 'أنثى'],
    ['موظفو الإدارة والتفتيش', rankTitle, 'إدارة المؤسسات التعليمية', 'دليحة كمال بن عبد القادر', '1983/05/30', 'حاسي الرمل', 'الأغواط', 'الأغواط', 'ذكر']
  ];

  const allRows = [...instructions, headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);
  
  // Configure column widths
  ws['!cols'] = [
    { wch: 22 }, // السلك
    { wch: 22 }, // الرتبة
    { wch: 22 }, // التخصص
    { wch: 26 }, // إسم ولقب المتكون
    { wch: 15 }, // تاريخ الميلاد
    { wch: 18 }, // بلدية الميلاد
    { wch: 18 }, // ولاية الميلاد
    { wch: 18 }, // ولاية المترشح
    { wch: 12 }  // الجنس
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'قائمة المتكونين');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(excelBuffer);
}

/**
 * Parse an uploaded Excel file to extract candidates with robust column detection,
 * duplicate detection, and validation against existing database records.
 */
export function parseCandidatesExcel(
  data: ArrayBuffer | Uint8Array,
  defaultSpecialtyId: string = 'dir_sec',
  defaultPromotion: string = '2024-2025',
  existingCandidates: Candidate[] = []
): ParseCandidateResult {
  const wb = XLSX.read(data, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const result: ParseCandidateResult = {
    candidates: [],
    duplicates: [],
    errors: [],
    totalParsed: 0
  };

  if (rawRows.length < 2) return result;

  // Locate header row by searching for short Arabic header terms
  let headerRowIndex = -1;
  let colMap = {
    reg: -1,
    corps: -1,
    rank: -1,
    specialty: -1,
    lastName: -1,
    firstName: -1,
    fullName: -1,
    birthDate: -1,
    birthCommune: -1,
    birthWilaya: -1,
    birthPlace: -1,
    candidateWilaya: -1,
    gender: -1,
    institution: -1,
    wilaya: -1,
    group: -1,
    room: -1
  };

  for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
    const row = rawRows[r];
    if (!row || !Array.isArray(row)) continue;

    const tempMap = {
      reg: -1,
      corps: -1,
      rank: -1,
      specialty: -1,
      lastName: -1,
      firstName: -1,
      fullName: -1,
      birthDate: -1,
      birthCommune: -1,
      birthWilaya: -1,
      birthPlace: -1,
      candidateWilaya: -1,
      gender: -1,
      institution: -1,
      wilaya: -1,
      group: -1,
      room: -1
    };
    let matches = 0;

    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').trim();
      if (cell.length > 35) continue; // Skip instructions / long text

      if (cell === 'السلك') {
        tempMap.corps = c;
        matches++;
      } else if (cell === 'الرتبة') {
        tempMap.rank = c;
        matches++;
      } else if (cell === 'التخصص') {
        tempMap.specialty = c;
        matches++;
      } else if (cell === 'إسم ولقب المتكون' || cell === 'اسم ولقب المتكون' || cell === 'اللقب والاسم' || cell === 'الاسم واللقب' || cell.toLowerCase() === 'nom et prenom') {
        tempMap.fullName = c;
        matches++;
      } else if (cell === 'تاريخ الميلاد' || (cell.includes('الميلاد') && !cell.includes('مكان') && !cell.includes('بلدية') && !cell.includes('ولاية'))) {
        tempMap.birthDate = c;
        matches++;
      } else if (cell === 'بلدية الميلاد' || cell.includes('بلدية')) {
        tempMap.birthCommune = c;
        matches++;
      } else if (cell === 'ولاية الميلاد') {
        tempMap.birthWilaya = c;
        matches++;
      } else if (cell === 'ولاية المترشح') {
        tempMap.candidateWilaya = c;
        matches++;
      } else if (cell === 'الجنس' || cell.toLowerCase() === 'sexe' || cell.toLowerCase() === 'genre') {
        tempMap.gender = c;
        matches++;
      } else if (cell === 'رقم التسجيل' || cell === 'التسجيل' || cell.toLowerCase() === 'matricule') {
        tempMap.reg = c;
        matches++;
      } else if (cell === 'اللقب' || cell.toLowerCase() === 'nom') {
        tempMap.lastName = c;
        matches++;
      } else if (cell === 'الاسم' || cell.toLowerCase() === 'prenom') {
        tempMap.firstName = c;
        matches++;
      } else if (cell === 'مكان الميلاد' || cell.toLowerCase().includes('lieu')) {
        tempMap.birthPlace = c;
        matches++;
      } else if (cell.includes('المؤسسة') || cell.includes('مؤسسة')) {
        tempMap.institution = c;
        matches++;
      } else if (cell === 'الولاية' || cell.toLowerCase() === 'wilaya') {
        tempMap.wilaya = c;
        matches++;
      } else if (cell.includes('الفوج') || cell.toLowerCase() === 'groupe') {
        tempMap.group = c;
        matches++;
      } else if (cell.includes('القاعة') || cell.toLowerCase() === 'salle') {
        tempMap.room = c;
        matches++;
      }
    }

    if (matches >= 2) {
      headerRowIndex = r;
      colMap = tempMap;
      break;
    }
  }

  // Fallback defaults if header search didn't match specific positions
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    colMap.corps = 0;
    colMap.rank = 1;
    colMap.specialty = 2;
    colMap.fullName = 3;
    colMap.birthDate = 4;
    colMap.birthCommune = 5;
    colMap.birthWilaya = 6;
    colMap.candidateWilaya = 7;
    colMap.gender = 8;
  }

  const seenRegsInFile = new Set<string>();
  const existingRegs = new Set(existingCandidates.map(c => c.registrationNumber.trim().toLowerCase()));

  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const rowNumber = i + 1;

    // Build Registration Number
    let regNum = colMap.reg !== -1 && row[colMap.reg] !== undefined 
      ? String(row[colMap.reg]).trim() 
      : '';
    
    // Build Full Name
    let fullName = '';
    if (colMap.lastName !== -1 && colMap.firstName !== -1 && (row[colMap.lastName] || row[colMap.firstName])) {
      const l = String(row[colMap.lastName] || '').trim();
      const f = String(row[colMap.firstName] || '').trim();
      fullName = `${l} ${f}`.trim();
    } else if (colMap.fullName !== -1 && row[colMap.fullName]) {
      fullName = String(row[colMap.fullName]).trim();
    } else if (row[1]) {
      fullName = String(row[1]).trim();
    }

    // Skip empty rows
    if (!regNum && !fullName) continue;

    if (!regNum) {
      const rankNumeric = getRankNumericCode(defaultSpecialtyId);
      const seq = result.candidates.length + 1;
      regNum = generateRegistrationNumber('03', rankNumeric, seq);
    }

    // Validation
    if (!fullName) {
      result.errors.push({ row: rowNumber, field: 'fullName', message: 'اسم ولقب المترشح فارغ' });
      continue;
    }

    const regLower = regNum.toLowerCase();
    let isDup = false;

    if (seenRegsInFile.has(regLower)) {
      result.duplicates.push({ registrationNumber: regNum, fullName, row: rowNumber });
      isDup = true;
    }
    if (existingRegs.has(regLower)) {
      result.duplicates.push({ registrationNumber: regNum, fullName, row: rowNumber });
      isDup = true;
    }

    seenRegsInFile.add(regLower);

    const corps = colMap.corps !== -1 && row[colMap.corps] ? String(row[colMap.corps]).trim() : 'موظفو الإدارة والتفتيش';
    const rankName = colMap.rank !== -1 && row[colMap.rank] ? String(row[colMap.rank]).trim() : '';
    const specialtyField = colMap.specialty !== -1 && row[colMap.specialty] ? String(row[colMap.specialty]).trim() : '';
    const birthCommune = colMap.birthCommune !== -1 && row[colMap.birthCommune] ? String(row[colMap.birthCommune]).trim() : '';
    const birthWilaya = colMap.birthWilaya !== -1 && row[colMap.birthWilaya] ? String(row[colMap.birthWilaya]).trim() : '';
    const candidateWilaya = colMap.candidateWilaya !== -1 && row[colMap.candidateWilaya] ? String(row[colMap.candidateWilaya]).trim() : '';
    const gender = colMap.gender !== -1 && row[colMap.gender] ? String(row[colMap.gender]).trim() : 'ذكر';

    const birthDate = colMap.birthDate !== -1 && row[colMap.birthDate] 
      ? String(row[colMap.birthDate]).trim() 
      : '1985-01-01';
    
    let birthPlace = '';
    if (birthCommune || birthWilaya) {
      birthPlace = birthCommune ? (birthWilaya ? `${birthCommune} (${birthWilaya})` : birthCommune) : birthWilaya;
    } else if (colMap.birthPlace !== -1 && row[colMap.birthPlace]) {
      birthPlace = String(row[colMap.birthPlace]).trim();
    } else {
      birthPlace = 'الأغواط';
    }

    const originalInstitution = colMap.institution !== -1 && row[colMap.institution] 
      ? String(row[colMap.institution]).trim() 
      : 'مؤسسة تعليمية';

    const wilaya = candidateWilaya || (colMap.wilaya !== -1 && row[colMap.wilaya] ? String(row[colMap.wilaya]).trim() : 'الأغواط');

    const groupNumber = colMap.group !== -1 && row[colMap.group] 
      ? String(row[colMap.group]).trim() 
      : 'الفوج 01';

    const roomNumber = colMap.room !== -1 && row[colMap.room] 
      ? String(row[colMap.room]).trim() 
      : 'القاعة 01';

    const candidate: Candidate = {
      id: `cand_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
      registrationNumber: regNum,
      fullName,
      birthDate,
      birthPlace,
      specialtyId: defaultSpecialtyId,
      promotionYear: defaultPromotion,
      groupNumber,
      roomNumber,
      attendanceStatus: 'present',
      originalInstitution,
      wilaya,
      corps,
      rankName: rankName || undefined,
      specialtyField: specialtyField || undefined,
      birthCommune: birthCommune || undefined,
      birthWilaya: birthWilaya || undefined,
      candidateWilaya: candidateWilaya || undefined,
      gender: gender || 'ذكر'
    };

    result.candidates.push(candidate);
    result.totalParsed++;
  }

  return result;
}

/**
 * Export Grade Entry Sheet for Correctors (Blind Saisie by Anonymat Only)
 */
export function generateAnonymatGradeSheetExcel(
  moduleTitle: string,
  specialtyTitle: string,
  rows: { anonymatCode: string; grade1?: number | null; grade2?: number | null; grade3?: number | null }[]
): Uint8Array {
  const headerInfo = [
    [INSTITUTION.republic],
    [INSTITUTION.ministry],
    [INSTITUTION.name],
    [INSTITUTION.deputyDirectorate],
    [INSTITUTION.service],
    [`جدول رصد ومطابقة النقاط المشفرة (وثيقة سرية ومحمية) — المقياس: ${moduleTitle} — الرتبة: ${specialtyTitle}`],
    [`تاريخ الاستخراج: ${formatArabicDate(new Date())}`],
    []
  ];

  const tableHeaders = [
    'الرقم الترتيبي',
    'رقم الإغفال المشفر (Anonymat)',
    'نقطة التصحيح الأول (/20)',
    'نقطة التصحيح الثاني (/20)',
    'نقطة التصحيح الثالث (التحكيمي إن وجد)',
    'ملاحظات المصحح'
  ];

  const tableData = rows.map((r, idx) => [
    idx + 1,
    r.anonymatCode,
    r.grade1 !== null && r.grade1 !== undefined ? r.grade1 : '',
    r.grade2 !== null && r.grade2 !== undefined ? r.grade2 : '',
    r.grade3 !== null && r.grade3 !== undefined ? r.grade3 : '',
    ''
  ]);

  const allRows = [...headerInfo, tableHeaders, ...tableData];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  ws['!cols'] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 22 },
    { wch: 22 },
    { wch: 28 },
    { wch: 25 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'رصد النقاط المشفر');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(buf);
}

/**
 * Export official Procès-Verbal of Deliberations
 */
export function generateDeliberationsPvExcel(
  sessionTitle: string,
  specialtyTitle: string,
  modules: ExamModule[],
  results: DeliberationCandidateResult[]
): Uint8Array {
  const headerInfo = [
    [INSTITUTION.republic],
    [INSTITUTION.ministry],
    [INSTITUTION.name],
    [INSTITUTION.deputyDirectorate],
    [INSTITUTION.service],
    [`محضر المداولات الرسمي النهائي — الدورة: ${sessionTitle} — الرتبة: ${specialtyTitle}`],
    []
  ];

  // Dynamic headers based on modules
  const tableHeaders = [
    'الرقم',
    'رقم التسجيل',
    'اللقب والاسم',
    'تاريخ الميلاد',
    ...modules.map(m => `${m.titleAr} (معامل ${m.coefficient})`),
    'مجموع النقاط الموزونة',
    'المعدل العام (/20)',
    'الترتيب',
    'قرار لجنة المداولات',
    'الملاحظة'
  ];

  const tableRows = results.map((res, idx) => {
    const modScores = modules.map(m => {
      const g = res.moduleGrades.find(mg => mg.module.id === m.id);
      return g && g.finalGrade !== null ? g.finalGrade : 'غ.م';
    });

    return [
      idx + 1,
      res.candidate.registrationNumber,
      res.candidate.fullName,
      formatArabicDate(res.candidate.birthDate),
      ...modScores,
      res.totalWeightedScore,
      res.average !== null ? res.average.toFixed(2) : '—',
      res.rank > 0 ? res.rank : '—',
      res.decision,
      res.mention
    ];
  });

  const summary = [
    [],
    ['إحصائيات المداولات الرسمية:'],
    [`إجمالي المترشحين المسجلين: ${results.length}`],
    [`عدد الناجحين: ${results.filter(r => r.decision === 'ناجح').length}`],
    [`عدد المؤجلين: ${results.filter(r => r.decision === 'مؤجل').length}`],
    [`عدد الراسبين: ${results.filter(r => r.decision === 'راسب' || r.decision === 'مقصى').length}`],
    [`نسبة النجاح العامة: ${results.length > 0 ? ((results.filter(r => r.decision === 'ناجح').length / results.length) * 100).toFixed(2) : 0}%`],
    [],
    ['أعضاء لجنة المداولات الرسمية:', '', `${INSTITUTION.serviceHeadTitle}:`, '', `${INSTITUTION.directorTitle}:`],
    ['1. ........................................', '', '........................................', '', '........................................']
  ];

  const allRows = [...headerInfo, tableHeaders, ...tableRows, ...summary];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  ws['!cols'] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 26 },
    { wch: 14 },
    ...modules.map(() => ({ wch: 18 })),
    { wch: 20 },
    { wch: 16 },
    { wch: 10 },
    { wch: 20 },
    { wch: 20 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'محضر المداولات الرسمي');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(buf);
}
