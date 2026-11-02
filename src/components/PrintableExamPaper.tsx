import React from 'react';
import { Scissors, AlertOctagon } from 'lucide-react';
import type { Candidate, ExamModule, AnonymatMapping } from '../utils/crypto-anonymat';
import { INSTITUTION } from '../constants/branding';
import { formatArabicDate } from '../utils/date-formatter';

interface PrintableExamPaperProps {
  candidate?: Candidate | null;
  module: ExamModule;
  mapping?: AnonymatMapping | null;
  sessionName: string;
  specialtyTitle: string;
  paperFormat?: 'A4' | 'A3';
  isBlankSheet?: boolean;
}

export const PrintableExamPaper: React.FC<PrintableExamPaperProps> = ({
  candidate,
  module,
  sessionName,
  specialtyTitle,
  paperFormat = 'A4',
  isBlankSheet = false
}) => {
  const isBlank = isBlankSheet || !candidate;

  return (
    <div 
      className={`print-document bg-white text-slate-900 border-2 border-slate-900 shadow-md p-6 mx-auto my-4 print:my-0 print:border-none print:shadow-none print:p-0 page-break-after ${
        paperFormat === 'A3' ? 'max-w-[1000px] min-h-[1400px]' : 'max-w-[820px] min-h-[1120px]'
      }`}
      style={{ direction: 'rtl' }}
    >
      {/* ============================================================== */}
      {/* DETACHABLE TOP FLAP (اللسان العلوي القابل للقص - Souche Détachable) */}
      {/* Strictly contains explicit candidate info + empty sticker zone. NO ANONYMAT! */}
      {/* ============================================================== */}
      <div className="border-2 border-slate-900 rounded-lg p-4 bg-slate-50/60 relative">
        {/* Strip title - Official 5-Line Ministerial Hierarchy */}
        <div className="text-center border-b-2 border-slate-900 pb-2 mb-3 leading-snug">
          <p className="text-[11px] font-bold tracking-wide text-slate-800">{INSTITUTION.republic}</p>
          <p className="text-[11px] font-bold tracking-wide text-slate-800">{INSTITUTION.ministry}</p>
          <h2 className="text-xs md:text-sm font-bold text-slate-950 mt-0.5 print-bold">
            {INSTITUTION.name}
          </h2>
          <p className="text-[11px] font-semibold text-slate-800 mt-0.5">
            {INSTITUTION.deputyDirectorate}
          </p>
          <p className="text-[11px] font-bold text-slate-900 mt-0.5 print-bold">
            {INSTITUTION.service}
          </p>
          <div className="inline-block bg-slate-900 text-white text-[11px] font-bold px-3 py-0.5 rounded-full mt-1.5 print-bold">
            لسان إثبات هوية المترشح (قسيمة قابلة للقص والفصل في {INSTITUTION.service})
          </div>
        </div>

        {/* Content grid: Candidate Info on Right, Reserved Safe Box on Left */}
        <div className="grid grid-cols-12 gap-3 items-stretch">
          {/* Candidate Explicit Details (Right - 8 cols) */}
          <div className="col-span-8 text-xs space-y-1.5 border-l-2 border-slate-300 pl-3 text-slate-900">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-bold text-slate-500 text-[11px] block">الدورة التكوينية:</span>
                <span className="font-bold text-slate-950">{sessionName}</span>
              </div>
              <div>
                <span className="font-bold text-slate-500 text-[11px] block">الرتبة التكوينية:</span>
                <span className="font-bold text-slate-950">{specialtyTitle}</span>
              </div>
            </div>

            <div className="pt-1 border-t border-slate-200">
              <span className="font-bold text-slate-500 text-[11px] ml-1">مقياس الاختبار:</span>
              <span className="font-bold text-slate-950 text-sm">{module.titleAr}</span>
              <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-mono-code font-bold mr-2">
                كود: {module.code}
              </span>
            </div>

            <div className="pt-2 border-t-2 border-slate-300 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <div>
                <span className="text-[11px] text-slate-600 block font-bold">اللقب والاسم الكامل:</span>
                {!isBlank && candidate ? (
                  <span className="font-black text-sm text-slate-950 block">{candidate.fullName}</span>
                ) : (
                  <span className="border-b border-dotted border-slate-500 block h-6 pt-1 text-slate-400">
                    ......................................................................
                  </span>
                )}
              </div>

              <div>
                <span className="text-[11px] text-slate-600 block font-bold">رقم التسجيل الرسمي:</span>
                {!isBlank && candidate ? (
                  <span className="font-mono-code font-extrabold text-sm text-slate-950 block">
                    {candidate.registrationNumber}
                  </span>
                ) : (
                  <span className="border-b border-dotted border-slate-500 block h-6 pt-1 text-slate-400">
                    ......................................................................
                  </span>
                )}
              </div>

              <div>
                <span className="text-[11px] text-slate-600 block font-bold">تاريخ ومكان الميلاد:</span>
                {!isBlank && candidate ? (
                  <span className="font-semibold text-slate-900 block font-mono">
                    {formatArabicDate(candidate.birthDate)} ({candidate.birthPlace})
                  </span>
                ) : (
                  <span className="border-b border-dotted border-slate-500 block h-6 pt-1 text-slate-400">
                    ......................................................................
                  </span>
                )}
              </div>

              <div>
                <span className="text-[11px] text-slate-600 block font-bold">الفوج وقاعة الإجراء:</span>
                {!isBlank && candidate ? (
                  <span className="font-semibold text-slate-900 block">
                    {candidate.groupNumber} • {candidate.roomNumber}
                  </span>
                ) : (
                  <span className="border-b border-dotted border-slate-500 block h-6 pt-1 text-slate-400">
                    ......................................................................
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-600">
              <span>توقيع المترشح: ............................................</span>
              <span>تأشيرة الحارس: ............................................</span>
            </div>
          </div>

          {/* Reserved Safe Box for Exam Center Sticker A (Left - 4 cols) */}
          <div className="col-span-4 bg-white border-2 border-dashed border-red-400 rounded-lg p-2 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 bg-red-600 text-white text-[9px] font-black py-0.5 uppercase tracking-wider">
              {INSTITUTION.service}
            </div>

            <div className="mt-3.5 space-y-1">
              <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded block">
                يُمنع الكتابة هنا نهائياً
              </span>

              <div className="w-full h-16 border-2 border-slate-300 border-dashed rounded bg-slate-50 flex flex-col items-center justify-center p-1 text-slate-500">
                <span className="text-[10px] font-bold text-slate-800">
                  مكان إلصاق قسيمة التشفير (أ)
                </span>
                <span className="text-[9px] text-slate-500 font-mono-code">
                  (Sticker A: كود الإغفال والباركود)
                </span>
                <span className="text-[8px] text-slate-400 mt-0.5">
                  يُلصق بالمصلحة قبل القص
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SCISSORS CUT LINE (خط القص ونزع لسان الهوية)                    */}
      {/* ============================================================== */}
      <div className="my-4 flex items-center justify-between text-xs text-slate-700 font-mono-code select-none">
        <div className="flex-1 border-b-2 border-dashed border-slate-800"></div>
        <div className="px-3 flex items-center gap-2 bg-slate-900 text-white font-bold text-[11px] py-1 rounded-full shadow-sm">
          <Scissors className="w-3.5 h-3.5 text-amber-400" />
          <span>خط القص الإلزامي — يُفصل هذا اللسان حصراً داخل {INSTITUTION.service} بعد إلصاق قسيمتي التشفير</span>
          <Scissors className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="flex-1 border-b-2 border-dashed border-slate-800"></div>
      </div>

      {/* ============================================================== */}
      {/* ANONYMOUS EXAM ANSWER SHEET BODY FOR CORRECTORS                */}
      {/* Strictly contains NO candidate names or registration numbers!   */}
      {/* ============================================================== */}
      <div className="border-2 border-slate-900 rounded-xl p-5 bg-white flex flex-col">
        {/* Upper strip & Reserved Box B */}
        <div className="flex flex-col sm:flex-row items-stretch justify-between gap-4 border-b-2 border-slate-900 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-slate-900 text-white font-bold px-2 py-0.5 rounded">
                مركز التصحيح والتنقيط الرسمي
              </span>
              <span className="text-xs text-slate-600 font-bold">
                {INSTITUTION.name}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-950">
              ورقة إجابة رسمية مشفرة (Feuille d'Épreuve Anonyme)
            </h3>
            <p className="text-xs text-slate-800 pt-0.5">
              المقياس: <strong className="text-slate-950 font-bold">{module.titleAr}</strong> • المعامل: <strong>{module.coefficient}</strong> • المدة: <strong>{module.durationMinutes / 60} ساعات</strong>
            </p>
          </div>

          {/* Reserved Box for Exam Center Anonymat Sticker B */}
          <div className="bg-slate-50 border-2 border-dashed border-red-400 rounded-lg p-2 min-w-[210px] flex flex-col items-center justify-center text-center">
            <div className="bg-red-600 text-white text-[9px] font-black py-0.5 px-2 rounded-full uppercase tracking-wider mb-1">
              {INSTITUTION.service}
            </div>
            <div className="w-full h-14 border border-dashed border-slate-400 rounded bg-white flex flex-col items-center justify-center p-1 text-slate-500">
              <span className="text-[10px] font-bold text-slate-800">
                مكان إلصاق قسيمة التشفير (ب)
              </span>
              <span className="text-[9px] text-slate-500 font-mono-code">
                (Sticker B: كود الإغفال والباركود)
              </span>
              <span className="text-[8px] text-slate-400">
                يُمنع المترشح من الكتابة هنا
              </span>
            </div>
          </div>
        </div>

        {/* Candidate Warning Banner */}
        <div className="my-3 p-2 bg-amber-50 border border-amber-300 rounded-lg flex items-center gap-2 text-amber-950 text-[11px] leading-relaxed">
          <AlertOctagon className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>تنبيه صارم للمترشح:</strong> يُمنع كتابة الاسم أو اللقب أو رقم التسجيل أو وضع أي إشارة فارقة على هذه الورقة، وكل مخالفة تُعرّض صاحبها للإقصاء الفوري.
          </span>
        </div>

        {/* Single Correction & Evaluation Box */}
        <div className="mb-4 border-2 border-slate-900 rounded-lg p-3 bg-slate-50/50">
          <div className="grid grid-cols-12 gap-3 items-center">
            <div className="col-span-6 border-l-2 border-slate-900 pl-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-slate-800">نقطة الامتحان المعتمدة:</span>
                <span className="text-base font-black font-mono text-slate-950 bg-white border border-slate-400 px-4 py-0.5 rounded shadow-inner">
                  ....... / 20
                </span>
              </div>
              <div className="text-[10px] text-slate-600 mt-1.5">
                بالحروف: ............................................................................................
              </div>
            </div>

            <div className="col-span-6 pr-2">
              <div className="text-[11px] font-bold text-slate-900 mb-1">
                اسم ولقب وتوقيع الأستاذ المصحح:
              </div>
              <div className="text-[10px] text-slate-500 border-b border-dotted border-slate-500 h-6 pt-1">
                ................................................................................................................
              </div>
            </div>
          </div>
        </div>

        {/* Ruled lines for answer writing */}
        <div className="flex-1 border-t-2 border-slate-900 pt-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
            <span>الإجابة (Réponse de l'épreuve):</span>
            <span className="text-[10px] font-normal text-slate-500 font-mono-code">الصفحة 01</span>
          </div>

          <div className="space-y-6 pt-2">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="border-b border-slate-300 w-full h-2"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-300 mt-4 flex items-center justify-between text-[10px] text-slate-500 font-mono-code">
        <span>{INSTITUTION.name} • {INSTITUTION.service}</span>
        <span>وثيقة رسمية مؤمنة</span>
      </div>
    </div>
  );
};
