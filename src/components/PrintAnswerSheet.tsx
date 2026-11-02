import React, { useState } from 'react';
import { Printer, Scissors, ShieldAlert, CheckCircle2, User, FileText, AlertOctagon } from 'lucide-react';
import type { Candidate, ExamModule } from '../utils/crypto-anonymat';
import { INSTITUTION } from '../constants/branding';
import { formatArabicDate } from '../utils/date-formatter';

interface PrintAnswerSheetProps {
  candidate?: Candidate | null; // Optional: If null or undefined, prints a blank standardized sheet for the exam hall
  module: ExamModule;
  sessionTitle: string;
  specialtyTitle: string;
  defaultFormat?: 'A4' | 'A3';
  isBlankSheet?: boolean;
  onClose?: () => void;
}

export const PrintAnswerSheet: React.FC<PrintAnswerSheetProps> = ({
  candidate,
  module,
  sessionTitle,
  specialtyTitle,
  defaultFormat = 'A4',
  isBlankSheet: initialBlank = false,
  onClose
}) => {
  const [paperFormat, setPaperFormat] = useState<'A4' | 'A3'>(defaultFormat);
  const [isBlank, setIsBlank] = useState<boolean>(initialBlank || !candidate);

  return (
    <div className="bg-slate-100 min-h-screen p-4 md:p-8 print:p-0 print:bg-white text-slate-900" dir="rtl">
      {/* Control Toolbar (Hidden on print) */}
      <div className="max-w-4xl mx-auto mb-6 bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-lg no-print">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold font-cairo text-white flex items-center gap-2">
              <span>ورقة الإجابة الرسمية ذات اللسان القابل للقص (Feuille d'Épreuve d'Examen)</span>
            </h2>
            <span className="bg-emerald-600 text-white text-[11px] px-2 py-0.5 rounded-full font-bold">
              مطابقة للأمن البيداغوجي 100%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {INSTITUTION.name} • {INSTITUTION.service}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sheet mode toggle */}
          <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg text-xs">
            <button
              onClick={() => setIsBlank(false)}
              disabled={!candidate}
              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                !isBlank && candidate ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white disabled:opacity-40'
              }`}
            >
              اسمية للمترشح
            </button>
            <button
              onClick={() => setIsBlank(true)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                isBlank ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              نموذج فارغ للقاعة
            </button>
          </div>

          {/* Format Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg text-xs">
            <span className="text-slate-400 px-1 text-[11px]">المقاس:</span>
            <button
              onClick={() => setPaperFormat('A4')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                paperFormat === 'A4' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              A4 مفردة
            </button>
            <button
              onClick={() => setPaperFormat('A3')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                paperFormat === 'A3' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              A3 مطوية (Double)
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الورقة</span>
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

      {/* Main Examination Answer Sheet Container with Simplified Arabic Typography */}
      <div 
        className={`print-document mx-auto bg-white border-2 border-slate-900 shadow-2xl print:shadow-none print:border-none p-6 md:p-8 print:p-0 flex flex-col justify-between page-break-after ${
          paperFormat === 'A3' ? 'max-w-[1050px] min-h-[1450px]' : 'max-w-[840px] min-h-[1140px]'
        }`}
      >
        <div>
          {/* ========================================================================= */}
          {/* UPPER SECTION: DETACHABLE CANDIDATE IDENTITY STUB (اللسان العلوي القابل للقص) */}
          {/* Strictly contains explicit candidate info + empty sticker zone. NO ANONYMAT!  */}
          {/* ========================================================================= */}
          <div className="border-2 border-slate-900 rounded-xl p-4 bg-slate-50/60 relative">
            {/* Official 5-Line Ministerial Header */}
            <div className="text-center border-b-2 border-slate-900 pb-2 mb-3 leading-snug">
              <p className="text-[11px] font-bold text-slate-800 leading-tight">{INSTITUTION.republic}</p>
              <p className="text-[11px] font-bold text-slate-800 leading-tight">{INSTITUTION.ministry}</p>
              <h1 className="text-xs md:text-sm font-bold text-slate-950 mt-0.5 print-bold">
                {INSTITUTION.name}
              </h1>
              <p className="text-[11px] font-semibold text-slate-800 mt-0.5">
                {INSTITUTION.deputyDirectorate}
              </p>
              <p className="text-[11px] font-bold text-slate-900 mt-0.5 print-bold">
                {INSTITUTION.service}
              </p>
              <div className="inline-block bg-slate-900 text-white text-[11px] font-bold px-3 py-0.5 rounded-full mt-1.5 print-bold">
                لسان إثبات هوية المترشح (قسيمة قابلة للقص والفصل في مصلحة تنظيم سير المسابقات والإمتحانات)
              </div>
            </div>

            {/* Split Grid: Candidate Info on Right, Reserved Safe Sticker Box on Left */}
            <div className="grid grid-cols-12 gap-3 items-stretch">
              {/* Candidate Info (Right - 8 Cols) */}
              <div className="col-span-8 border-l-2 border-slate-300 pl-3 space-y-1.5 text-xs text-slate-900">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold block text-[11px]">الدورة التكوينية:</span>
                    <strong className="text-slate-950 font-bold">{sessionTitle}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block text-[11px]">الرتبة التكوينية:</span>
                    <strong className="text-slate-950 font-bold">{specialtyTitle}</strong>
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-semibold text-[11px]">مقياس الاختبار:</span>
                    <strong className="text-slate-950 text-sm font-bold">{module.titleAr}</strong>
                    <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-mono-code font-bold">
                      {module.code}
                    </span>
                  </div>
                </div>

                {/* Candidate details: prefilled or blank lines */}
                <div className="pt-2 border-t-2 border-slate-300 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-600 block font-bold">اللقب والاسم الكامل:</span>
                    {!isBlank && candidate ? (
                      <span className="text-sm font-black text-slate-950 block">{candidate.fullName}</span>
                    ) : (
                      <span className="border-b border-dotted border-slate-500 block h-6 pt-1 text-slate-400">
                        ......................................................................
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-600 block font-bold">رقم التسجيل الرسمي:</span>
                    {!isBlank && candidate ? (
                      <span className="font-mono-code text-sm font-extrabold text-slate-950 block">
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
                      <span className="font-bold text-slate-900 block">
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
                  <span>توقيع المترشح(ة): ............................................</span>
                  <span>تأشيرة الحارس: ............................................</span>
                </div>
              </div>

              {/* Reserved Box for Exam Center Anonymat Sticker A (Left - 4 Cols) */}
              <div className="col-span-4 bg-white border-2 border-dashed border-red-400 rounded-lg p-2.5 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 bg-red-600 text-white text-[9px] font-black py-0.5 tracking-wider uppercase">
                  {INSTITUTION.service}
                </div>

                <div className="mt-3.5 space-y-1">
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded block">
                    يُمنع الكتابة هنا منعاً باتاً
                  </span>

                  <div className="w-full h-16 border-2 border-slate-300 border-dashed rounded bg-slate-50 flex flex-col items-center justify-center p-1 text-slate-400">
                    <span className="text-[10px] font-bold text-slate-700">
                      مكان إلصاق قسيمة التشفير (أ)
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono-code">
                      (Sticker A: باركود الإغفال)
                    </span>
                    <span className="text-[8px] text-slate-400 mt-0.5">
                      يُلصق بعد جمع الأوراق وقبل القص
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PERFORATED SCISSORS CUT LINE (خط القص الإلزامي)                           */}
          {/* ========================================================================= */}
          <div className="my-4 flex items-center justify-between text-xs text-slate-700 font-mono-code select-none">
            <div className="flex-1 border-b-2 border-dashed border-slate-800"></div>
            <div className="px-3 flex items-center gap-2 bg-slate-900 text-white font-bold text-[11px] py-1 rounded-full shadow-sm">
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span>خط القص الإلزامي — يُفصل هذا اللسان حصراً داخل {INSTITUTION.service} بعد وضع لواصق الإغفال</span>
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex-1 border-b-2 border-dashed border-slate-800"></div>
          </div>

          {/* ========================================================================= */}
          {/* LOWER SECTION: STRICTLY ANONYMOUS EXAM ANSWER SHEET FOR CORRECTORS        */}
          {/* Strictly contains NO candidate names or registration numbers!              */}
          {/* ========================================================================= */}
          <div className="border-2 border-slate-900 rounded-xl p-5 bg-white flex flex-col">
            {/* Header Strip & Reserved Box B */}
            <div className="flex flex-col sm:flex-row items-stretch justify-between gap-4 border-b-2 border-slate-900 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-slate-900 text-white font-bold px-2 py-0.5 rounded">
                    ورقة الامتحان الرسمية
                  </span>
                  <span className="text-xs text-slate-600 font-bold">
                    {INSTITUTION.name}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-950">
                  ورقة إجابة الاختبار (Feuille d'Épreuve d'Examen)
                </h2>
                <div className="text-xs text-slate-800 flex flex-wrap items-center gap-3 pt-0.5">
                  <span>المقياس: <strong className="text-slate-950 font-bold">{module.titleAr}</strong></span>
                  <span>•</span>
                  <span>المعامل: <strong>{module.coefficient}</strong></span>
                  <span>•</span>
                  <span>المدة: <strong>{module.durationMinutes / 60} ساعات</strong></span>
                  <span>•</span>
                  <span className="text-red-700">العلامة الإقصائية: أقل من <strong>05.00/20</strong></span>
                </div>
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

            {/* Strict Warning Banner for Candidate */}
            <div className="my-3 p-2 bg-amber-50 border border-amber-300 rounded-lg flex items-center gap-2 text-amber-950 text-[11px] leading-relaxed">
              <AlertOctagon className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>تنبيه صارم للمترشح:</strong> يُمنع منعاً باتاً كتابة الاسم أو اللقب أو رقم التسجيل أو وضع أي إشارة أو علامة فارقة على هذه الورقة، وكل مخالفة تُعرّض صاحبها للإقصاء التام وإلغاء الامتحان طبقاً للتنظيم التربوي.
              </span>
            </div>

            {/* Official Single Correction & Evaluation Box */}
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

            {/* Answer Sheet Ruled Writing Grid */}
            <div className="flex-1 border-t-2 border-slate-900 pt-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span>الإجابة (Réponse de l'épreuve):</span>
                <span className="text-[10px] font-normal text-slate-500 font-mono-code">الصفحة 01 / 0{paperFormat === 'A3' ? '4' : '2'}</span>
              </div>

              {/* Lined notebook simulation for writing answers */}
              <div className="space-y-6 pt-2">
                {Array.from({ length: paperFormat === 'A3' ? 24 : 16 }).map((_, i) => (
                  <div key={i} className="border-b border-slate-300 w-full h-2"></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-300 mt-6 flex items-center justify-between text-[10px] text-slate-500 font-mono-code">
          <span>{INSTITUTION.name} • ورقة اختبار معيارية مطابقة لبروتوكول ONEC</span>
          <span>يُمنع إتلاف هذا المطبوع أو نزع أي جزء منه من طرف المترشح</span>
        </div>
      </div>
    </div>
  );
};
