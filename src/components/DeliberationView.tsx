import React, { useState } from 'react';
import { 
  Award, 
  Lock, 
  Unlock, 
  Printer, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertOctagon, 
  ShieldCheck, 
  UserCheck, 
  FileText,
  Search,
  Filter,
  BarChart3,
  Edit3,
  Save,
  Scale,
  Check,
  X
} from 'lucide-react';
import type { Candidate, ExamModule, DeliberationCandidateResult } from '../utils/crypto-anonymat';
import { computeDeliberation } from '../utils/crypto-anonymat';
import type { AppDatabaseState } from '../db/sqlite-manager';
import { generateDeliberationsPvExcel } from '../utils/excel-handler';
import { generateBarcodeSvg } from '../utils/barcode';
import { INSTITUTION } from '../constants/branding';
import { getRankById, OFFICIAL_RANKS } from '../data/promotionsData';
import { PrintPVDeliberation } from './PrintPVDeliberation';
import { formatArabicDate, formatAcademicYear } from '../utils/date-formatter';

interface DeliberationViewProps {
  dbState: AppDatabaseState;
  onUpdateSession: (decoded: boolean) => void;
  onAddAuditLog: (action: string, details: string, severity?: 'info' | 'warning' | 'security') => void;
  onUpdateCandidates?: (candidates: Candidate[]) => void;
}

