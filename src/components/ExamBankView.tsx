import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Printer, 
  Edit3, 
  CheckCircle, 
  Clock, 
  FileText, 
  Eye, 
  Search,
  Scale,
  Award
} from 'lucide-react';
import type { ExamSubject, AppDatabaseState } from '../db/sqlite-manager';
import { INSTITUTION } from '../constants/branding';

interface ExamBankViewProps {
  dbState: AppDatabaseState;
  onUpdateSubjects: (subjects: ExamSubject[]) => void;
  onAddAuditLog: (action: string, details: string, severity?: 'info' | 'warning' | 'security') => void;
}

export const ExamBankView: React.FC<ExamBankViewProps> = ({
  dbState,
  onUpdateSubjects,
  onAddAuditLog
}) => {
  const currentSession = dbState.sessions.find(s => s.id === dbState.currentSessionId) || dbState.sessions[0];
  const specialty = dbState.specialties.find(sp => sp.id === currentSession?.specialtyId);
  const sessionModules = dbState.modules.filter(m => m.specialtyId === currentSession?.specialtyId);

  const [selectedSubject, setSelectedSubject] = useState<ExamSubject | null>(dbState.examSubjects[0] || null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<ExamSubject>>({
    title: '',
    moduleId: sessionModules[0]?.id || '',
    duration: '03 ساعات',
    coefficient: 3,
    instructions: 'يمنع تدوين أي إشارة دالة على الهوية خارج اللسان المخصص للقص.',
    content: '',
    gradingScale: '',
    status: 'approved'
  });

  const handleStartEdit = (subject?: ExamSubject) => {
    if (subject) {
      setSelectedSubject(subject);
      setFormData(subject);
    } else {
      const defaultMod = sessionModules[0];
      setFormData({
        id: `subj_${Date.now()}`,
        moduleId: defaultMod?.id || '',
        specialtyId: specialty?.id || 'dir_sec',
        title: `امتحان نهاية التكوين في مقياس ${defaultMod?.titleAr || ''}`,
        sessionTitle: currentSession?.name || 'دورة جوان 2025',
        examDate: '2025-06-15',
        duration: '03 ساعات',
        coefficient: defaultMod?.coefficient || 3,
        instructions: 'يمنع منعاً باتاً تدوين أي إشارة أو اسم على ورقة الإجابة خارج اللسان المخصص للقص. الإجابة باللغة العربية حصراً.',
        content: `الموضوع الأول:
الوضعية الإشكالية:
...
المطلوب:
1.
2.`,
        gradingScale: `سلم التنقيط المفصل (20/20):
- المعيار الأول: 06 نقاط
- المعيار الثاني: 08 نقاط
- المعيار الثالث: 06 نقاط`,
        status: 'draft'
      });
    }
    setIsEditing(true);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim() || !formData.content?.trim()) {
      alert('يرجى ملء عنوان الموضوع ونص الاختبار.');
      return;
    }

    const mod = sessionModules.find(m => m.id === formData.moduleId);
    const updatedSubject: ExamSubject = {
      id: formData.id || `subj_${Date.now()}`,
      moduleId: formData.moduleId || sessionModules[0].id,
      specialtyId: specialty?.id || 'dir_sec',
      title: formData.title,
      sessionTitle: currentSession?.name || 'دورة جوان 2025',
      examDate: formData.examDate || new Date().toISOString().slice(0, 10),
      duration: formData.duration || '03 ساعات',
      coefficient: mod?.coefficient || formData.coefficient || 3,
      instructions: formData.instructions || '',
      content: formData.content,
      gradingScale: formData.gradingScale || '',
      status: (formData.status as any) || 'approved'
    };

    const exists = dbState.examSubjects.some(s => s.id === updatedSubject.id);
    let newSubjects: ExamSubject[];
    if (exists) {
      newSubjects = dbState.examSubjects.map(s => s.id === updatedSubject.id ? updatedSubject : s);
      onAddAuditLog('تعديل موضوع امتحان', `تم تحديث موضوع الامتحان: ${updatedSubject.title}`);
    } else {
      newSubjects = [...dbState.examSubjects, updatedSubject];
      onAddAuditLog('إضافة موضوع امتحان جديد', `تمت إضافة موضوع جديد لمقياس ${mod?.titleAr}`);
    }

    onUpdateSubjects(newSubjects);
    setSelectedSubject(updatedSubject);
    setIsEditing(false);
  };

  const filteredSubjects = dbState.examSubjects.filter(s => {
    if (!searchTerm) return true;
    return (
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 font-cairo">
              بنك مواضيع الامتحانات وتوليد أوراق الاختبار الرسمية (Banque de Sujets)
            </h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {dbState.examSubjects.length} مواضيع معتمدة
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إعداد وطباعة أوراق مواضيع الامتحانات الوزارية الموحدة وفق المعايير البيداغوجية وسلم التنقيط التحليلي.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleStartEdit()}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>إضافة موضوع جديد</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة ورقة الموضوع الرسمية</span>
          </button>
        </div>
      </div>

      {/* Editor Modal / Panel */}
      {isEditing && (
        <div className="bg-white rounded-xl p-6 border-2 border-emerald-500 shadow-xl space-y-4 no-print animate-in fade-in">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-base text-slate-900 font-cairo">
              تحرير موضوع الامتحان الوزاري الموحد
            </h3>
            <button
              onClick={() => setIsEditing(false)}
              className="text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕ إلغاء
            </button>
          </div>

          <form onSubmit={handleSaveSubject} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">عنوان الموضوع الرسمي *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">المقياس التكويني *</label>
                <select
                  value={formData.moduleId}
                  onChange={(e) => setFormData({ ...formData, moduleId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none"
                >
                  {sessionModules.map(m => (
                    <option key={m.id} value={m.id}>{m.titleAr} (معامل {m.coefficient})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">مدة الإنجاز</label>
                <input
                  type="text"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">تاريخ إجراء الاختبار</label>
                <input
                  type="date"
                  value={formData.examDate}
                  onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">حالة الاعتماد</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="draft">مسودة قيد المراجعة</option>
                  <option value="approved">معتمد رسمياً</option>
                  <option value="final">نهائي محفوظ</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">تعليمات وتوجيهات للمترشح</label>
              <input
                type="text"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">نص موضوع الامتحان والوضعيات الإشكالية *</label>
              <textarea
                rows={10}
                required
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full p-3 rounded-lg border border-slate-300 font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">سلم التنقيط المفصل وعناصر الإجابة (Barème)</label>
              <textarea
                rows={4}
                value={formData.gradingScale}
                onChange={(e) => setFormData({ ...formData, gradingScale: e.target.value })}
                className="w-full p-3 rounded-lg border border-slate-300 font-mono-code text-xs bg-slate-50"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold shadow-sm"
              >
                حفظ الموضوع في البنك المحلي
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main View: Left List, Right Official Printable Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Subject Selector (Hidden in print) */}
        <div className="lg:col-span-4 space-y-3 no-print">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث في بنك المواضيع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div className="space-y-2">
            {filteredSubjects.map(subj => {
              const mod = sessionModules.find(m => m.id === subj.moduleId);
              const isSelected = selectedSubject?.id === subj.id;
              return (
                <div
                  key={subj.id}
                  onClick={() => {
                    setSelectedSubject(subj);
                    setIsEditing(false);
                  }}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {mod?.code || 'INFPE'}
                    </span>
                    <span className="text-[11px] font-mono-code text-slate-400">
                      معامل {subj.coefficient} • {subj.duration}
                    </span>
                  </div>
                  <h4 className={`text-xs font-bold leading-snug line-clamp-2 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {subj.title}
                  </h4>
                  <p className={`text-[11px] mt-1 line-clamp-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {mod?.titleAr}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Official Printable Exam Paper (A4 Viewport) */}
        <div className="lg:col-span-8">
          {selectedSubject ? (
            <div className="bg-white border-2 border-slate-300 rounded-xl p-8 shadow-lg print:p-0 print:border-none print:shadow-none min-h-[900px] flex flex-col justify-between print-document">
              {/* Official Header */}
              <div>
                <div className="text-center border-b-2 border-slate-900 pb-4 mb-5">
                  <p className="text-xs font-bold text-slate-800">{INSTITUTION.republic}</p>
                  <p className="text-xs font-bold text-slate-800">{INSTITUTION.ministry}</p>
                  <h2 className="text-sm font-bold text-slate-950 mt-1">
                    {INSTITUTION.name}
                  </h2>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">
                    {INSTITUTION.deputyDirectorate} — {INSTITUTION.service}
                  </p>
                  <p className="text-xs font-bold text-emerald-900 mt-1">
                    امتحان نهاية التكوين لنيل شهادة التأهيل المهني
                  </p>
                </div>

                {/* Exam Metadata Strip */}
                <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 text-xs grid grid-cols-2 gap-2 mb-5 font-semibold text-slate-800">
                  <div>الدورة: <span className="font-bold text-slate-950">{selectedSubject.sessionTitle}</span></div>
                  <div>الرتبة التكوينية: <span className="font-bold text-emerald-900">{specialty?.titleAr}</span></div>
                  <div>المقياس: <span className="font-bold text-slate-950">{selectedSubject.title}</span></div>
                  <div className="flex gap-4">
                    <span>المدة: <strong className="font-mono-code">{selectedSubject.duration}</strong></span>
                    <span>المعامل: <strong className="font-mono-code">{selectedSubject.coefficient}</strong></span>
                  </div>
                </div>

                {/* Instructions */}
                {selectedSubject.instructions && (
                  <div className="text-[11px] bg-amber-50/80 border-r-3 border-amber-500 text-amber-950 p-2.5 rounded-l mb-5 font-medium">
                    <strong>تنبيهات هامة للمترشح:</strong> {selectedSubject.instructions}
                  </div>
                )}

                {/* Exam Subject Content */}
                <div className="text-sm text-slate-900 leading-relaxed font-sans whitespace-pre-line border-b border-slate-200 pb-8">
                  {selectedSubject.content}
                </div>

                {/* Grading Scale (Collapsible or visible) */}
                {selectedSubject.gradingScale && (
                  <div className="mt-6 pt-4 border-t border-dashed border-slate-300 no-print">
                    <h5 className="font-bold text-xs text-slate-700 flex items-center gap-1.5 mb-2">
                      <Scale className="w-4 h-4 text-emerald-700" />
                      <span>سلم التنقيط المعتمد ومحاور التقويم (Barème):</span>
                    </h5>
                    <pre className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono-code text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {selectedSubject.gradingScale}
                    </pre>
                  </div>
                )}
              </div>

              {/* Bottom Official End Marker */}
              <div className="mt-8 pt-4 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-500 font-mono-code">
                <span>{INSTITUTION.shortName} // BANQUE-SUJETS // COD-{selectedSubject.id.slice(-6)}</span>
                <span className="font-bold text-slate-700">— انتهى الموضوع وبالتوفيق للجميع —</span>
                <span>صفحة 1 من 1</span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-12 text-center text-slate-400 border border-slate-200">
              اختر موضوعاً من القائمة الجانبية لمعاينته أو طباعته.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
