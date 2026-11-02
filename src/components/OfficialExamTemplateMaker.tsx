import React, { useState } from 'react';
import { 
  FileEdit, 
  Printer, 
  Save, 
  Copy, 
  Check, 
  Sparkles, 
  FileText, 
  Clock, 
  Scale, 
  Calendar, 
  Layers, 
  AlertCircle,
  Eye,
  RotateCcw
} from 'lucide-react';
import type { AppDatabaseState, ExamSubject } from '../db/sqlite-manager';
import { INSTITUTION } from '../constants/branding';
import { getRankById, OFFICIAL_RANKS } from '../data/promotionsData';
import { getRankNumericCode, DEFAULT_INSTITUTE_WILAYA_CODE } from '../utils/registration-number';
import { formatArabicDate, formatAcademicYear } from '../utils/date-formatter';

interface OfficialExamTemplateMakerProps {
  dbState: AppDatabaseState;
  onUpdateSubjects?: (subjects: ExamSubject[]) => void;
  onAddAuditLog: (action: string, details: string, severity?: 'info' | 'warning' | 'security') => void;
}

export const OfficialExamTemplateMaker: React.FC<OfficialExamTemplateMakerProps> = ({
  dbState,
  onUpdateSubjects,
  onAddAuditLog
}) => {
  const currentSession = dbState.sessions.find(s => s.id === dbState.currentSessionId) || dbState.sessions[0];
  const currentSpecialtyId = currentSession?.specialtyId || 'dir_sec';
  const currentRank = getRankById(currentSpecialtyId) || OFFICIAL_RANKS[0];
  const rankNumericCode = getRankNumericCode(currentSpecialtyId);
  const sessionModules = dbState.modules.filter(m => m.specialtyId === currentSpecialtyId);

  // Form states
  const [selectedModuleId, setSelectedModuleId] = useState<string>(sessionModules[0]?.id || '');
  const [sessionTitle, setSessionTitle] = useState<string>(currentSession?.name || 'امتحان التخرج النهائي - دورة جوان 2027');
  const [academicYear, setAcademicYear] = useState<string>(currentSession?.academicYear || '2026 / 2027');
  const [duration, setDuration] = useState<string>('03 ساعات');
  const [coefficient, setCoefficient] = useState<number>(sessionModules[0]?.coefficient || 3);
  const [examDate, setExamDate] = useState<string>(currentSession?.examStartDate || '2027-06-13');
  const [authorName, setAuthorName] = useState<string>('لجنة صياغة ومطابقة مواضيع الامتحانات بالمعهد');
  const [instructions, setInstructions] = useState<string>('يُمنع منعاً باتاً تدوين أي إشارة دالة على الهوية خارج اللسان المخصص للقص. الإجابة باللغة العربية حصراً وبخط واضح ومقروء.');

  // Exam Content (Pasted from Word)
  const [examContent, setExamContent] = useState<string>(`الجزء الأول: الوضعية الإشكالية الانطلاقية (12 نقطة)

في إطار ممارسة المهام الإدارية والبيداغوجية، واستناداً إلى أحكام التشريع المدرسي والتنظيم الإداري المعمول به في قطاع التربية الوطنية:
لوحظ في إحدى المؤسسات التعليمية حدوث تباين في تفسير الصلاحيات المخولة لأعضاء الفريق الإداري والتربوي، مما أدى إلى تعثر في التنسيق الداخلي وسير العمل اليومي بالمؤسسة.

المطلوب:
1. حدد بدقة السند القانوني والمرجعي المنظم لمهام وصلاحيات الفريق الإداري والتربوي. (04 نقاط)
2. بين الآليات التنظيمية والبيداغوجية الكفيلة بتفعيل التنسيق والتشاور المستمر داخل المؤسسة. (04 نقاط)
3. اقترح خطة عمل إجرائية عملية لمعالجة هذا الخلل وضمان السير الحسن للمرفق العام المدرسي. (04 نقاط)

--------------------------------------------------

الجزء الثاني: الوضعية الإدماجية المركبة (08 نقاط)

السند:
« يعد التقويم والمتابعة المستمرة ركيزة أساسية لتحسين المردود المدرسي والارتقاء بالأداء البيداغوجي والإداري. »

التعليمة:
انطلاقاً من السند ومكتسباتك القبلية خلال فترة التكوين بالمعهد الوطني:
حرر تقريراً تحليلياً مفصلاً تُبرز فيه خطوات تنفيذ عملية تقويمية شاملة، مبرزاً المعايير والمؤشرات المعتمدة، وكيفية توظيف مخرجات التقويم في معالجة النقائص وتطوير الأداء الجماعي.`);

  const [gradingRubric, setGradingRubric] = useState<string>('');
  const [saveSuccessBanner, setSaveSuccessBanner] = useState(false);
  const [copiedBanner, setCopiedBanner] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');

  const selectedModule = sessionModules.find(m => m.id === selectedModuleId) || sessionModules[0];

  // When module changes, update coefficient
  const handleModuleChange = (modId: string) => {
    setSelectedModuleId(modId);
    const m = sessionModules.find(x => x.id === modId);
    if (m) {
      setCoefficient(m.coefficient);
    }
  };

  // Quick insertion snippets
  const insertSnippet = (snippet: string) => {
    setExamContent(prev => prev + '\n\n' + snippet);
  };

  // Save to Exam Bank
  const handleSaveToBank = () => {
    if (!examContent.trim()) {
      alert('يرجى لصق أو كتابة نص الموضوع أولاً.');
      return;
    }

    const newSubject: ExamSubject = {
      id: `subj_${Date.now()}`,
      moduleId: selectedModule?.id || 'mod-default',
      specialtyId: currentSpecialtyId,
      title: `موضوع امتحان: ${selectedModule?.titleAr || 'مقياس معتمد'}`,
      sessionTitle,
      examDate,
      duration,
      coefficient,
      instructions,
      content: examContent,
      gradingScale: gradingRubric,
      status: 'approved'
    };

    if (onUpdateSubjects) {
      onUpdateSubjects([...dbState.examSubjects, newSubject]);
    }

    onAddAuditLog(
      'إيداع موضوع امتحان رسمي',
      `تم تثبيت وإيداع موضوع رسمي لمقياس ${selectedModule?.titleAr} لرتبة ${currentRank.titleAr} بالترويسة الموحدة.`
    );

    setSaveSuccessBanner(true);
    setTimeout(() => setSaveSuccessBanner(false), 3500);
  };

  // Copy Content
  const handleCopy = () => {
    navigator.clipboard.writeText(examContent);
    setCopiedBanner(true);
    setTimeout(() => setCopiedBanner(false), 2500);
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-cairo">
                النموذج الرسمي الموحد للامتحان (Gabarit Officiel de Sujet)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                لصق موضوع الامتحان المستلم من الأستاذ (Word) وتوليد ورقة الاختبار الرسمية بالترويسة المعتمدة للطباعة (A4).
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'editor' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              محرر ولصق الموضوع
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'preview' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              معاينة الطباعة الرسمية (A4)
            </button>
          </div>

          <button
            type="button"
            onClick={handleSaveToBank}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Save className="w-4 h-4 text-amber-400" />
            <span>حفظ في بنك المواضيع</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة ورقة الموضوع الرسمية</span>
          </button>
        </div>
      </div>

      {saveSuccessBanner && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-3 flex items-center gap-2 text-xs font-bold animate-fadeIn no-print">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>تم حفظ ورقة الامتحان الرسمية بنجاح في بنك مواضيع المعهد!</span>
        </div>
      )}

      {/* Inputs for Exam Metadata Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 no-print">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5 font-cairo">
            <Layers className="w-4 h-4 text-orange-600" />
            بيانات الترويسة وبطاقة تعريف الامتحان (يتم تضمينها تلقائياً بالترويسة المعتمدة):
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            رمز الرتبة الوزاري: <strong className="text-orange-600">{rankNumericCode}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Rank (Readonly / Preset) */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">الرتبة التكوينية:</label>
            <input
              type="text"
              readOnly
              value={`${currentRank.titleAr} (${currentRank.trackId === 'specialized' ? 'تكوين متخصص' : 'تكوين قبل الترقية'})`}
              className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 cursor-not-allowed"
            />
          </div>

          {/* Module Select */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">مقياس الاختبار:</label>
            <select
              value={selectedModuleId}
              onChange={(e) => handleModuleChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-orange-500"
            >
              {sessionModules.map(m => (
                <option key={m.id} value={m.id}>
                  {m.titleAr} (معامل {m.coefficient})
                </option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">المدة المحددة للاختبار:</label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="03 ساعات"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-orange-500 font-mono"
            />
          </div>

          {/* Coefficient */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">المعامل القانوني:</label>
            <input
              type="number"
              min="1"
              max="10"
              value={coefficient}
              onChange={(e) => setCoefficient(parseInt(e.target.value, 10) || 1)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-orange-500 font-mono"
            />
          </div>

          {/* Exam Date */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">تاريخ الاختبار:</label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-orange-500 font-mono"
            />
          </div>

          {/* Session Title */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">تسمية الدورة التكوينية:</label>
            <input
              type="text"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Academic Year */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">السنة التكوينية:</label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-orange-500 font-mono"
            />
          </div>

          {/* Author / Teacher */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">الأستاذ واضع الموضوع:</label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Candidate Instructions */}
        <div className="pt-2 border-t border-slate-100 text-xs">
          <label className="block font-bold text-slate-700 mb-1">توجيهات وتعليمات هامة للمترشحين (تظهر أسفل الترويسة):</label>
          <input
            type="text"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Editor & Word Paste Workspace (Visible in Editor Mode) */}
      {viewMode === 'editor' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 no-print">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-cairo">
                مساحة لصق نص الموضوع المستلم من الأستاذ (Coller le Sujet Word):
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                قم بنسخ نص الامتحان مباشرة من ملف Word ولصقه هنا. يحتفظ النظام بالفقرات والأسئلة والتسلسلات الرقمية.
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => insertSnippet('الجزء الأول: الوضعية الإشكالية الانطلاقية (12 نقطة)\n\nالسند:\n...\n\nالأسئلة والمطلوب:\n1.\n2.\n3.')}
                className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
              >
                + قالب الجزء 1
              </button>

              <button
                type="button"
                onClick={() => insertSnippet('الجزء الثاني: الوضعية الإدماجية المركبة (08 نقاط)\n\nالسند:\n...\n\nالتعليمة:\n...')}
                className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
              >
                + قالب الجزء 2
              </button>

              <button
                type="button"
                onClick={() => setExamContent('')}
                className="text-[11px] text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
              >
                مسح الكل
              </button>
            </div>
          </div>

          <textarea
            rows={15}
            value={examContent}
            onChange={(e) => setExamContent(e.target.value)}
            placeholder="قم بلصق محتوى موضوع الامتحان هنا (Ctrl+V)..."
            className="w-full bg-slate-50/60 border-2 border-dashed border-slate-300 rounded-xl p-4 text-xs font-mono leading-relaxed text-slate-900 focus:bg-white focus:border-orange-500 focus:outline-none transition resize-y"
          />

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>عدد الحروف: <strong className="font-mono text-slate-800">{examContent.length}</strong> حرفاً</span>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className="text-xs text-orange-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>الانتقال للمعاينة الطباعية الرسمية A4</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* OFFICIAL PRINTABLE A4 EXAM SHEET (Always visible in Print Mode, or in Preview Mode)     */}
      {/* Rendered strictly with Simplified Arabic Print Typography & Ministerial Standards        */}
      {/* ========================================================================================= */}
      {(viewMode === 'preview' || true) && (
        <div className={viewMode === 'editor' ? 'hidden print:block' : 'block'}>
          <div className="print-document bg-white border-2 border-slate-900 rounded-xl p-8 md:p-10 max-w-[820px] mx-auto shadow-2xl print:shadow-none print:border-none print:p-0 min-h-[1120px] flex flex-col justify-between">
            <div>
              {/* Official 5-Line Ministerial Header */}
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-4 leading-snug">
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

              {/* Standardized Exam Identification Box */}
              <div className="border-2 border-slate-900 rounded-xl p-3.5 bg-slate-50/70 mb-4 text-xs">
                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                  <div>
                    <span className="text-slate-600 font-bold text-[11px]">الدورة التكوينية:</span>{' '}
                    <strong className="text-slate-950 font-bold">{sessionTitle}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600 font-bold text-[11px]">السنة التكوينية:</span>{' '}
                    <strong className="text-slate-950 font-mono">{formatAcademicYear(academicYear)}</strong>
                  </div>

                  <div className="col-span-2 pt-1 border-t border-slate-300">
                    <span className="text-slate-600 font-bold text-[11px]">الرتبة التكوينية:</span>{' '}
                    <strong className="text-orange-950 text-sm font-black">{currentRank.titleAr}</strong>{' '}
                    <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-mono font-bold mr-2">
                      كود الرتبة: {rankNumericCode}
                    </span>
                  </div>

                  <div className="col-span-2 pt-1 border-t border-slate-300">
                    <span className="text-slate-600 font-bold text-[11px]">موضوع الاختبار في مقياس:</span>{' '}
                    <strong className="text-slate-950 text-sm font-bold">{selectedModule?.titleAr}</strong>
                  </div>

                  <div className="col-span-2 pt-1.5 border-t border-slate-300 flex items-center justify-between text-xs font-mono font-bold text-slate-900">
                    <span>المدة: <strong>{duration}</strong></span>
                    <span>المعامل: <strong>{coefficient}</strong></span>
                    <span>تاريخ الاختبار: <strong>{formatArabicDate(examDate)}</strong></span>
                    <span className="text-[10px] text-slate-500 font-normal">كود: {selectedModule?.code}</span>
                  </div>
                </div>
              </div>

              {/* Candidate Instructions Strip */}
              {instructions && (
                <div className="border-r-4 border-slate-800 bg-amber-50/70 p-2.5 rounded-l mb-6 text-xs text-slate-900 leading-relaxed font-bold">
                  <span className="text-slate-950 block mb-0.5">توجيهات هامة للمترشح:</span>
                  <p className="font-normal text-slate-800 text-[11px]">{instructions}</p>
                </div>
              )}

              {/* Official Exam Body (Pasted Content) */}
              <div className="text-justify text-xs md:text-sm text-slate-950 leading-loose space-y-4 whitespace-pre-line print:leading-relaxed">
                {examContent}
              </div>
            </div>

            {/* Bottom Official Sheet Sign-off */}
            <div className="border-t-2 border-slate-900 pt-3 mt-8 flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="text-[11px]">معهد الشيخ زاهية حسين بالأغواط • مصلحة تنظيم سير المسابقات والامتحانات</span>
              <span className="text-xs font-black text-slate-950 print-bold">
                — انتهى موضوع الاختبار • بالتوفيق للجميع —
              </span>
              <span className="font-mono text-[11px]">صفحة 1 / 1</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
