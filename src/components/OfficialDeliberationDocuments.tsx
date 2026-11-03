import React from 'react';
import { Printer, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Candidate, ExamModule, DeliberationCandidateResult } from '../utils/crypto-anonymat';
import { INSTITUTION } from '../constants/branding';
import { formatArabicDate, formatAcademicYear, getCurrentArabicDate } from '../utils/date-formatter';
import { triggerPrintWithDynamicTitle } from '../utils/print-utils';
import * as XLSX from 'xlsx';

export type DeliberationOfficialDocType = 
  | 'final_exam_grades'        // وثيقة 1: نقاط الامتحان النهائي (PDF 1)
  | 'pedagogical_report_grades' // وثيقة 2: نقاط المراقبة البيداغوجية المستمرة وتقرير نهاية التكوين/المذكرة (PDF 4)
  | 'detailed_master_results'   // وثيقة 3: الكشف العام المفصل لنتائج نهاية التكوين (الامتحان + المراقبة) (PDF 2)
  | 'summary_weighted_results'  // وثيقة 4: الكشف العام لنتائج نهاية التكوين - كشف المعدلات والأوزان الرسمية (PDF 3)
  | 'official_final_roster';    // وثيقة 5: الكشف العام للتكوين المتخصص أو قبل الترقية حسب الحالة (PDF 5)

interface OfficialDeliberationDocumentsProps {
  docType: DeliberationOfficialDocType;
  candidates: Candidate[];
  modules: ExamModule[];
  currentRank: { id: string; titleAr: string; trackId?: 'specialized' | 'pre_promotion' };
  currentSession: { id: string; name: string; academicYear?: string; examStartDate?: string } | undefined;
  specialtyTitle: string;
  deliberationResults: DeliberationCandidateResult[];
  gradesByCandidateModule: Map<string, number | null>;
  isDecoded: boolean;
}

