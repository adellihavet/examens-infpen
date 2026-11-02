import React, { useState } from 'react';
import { Printer, ShieldAlert, Lock, FileText, CheckCircle2, KeyRound } from 'lucide-react';
import type { Candidate, ExamModule, AnonymatMapping } from '../utils/crypto-anonymat';
import { INSTITUTION } from '../constants/branding';
import { formatArabicDate } from '../utils/date-formatter';
import { triggerPrintWithDynamicTitle } from '../utils/print-utils';

interface PrintConcordanceReportProps {
  module: ExamModule;
  sessionTitle: string;
  specialtyTitle: string;
  mappings: AnonymatMapping[];
  candidates: Candidate[];
  onClose?: () => void;
}

export const PrintConcordanceReport: React.FC<PrintConcordanceReportProps> = ({
  module,
  sessionTitle,
  specialtyTitle,
  mappings,
  candidates,
  onClose
}) => {
  const [filterGroup, setFilterGroup] = useState<string>('all');

  const rows = mappings.map((mapping, idx) => {
    const candidate = candidates.find(c => c.id === mapping.candidateId);
    return {
      index: idx + 1,
      mapping,
      candidate
    };
  }).filter(r => {
    if (filterGroup === 'all') return true;
    return r.candidate?.groupNumber === filterGroup;
  });

  const groups = Array.from(new Set(candidates.map(c => c.groupNumber).filter(Boolean)));

  return (
    <div className="bg-slate-100 min-h-screen p-4 md:p-8 print:p-0 print:bg-white text-slate-900" dir="rtl">
      {/* Top Controller Toolbar (Hidden on Print) */}
      <div className="max-w-6xl mx-auto mb-6 bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-lg no-print">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <h2 className="text-sm font-bold font-cairo text-white">
              جدول ومحضر المطابقة والتشفير السري (Bordereau de Concordance d'Anonymat)
            </h2>
            <span className="bg-red-600 text-white text-[10px] px-2.5 py-0.5 rounded font-black tracking-wider uppercase">
              سري للغاية ومحمي
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {INSTITUTION.name} • {INSTITUTION.service}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {groups.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-lg text-xs">
              <span className="text-slate-400">الفوج:</span>
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="bg-slate-900 text-white text-xs rounded border border-slate-700 px-2 py-1 focus:outline-none"
              >
                <option value="all">كل الأفواج ({mappings.length})</option>
                {groups.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => {
              const docTitle = `محضر_المطابقة_السري_مقياس_${module.titleAr.replace(/\s+/g, '_')}_${formatArabicDate(new Date())}`;
              triggerPrintWithDynamicTitle(docTitle);
            }}
            className="flex items-center gap-1.5 bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة المحضر السري</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              إغلاق
            </button>
          )}
        </div>
      </div>

      {/* Main Printable Document Container with Simplified Arabic Typography */}
      <div className="print-document max-w-6xl mx-auto bg-white p-8 rounded-xl shadow-xl print:shadow-none print:p-0 border border-slate-300 print:border-none">
        {/* Official 5-Line Ministerial Header with Black Logo */}
        <div className="border-b-2 border-slate-900 pb-3 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-right flex-1 leading-snug">
              <p className="text-xs font-bold text-slate-800">{INSTITUTION.republic}</p>
              <p className="text-xs font-bold text-slate-800">{INSTITUTION.ministry}</p>
              <h1 className="text-sm md:text-base font-bold text-slate-950 mt-0.5 print-bold">
                {INSTITUTION.name}
              </h1>
              <p className="text-xs font-semibold text-slate-800 mt-0.5">
                {INSTITUTION.deputyDirectorate}
              </p>
              <p className="text-xs font-bold text-slate-900 mt-0.5 print-bold">
                {INSTITUTION.service}
              </p>
            </div>
            <div className="shrink-0 pl-3">
              <img 
                src={INSTITUTION.logoBlack} 
                alt="شعار المعهد" 
                className="h-16 w-auto object-contain filter contrast-125"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50 border-2 border-slate-900 p-3 rounded-lg">
            <div>
              <div className="text-base font-black text-red-900">
                محضر المطابقة وجدول التشفير السري (Bordereau de Concordance)
              </div>
              <div className="text-xs text-slate-700 mt-0.5">
                الدورة: <strong className="text-slate-950">{sessionTitle}</strong> • الرتبة: <strong className="text-slate-950">{specialtyTitle}</strong>
              </div>
            </div>

            <div className="text-left font-mono-code text-xs space-y-0.5">
              <div>المقياس: <strong className="text-slate-950">{module.titleAr} ({module.code})</strong></div>
              <div>تاريخ التشفير: <strong>{formatArabicDate(new Date())}</strong></div>
              <div className="text-red-700 font-bold">حالة الخزينة: مقفلة بالشمع والأمانات</div>
            </div>
          </div>
        </div>

        {/* Security Warning Notice */}
        <div className="mb-4 p-2.5 bg-red-50 border border-red-300 rounded text-[11px] text-red-950 font-bold flex items-center gap-2">
          <Lock className="w-4 h-4 text-red-700 shrink-0" />
          <span>
            وثيقة سرية ذات طابع أمني خاص: يُحظر إخراج هذا السجل من خزينة رئيس المركز إلا بلحظة انعقاد جلسة المداولات الرسمية لرفع الإغفال بحضور كامل أعضاء اللجنة.
          </span>
        </div>

        {/* Concordance Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-2 border-slate-900 text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-950 border-b-2 border-slate-900 font-bold text-center">
                <th className="border border-slate-800 py-2 px-2 w-10">#</th>
                <th className="border border-slate-800 py-2 px-3 text-right">رقم التسجيل الرسمي</th>
                <th className="border border-slate-800 py-2 px-4 text-right">اللقب والاسم الكامل للمترشح</th>
                <th className="border border-slate-800 py-2 px-3 text-right">تاريخ ومكان الميلاد</th>
                <th className="border border-slate-800 py-2 px-3 text-center">الفوج والقاعة</th>
                <th className="border-2 border-slate-900 py-2 px-3 text-center bg-amber-100 text-slate-950">
                  رقم الإغفال السري (Anonymat)
                </th>
                <th className="border border-slate-800 py-2 px-3 text-center font-mono-code">كود الباركود</th>
                <th className="border border-slate-800 py-2 px-2 text-center w-16">SIG</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.mapping.anonymatCode} className="hover:bg-slate-50 transition border-b border-slate-300">
                  <td className="border border-slate-300 py-1.5 px-2 text-center font-mono-code text-slate-500 text-[11px]">
                    {row.index}
                  </td>
                  <td className="border border-slate-300 py-1.5 px-3 font-mono-code font-bold text-slate-900 text-xs">
                    {row.candidate?.registrationNumber || '-'}
                  </td>
                  <td className="border border-slate-300 py-1.5 px-4 font-black text-slate-950 text-sm">
                    {row.candidate?.fullName || '-'}
                  </td>
                  <td className="border border-slate-300 py-1.5 px-3 text-slate-700 text-[11px] font-mono">
                    {formatArabicDate(row.candidate?.birthDate)} ({row.candidate?.birthPlace})
                  </td>
                  <td className="border border-slate-300 py-1.5 px-3 text-center font-bold text-slate-800 text-[11px]">
                    {row.candidate?.groupNumber} • {row.candidate?.roomNumber}
                  </td>
                  <td className="border-2 border-slate-900 py-1.5 px-3 text-center bg-amber-50/80 font-mono-code font-black text-sm text-slate-950 tracking-wider">
                    {row.mapping.anonymatCode}
                  </td>
                  <td className="border border-slate-300 py-1.5 px-3 text-center font-mono-code text-slate-600 text-[11px]">
                    {row.mapping.barcodePayload}
                  </td>
                  <td className="border border-slate-300 py-1.5 px-2 text-center font-mono-code text-[10px] text-slate-700">
                    {row.mapping.checksum}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Committee Signatures & Official Stamping Box */}
        <div className="mt-8 pt-4 border-t-2 border-slate-900 page-break-inside-avoid">
          <div className="text-xs font-bold text-slate-900 mb-3">
            تمت عملية التشفير وإعداد جدول المطابقة طبقا للتنظيم المعمول به، وتودع هذه القائمة في الخزينة المحصنة.
          </div>

          <div className="grid grid-cols-3 gap-6 text-center text-xs">
            <div className="border border-slate-400 rounded-lg p-4 h-28 flex flex-col justify-between">
              <span className="font-bold text-slate-900">عضو أمانة التشفير</span>
              <span className="text-[10px] text-slate-400">التوقيع والتاريخ: .....................</span>
            </div>

            <div className="border border-slate-400 rounded-lg p-4 h-28 flex flex-col justify-between">
              <span className="font-bold text-slate-900">{INSTITUTION.serviceHeadTitle}</span>
              <span className="text-[10px] text-slate-500">{INSTITUTION.deputyDirectorate}</span>
              <span className="text-[10px] text-slate-400">التوقيع والخاتم: .....................</span>
            </div>

            <div className="border-2 border-slate-900 rounded-lg p-4 h-28 flex flex-col justify-between bg-slate-50">
              <span className="font-bold text-slate-950">{INSTITUTION.directorTitle}</span>
              <span className="text-[10px] font-bold text-slate-700">{INSTITUTION.director}</span>
              <span className="text-[10px] text-slate-400">الختم والتوقيع الرسمي</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-[10px] text-slate-500 font-mono-code">
            <span>{INSTITUTION.name} • {INSTITUTION.service}</span>
            <span>صفحة 01 من 01 • مشفر ومحمي في الخزينة الفولاذية</span>
          </div>
        </div>
      </div>
    </div>
  );
};
