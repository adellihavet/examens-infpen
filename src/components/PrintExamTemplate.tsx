import React from 'react';
import { Printer, Scale, AlertCircle } from 'lucide-react';
import type { ExamSubject } from '../db/sqlite-manager';
import { INSTITUTION } from '../constants/branding';
import { formatArabicDate } from '../utils/date-formatter';

interface PrintExamTemplateProps {
  subject: ExamSubject;
  specialtyTitle: string;
  sessionTitle: string;
  onClose?: () => void;
}

export const PrintExamTemplate: React.FC<PrintExamTemplateProps> = ({
  subject,
  specialtyTitle,
  sessionTitle,
  onClose
}) => {
  return (
    <div className="bg-slate-100 min-h-screen p-4 md:p-8 print:p-0 print:bg-white text-slate-900" dir="rtl">
      {/* Action bar (Hidden on print) */}
      <div className="max-w-4xl mx-auto mb-6 bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow-lg no-print">
        <div>
          <h2 className="text-sm font-bold font-cairo text-white">
            طباعة ورقة موضوع الامتحان الوزاري الموحد (Format A4)
          </h2>
          <p className="text-xs text-slate-400">
            {INSTITUTION.name} • {INSTITUTION.service}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الموضوع الآن</span>
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

      {/* Printable Sheet (Standard A4 Container) with Simplified Arabic Print Typography */}
      <div className="print-document max-w-[820px] mx-auto bg-white border-2 border-slate-400 rounded-xl p-8 md:p-10 shadow-2xl print:shadow-none print:border-none print:p-0 min-h-[1100px] flex flex-col justify-between">
        <div>
          {/* Official 5-Line Ministerial Header */}
          <div className="text-center border-b-2 border-slate-900 pb-3 mb-5 leading-snug">
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

          {/* Exam Identification Box */}
          <div className="border border-slate-400 rounded-lg p-3.5 bg-slate-50/70 mb-5 text-xs text-slate-800">
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              <div>
                <span className="text-slate-500 font-semibold">الدورة التكوينية:</span>{' '}
                <strong className="text-slate-950">{sessionTitle}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">الرتبة / الشعبة:</span>{' '}
                <strong className="text-emerald-900">{specialtyTitle}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 font-semibold">موضوع الاختبار في مقياس:</span>{' '}
                <strong className="text-slate-950 text-sm font-bold">{subject.title}</strong>
              </div>
              <div className="flex items-center gap-6 col-span-2 pt-2 border-t border-slate-300">
                <span>المدة: <strong className="font-mono-code text-slate-950">{subject.duration}</strong></span>
                <span>المعامل: <strong className="font-mono-code text-slate-950">{subject.coefficient}</strong></span>
                <span>تاريخ الاختبار: <strong className="font-mono-code text-slate-950">{formatArabicDate(subject.examDate)}</strong></span>
                <span className="mr-auto text-[11px] text-slate-500 font-mono-code">كود: COD-{subject.id.slice(-6)}</span>
              </div>
            </div>
          </div>

          {/* Important Instructions Box */}
          {subject.instructions && (
            <div className="border-r-4 border-amber-600 bg-amber-50/80 p-3 rounded-l-lg mb-6 text-xs text-amber-950 leading-relaxed font-medium">
              <strong className="text-amber-900 block mb-1">تعليمات وتوجيهات تنظيمية هامة للمترشح:</strong>
              {subject.instructions}
            </div>
          )}

          {/* Exam Questions & Content Body */}
          <div className="text-sm text-slate-900 leading-relaxed font-sans whitespace-pre-line text-justify space-y-4 pt-2">
            {subject.content}
          </div>

          {/* Grading Rubric (Barème) if available */}
          {subject.gradingScale && (
            <div className="mt-8 pt-4 border-t-2 border-dashed border-slate-300">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 mb-2">
                <Scale className="w-4 h-4 text-emerald-700" />
                <span>سلم التنقيط التحليلي المعتمد (Barème de Notation Officiel):</span>
              </div>
              <pre className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs font-mono-code text-slate-800 whitespace-pre-wrap leading-relaxed">
                {subject.gradingScale}
              </pre>
            </div>
          )}
        </div>

        {/* Official Footer & Signatures Block */}
        <div className="mt-10 pt-4 border-t-2 border-slate-900">
          <div className="grid grid-cols-3 gap-4 text-center text-xs text-slate-700 mb-4">
            <div>
              <p className="font-bold">أستاذ المقياس / اللجنة البيداغوجية</p>
              <div className="h-12 flex items-end justify-center text-[11px] text-slate-400">التوقيع: .....................</div>
            </div>
            <div>
              <p className="font-bold">{INSTITUTION.serviceHeadTitle}</p>
              <div className="h-12 flex items-end justify-center text-[11px] text-slate-400">التأشيرة والخاتم: .........</div>
            </div>
            <div>
              <p className="font-bold">{INSTITUTION.directorTitle}</p>
              <p className="text-[11px] font-semibold text-slate-600">{INSTITUTION.director}</p>
              <div className="h-10 flex items-end justify-center text-[11px] text-slate-400">الختم والتوقيع الرسمي</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono-code pt-2 border-t border-slate-200">
            <span>INFPE-LAGHOUAT // ORG-EXAMS // V2025</span>
            <span className="font-bold text-slate-800 print-bold text-xs">— بالتوفيق والنجاح لجميع المترشحين —</span>
            <span>صفحة 1 من 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};