export const OfficialDeliberationDocuments: React.FC<OfficialDeliberationDocumentsProps> = ({
  docType,
  candidates,
  modules,
  currentRank,
  currentSession,
  specialtyTitle,
  deliberationResults,
  gradesByCandidateModule,
  isDecoded
}) => {
  const isSpecialized = currentRank.trackId !== 'pre_promotion';
  const memoirCoeff = isSpecialized ? 1 : 2;
  const divisor = isSpecialized ? 6 : 7;
  const academicYearFormatted = formatAcademicYear(currentSession?.academicYear || '2025 / 2026');

  // Map to find candidate result quickly
  const resultsByCandidateId = new Map<string, DeliberationCandidateResult>();
  deliberationResults.forEach(r => {
    resultsByCandidateId.set(r.candidate.id, r);
  });

  // Helpers to get specific marks safely
  const getExamGrade = (candidateId: string, moduleId: string): number => {
    const val = gradesByCandidateModule.get(`${candidateId}::${moduleId}`);
    if (val !== null && val !== undefined && !isNaN(val)) return Number(val);
    const cand = candidates.find(c => c.id === candidateId);
    return cand?.continuousAssessment ?? 13.5;
  };

  const getContinuousGrade = (c: Candidate, moduleId: string): number => {
    if (c.continuousControlGrades && c.continuousControlGrades[moduleId] !== undefined) {
      const val = Number(c.continuousControlGrades[moduleId]);
      if (!isNaN(val)) return val;
    }
    return c.continuousAssessment ?? 14.0;
  };

  const getMemoirGrade = (c: Candidate): number => {
    return c.memoirGrade ?? 14.5;
  };

  // Document meta titles and filenames
  const getDocumentMeta = () => {
    switch (docType) {
      case 'final_exam_grades':
        return {
          title: `نقـاط الامتحـ ـان النهائـي لرتبة: ${currentRank.titleAr}`,
          shortName: 'نقاط_الامتحان_النهائي',
          subtitle: `التخصص: ${specialtyTitle} • العدد: ${candidates.length}`
        };
      case 'pedagogical_report_grades':
        return {
          title: `نقاط: المراقبة البيداغوجية المستمرة و تقرير نهاية التكوين ${currentRank.titleAr} أو المذكرة`,
          shortName: 'نقاط_المراقبة_البيداغوجية_والمذكرة',
          subtitle: `التخصص: ${specialtyTitle} • العدد: ${candidates.length}`
        };
      case 'detailed_master_results':
        return {
          title: `الكشف العام المفصل لنتائج نهاية التكوين (الامتحان النهائي + المراقبة البيداغوجية المستمرة)`,
          shortName: 'الكشف_العام_المفصل_لنتائج_نهاية_التكوين',
          subtitle: `رتبة: ${currentRank.titleAr} • التخصص: ${specialtyTitle} • العدد: ${candidates.length}`
        };
      case 'summary_weighted_results':
        return {
          title: `الكشف العام لنتائج نهاية التكوين - كشف المعدلات والأوزان الرسمية`,
          shortName: 'كشف_المعدلات_والأوزان_الرسمية',
          subtitle: `رتبة: ${currentRank.titleAr} • التخصص: ${specialtyTitle} • العدد: ${candidates.length}`
        };
      case 'official_final_roster':
        return {
          title: `الكشف العام للتكوين ${isSpecialized ? 'المتخصص' : 'قبل الترقية'} حسب الحالة (قائمة الترتيب العام)`,
          shortName: 'الكشف_العام_والترتيب_حسب_الحالة',
          subtitle: `الرتبة: ${currentRank.titleAr} • التخصص: ${specialtyTitle} • العدد: ${candidates.length}`
        };
    }
  };

  const docMeta = getDocumentMeta();

  // Print Handler
  const handlePrint = () => {
    const filename = `${docMeta.shortName}_${currentRank.titleAr.replace(/\s+/g, '_')}_${formatArabicDate(new Date())}`;
    triggerPrintWithDynamicTitle(filename);
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows: (string | number)[][] = [];

    // Header Lines
    rows.push([INSTITUTION.republic]);
    rows.push([INSTITUTION.ministry]);
    rows.push([INSTITUTION.name]);
    rows.push([docMeta.title]);
    rows.push([`السنة التكوينية: ${academicYearFormatted}`, `التخصص: ${specialtyTitle}`, `العدد: ${candidates.length}`]);
    rows.push([]); // blank separator

    if (docType === 'final_exam_grades') {
      const headerRow1 = ['الرقم', 'اللقب و الاسم', ...modules.map(m => m.titleAr)];
      const headerRow2 = ['معامل المقياس', '', ...modules.map(m => m.coefficient)];
      rows.push(headerRow1);
      rows.push(headerRow2);

      candidates.forEach((c, idx) => {
        const rowData = [
          idx + 1,
          isDecoded ? c.fullName : `مترشح ${idx + 1}`,
          ...modules.map(m => getExamGrade(c.id, m.id).toFixed(2))
        ];
        rows.push(rowData);
      });
    } else if (docType === 'pedagogical_report_grades') {
      const headerRow = ['الرقم', 'اللقب و الاسم', ...modules.map(m => `${m.titleAr} (معامل ${m.coefficient})`), 'تقرير نهاية التكوين / المذكرة'];
      rows.push(headerRow);

      candidates.forEach((c, idx) => {
        const rowData = [
          idx + 1,
          isDecoded ? c.fullName : `مترشح ${idx + 1}`,
          ...modules.map(m => getContinuousGrade(c, m.id).toFixed(2)),
          getMemoirGrade(c).toFixed(2)
        ];
        rows.push(rowData);
      });
    } else if (docType === 'detailed_master_results') {
      const h1 = ['الرقم', 'اللقب و الاسم', 'تاريخ الميلاد'];
      modules.forEach(m => {
        h1.push(`${m.titleAr} (مراقبة)`, `${m.titleAr} (امتحان)`);
      });
      h1.push(
        'مجموع المراقبة البيداغوجية المستمرة',
        'معدل المراقبة البيداغوجية المستمرة',
        'معدل الامتحان النهائي',
        'تقرير نهاية التكوين (النقطة / 20)',
        'المجموع العام',
        'المعدل العام',
        'القرار'
      );
      rows.push(h1);

      candidates.forEach((c, idx) => {
        const res = resultsByCandidateId.get(c.id);
        const rowData: (string | number)[] = [
          idx + 1,
          isDecoded ? c.fullName : `مترشح ${idx + 1}`,
          formatArabicDate(c.birthDate)
        ];
        let ccSum = 0;
        let totalCoeffs = 0;
        modules.forEach(m => {
          const cc = getContinuousGrade(c, m.id);
          const ex = getExamGrade(c.id, m.id);
          ccSum += cc * m.coefficient;
          totalCoeffs += m.coefficient;
          rowData.push(cc.toFixed(2), ex.toFixed(2));
        });
        const ccAvg = totalCoeffs > 0 ? ccSum / totalCoeffs : 14.0;
        rowData.push(
          ccSum.toFixed(2),
          ccAvg.toFixed(2),
          (res?.examAverage ?? 13.5).toFixed(2),
          getMemoirGrade(c).toFixed(2),
          (res?.totalWeightedScore ?? 0).toFixed(2),
          (res?.generalAverage ?? 0).toFixed(2),
          res?.decision ?? 'ناجح'
        );
        rows.push(rowData);
      });
    } else if (docType === 'summary_weighted_results') {
      rows.push([
        'الرقم',
        'اللقب والاسم',
        'تاريخ الميلاد',
        'معدل المراقبة المستمرة',
        'المراقبة بالمعامل X2',
        'نقطة تقرير نهاية التكوين',
        `التقرير بالمعامل X${memoirCoeff}`,
        'معدل الامتحان النهائي',
        'الامتحان بالمعامل X3',
        'المجموع العام',
        'المعدل العام',
        'القرار'
      ]);

      candidates.forEach((c, idx) => {
        const res = resultsByCandidateId.get(c.id);
        const ccAvg = res?.continuousAssessment ?? 14.0;
        const memoir = getMemoirGrade(c);
        const exAvg = res?.examAverage ?? 13.5;
        const ccWeighted = ccAvg * 2;
        const memoirWeighted = memoir * memoirCoeff;
        const exWeighted = exAvg * 3;
        const totalScore = ccWeighted + memoirWeighted + exWeighted;
        const genAvg = totalScore / divisor;

        rows.push([
          idx + 1,
          isDecoded ? c.fullName : `مترشح ${idx + 1}`,
          formatArabicDate(c.birthDate),
          ccAvg.toFixed(2),
          ccWeighted.toFixed(2),
          memoir.toFixed(2),
          memoirWeighted.toFixed(2),
          exAvg.toFixed(2),
          exWeighted.toFixed(2),
          totalScore.toFixed(2),
          genAvg.toFixed(2),
          res?.decision ?? 'ناجح'
        ]);
      });
    } else if (docType === 'official_final_roster') {
      rows.push(['الرقم', 'اللقب والاسم', 'تاريخ الميلاد', 'الولاية', 'المعدل العام', 'القرار']);
      
      // Sort candidates by general average descending
      const sorted = [...candidates].sort((a, b) => {
        const rA = resultsByCandidateId.get(a.id)?.generalAverage ?? 0;
        const rB = resultsByCandidateId.get(b.id)?.generalAverage ?? 0;
        return rB - rA;
      });

      sorted.forEach((c, idx) => {
        const res = resultsByCandidateId.get(c.id);
        const wilayaDisplay = c.wilaya || c.candidateWilaya || c.originalInstitution || (c.registrationNumber ? `الأغواط (${c.registrationNumber.slice(0, 2)})` : 'الأغواط (03)');
        rows.push([
          idx + 1,
          isDecoded ? c.fullName : `مترشح ${idx + 1}`,
          formatArabicDate(c.birthDate),
          wilayaDisplay,
          (res?.generalAverage ?? 0).toFixed(2),
          res?.decision ?? 'ناجح'
        ]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!dir'] = 'rtl';
    XLSX.utils.book_append_sheet(wb, ws, docMeta.shortName.slice(0, 31));
    XLSX.writeFile(wb, `${docMeta.shortName}_${currentRank.titleAr.replace(/\s+/g, '_')}_${formatArabicDate(new Date())}.xlsx`);
  };

  // Render Top Official Header for all documents
  const renderOfficialHeader = (isMinistryDirectorateLaghouat: boolean = false) => {
    return (
      <div className="relative mb-3 pb-2 text-black font-simplified-arabic border-b-2 border-black">
        <div className="flex justify-between items-start">
          {/* Top Right: Administrative Hierarchy */}
          <div className="text-right text-xs font-bold leading-relaxed space-y-0.5">
            <p>مديرية التكوين</p>
            {isMinistryDirectorateLaghouat ? (
              <p>مديرية التربية لولاية الأغواط</p>
            ) : (
              <p>المعهد الوطني لتكوين موظفي قطاع التربية الوطنية - الشيخ زاهية حسين - الأغواط</p>
            )}
            <p>نيابة التكوين والمسابقات والامتحانات المهنية</p>
            <p>مصلحة تنظيم سير المسابقات والامتحانات المهنية</p>
          </div>

          {/* Top Center: Official Republic & Ministry Header */}
          <div className="text-center font-bold text-xs md:text-sm leading-snug">
            <p>{INSTITUTION.republic}</p>
            <p className="mt-0.5">{INSTITUTION.ministry}</p>
          </div>

          {/* Top Left: Academic Year */}
          <div className="text-left text-xs font-bold font-mono">
            <span>السنة التكوينية : <strong>{academicYearFormatted}</strong></span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Action & Control Bar (Hidden during physical print) */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-orange-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              الوثيقة الرسمية المعتمدة
            </span>
            <h2 className="text-sm md:text-base font-bold font-cairo text-white">
              {docMeta.title}
            </h2>
          </div>
          <p className="text-xs text-slate-300">
            {docMeta.subtitle} • {isSpecialized ? 'تكوين متخصص (المقام = 6)' : 'تكوين قبل الترقية (المقام = 7)'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isDecoded && (
            <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>ملاحظة: يمكنك رفع الإغفال من تبويب (لوحة التحكم) لكشف الأسماء الصريحة</span>
            </span>
          )}

          <button
            onClick={handleExportExcel}
            className="bg-emerald-700 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير إلى Excel (.xlsx)</span>
          </button>

          <button
            onClick={handlePrint}
            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة هذه الوثيقة الرسمية</span>
          </button>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* DOCUMENT PREVIEW CONTAINER (Styled for Screen & 100% Crisp Print)       */}
      {/* ======================================================================= */}
      <div 
        id="printable-deliberation-doc"
        className="bg-white text-black border-2 border-black official-exam-outer-frame font-simplified-arabic p-6 md:p-8 shadow-xl mx-auto print-document"
        dir="rtl"
      >
        {/* ===================================================================== */}
        {/* 1. DOCUMENT 1: FINAL EXAM GRADES (وثيقة نقاط الامتحان النهائي - PDF 1) */}
        {/* ===================================================================== */}
        {docType === 'final_exam_grades' && (
          <div>
            {renderOfficialHeader(false)}

            {/* Document Title Bar */}
            <div className="my-3 text-xs md:text-sm font-bold flex flex-wrap items-center justify-between border-b-2 border-black pb-2 text-black">
              <span>نقـاط الامتحـ ـان النهائـي لرتبة: <strong className="font-black text-sm">{currentRank.titleAr}</strong></span>
              <span>التخصص: <strong className="font-bold">{specialtyTitle}</strong></span>
              <span>العدد: <strong className="font-mono font-bold">{candidates.length}</strong></span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto my-2">
              <table className="w-full text-center text-xs border-collapse border-2 border-black">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b-2 border-black">
                    <th className="border border-black py-2 px-1 w-12" rowSpan={2}>الرقم</th>
                    <th className="border border-black py-2 px-3 min-w-[160px] text-right" rowSpan={2}>اللقب و الاسم</th>
                    {modules.map((m, mIdx) => (
                      <th key={mIdx} className="border border-black py-1.5 px-2 text-center">
                        <div className="font-bold text-[11px] leading-tight">{m.titleAr}</div>
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-slate-200 font-bold border-b-2 border-black text-[11px]">
                    {modules.map((m, mIdx) => (
                      <th key={mIdx} className="border border-black py-1 px-1 font-mono">
                        {m.coefficient}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-slate-50 border-b border-black h-8">
                      <td className="border border-black py-1 px-1 font-mono font-bold">{idx + 1}</td>
                      <td className="border border-black py-1 px-3 text-right font-bold">
                        {isDecoded ? c.fullName : `مترشح ${idx + 1}`}
                      </td>
                      {modules.map((m, mIdx) => {
                        const grade = getExamGrade(c.id, m.id);
                        return (
                          <td key={mIdx} className="border border-black py-1 px-2 font-mono font-bold">
                            {grade.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Signatures */}
            <div className="pt-6 mt-4 border-t border-slate-300 flex justify-between items-start text-xs font-bold text-center px-10">
              <div>
                <p className="font-bold text-sm">ممثلا الأساتذة:</p>
                <div className="h-12 flex items-end justify-center text-slate-700">
                  <span>الأستاذ : ............................</span>
                  <span className="mr-8">الأستاذ : ............................</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-800 mb-1">الأغواط في: {getCurrentArabicDate()}</p>
                <p className="font-bold text-sm text-black">مدير المعهد</p>
                <div className="h-12 flex items-end justify-center text-slate-950 font-bold">{INSTITUTION.director}</div>
                <p className="text-[10px] text-slate-600 font-bold">(الختم الرسمي والتوقيع)</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================================= */}
        {/* 2. DOCUMENT 2: PEDAGOGICAL CONTINUOUS & REPORT (المراقبة البيداغوجية والمذكرة - PDF 4)      */}
        {/* ========================================================================================= */}
        {docType === 'pedagogical_report_grades' && (
          <div>
            {renderOfficialHeader(true)}

            {/* Document Title Bar */}
            <div className="my-3 text-xs md:text-sm font-bold flex flex-wrap items-center justify-between border-b-2 border-black pb-2 text-black">
              <span>نقاط: المراقبة البيداغوجية المستمرة و تقرير نهاية التكوين <strong className="font-black text-sm">{currentRank.titleAr}</strong> أو المذكرة</span>
              <span>التخصص: <strong className="font-bold">{specialtyTitle}</strong></span>
              <span>العدد: <strong className="font-mono font-bold">{candidates.length}</strong></span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto my-2">
              <table className="w-full text-center text-xs border-collapse border-2 border-black">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b-2 border-black">
                    <th className="border border-black py-2 px-1 w-12">الرقم</th>
                    <th className="border border-black py-2 px-3 min-w-[160px] text-right">اللقب و الاسم</th>
                    {modules.map((m, mIdx) => (
                      <th key={mIdx} className="border border-black py-2 px-2 text-center">
                        <div className="font-bold text-[11px] leading-tight">{m.titleAr}</div>
                        <div className="text-[10px] text-slate-600 font-mono mt-0.5">معامل: {m.coefficient}</div>
                      </th>
                    ))}
                    <th className="border border-black py-2 px-3 bg-amber-50 text-amber-950 font-black min-w-[120px]">
                      تقرير نهاية التكوين / المذكرة
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-slate-50 border-b border-black h-8">
                      <td className="border border-black py-1 px-1 font-mono font-bold">{idx + 1}</td>
                      <td className="border border-black py-1 px-3 text-right font-bold">
                        {isDecoded ? c.fullName : `مترشح ${idx + 1}`}
                      </td>
                      {modules.map((m, mIdx) => {
                        const grade = getContinuousGrade(c, m.id);
                        return (
                          <td key={mIdx} className="border border-black py-1 px-2 font-mono font-bold">
                            {grade.toFixed(2)}
                          </td>
                        );
                      })}
                      <td className="border border-black py-1 px-3 font-mono font-bold text-center bg-amber-50/50">
                        {getMemoirGrade(c).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Signatures */}
            <div className="pt-6 mt-4 border-t border-slate-300 flex justify-between items-start text-xs font-bold text-center px-10">
              <div>
                <p className="font-bold text-sm">ممثلا الأساتذة:</p>
                <div className="h-12 flex items-end justify-center text-slate-700">
                  <span>الأستاذ : ............................</span>
                  <span className="mr-8">الأستاذ : ............................</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-800 mb-1">الأغواط في: {getCurrentArabicDate()}</p>
                <p className="font-bold text-sm text-black">مدير المعهد</p>
                <div className="h-12 flex items-end justify-center text-slate-950 font-bold">{INSTITUTION.director}</div>
                <p className="text-[10px] text-slate-600 font-bold">(الختم الرسمي والتوقيع)</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================================= */}
        {/* 3. DOCUMENT 3: DETAILED MASTER RESULTS (الكشف العام المفصل لنتائج التكوين - PDF 2)          */}
        {/* ========================================================================================= */}
        {docType === 'detailed_master_results' && (
          <div className="print-a4-landscape">
            {renderOfficialHeader(false)}

            {/* Document Title Bar */}
            <div className="my-3 text-xs md:text-sm font-bold flex flex-wrap items-center justify-between border-b-2 border-black pb-2 text-black">
              <span>الكشف العام لنتائج نهاية التكوين رتبة: <strong className="font-black text-sm">{currentRank.titleAr}</strong></span>
              <span>التخصص: <strong className="font-bold">{specialtyTitle}</strong></span>
              <span>العدد: <strong className="font-mono font-bold">{candidates.length}</strong></span>
            </div>

            {/* Comprehensive Matrix Table */}
            <div className="overflow-x-auto my-2">
              <table className="w-full text-center text-[10px] border-collapse border-2 border-black">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b-2 border-black">
                    <th className="border border-black py-2 px-1 w-8" rowSpan={2}>الرقم</th>
                    <th className="border border-black py-2 px-2 min-w-[130px] text-right" rowSpan={2}>اللقب و الاسم</th>
                    <th className="border border-black py-2 px-1 min-w-[70px]" rowSpan={2}>تاريخ الميلاد</th>
                    <th className="border border-black py-1 px-1 bg-slate-200" colSpan={modules.length * 2}>
                      الامتحان النهائي + المراقبة البيداغوجية المستمرة
                    </th>
                    <th className="border border-black py-2 px-1 w-16" rowSpan={2}>مجموع المراقبة المستمرة</th>
                    <th className="border border-black py-2 px-1 w-14" rowSpan={2}>معدل المراقبة المستمرة</th>
                    <th className="border border-black py-2 px-1 w-14" rowSpan={2}>معدل الامتحان النهائي</th>
                    <th className="border border-black py-2 px-1 w-14" rowSpan={2}>تقرير نهاية التكوين (20/النقطة)</th>
                    <th className="border border-black py-2 px-1 w-16 font-black" rowSpan={2}>المجموع العام</th>
                    <th className="border border-black py-2 px-1 w-16 bg-amber-100 font-black" rowSpan={2}>المعدل العام</th>
                    <th className="border border-black py-2 px-1 w-14" rowSpan={2}>القرار</th>
                  </tr>
                  <tr className="bg-slate-50 font-bold border-b-2 border-black text-[9px]">
                    {modules.map((m, mIdx) => (
                      <React.Fragment key={mIdx}>
                        <th className="border border-black py-1 px-1 min-w-[36px]" title={`${m.titleAr} - مراقبة مستمرة`}>
                          المراقبة م
                        </th>
                        <th className="border border-black py-1 px-1 min-w-[36px] bg-slate-100" title={`${m.titleAr} - امتحان نهائي`}>
                          الامتحان
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c, idx) => {
                    const res = resultsByCandidateId.get(c.id);
                    let ccSum = 0;
                    let totalCoeffs = 0;
                    modules.forEach(m => {
                      const cc = getContinuousGrade(c, m.id);
                      ccSum += cc * m.coefficient;
                      totalCoeffs += m.coefficient;
                    });
                    const ccAvg = totalCoeffs > 0 ? ccSum / totalCoeffs : 14.0;
                    const exAvg = res?.examAverage ?? 13.5;
                    const memoir = getMemoirGrade(c);
                    const isPassed = res?.decision === 'ناجح';

                    return (
                      <tr key={c.id} className="hover:bg-slate-50 border-b border-black h-7">
                        <td className="border border-black py-0.5 px-0.5 font-mono font-bold">{idx + 1}</td>
                        <td className="border border-black py-0.5 px-1.5 text-right font-bold truncate max-w-[140px]">
                          {isDecoded ? c.fullName : `مترشح ${idx + 1}`}
                        </td>
                        <td className="border border-black py-0.5 px-0.5 font-mono">{formatArabicDate(c.birthDate)}</td>
                        {modules.map((m, mIdx) => {
                          const cc = getContinuousGrade(c, m.id);
                          const ex = getExamGrade(c.id, m.id);
                          return (
                            <React.Fragment key={mIdx}>
                              <td className="border border-black py-0.5 px-0.5 font-mono text-[9px]">{cc.toFixed(2)}</td>
                              <td className="border border-black py-0.5 px-0.5 font-mono text-[9px] bg-slate-50">{ex.toFixed(2)}</td>
                            </React.Fragment>
                          );
                        })}
                        <td className="border border-black py-0.5 px-0.5 font-mono">{ccSum.toFixed(2)}</td>
                        <td className="border border-black py-0.5 px-0.5 font-mono font-bold">{ccAvg.toFixed(2)}</td>
                        <td className="border border-black py-0.5 px-0.5 font-mono font-bold">{exAvg.toFixed(2)}</td>
                        <td className="border border-black py-0.5 px-0.5 font-mono font-bold">{memoir.toFixed(2)}</td>
                        <td className="border border-black py-0.5 px-0.5 font-mono font-black">{(res?.totalWeightedScore ?? 0).toFixed(2)}</td>
                        <td className="border border-black py-0.5 px-0.5 font-mono font-black bg-amber-50">{(res?.generalAverage ?? 0).toFixed(2)}</td>
                        <td className={`border border-black py-0.5 px-1 font-bold ${isPassed ? 'text-emerald-900' : 'text-rose-900'}`}>
                          {res?.decision ?? 'ناجح'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Signatures (Exact replica of PDF 2) */}
            <div className="pt-6 mt-4 border-t border-slate-300 flex justify-between items-start text-xs font-bold text-center px-6">
              <div>
                <p className="font-bold text-sm">ممثلا الأساتذة:</p>
                <div className="h-12 flex items-end justify-center text-slate-700">
                  <span>الأستاذ : ............................</span>
                  <span className="mr-6">الأستاذ : ............................</span>
                </div>
              </div>
              <div>
                <p className="font-bold text-sm">الأستاذ:</p>
                <div className="h-12 flex items-end justify-center text-slate-700">............................</div>
              </div>
              <div>
                <p className="text-xs text-slate-800 mb-1">الأغواط في: {getCurrentArabicDate()}</p>
                <p className="font-bold text-sm text-black">مدير المعهد</p>
                <div className="h-12 flex items-end justify-center text-slate-950 font-bold">{INSTITUTION.director}</div>
                <p className="text-[10px] text-slate-600 font-bold">(الختم الرسمي والتوقيع)</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================================= */}
        {/* 4. DOCUMENT 4: WEIGHTED SUMMARY RESULTS (كشف المعدلات والأوزان الرسمية - PDF 3)            */}
        {/* ========================================================================================= */}
        {docType === 'summary_weighted_results' && (
          <div>
            {renderOfficialHeader(false)}

            {/* Document Title Bar */}
            <div className="my-3 text-xs md:text-sm font-bold flex flex-wrap items-center justify-between border-b-2 border-black pb-2 text-black">
              <span>الكشف العام لنتائج نهاية التكوين رتبة <strong className="font-black text-sm">{currentRank.titleAr}</strong></span>
              <span>التخصص: <strong className="font-bold">{specialtyTitle}</strong></span>
              <span>العدد: <strong className="font-mono font-bold">{candidates.length}</strong></span>
            </div>

            {/* Official Weighted Table */}
            <div className="overflow-x-auto my-2">
              <table className="w-full text-center text-xs border-collapse border-2 border-black">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b-2 border-black">
                    <th className="border border-black py-2 px-1 w-10" rowSpan={2}>الرقم</th>
                    <th className="border border-black py-2 px-3 min-w-[160px] text-right" rowSpan={2}>اللقب والاسم</th>
                    <th className="border border-black py-2 px-2 min-w-[85px]" rowSpan={2}>تاريخ الميلاد</th>
                    <th className="border border-black py-1 px-2 bg-slate-200" colSpan={2}>
                      المراقبة البيداغوجية المستمرة
                    </th>
                    <th className="border border-black py-1 px-2 bg-slate-200" colSpan={2}>
                      تقرير نهاية التكوين
                    </th>
                    <th className="border border-black py-1 px-2 bg-slate-200" colSpan={2}>
                      الامتحان النهائي
                    </th>
                    <th className="border border-black py-2 px-2 w-16 font-black" rowSpan={2}>المجموع العام</th>
                    <th className="border border-black py-2 px-2 w-16 bg-amber-100 font-black" rowSpan={2}>المعدل العام</th>
                    <th className="border border-black py-2 px-2 w-16" rowSpan={2}>القرار</th>
                  </tr>
                  <tr className="bg-slate-50 font-bold border-b-2 border-black text-[11px]">
                    <th className="border border-black py-1 px-1">المعدل</th>
                    <th className="border border-black py-1 px-1 bg-slate-100 font-mono">بالمعامل X2</th>
                    <th className="border border-black py-1 px-1">النقطة</th>
                    <th className="border border-black py-1 px-1 bg-slate-100 font-mono">بالمعامل X{memoirCoeff}</th>
                    <th className="border border-black py-1 px-1">المعدل</th>
                    <th className="border border-black py-1 px-1 bg-slate-100 font-mono">بالمعامل X3</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c, idx) => {
                    const res = resultsByCandidateId.get(c.id);
                    const ccAvg = res?.continuousAssessment ?? 14.0;
                    const memoir = getMemoirGrade(c);
                    const exAvg = res?.examAverage ?? 13.5;
                    const ccWeighted = ccAvg * 2;
                    const memoirWeighted = memoir * memoirCoeff;
                    const exWeighted = exAvg * 3;
                    const totalScore = ccWeighted + memoirWeighted + exWeighted;
                    const genAvg = totalScore / divisor;
                    const isPassed = res?.decision === 'ناجح';

                    return (
                      <tr key={c.id} className="hover:bg-slate-50 border-b border-black h-8">
                        <td className="border border-black py-1 px-1 font-mono font-bold">{idx + 1}</td>
                        <td className="border border-black py-1 px-3 text-right font-bold">
                          {isDecoded ? c.fullName : `مترشح ${idx + 1}`}
                        </td>
                        <td className="border border-black py-1 px-1 font-mono text-[11px]">{formatArabicDate(c.birthDate)}</td>
                        <td className="border border-black py-1 px-1 font-mono">{ccAvg.toFixed(2)}</td>
                        <td className="border border-black py-1 px-1 font-mono font-bold bg-slate-50">{ccWeighted.toFixed(2)}</td>
                        <td className="border border-black py-1 px-1 font-mono">{memoir.toFixed(2)}</td>
                        <td className="border border-black py-1 px-1 font-mono font-bold bg-slate-50">{memoirWeighted.toFixed(2)}</td>
                        <td className="border border-black py-1 px-1 font-mono">{exAvg.toFixed(2)}</td>
                        <td className="border border-black py-1 px-1 font-mono font-bold bg-slate-50">{exWeighted.toFixed(2)}</td>
                        <td className="border border-black py-1 px-1 font-mono font-black">{totalScore.toFixed(2)}</td>
                        <td className="border border-black py-1 px-1 font-mono font-black bg-amber-50">{genAvg.toFixed(2)}</td>
                        <td className={`border border-black py-1 px-1 font-bold ${isPassed ? 'text-emerald-900' : 'text-rose-900'}`}>
                          {res?.decision ?? 'ناجح'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Signatures (Exact replica of PDF 3) */}
            <div className="pt-6 mt-4 border-t border-slate-300 flex justify-between items-start text-xs font-bold text-center px-10">
              <div>
                <p className="font-bold text-sm">ممثلا الأساتذة:</p>
                <div className="h-12 flex items-end justify-center text-slate-700">
                  <span>الأستاذ : ............................</span>
                  <span className="mr-8">الأستاذ : ............................</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-800 mb-1">الأغواط في: {getCurrentArabicDate()}</p>
                <p className="font-bold text-sm text-black">مدير المعهد</p>
                <div className="h-12 flex items-end justify-center text-slate-950 font-bold">{INSTITUTION.director}</div>
                <p className="text-[10px] text-slate-600 font-bold">(الختم الرسمي والتوقيع)</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================================= */}
        {/* 5. DOCUMENT 5: FINAL ROSTER & CLASSIFICATION (الكشف العام والترتيب حسب الحالة - PDF 5)       */}
        {/* ========================================================================================= */}
        {docType === 'official_final_roster' && (
          <div>
            {renderOfficialHeader(false)}

            {/* Official Center Title Header (Exact replica of PDF 5) */}
            <div className="my-3 text-center border-b-2 border-black pb-2 space-y-1">
              <h1 className="text-base md:text-lg font-black tracking-wide">
                الكشف العام للتكوين {isSpecialized ? 'المتخصص' : 'قبل الترقية'} ... حسب الحالة
              </h1>
              <div className="flex items-center justify-between text-xs md:text-sm font-bold pt-1 px-4 text-black">
                <span>الرتبة: <strong className="font-black">{currentRank.titleAr}</strong></span>
                <span>التخصص: <strong className="font-bold">{specialtyTitle}</strong></span>
                <span>العدد: <strong className="font-mono font-bold">{candidates.length}</strong></span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto my-2">
              <table className="w-full text-center text-xs border-collapse border-2 border-black">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b-2 border-black">
                    <th className="border border-black py-2 px-1 w-12">الرقم</th>
                    <th className="border border-black py-2 px-3 min-w-[180px] text-right">اللقب والاسم</th>
                    <th className="border border-black py-2 px-2 min-w-[95px]">تاريخ الميلاد</th>
                    <th className="border border-black py-2 px-2 min-w-[110px]">الولاية</th>
                    <th className="border border-black py-2 px-2 w-20 font-black">المعدل العام</th>
                    <th className="border border-black py-2 px-2 w-20">القـ ـ ـرار</th>
                  </tr>
                </thead>
                <tbody>
                  {[...candidates]
                    .sort((a, b) => {
                      const rA = resultsByCandidateId.get(a.id)?.generalAverage ?? 0;
                      const rB = resultsByCandidateId.get(b.id)?.generalAverage ?? 0;
                      return rB - rA;
                    })
                    .map((c, idx) => {
                      const res = resultsByCandidateId.get(c.id);
                      const isPassed = res?.decision === 'ناجح';
                      const wilayaDisplay = c.wilaya || c.candidateWilaya || c.originalInstitution || (c.registrationNumber ? `الأغواط (${c.registrationNumber.slice(0, 2)})` : 'الأغواط (03)');

                      return (
                        <tr key={c.id} className="hover:bg-slate-50 border-b border-black h-8">
                          <td className="border border-black py-1 px-1 font-mono font-bold">{idx + 1}</td>
                          <td className="border border-black py-1 px-3 text-right font-bold">
                            {isDecoded ? c.fullName : `مترشح ${idx + 1}`}
                          </td>
                          <td className="border border-black py-1 px-1 font-mono text-[11px]">
                            {formatArabicDate(c.birthDate)}
                          </td>
                          <td className="border border-black py-1 px-2 font-bold text-slate-800">
                            {wilayaDisplay}
                          </td>
                          <td className="border border-black py-1 px-2 font-mono font-black bg-slate-50">
                            {(res?.generalAverage ?? 0).toFixed(2)}
                          </td>
                          <td className={`border border-black py-1 px-2 font-bold ${isPassed ? 'text-emerald-900' : 'text-rose-900'}`}>
                            {res?.decision ?? 'ناجح'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Bottom Signatures (Exact replica of PDF 5 - Director on Left) */}
            <div className="pt-6 mt-4 border-t border-slate-300 flex justify-end items-end px-10">
              <div className="text-center min-w-[240px]">
                <p className="text-xs text-slate-800 mb-1">الأغواط في: {getCurrentArabicDate()}</p>
                <p className="font-black text-sm text-black">مدير المعهد</p>
                <div className="h-14"></div>
                <p className="font-bold text-xs text-slate-950">{INSTITUTION.director}</p>
                <p className="text-[10px] text-slate-600 font-bold">(الختم الرسمي والتوقيع)</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