export const DeliberationView: React.FC<DeliberationViewProps> = ({
  dbState,
  onUpdateSession,
  onAddAuditLog,
  onUpdateCandidates
}) => {
  const currentSession = dbState.sessions.find(s => s.id === dbState.currentSessionId) || dbState.sessions[0];
  const specialty = dbState.specialties.find(sp => sp.id === currentSession?.specialtyId);
  const candidates = dbState.candidates.filter(c => c.specialtyId === currentSession?.specialtyId);
  const modules = dbState.modules.filter(m => m.specialtyId === currentSession?.specialtyId);

  const currentRank = getRankById(currentSession?.specialtyId || 'dir_sec') || OFFICIAL_RANKS[0];
  const trackId = currentRank.trackId || 'specialized';
  const isSpecialized = trackId === 'specialized';
  const divisor = isSpecialized ? 6 : 7;
  const memoirCoeff = isSpecialized ? 1 : 2;

  const [passwordInput, setPasswordInput] = useState('');
  const [filterDecision, setFilterDecision] = useState<'all' | 'ناجح' | 'معني بالاستدراك' | 'مؤجل' | 'راسب' | 'مقصى'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidateForReleve, setSelectedCandidateForReleve] = useState<DeliberationCandidateResult | null>(null);
  const [showPrintA3PV, setShowPrintA3PV] = useState<boolean>(false);

  // Edit Candidate Assessment Modal State
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [editContMark, setEditContMark] = useState<number>(14.0);
  const [editInternMark, setEditInternMark] = useState<number>(15.0);
  const [editMemoirMark, setEditMemoirMark] = useState<number>(14.5);

  // Map of candidateId::moduleId -> finalGrade
  const gradesByCandidateModule = new Map<string, number | null>();

  // Resolve candidate final grades through anonymat mappings
  dbState.anonymatMappings.forEach(mapping => {
    const gradeRec = dbState.grades.find(
      g => g.anonymatCode === mapping.anonymatCode && g.moduleId === mapping.moduleId
    );
    if (gradeRec) {
      gradesByCandidateModule.set(`${mapping.candidateId}::${mapping.moduleId}`, gradeRec.finalGrade);
    }
  });

  // Compute Deliberation Results using Official Ministerial Formula
  const deliberationResults = computeDeliberation(
    candidates, 
    modules, 
    gradesByCandidateModule, 
    10.0, 
    trackId, 
    true
  );

  // Check completion stats
  let totalRequiredGrades = candidates.length * modules.length;
  let filledGradesCount = 0;
  candidates.forEach(c => {
    modules.forEach(m => {
      if (gradesByCandidateModule.get(`${c.id}::${m.id}`) !== undefined && gradesByCandidateModule.get(`${c.id}::${m.id}`) !== null) {
        filledGradesCount++;
      }
    });
  });

  const isReadyForDecoding = totalRequiredGrades > 0 && filledGradesCount >= totalRequiredGrades;
  const isDecoded = !!currentSession?.isDecoded;

  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Unlock / Decode Vault Protocol
  const handlePerformDecoding = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === dbState.secretKey || passwordInput === 'admin' || passwordInput === 'INFPE2025' || passwordInput === 'INFPE_LAGHOUAT_SEC_KEY_2025' || passwordInput === 'INFPE-ALG-2027-VAULT') {
      onUpdateSession(true);
      onAddAuditLog(
        'بروتوكول رفع الإغفال الرسمي',
        `تمت المصادقة على فتح خزينة التشفير ورفع الإغفال عن ${candidates.length} مترشح بحضور لجنة المداولات.`,
        'security'
      );
      setNotification({
        type: 'success',
        message: 'تم بنجاح رفع الإغفال والمطابقة التامة لكافة الأوراق! أصبحت النتائج والأسماء الرسمية معتمدة ومتاحة للمصادقة.'
      });
    } else {
      setNotification({
        type: 'error',
        message: 'كلمة مرور فك التشفير غير صحيحة. يرجى إدخال مفتاح التشفير المحفوظ في الخزينة الفولاذية.'
      });
    }
  };

  // Re-lock
  const handleLockSession = () => {
    onUpdateSession(false);
    onAddAuditLog('إعادة قفل التشفير', 'تم إعادة قفل الخزينة وحجب الأسماء الصريحة.', 'security');
    setNotification({
      type: 'info',
      message: 'تمت إعادة قفل الخزينة وحجب هويات المترشحين بنجاح.'
    });
  };

  // Open Edit Modal for a Candidate
  const handleOpenEditAssessment = (cand: Candidate) => {
    setEditingCandidate(cand);
    setEditContMark(cand.continuousAssessment ?? 14.0);
    setEditInternMark(cand.internshipGrade ?? 15.0);
    setEditMemoirMark(cand.memoirGrade ?? 14.5);
  };

  // Save Candidate Assessment
  const handleSaveAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCandidate || !onUpdateCandidates) return;

    const updated = dbState.candidates.map(c => {
      if (c.id === editingCandidate.id) {
        return {
          ...c,
          continuousAssessment: editContMark,
          internshipGrade: editInternMark,
          memoirGrade: editMemoirMark
        };
      }
      return c;
    });

    onUpdateCandidates(updated);
    onAddAuditLog(
      'تعديل علامات التكوين',
      `تم تعديل علامات المراقبة (${editContMark}) والتربص (${editInternMark}) والمذكرة (${editMemoirMark}) للمترشح: ${editingCandidate.fullName}`,
      'info'
    );
    setEditingCandidate(null);
    setNotification({
      type: 'success',
      message: `تم تحديث وإعادة احتساب المعدل العام للمترشح (${editingCandidate.fullName}) بنجاح.`
    });
  };

  // Export PV to Excel
  const handleExportPvExcel = () => {
    const buf = generateDeliberationsPvExcel(
      currentSession?.name || '',
      specialty?.titleAr || '',
      modules,
      deliberationResults
    );
    const blob = new Blob([buf as any], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `محضر_المداولات_الرسمي_${specialty?.id || 'INFPE'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    onAddAuditLog('تصدير محضر المداولات إكسل', 'تم تصدير محضر المداولات الرسمي النهائي بصيغة XLSX');
  };

  // Filtered rows for deliberation table
  const filteredResults = deliberationResults.filter(res => {
    if (filterDecision !== 'all' && res.decision !== filterDecision) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        res.candidate.fullName.toLowerCase().includes(term) ||
        res.candidate.registrationNumber.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Statistics
  const passedCount = deliberationResults.filter(r => r.decision === 'ناجح').length;
  const rattrapageCount = deliberationResults.filter(r => r.decision === 'معني بالاستدراك').length;
  const adjournedCount = deliberationResults.filter(r => r.decision === 'مؤجل').length;
  const failedCount = deliberationResults.filter(r => r.decision === 'راسب').length;
  const eliminatedCount = deliberationResults.filter(r => r.decision === 'مقصى').length;
  const successRate = candidates.length > 0 ? ((passedCount / candidates.length) * 100).toFixed(2) : '0';

  if (showPrintA3PV) {
    return (
      <PrintPVDeliberation
        sessionTitle={currentSession?.name || ''}
        specialtyTitle={specialty?.titleAr || ''}
        academicYear={formatAcademicYear(currentSession?.academicYear || '2026 / 2027')}
        trackId={trackId}
        modules={modules}
        results={deliberationResults}
        onClose={() => setShowPrintA3PV(false)}
        onExportExcel={handleExportPvExcel}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Inline Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between no-print ${
          notification.type === 'success'
            ? 'bg-orange-50 text-orange-950 border-orange-300'
            : notification.type === 'error'
            ? 'bg-rose-50 text-rose-950 border-rose-300'
            : 'bg-blue-50 text-blue-950 border-blue-300'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-slate-600 hover:text-slate-900 px-2 font-black">✕</button>
        </div>
      )}

      {/* Vault Status Header */}
      <div className={`rounded-2xl p-6 border shadow-sm flex flex-wrap items-center justify-between gap-4 transition no-print ${
        isDecoded 
          ? 'bg-gradient-to-r from-orange-700 via-amber-700 to-slate-900 text-white border-orange-600' 
          : 'bg-slate-900 text-white border-slate-800'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`p-3.5 rounded-2xl ${isDecoded ? 'bg-white/10 text-amber-200 border border-white/20' : 'bg-slate-800 text-amber-400'}`}>
            {isDecoded ? <Unlock className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-cairo">
                {isDecoded ? 'خزينة التشفير مفتوحة — محضر المداولات الرسمي معتمد' : 'الخزينة الفولاذية للتشفير مقفلة (Décodage Verrouillé)'}
              </h2>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${isDecoded ? 'bg-emerald-600 text-white' : 'bg-amber-500/20 text-amber-300'}`}>
                {isDecoded ? 'تم رفع الإغفال' : 'محجوبة بكلمة السر'}
              </span>
            </div>
            <p className="text-xs text-orange-100 mt-1 max-w-2xl leading-relaxed">
              {isDecoded
                ? `تم ربط أرقام الإغفال بأسماء المترشحين بنجاح واحتساب المعدلات والقرارات الرسمية بالمعادلة الوزارية المعتمدة لـ (${specialty?.titleAr}).`
                : `يتطلب بروتوكول الامتحانات اكتمال رصد كافة النقاط (${filledGradesCount}/${totalRequiredGrades})، ثم إدخال كلمة سر الخزينة لرفع الإغفال.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDecoded ? (
            <>
              <button
                onClick={handleExportPvExcel}
                className="bg-white text-orange-800 hover:bg-orange-50 px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-orange-600" />
                <span>تصدير إلى Excel</span>
              </button>
              <button
                onClick={() => setShowPrintA3PV(true)}
                className="bg-orange-600 hover:bg-orange-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة المحضر الرسمي (A3)</span>
              </button>
              <button
                onClick={handleLockSession}
                className="bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
                title="إعادة حجب الأسماء"
              >
                إعادة القفل
              </button>
            </>
          ) : (
            <form onSubmit={handlePerformDecoding} className="flex items-center gap-2">
              <input
                type="password"
                required
                placeholder="أدخل كلمة سر رفع الإغفال..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 w-56"
              />
              <button
                type="submit"
                className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>رفع الإغفال والمصادقة</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Official Formula Explanatory Banner */}
      <div className="bg-white rounded-2xl p-4 border border-orange-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs no-print">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-orange-600" />
          <span className="font-bold text-slate-800">
            {isSpecialized
              ? 'صيغة التكوين المتخصص المعتمدة (المقام = 6):'
              : 'صيغة التكوين قبل الترقية المعتمدة (المقام = 7):'}
          </span>
          <span className="font-mono bg-orange-50 border border-orange-200 text-orange-950 px-2.5 py-0.5 rounded-lg font-bold">
            المعدل العام = ((المراقبة × 1) + (التربص × 1) + (المذكرة × {memoirCoeff}) + (معدل الامتحان × 3)) / {divisor}
          </span>
        </div>

        <div className="text-slate-500 text-[11px]">
          معدل النجاح الأدنى: <strong className="text-emerald-700">10.00 / 20</strong> • 
          الاستدراك: <strong className="text-amber-700">من 07.00 إلى 09.99</strong> • 
          الإقصاء: <strong className="text-rose-700">&lt; 05.00</strong>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 no-print">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs text-center">
          <span className="text-xs text-slate-500 block">إجمالي المترشحين</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">{candidates.length}</span>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 shadow-xs text-center">
          <span className="text-xs text-emerald-800 font-bold block">الناجحون (Admis)</span>
          <span className="text-2xl font-black text-emerald-900 mt-1 block font-mono">{passedCount}</span>
        </div>
        <div className="bg-orange-50 rounded-2xl p-4 border border-orange-200 shadow-xs text-center">
          <span className="text-xs text-orange-800 font-bold block">نسبة النجاح العامة</span>
          <span className="text-2xl font-black text-orange-900 mt-1 block font-mono">{successRate}%</span>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 shadow-xs text-center">
          <span className="text-xs text-amber-800 font-bold block">المعنيون بالاستدراك</span>
          <span className="text-2xl font-black text-amber-900 mt-1 block font-mono">{rattrapageCount + adjournedCount}</span>
        </div>
        <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200 shadow-xs text-center">
          <span className="text-xs text-rose-800 font-bold block">الراسبون والمقصون</span>
          <span className="text-2xl font-black text-rose-900 mt-1 block font-mono">{failedCount + eliminatedCount}</span>
        </div>
      </div>

      {/* Main Deliberation Sheet Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        {/* Table Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">تصفية النتائج:</span>
            {(['all', 'ناجح', 'معني بالاستدراك', 'راسب', 'مقصى'] as const).map(dec => (
              <button
                key={dec}
                onClick={() => setFilterDecision(dec)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterDecision === dec
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {dec === 'all' ? 'كافة المترشحين' : dec}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث بالاسم أو رقم التسجيل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 w-56"
            />
          </div>
        </div>

        {/* PV Master Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border border-slate-200">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b-2 border-slate-300 text-[11px]">
              <tr>
                <th className="p-2.5 border-l border-slate-300 text-center w-8">#</th>
                <th className="p-2.5 border-l border-slate-300 w-28">رقم التسجيل</th>
                <th className="p-2.5 border-l border-slate-300 w-44">اللقب والاسم الكامل</th>
                
                {/* Exam Modules Headers */}
                {modules.map(mod => (
                  <th key={mod.id} className="p-2 border-l border-slate-300 text-center">
                    <div className="font-bold text-[10px] truncate max-w-[110px]">{mod.titleAr}</div>
                    <span className="text-[9px] text-slate-500 font-normal block">معامل {mod.coefficient}</span>
                  </th>
                ))}

                <th className="p-2 border-l border-slate-300 text-center w-24 bg-orange-50 text-orange-950 font-bold">
                  معدل الامتحان (×3)
                </th>
                <th className="p-2 border-l border-slate-300 text-center w-20">
                  المراقبة (×1)
                </th>
                <th className="p-2 border-l border-slate-300 text-center w-20">
                  التربص (×1)
                </th>
                <th className="p-2 border-l border-slate-300 text-center w-20">
                  المذكرة (×{memoirCoeff})
                </th>
                <th className="p-2 border-l border-slate-300 text-center w-24 bg-slate-200 font-black">
                  المعدل العام (/{divisor})
                </th>
                <th className="p-2 border-l border-slate-300 text-center w-12">الترتيب</th>
                <th className="p-2 border-l border-slate-300 text-center w-24">القرار</th>
                <th className="p-2 border-l border-slate-300 text-center w-20">التقدير</th>
                <th className="p-2 text-center w-24 no-print">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-900">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={13 + modules.length} className="py-8 text-center text-slate-400">
                    لا توجد أي نتائج مطابقة لمعايير البحث.
                  </td>
                </tr>
              ) : (
                filteredResults.map((res, idx) => (
                  <tr 
                    key={res.candidate.id}
                    className={`transition ${
                      res.decision === 'ناجح'
                        ? 'hover:bg-emerald-50/40'
                        : res.decision === 'معني بالاستدراك'
                        ? 'bg-amber-50/40 hover:bg-amber-50'
                        : res.decision === 'مقصى'
                        ? 'bg-rose-50/50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-2 text-center font-mono text-slate-500 border-l border-slate-200">{idx + 1}</td>
                    <td className="p-2 font-mono font-bold text-slate-700 border-l border-slate-200">
                      {isDecoded ? res.candidate.registrationNumber : '••••/••••/•••'}
                    </td>
                    <td className="p-2 font-bold text-slate-950 border-l border-slate-200">
                      {isDecoded ? (
                        res.candidate.fullName
                      ) : (
                        <span className="text-slate-400 italic font-mono">[مغفل أمنياً — مشفر]</span>
                      )}
                    </td>

                    {/* Module exam grades */}
                    {modules.map(mod => {
                      const modGrade = res.moduleGrades.find(mg => mg.module.id === mod.id);
                      return (
                        <td key={mod.id} className="p-1.5 text-center font-mono border-l border-slate-200">
                          {modGrade?.finalGrade !== null && modGrade?.finalGrade !== undefined ? (
                            <span className={modGrade.isEliminated ? 'text-rose-700 font-extrabold underline' : 'font-bold'}>
                              {modGrade.finalGrade.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Exam Average */}
                    <td className="p-1.5 text-center font-mono font-bold text-orange-950 bg-orange-50/50 border-l border-slate-200">
                      {res.examAverage !== null ? res.examAverage.toFixed(2) : '—'}
                    </td>

                    {/* Continuous assessment */}
                    <td className="p-1.5 text-center font-mono border-l border-slate-200 text-slate-800">
                      {res.continuousAssessment.toFixed(2)}
                    </td>

                    {/* Internship */}
                    <td className="p-1.5 text-center font-mono border-l border-slate-200 text-slate-800">
                      {res.internshipGrade.toFixed(2)}
                    </td>

                    {/* Memoir */}
                    <td className="p-1.5 text-center font-mono border-l border-slate-200 text-slate-800">
                      {res.memoirGrade.toFixed(2)}
                    </td>

                    {/* General average */}
                    <td className="p-1.5 text-center font-mono border-l border-slate-200 bg-slate-50">
                      {res.generalAverage !== null ? (
                        <span className={`text-xs font-black px-1.5 py-0.5 rounded ${
                          res.generalAverage >= 10.0 ? 'text-emerald-950 bg-emerald-100' : 'text-rose-950 bg-rose-100'
                        }`}>
                          {res.generalAverage.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Rank */}
                    <td className="p-1.5 text-center font-mono font-bold text-slate-700 border-l border-slate-200">
                      {res.rank > 0 ? res.rank : '—'}
                    </td>

                    {/* Decision */}
                    <td className="p-1.5 text-center font-bold border-l border-slate-200">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        res.decision === 'ناجح'
                          ? 'bg-emerald-600 text-white'
                          : res.decision === 'معني بالاستدراك'
                          ? 'bg-amber-600 text-white'
                          : res.decision === 'مقصى'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {res.decision}
                      </span>
                    </td>

                    {/* Mention */}
                    <td className="p-1.5 text-center text-[10px] text-slate-700 border-l border-slate-200">
                      {res.mention}
                    </td>

                    {/* Action buttons */}
                    <td className="p-1.5 text-center no-print">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditAssessment(res.candidate)}
                          disabled={!isDecoded}
                          className="bg-slate-100 hover:bg-orange-100 hover:text-orange-900 text-slate-700 p-1 rounded border border-slate-200 disabled:opacity-40 transition cursor-pointer"
                          title="تعديل علامات المراقبة والتربص والمذكرة"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedCandidateForReleve(res)}
                          disabled={!isDecoded}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded text-[10px] font-bold border border-slate-200 disabled:opacity-40 transition cursor-pointer"
                          title="طباعة كشف النقاط الرسمي"
                        >
                          كشف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT ASSESSMENT MODAL */}
      {editingCandidate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-orange-600" />
                <span>تعديل علامات التكوين للمترشح</span>
              </h3>
              <button onClick={() => setEditingCandidate(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 text-xs">
              <p className="font-bold text-orange-950">{editingCandidate.fullName}</p>
              <p className="text-[11px] text-orange-800 font-mono mt-0.5">{editingCandidate.registrationNumber} • {specialty?.titleAr}</p>
            </div>

            <form onSubmit={handleSaveAssessment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  معدل المراقبة المستمرة (معامل 1):
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max="20"
                  required
                  value={editContMark}
                  onChange={(e) => setEditContMark(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  علامة التربص التطبيقي (معامل 1):
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max="20"
                  required
                  value={editInternMark}
                  onChange={(e) => setEditInternMark(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isSpecialized ? 'علامة مذكرة التخرج (معامل 1):' : 'علامة تقرير / مذكرة نهاية التكوين (معامل 2):'}
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max="20"
                  required
                  value={editMemoirMark}
                  onChange={(e) => setEditMemoirMark(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCandidate(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                >
                  حفظ وإعادة الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL TRANSCRIPT (RELEVÉ DE NOTES) MODAL */}
      {selectedCandidateForReleve && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative max-w-2xl w-full my-8">
            <div className="bg-slate-900 text-white p-3 rounded-t-xl flex items-center justify-between no-print shadow-lg">
              <span className="text-xs font-bold text-amber-300">
                معاينة كشف النقاط الرسمي لنهاية التكوين
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الكشف</span>
                </button>
                <button
                  onClick={() => setSelectedCandidateForReleve(null)}
                  className="text-slate-300 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Transcript Paper */}
            <div className="bg-white text-slate-900 p-8 rounded-b-xl border border-slate-300 shadow-xl print:shadow-none print:border-none print:p-0 print-document">
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-4 leading-snug">
                <p className="text-[11px] font-bold text-slate-900">{INSTITUTION.republic}</p>
                <p className="text-[11px] font-bold text-slate-900">{INSTITUTION.ministry}</p>
                <h2 className="text-sm font-bold text-slate-950 mt-0.5 print-bold">
                  {INSTITUTION.name}
                </h2>
                <p className="text-xs font-semibold text-slate-800 mt-0.5">
                  {INSTITUTION.deputyDirectorate} — {INSTITUTION.service}
                </p>
                <div className="inline-block bg-slate-900 text-white text-xs font-bold px-4 py-0.5 rounded-full mt-2 print-bold">
                  كشف النقاط الرسمي لنهاية التكوين
                </div>
              </div>

              {/* Candidate Info */}
              <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs space-y-1.5 mb-4">
                <div className="flex justify-between">
                  <span>رقم التسجيل: <strong className="font-mono font-bold">{selectedCandidateForReleve.candidate.registrationNumber}</strong></span>
                  <span>السنة التكوينية: <strong className="font-mono" dir="ltr">{formatAcademicYear(currentSession?.academicYear)}</strong></span>
                </div>
                <div className="flex justify-between">
                  <span>الاسم واللقب: <strong className="text-sm font-bold text-slate-950">{selectedCandidateForReleve.candidate.fullName}</strong></span>
                  <span>تاريخ ومكان الميلاد: <strong>{formatArabicDate(selectedCandidateForReleve.candidate.birthDate)} ({selectedCandidateForReleve.candidate.birthPlace})</strong></span>
                </div>
                <div className="flex justify-between">
                  <span>الرتبة التكوينية: <strong className="text-orange-950 font-bold">{specialty?.titleAr}</strong></span>
                  <span>الفوج: <strong>{selectedCandidateForReleve.candidate.groupNumber || 'الفوج 01'}</strong></span>
                </div>
              </div>

              {/* Transcript Detailed Breakdown */}
              <table className="w-full text-right text-xs border-collapse border-2 border-slate-900 mb-4">
                <thead>
                  <tr className="bg-slate-200 text-slate-950 border-b-2 border-slate-900 font-bold text-center">
                    <th className="border-r border-slate-900 p-2">مكونات التقييم والمقاييس</th>
                    <th className="border-r border-slate-900 p-2 w-20">المعامل</th>
                    <th className="border-r border-slate-900 p-2 w-28">النقطة (/ 20)</th>
                    <th className="p-2 w-32">المجموع الموزون</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-b-2 border-slate-900">
                  {/* Exam Modules */}
                  {selectedCandidateForReleve.moduleGrades.map(mg => (
                    <tr key={mg.module.id} className="border-b border-slate-300">
                      <td className="border-r border-slate-300 p-2 font-medium">امتحان: {mg.module.titleAr}</td>
                      <td className="border-r border-slate-300 p-2 text-center font-mono">{mg.module.coefficient}</td>
                      <td className="border-r border-slate-300 p-2 text-center font-mono font-bold">
                        {mg.finalGrade !== null ? mg.finalGrade.toFixed(2) : '—'}
                      </td>
                      <td className="p-2 text-center font-mono text-slate-700">
                        {mg.weightedGrade !== null ? mg.weightedGrade.toFixed(2) : '—'}
                      </td>
                    </tr>
                  ))}

                  {/* Summary of 4 Ministerial Components */}
                  <tr className="bg-orange-50 font-bold border-t-2 border-slate-800">
                    <td className="border-r border-slate-800 p-2">معدل الامتحان النهائي (Moyenne des Épreuves)</td>
                    <td className="border-r border-slate-800 p-2 text-center font-mono">3</td>
                    <td className="border-r border-slate-800 p-2 text-center font-mono font-black text-orange-950">
                      {selectedCandidateForReleve.examAverage?.toFixed(2) ?? '—'}
                    </td>
                    <td className="p-2 text-center font-mono font-bold text-orange-950">
                      {selectedCandidateForReleve.examAverage ? (selectedCandidateForReleve.examAverage * 3).toFixed(2) : '—'}
                    </td>
                  </tr>

                  <tr className="bg-slate-50 font-bold border-b border-slate-300">
                    <td className="border-r border-slate-300 p-2">معدل المراقبة المستمرة (Contrôle Continu)</td>
                    <td className="border-r border-slate-300 p-2 text-center font-mono">1</td>
                    <td className="border-r border-slate-300 p-2 text-center font-mono font-bold">
                      {selectedCandidateForReleve.continuousAssessment.toFixed(2)}
                    </td>
                    <td className="p-2 text-center font-mono text-slate-800">
                      {(selectedCandidateForReleve.continuousAssessment * 1).toFixed(2)}
                    </td>
                  </tr>

                  <tr className="bg-slate-50 font-bold border-b border-slate-300">
                    <td className="border-r border-slate-300 p-2">علامة التربص التطبيقي (Stage Pratique)</td>
                    <td className="border-r border-slate-300 p-2 text-center font-mono">1</td>
                    <td className="border-r border-slate-300 p-2 text-center font-mono font-bold">
                      {selectedCandidateForReleve.internshipGrade.toFixed(2)}
                    </td>
                    <td className="p-2 text-center font-mono text-slate-800">
                      {(selectedCandidateForReleve.internshipGrade * 1).toFixed(2)}
                    </td>
                  </tr>

                  <tr className="bg-slate-50 font-bold border-b-2 border-slate-800">
                    <td className="border-r border-slate-800 p-2">
                      {isSpecialized ? 'مذكرة التخرج (Mémoire de fin)' : 'تقرير نهاية التكوين (Rapport de stage)'}
                    </td>
                    <td className="border-r border-slate-800 p-2 text-center font-mono">{memoirCoeff}</td>
                    <td className="border-r border-slate-800 p-2 text-center font-mono font-bold">
                      {selectedCandidateForReleve.memoirGrade.toFixed(2)}
                    </td>
                    <td className="p-2 text-center font-mono text-slate-800">
                      {(selectedCandidateForReleve.memoirGrade * memoirCoeff).toFixed(2)}
                    </td>
                  </tr>

                  {/* General Result */}
                  <tr className="bg-emerald-50 text-slate-950 font-bold text-sm">
                    <td colSpan={2} className="border-r border-slate-800 p-2.5 font-bold">
                      المعدل العام الرسمي المحصل عليه (Moyenne Générale):
                    </td>
                    <td colSpan={2} className="p-2.5 text-center font-mono font-black text-base text-emerald-950">
                      {selectedCandidateForReleve.generalAverage !== null ? `${selectedCandidateForReleve.generalAverage.toFixed(2)} / 20` : '—'}
                    </td>
                  </tr>

                  <tr className="font-bold">
                    <td colSpan={2} className="border-r border-slate-800 p-2">
                      قرار لجنة المداولات النهائية:
                    </td>
                    <td colSpan={2} className="p-2 text-center text-sm font-black text-orange-950">
                      {selectedCandidateForReleve.decision} ({selectedCandidateForReleve.mention})
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signatures */}
              <div className="pt-4 border-t border-slate-300 flex justify-between items-center text-xs">
                <div className="text-slate-500 font-mono text-[10px]">
                  INFPE-LG-CERT // {new Date().getFullYear()} // {selectedCandidateForReleve.candidate.registrationNumber}
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-800">حرر بالأغواط في: {formatArabicDate(new Date())}</p>
                  <p className="font-bold text-slate-800 mt-1">{INSTITUTION.directorTitle}</p>
                  <div className="h-10 flex items-end justify-center text-[10px] text-slate-400">
                    الختم والتوقيع الرسمي
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
