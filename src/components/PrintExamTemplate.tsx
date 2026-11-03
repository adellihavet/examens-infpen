import React from 'react';
import { Printer, Scale, AlertCircle } from 'lucide-react';
import type { ExamSubject } from '../db/sqlite-manager';
import { INSTITUTION } from '../constants/branding';
import { formatArabicDate, formatAcademicYear } from '../utils/date-formatter';

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

      {/* Printable Sheet (Standard A4 Container) with Official Algerian Exam Layout */}
      <div className="print-document max-w-[820px] mx-auto bg-white border-2 border-black official-exam-outer-frame rounded-none p-6 md:p-8 shadow-2xl print:shadow-none min-h-[1050px] flex flex-col justify-between font-simplified-arabic text-black">
        <div className="flex flex-col flex-1">
          {/* 1. Official Header (Exact replica of PDF: Centered Republic & Ministry, Right-aligned Direction & Institute) */}
          <div className="mb-2">
            <div className="text-center font-bold text-xs md:text-sm leading-snug">
              <p className="font-bold">{INSTITUTION.republic}</p>
              <p className="font-bold mt-0.5">{INSTITUTION.ministry}</p>
            </div>
            <div className="text-right font-bold text-xs leading-tight mt-1 space-y-0.5 text-black">
              <p>مديرية التكوين</p>
              <p>المعهد الوطني لتكوين موظفي قطاع التربية الوطنية</p>
              <p>&quot; الشيخ زاهية حسين &quot; الأغواط</p>
            </div>
          </div>

          {/* 2. Official Exam Identification Table (Exact replica of PDF) */}
          <table className="w-full border-2 border-black border-collapse text-xs mb-2">
            <tbody>
              {/* Row 1: Session Exam Header (Right) & Academic Year (Left) */}
              <tr className="border-b-2 border-black">
                <td className="border-l-2 border-black p-2 font-black text-center text-sm md:text-base w-2/3">
                  إمتحــــــــــــــــــان نهاية التكوين المتخصص
                </td>
                <td className="p-2 font-bold text-center w-1/3 text-xs md:text-sm">
                  السنة التكوينية : <span className="font-mono">{formatAcademicYear(sessionTitle)}</span>
                </td>
              </tr>

              {/* Row 2: Rank (الرتبة) spanning full width */}
              <tr className="border-b-2 border-black">
                <td colSpan={2} className="p-2 font-bold text-right text-xs md:text-sm">
                  <span>الرتبة : </span>
                  <span className="font-black mr-2">{specialtyTitle}</span>
                </td>
              </tr>

              {/* Row 3: Module on Right, Date & Time stacked on Left */}
              <tr>
                {/* Right Column: Module */}
                <td className="border-l-2 border-black p-2.5 align-middle text-right">
                  <div className="font-bold flex items-baseline gap-2">
                    <span className="shrink-0 text-xs">المقياس :</span>
                    <span className="font-black text-sm">{subject.title}</span>
                  </div>
                </td>

                {/* Left Column: Stacked Date & Duration */}
                <td className="p-0 align-top">
                  <div className="border-b border-black p-1.5 font-bold text-right flex items-center justify-between text-xs">
                    <span>التاريخ:</span>
                    <span className="font-mono">{formatArabicDate(subject.examDate)}</span>
                  </div>
                  <div className="p-1.5 font-bold text-right flex items-center justify-between text-xs">
                    <span>التوقيت :</span>
                    <span className="font-mono">{subject.duration}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 3. Main Exam Subject Framing Box (Exact replica of PDF) */}
          <div className="border-2 border-black flex-1 p-4 my-1 min-h-[440px] text-justify text-xs md:text-sm leading-relaxed overflow-hidden bg-white flex flex-col justify-between">
            <div>
              {/* Important Instructions if any */}
              {subject.instructions && (
                <div className="border-r-4 border-black bg-slate-100 p-2 rounded-l mb-3 text-xs text-black leading-relaxed font-bold">
                  <span className="block mb-0.5 text-black">توجيهات وتعليمات هامة للمترشح:</span>
                  <p className="font-normal text-slate-800 text-[11px]">{subject.instructions}</p>
                </div>
              )}

              {/* Exam Content */}
              <div 
                className="text-sm text-black leading-relaxed whitespace-pre-line text-justify space-y-4"
                dangerouslySetInnerHTML={{ __html: subject.content }}
              />

              {/* Grading Rubric if included */}
              {subject.gradingScale && (
                <div className="mt-8 pt-4 border-t-2 border-dashed border-slate-400">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 mb-2">
                    <Scale className="w-4 h-4 text-emerald-700" />
                    <span>سلم التنقيط التحليلي المعتمد (Barème de Notation Officiel):</span>
                  </div>
                  <pre className="bg-slate-50 p-4 rounded-lg border border-slate-300 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {subject.gradingScale}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Official Bottom Table Footer (Exact replica of PDF: Professor, Page 1/1, Best of luck) */}
        <table className="w-full border-2 border-black border-collapse text-xs mt-2">
          <tbody>
            <tr>
              <td className="border-l-2 border-black p-2 font-bold text-right w-1/2">
                <span>أستاذ(ة) المقياس : </span>
                <span className="font-mono text-xs">...................................................</span>
              </td>
              <td className="border-l-2 border-black p-2 font-bold font-mono text-center w-1/5">
                ص 1/1
              </td>
              <td className="p-2 font-black text-center w-[30%] text-sm">
                بالتــــــــــــــــــــــــــــــوفيق
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
