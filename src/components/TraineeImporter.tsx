import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Users, 
  Building2, 
  MapPin, 
  Calendar,
  Sparkles,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import type { Candidate } from '../utils/crypto-anonymat';
import { 
  generateCandidateTemplateExcel, 
  parseCandidatesExcel, 
  type ParseCandidateResult 
} from '../utils/excel-handler';
import { formatArabicDate, formatAcademicYear } from '../utils/date-formatter';

interface TraineeImporterProps {
  specialtyId: string;
  specialtyTitle: string;
  promotionYear: string;
  existingCandidates: Candidate[];
  onCommitCandidates: (newCandidates: Candidate[]) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const TraineeImporter: React.FC<TraineeImporterProps> = ({
  specialtyId,
  specialtyTitle,
  promotionYear,
  existingCandidates,
  onCommitCandidates,
  isOpen = false,
  onClose
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parseResult, setParseResult] = useState<ParseCandidateResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Download official blank template
  const handleDownloadTemplate = () => {
    const buffer = generateCandidateTemplateExcel(specialtyTitle, specialtyId);
    const blob = new Blob([buffer.buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `استمارة_استيراد_متكوني_${specialtyTitle.replace(/\s+/g, '_')}_2025.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Upload and parse Excel
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result as ArrayBuffer;
        const res = parseCandidatesExcel(data, specialtyId, promotionYear, existingCandidates);
        setParseResult(res);
      } catch (err) {
        console.error('Error parsing Excel', err);
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset file input value to allow re-upload of same file name
    e.target.value = '';
  };

  // Commit candidates
  const handleCommit = () => {
    if (!parseResult) return;

    let toAdd = parseResult.candidates;
    if (skipDuplicates && parseResult.duplicates.length > 0) {
      const dupRegs = new Set(parseResult.duplicates.map(d => d.registrationNumber.toLowerCase()));
      toAdd = toAdd.filter(c => !dupRegs.has(c.registrationNumber.toLowerCase()));
    }

    if (toAdd.length > 0) {
      onCommitCandidates(toAdd);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setParseResult(null);
        if (onClose) onClose();
      }, 1500);
    }
  };

  if (!isOpen) return null;

  const validCount = parseResult 
    ? (skipDuplicates 
        ? parseResult.candidates.length - parseResult.duplicates.length 
        : parseResult.candidates.length)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black">استيراد قائمة المتكونين (Excel Onboarding)</h2>
              <p className="text-xs text-slate-300 mt-1">
                الرتبة المعتمدة: <strong className="text-emerald-300 font-bold">{specialtyTitle}</strong> — الدفعة: {promotionYear}
              </p>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Action Bar: Download template & Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1: Template download */}
            <div className="border border-indigo-100 bg-indigo-50/60 rounded-xl p-4 flex flex-col justify-between hover:border-indigo-300 transition-all">
              <div>
                <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm mb-1">
                  <Download className="w-4 h-4 text-indigo-600" />
                  <span>1. تحميل النموذج الرسمي المهيأ</span>
                </div>
                <p className="text-xs text-indigo-800 leading-relaxed mb-4">
                  ملف Excel مهيأ بالأعمدة التسعة الثابتة: [السلك، الرتبة، التخصص، إسم ولقب المتكون، تاريخ الميلاد، بلدية الميلاد، ولاية الميلاد، ولاية المترشح، الجنس].
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full flex items-center justify-center gap-2 bg-white text-indigo-700 hover:bg-indigo-600 hover:text-white text-xs font-bold py-2.5 px-4 rounded-lg border border-indigo-200 shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                تحميل نموذج Excel فارغ مهيأ (.xlsx)
              </button>
            </div>

            {/* Step 2: Upload Excel file */}
            <div className="border border-emerald-100 bg-emerald-50/60 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-300 transition-all">
              <div>
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm mb-1">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>2. استيراد الملف المعبأ</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed mb-4">
                  قم باختيار ملف إكسيل (.xlsx / .xls) المستخرج من مصالح التكوين ليتم فحصه ومعاينته فورياً.
                </p>
              </div>
              <div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  {fileName ? `تغيير الملف (${fileName})` : 'اختيار ملف المتكونين (.xlsx / .xls)'}
                </button>
              </div>
            </div>
          </div>

          {/* Feedback: Success state */}
          {isSuccess && (
            <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-bold text-sm">تم تثبيت الفوج بنجاح!</h4>
                <p className="text-xs text-emerald-800">تم تسجيل المتكونين في قاعدة البيانات المحلية (SQLite) وتحديث السجلات الرسمية.</p>
              </div>
            </div>
          )}

          {/* Preview Section if file parsed */}
          {parseResult && !isSuccess && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <Users className="w-4 h-4 text-indigo-600" />
                    الإجمالي المستخرج: <strong>{parseResult.totalParsed}</strong>
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    المؤهل للتثبيت: <strong>{validCount}</strong>
                  </span>
                  {parseResult.duplicates.length > 0 && (
                    <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      تكرار أرقام التسجيل: <strong>{parseResult.duplicates.length}</strong>
                    </span>
                  )}
                  {parseResult.errors.length > 0 && (
                    <span className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      أخطاء تنسيق: <strong>{parseResult.errors.length}</strong>
                    </span>
                  )}
                </div>

                {parseResult.duplicates.length > 0 && (
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={skipDuplicates} 
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>استبعاد المكرر تلقائياً لتفادي التعارض</span>
                  </label>
                )}
              </div>

              {/* Duplicate warnings list if any */}
              {parseResult.duplicates.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    تنبيه أرقام التسجيل المكررة:
                  </div>
                  <div className="max-h-24 overflow-y-auto pr-2 space-y-1 text-slate-700">
                    {parseResult.duplicates.map((d, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span>السطر {d.row}: <strong>{d.fullName}</strong></span>
                        <span className="font-mono text-amber-800 bg-amber-100/60 px-1.5 py-0.5 rounded">رقم التسجيل: {d.registrationNumber}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Candidates Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 border-b border-slate-200 flex items-center justify-between">
                  <span>معاينة بيانات المتكونين الجدد (أول 15 سطراً)</span>
                  <span className="text-[11px] font-normal text-slate-500">تم التعرف التلقائي على الأعمدة</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">رقم التسجيل</th>
                        <th className="py-2 px-3">اللقب والاسم</th>
                        <th className="py-2 px-3">تاريخ الميلاد</th>
                        <th className="py-2 px-3">مكان الميلاد</th>
                        <th className="py-2 px-3">المؤسسة الأصلية</th>
                        <th className="py-2 px-3">الولاية</th>
                        <th className="py-2 px-3">الفوج</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parseResult.candidates.slice(0, 15).map((c, idx) => {
                        const isDup = parseResult.duplicates.some(d => d.registrationNumber.toLowerCase() === c.registrationNumber.toLowerCase());
                        return (
                          <tr key={c.id} className={isDup ? 'bg-amber-50/70 text-amber-900' : 'hover:bg-slate-50'}>
                            <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-bold text-indigo-700">{c.registrationNumber}</td>
                            <td className="py-2 px-3 font-bold text-slate-900">{c.fullName}</td>
                            <td className="py-2 px-3 text-slate-600 font-mono">{formatArabicDate(c.birthDate)}</td>
                            <td className="py-2 px-3 text-slate-600">{c.birthPlace}</td>
                            <td className="py-2 px-3 text-slate-600">{c.originalInstitution || '—'}</td>
                            <td className="py-2 px-3 text-slate-600">{c.wilaya || '—'}</td>
                            <td className="py-2 px-3">
                              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                                {c.groupNumber}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {parseResult ? `جاهز لإدراج ${validCount} متكون في رتبة ${specialtyTitle}` : 'البيانات تُحفظ محلياً 100% بدون أي خوادم خارجية.'}
          </div>
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            )}
            {parseResult && validCount > 0 && !isSuccess && (
              <button
                type="button"
                onClick={handleCommit}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-5 rounded-lg shadow-md transition-all cursor-pointer"
              >
                <FileCheck className="w-4 h-4" />
                حفظ وتثبيت الفوج في قاعدة البيانات المحلية ({validCount} متكون)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
