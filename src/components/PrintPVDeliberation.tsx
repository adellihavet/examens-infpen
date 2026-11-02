import React from 'react';
import { Printer, Download, Award, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { INSTITUTION } from '../constants/branding';
import { formatArabicDate, formatAcademicYear } from '../utils/date-formatter';

interface PrintPVDeliberationProps {
  sessionTitle: string;
  specialtyTitle: string;
  academicYear: string;
  trackId?: 'specialized' | 'pre_promotion';
  modules: { id: string; titleAr: string; coefficient: number; eliminatoryGrade?: number }[];
  results: {
    candidate: { id: string; registrationNumber: string; fullName: string; birthDate: string; groupNumber?: string };
    moduleGrades: { module: { id: string; titleAr: string; coefficient: number }; finalGrade: number | null; isEliminated: boolean }[];
    totalCoefficients: number;
    totalWeightedScore: number;
    examAverage: number | null;
    continuousAssessment: number;
    internshipGrade: number;
    memoirGrade: number;
    generalAverage: number | null;
    average: number | null;
    rank: number;
    decision: string;
    mention: string;
  }[];
  onClose?: () => void;
  onExportExcel?: () => void;
}

export const PrintPVDeliberation: React.FC<PrintPVDeliberationProps> = ({
  sessionTitle,
  specialtyTitle,
  academicYear,
  trackId = 'specialized',
  modules,
  results,
  onClose,
  onExportExcel
}) => {
  const isSpecialized = trackId === 'specialized';
  const divisor = isSpecialized ? 6 : 7;
  const memoirCoeff = isSpecialized ? 1 : 2;

  const passedCount = results.filter(r => r.decision === 'ناجح').length;
  const rattrapageCount = results.filter(r => r.decision === 'معني بالاستدراك' || r.decision === 'مؤجل').length;
  const failedCount = results.filter(r => r.decision === 'راسب' || r.decision === 'مقصى').length;
  const successRate = results.length > 0 ? ((passedCount / results.length) * 100).toFixed(2) : '0';

  return (
    <div className="bg-slate-100 min-h-screen p-4 md:p-6 print:p-0 print:bg-white text-slate-900" dir="rtl">
      {/* Print Control Bar (Hidden on print) */}
      <div className="max-w-[1400px] mx-auto mb-6 bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-lg no-print">
        <div>
          <h2 className="text-sm font-bold font-cairo text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-orange-400" />
            <span>محضر المداولات الرسمي والنهائي لنهاية التكوين (Format A3 Paysage)</span>
          </h2>
          <p className="text-xs text-slate-400">
            {INSTITUTION.name} • {INSTITUTION.service} — المعتمد طبقاً للقرارات الوزارية المشتركة
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>تصدير إلى Excel</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة المحضر الرسمي (A3)</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg text-xs font-semibold transition cursor-pointer"
              title="إغلاق المعاينة"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Official A3 Sheet Container with Simplified Arabic Typography */}
      <div 
        className="print-document max-w-[1450px] mx-auto bg-white border-2 border-slate-700 rounded-xl p-8 print:p-0 print:border-none print:shadow-none shadow-2xl min-h-[960px] flex flex-col justify-between"
        style={{ width: '100%' }}
      >
        <div>
          {/* Official 5-Line Ministerial Header */}
          <div className="text-center border-b-2 border-slate-900 pb-3 mb-4 leading-snug">
            <p className="text-xs font-bold text-slate-900 tracking-wider">{INSTITUTION.republic}</p>
            <p className="text-xs font-bold text-slate-900">{INSTITUTION.ministry}</p>
            <h1 className="text-base md:text-lg font-bold text-slate-950 mt-0.5 print-bold">
              {INSTITUTION.name}
            </h1>
            <p className="text-xs font-semibold text-slate-800 mt-0.5">
              {INSTITUTION.deputyDirectorate}
            </p>
            <p className="text-xs font-bold text-slate-900 mt-0.5 print-bold">
              {INSTITUTION.service}
            </p>
            <div className="inline-block bg-slate-900 text-white text-xs font-bold px-5 py-1 rounded-full mt-2 print-bold">
              محضر المداولات الرسمي والنهائي لاختبارات نهاية التكوين لنيل شهادة التأهيل المهني
            </div>
            
            <div className="flex items-center justify-center gap-6 text-xs text-slate-800 mt-2.5 font-medium bg-slate-50 py-1.5 px-4 rounded-lg border border-slate-200">
              <span>الدورة التكوينية: <strong className="text-slate-950">{sessionTitle}</strong></span>
              <span>•</span>
              <span>الرتبة التكوينية: <strong className="text-orange-950 font-bold">{specialtyTitle}</strong></span>
              <span>•</span>
              <span>السنة التكوينية: <strong className="text-slate-950 font-mono" dir="ltr">{formatAcademicYear(academicYear)}</strong></span>
              <span>•</span>
              <span>تاريخ المداولات: <strong className="text-slate-950 font-mono">{formatArabicDate(new Date())}</strong></span>
            </div>

            {/* Official Formula Strip */}
            <div className="mt-2 text-[11px] text-slate-700 font-bold bg-amber-50/70 border border-amber-200 py-1 px-3 rounded text-center">
              المعادلة الوزارية المعتمدة: المعدل العام = ((المراقبة المستمرة × 1) + (التربص التطبيقي × 1) + (المذكرة/التقرير × {memoirCoeff}) + (معدل الامتحان النهائي × 3)) / {divisor}
            </div>
          </div>

          {/* Statistical KPI Strip */}
          <div className="grid grid-cols-5 gap-2 text-center text-xs mb-4">
            <div className="bg-slate-50 border border-slate-300 rounded p-1.5">
              <span className="text-[10px] text-slate-500 block">إجمالي المترشحين</span>
              <strong className="text-sm font-mono text-slate-950">{results.length}</strong>
            </div>
            <div className="bg-emerald-50 border border-emerald-300 rounded p-1.5">
              <span className="text-[10px] text-emerald-800 font-bold block">الناجحون (Admis)</span>
              <strong className="text-sm font-mono text-emerald-950">{passedCount}</strong>
            </div>
            <div className="bg-blue-50 border border-blue-300 rounded p-1.5">
              <span className="text-[10px] text-blue-800 font-bold block">نسبة النجاح العامة</span>
              <strong className="text-sm font-mono text-blue-950">{successRate}%</strong>
            </div>
            <div className="bg-amber-50 border border-amber-300 rounded p-1.5">
              <span className="text-[10px] text-amber-800 font-bold block">المعنيون بالاستدراك</span>
              <strong className="text-sm font-mono text-amber-950">{rattrapageCount}</strong>
            </div>
            <div className="bg-rose-50 border border-rose-300 rounded p-1.5">
              <span className="text-[10px] text-rose-800 font-bold block">الراسبون والمقصون</span>
              <strong className="text-sm font-mono text-rose-950">{failedCount}</strong>
            </div>
          </div>

          {/* Master Deliberations Table (A3 Landscape) */}
          <div className="overflow-x-auto border-2 border-slate-800 rounded-lg">
            <table className="w-full text-right text-xs border-collapse">
              <thead className="bg-slate-200 text-slate-950 font-bold border-b-2 border-slate-800 text-[11px]">
                <tr>
                  <th className="p-2 border-l border-slate-400 text-center w-8">#</th>
                  <th className="p-2 border-l border-slate-400 w-28">رقم التسجيل</th>
                  <th className="p-2 border-l border-slate-400 w-48">اللقب والاسم الكامل</th>
                  <th className="p-2 border-l border-slate-400 text-center w-20">تاريخ الميلاد</th>
                  
                  {/* Exam Modules columns */}
                  {modules.map(mod => (
                    <th key={mod.id} className="p-2 border-l border-slate-400 text-center">
                      <div className="font-bold text-[10px]">{mod.titleAr}</div>
                      <span className="text-[9px] text-slate-600 block">معامل {mod.coefficient}</span>
                    </th>
                  ))}

                  <th className="p-2 border-l border-slate-400 text-center w-20 bg-orange-100">
                    معدل الامتحان (×3)
                  </th>
                  <th className="p-2 border-l border-slate-400 text-center w-20">
                    المراقبة (×1)
                  </th>
                  <th className="p-2 border-l border-slate-400 text-center w-20">
                    التربص (×1)
                  </th>
                  <th className="p-2 border-l border-slate-400 text-center w-20">
                    المذكرة (×{memoirCoeff})
                  </th>
                  <th className="p-2 border-l border-slate-400 text-center w-24 bg-slate-300 font-black">
                    المعدل العام (/{divisor === 6 ? '6' : '7'})
                  </th>
                  <th className="p-2 border-l border-slate-400 text-center w-12">الترتيب</th>
                  <th className="p-2 border-l border-slate-400 text-center w-28">قرار اللجنة</th>
                  <th className="p-2 text-center w-24">التقدير</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 text-slate-950">
                {results.map((res, idx) => (
                  <tr 
                    key={res.candidate.id} 
                    className={`transition ${
                      res.decision === 'ناجح' 
                        ? 'hover:bg-emerald-50/50' 
                        : res.decision === 'معني بالاستدراك'
                        ? 'bg-amber-50/40 hover:bg-amber-50'
                        : res.decision === 'مقصى' || res.decision === 'راسب'
                        ? 'bg-rose-50/50 hover:bg-rose-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-1.5 text-center font-mono text-slate-500 border-l border-slate-300">{idx + 1}</td>
                    <td className="p-1.5 font-mono font-bold text-slate-900 border-l border-slate-300">{res.candidate.registrationNumber}</td>
                    <td className="p-1.5 font-bold text-slate-950 border-l border-slate-300">{res.candidate.fullName}</td>
                    <td className="p-1.5 text-center font-mono text-slate-700 border-l border-slate-300">{formatArabicDate(res.candidate.birthDate)}</td>

                    {/* Module Scores */}
                    {modules.map(mod => {
                      const mg = res.moduleGrades.find(m => m.module.id === mod.id);
                      return (
                        <td key={mod.id} className="p-1.5 text-center font-mono border-l border-slate-300">
                          {mg?.finalGrade !== null && mg?.finalGrade !== undefined ? (
                            <span className={mg.isEliminated ? 'text-rose-700 font-extrabold underline' : 'font-bold'}>
                              {mg.finalGrade.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-semibold">—</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Exam Average */}
                    <td className="p-1.5 text-center font-mono font-bold text-orange-900 bg-orange-50/60 border-l border-slate-300">
                      {res.examAverage !== null ? res.examAverage.toFixed(2) : '—'}
                    </td>

                    {/* Continuous assessment */}
                    <td className="p-1.5 text-center font-mono text-slate-800 border-l border-slate-300">
                      {res.continuousAssessment.toFixed(2)}
                    </td>

                    {/* Internship mark */}
                    <td className="p-1.5 text-center font-mono text-slate-800 border-l border-slate-300">
                      {res.internshipGrade.toFixed(2)}
                    </td>

                    {/* Memoir mark */}
                    <td className="p-1.5 text-center font-mono text-slate-800 border-l border-slate-300">
                      {res.memoirGrade.toFixed(2)}
                    </td>

                    {/* General average */}
                    <td className="p-1.5 text-center font-mono border-l border-slate-300 bg-slate-100">
                      {res.generalAverage !== null ? (
                        <span className={`text-xs font-black px-1.5 py-0.5 rounded ${
                          res.generalAverage >= 10.0
                            ? 'text-emerald-950 bg-emerald-100'
                            : 'text-rose-950 bg-rose-100'
                        }`}>
                          {res.generalAverage.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold">—</span>
                      )}
                    </td>

                    {/* Rank */}
                    <td className="p-1.5 text-center font-mono font-bold text-slate-800 border-l border-slate-300">
                      {res.rank > 0 ? res.rank : '—'}
                    </td>

                    {/* Decision */}
                    <td className="p-1.5 text-center font-bold border-l border-slate-300">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        res.decision === 'ناجح'
                          ? 'bg-emerald-700 text-white'
                          : res.decision === 'معني بالاستدراك'
                          ? 'bg-amber-600 text-white'
                          : res.decision === 'مقصى'
                          ? 'bg-rose-700 text-white'
                          : 'bg-slate-300 text-slate-800'
                      }`}>
                        {res.decision}
                      </span>
                    </td>

                    {/* Mention */}
                    <td className="p-1.5 text-center font-medium text-slate-800 text-[10px]">
                      {res.mention}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Committee Signatures & Seals Block */}
        <div className="mt-8 pt-4 border-t-2 border-slate-900 avoid-break">
          <p className="font-bold text-xs text-slate-800 mb-3 text-center">
            صودق على هذا المحضر بصفة نهائية ورسمية من طرف أعضاء لجنة المداولات المجتمعة بمقر المعهد بالأغواط:
          </p>

          <div className="grid grid-cols-3 gap-6 text-center text-xs">
            {/* Jury Members */}
            <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50">
              <p className="font-bold text-slate-900 mb-1">أساتذة ومفتشو التكوين (أعضاء اللجنة)</p>
              <p className="text-[11px] text-slate-500 mb-2">1. .................... • 2. .................... • 3. ....................</p>
              <div className="h-14 flex items-end justify-center text-[11px] text-slate-400">
                التوقيعات: ................................................
              </div>
            </div>

            {/* Examination Chief */}
            <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50">
              <p className="font-bold text-slate-900 mb-1">{INSTITUTION.serviceHeadTitle}</p>
              <p className="text-[11px] text-slate-600 font-semibold mb-2">{INSTITUTION.deputyDirectorate}</p>
              <div className="h-14 flex items-end justify-center text-[11px] text-slate-400">
                التأشيرة، الخاتم والتوقيع: ..........................
              </div>
            </div>

            {/* Institute Director */}
            <div className="border-2 border-slate-800 rounded-lg p-3 bg-orange-50/40">
              <p className="font-bold text-slate-900 mb-0.5">{INSTITUTION.directorTitle} ورئيس لجنة المداولات</p>
              <p className="text-[11px] font-extrabold text-orange-950 mb-1">{INSTITUTION.director}</p>
              <div className="h-14 flex items-end justify-center text-[11px] text-slate-400">
                الخاتم الدائري الرسمي والتوقيع
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono-code pt-3 mt-3 border-t border-slate-300">
            <span>INFPE-LAGHOUAT // PV-DELIBERATIONS // OFFICIAL-A3</span>
            <span>حرر بمقر {INSTITUTION.name} في: {formatArabicDate(new Date())}</span>
            <span>صفحة 1 من 1 • محضر قطعي نهائي غير قابل للتعديل</span>
          </div>
        </div>
      </div>
    </div>
  );
};
