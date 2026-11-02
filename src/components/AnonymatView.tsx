import React, { useState } from 'react';
import { 
  KeyRound, 
  Lock, 
  Unlock, 
  Printer, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Download, 
  RefreshCw, 
  FileText, 
  Search, 
  CheckCircle2, 
  ScanBarcode, 
  Layers, 
  Tag, 
  Scissors, 
  ShieldAlert, 
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import type { Candidate, ExamModule, AnonymatMapping } from '../utils/crypto-anonymat';
import { generateAnonymatCodes } from '../utils/crypto-anonymat';
import type { AppDatabaseState } from '../db/sqlite-manager';
import { PrintableExamPaper } from './PrintableExamPaper';
import { PrintAnswerSheet } from './PrintAnswerSheet';
import { PrintAnonymatStickers } from './PrintAnonymatStickers';
import { PrintConcordanceReport } from './PrintConcordanceReport';

interface AnonymatViewProps {
  dbState: AppDatabaseState;
  onUpdateAnonymat: (mappings: AnonymatMapping[]) => void;
  onAddAuditLog: (action: string, details: string, severity?: 'info' | 'warning' | 'security') => void;
}

type ModalViewType = 'single_answer_sheet' | 'batch_answer_sheets' | 'stickers' | 'concordance_report' | null;

export const AnonymatView: React.FC<AnonymatViewProps> = ({
  dbState,
  onUpdateAnonymat,
  onAddAuditLog
}) => {
  const currentSession = dbState.sessions.find(s => s.id === dbState.currentSessionId) || dbState.sessions[0];
  const specialty = dbState.specialties.find(sp => sp.id === currentSession?.specialtyId);
  const candidates = dbState.candidates.filter(c => c.specialtyId === currentSession?.specialtyId);
  const modules = dbState.modules.filter(m => m.specialtyId === currentSession?.specialtyId);

  const [selectedModuleId, setSelectedModuleId] = useState<string>(modules[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [revealNames, setRevealNames] = useState(false);
  const [securityKeyInput, setSecurityKeyInput] = useState(dbState.secretKey);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalViewType>(null);
  const [selectedCandidateForSheet, setSelectedCandidateForSheet] = useState<Candidate | null>(null);
  const [paperFormat, setPaperFormat] = useState<'A4' | 'A3'>('A4');

  // Barcode scanner simulator state
  const [scanInput, setScanInput] = useState('');
  const [scannedResult, setScannedResult] = useState<{
    candidate?: Candidate;
    module?: ExamModule;
    mapping?: AnonymatMapping;
  } | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const selectedModule = modules.find(m => m.id === selectedModuleId) || modules[0];
  const currentModuleMappings = dbState.anonymatMappings.filter(m => m.moduleId === selectedModule?.id);

  // Generate or re-generate all anonymat codes (Step 2)
  const handleGenerateAllAnonymat = () => {
    if (candidates.length === 0 || modules.length === 0) {
      setNotification({ type: 'error', message: 'يجب تسجيل المترشحين والمقاييس أولاً قبل توليد التشفير.' });
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      const allMappings: AnonymatMapping[] = [];

      modules.forEach(mod => {
        const modMappings = generateAnonymatCodes(candidates, mod.id, currentSession?.id, securityKeyInput);
        allMappings.push(...modMappings);
      });

      onUpdateAnonymat(allMappings);
      onAddAuditLog(
        'توليد التشفير وأرقام الإغفال السرية',
        `تم تشفير ${allMappings.length} ورقة إجابة بخوارزمية غير خطية مستقلة لمصلحة الامتحانات.`,
        'security'
      );
      setIsGenerating(false);
      setNotification({
        type: 'success',
        message: `تم بنجاح توليد أرقام الإغفال السرية لـ ${allMappings.length} ورقة وحفظها في الخزينة المحصنة!`
      });
    }, 200);
  };

  // Filter mappings for table
  const filteredRows = currentModuleMappings.map(mapping => {
    const cand = candidates.find(c => c.id === mapping.candidateId);
    return { mapping, candidate: cand };
  }).filter(row => {
    if (!row.candidate) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      row.mapping.anonymatCode.toLowerCase().includes(term) ||
      (revealNames && row.candidate.fullName.toLowerCase().includes(term)) ||
      (revealNames && row.candidate.registrationNumber.toLowerCase().includes(term))
    );
  });

  // Handle barcode scanner input
  const handleScanCode = (code: string) => {
    const clean = code.trim().replace(/^\*|\*$/g, '').replace('INFPE-', '');
    const found = dbState.anonymatMappings.find(m => m.anonymatCode === clean || clean.includes(m.anonymatCode));
    if (found) {
      const cand = candidates.find(c => c.id === found.candidateId);
      const mod = modules.find(m => m.id === found.moduleId);
      setScannedResult({ candidate: cand, module: mod, mapping: found });
      onAddAuditLog('مسح باركود إغفال', `تم مسح والتحقق من كود الإغفال: ${found.anonymatCode}`);
    } else {
      setScannedResult(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Notification banner */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between ${
          notification.type === 'success'
            ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
            : notification.type === 'error'
            ? 'bg-rose-100 text-rose-950 border-rose-300'
            : 'bg-blue-100 text-blue-950 border-blue-300'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-slate-600 hover:text-slate-900 px-2 font-black cursor-pointer">✕</button>
        </div>
      )}

      {/* Top Banner: Examination Anonymat Service Protocol */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>بروتوكول الأمانة والتشفير الصارم (Centre d'Anonymat ONEC)</span>
              </span>
              <span className="bg-slate-800 text-slate-300 text-[11px] px-2.5 py-0.5 rounded-full font-mono-code border border-slate-700">
                فصل تام: أوراق الإجراء ⟷ وثائق التشفير
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold font-cairo text-white">
              أمانة مركز التجميع والتشفير والإغفال
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-3xl leading-relaxed">
              المترشح في قاعة الإجراء لا يرى رقم إغفاله إطلاقاً. يتم توليد أرقام الإغفال ولواصق الباركود المزدوجة حصراً داخل مصلحة الامتحانات بعد جمع الأوراق وقبل عملية القص والفصل.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 w-full lg:w-auto">
            {/* Secret Key Input & Encryption Button */}
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-xl p-2 text-xs">
              <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-300 text-[11px] whitespace-nowrap">مفتاح التشفير:</span>
              <input
                type="password"
                value={securityKeyInput}
                onChange={(e) => setSecurityKeyInput(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-amber-300 rounded px-2 py-1 font-mono-code text-xs w-28 focus:outline-none focus:ring-1 focus:ring-amber-500"
                title="مفتاح التشفير السري المحفوظ في الخزينة"
              />
            </div>

            <button
              onClick={handleGenerateAllAnonymat}
              disabled={isGenerating}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{dbState.anonymatMappings.length > 0 ? 'إعادة توليد التشفير وتحديث الخزنة' : 'توليد أرقام الإغفال الآن'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4-Stage Operational Protocol Stepper (أبواب العمل الأمني) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Step 1: Blank & Candidate Answer Sheets for Exam Halls */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono-code font-bold bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded">
                المرحلة 01 • قبل الإجراء
              </span>
              <FileText className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">أوراق الإجابة الصامتة</h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              أوراق الإجراء الرسمية ذات اللسان القابل للقص. خالية 100% من أي رقم إغفال لتوزيعها في القاعات.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
            <button
              onClick={() => {
                setSelectedCandidateForSheet(null);
                setActiveModal('single_answer_sheet');
              }}
              className="w-full py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-lg transition text-center cursor-pointer"
            >
              طباعة نموذج رسمي فارغ للقاعة
            </button>
            <button
              onClick={() => {
                if (candidates.length > 0) {
                  setSelectedCandidateForSheet(candidates[0]);
                  setActiveModal('single_answer_sheet');
                }
              }}
              className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition text-center cursor-pointer"
            >
              طباعة استمارات المترشحين الاسمية
            </button>
          </div>
        </div>

        {/* Step 2: Anonymat Vault Status */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono-code font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                المرحلة 02 • بعد جمع الأوراق
              </span>
              <KeyRound className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">تشفير الخزينة المغفلة</h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              توليد أرقام الإغفال غير الخطية لكل مقياس ومترشح بشكل مستقل ومحكم، وتشفير الباركود الضوئي.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">الأوراق المشفرة:</span>
              <strong className="font-mono-code text-slate-900">
                {currentModuleMappings.length} / {candidates.length}
              </strong>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all"
                style={{ width: `${candidates.length > 0 ? (currentModuleMappings.length / candidates.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Step 3: Twin Stickers for Flap & Paper */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono-code font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                المرحلة 03 • قبل القص
              </span>
              <Tag className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">لواصق الإغفال المزدوجة</h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              طباعة قسائم التشفير المزدوجة بالباركود: قسيمة (أ) للسان، وقسيمة (ب) للورقة لتثبيتها قبل القص.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setActiveModal('stickers')}
              disabled={currentModuleMappings.length === 0}
              className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة لواصق الإغفال بالباركود</span>
            </button>
          </div>
        </div>

        {/* Step 4: Secret Concordance Register */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono-code font-bold bg-red-100 text-red-900 px-2 py-0.5 rounded">
                المرحلة 04 • للخزنة الفولاذية
              </span>
              <Lock className="w-4 h-4 text-red-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">جدول المطابقة السري</h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              محضر المطابقة السري (Bordereau de Concordance) المخصص للحفظ المشمع في خزينة رئيس المركز.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setActiveModal('concordance_report')}
              disabled={currentModuleMappings.length === 0}
              className="w-full py-2 px-3 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة محضر المطابقة السري</span>
            </button>
          </div>
        </div>
      </div>

      {/* Module Selector & Secrecy Control Strip */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Module Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap ml-2">المقياس المختار:</span>
          {modules.map(mod => {
            const countForMod = dbState.anonymatMappings.filter(m => m.moduleId === mod.id).length;
            const isSelected = mod.id === selectedModule?.id;
            return (
              <button
                key={mod.id}
                onClick={() => setSelectedModuleId(mod.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{mod.titleAr}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono-code ${
                  isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-800'
                }`}>
                  {countForMod}
                </span>
              </button>
            );
          })}
        </div>

        {/* Security Toggle: Reveal Candidate Names */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const nextState = !revealNames;
              setRevealNames(nextState);
              if (nextState) {
                onAddAuditLog('كشف هوية المترشحين بالأمانة', 'تم تفعيل كشف الأسماء الصريحة بجدول المطابقة', 'warning');
                setNotification({
                  type: 'info',
                  message: 'تم تفعيل كشف الأسماء الصريحة لأعضاء لجنة التشفير المعتمدين.'
                });
              } else {
                setNotification({
                  type: 'info',
                  message: 'تم إعادة حجب الأسماء وتفعيل الحماية الأمنية القصوى.'
                });
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
              revealNames
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            {revealNames ? <EyeOff className="w-3.5 h-3.5 text-amber-800" /> : <Eye className="w-3.5 h-3.5 text-slate-600" />}
            <span>{revealNames ? 'حجب الأسماء (الوضع المشفر الآمن)' : 'كشف الأسماء (خاص برئيس المركز)'}</span>
          </button>
        </div>
      </div>

      {/* Barcode Optical Scanner Tool */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-4 text-white shadow-sm flex flex-wrap items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ScanBarcode className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">الماسح الضوئي للتحقق من ألسنة ولواصق الإغفال (Laser Scanner)</h4>
            <p className="text-[11px] text-slate-400">امسح باركود أي قسيمة أو لسان مقصوص للتحقق الفوري من سلامة التشفير ومطابقته.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="امسح الباركود أو أدخل رقم الإغفال..."
            value={scanInput}
            onChange={(e) => {
              setScanInput(e.target.value);
              handleScanCode(e.target.value);
            }}
            className="px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-amber-300 font-mono-code focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
          />
          {scannedResult && (
            <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded text-xs text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>المترشح: <strong>{scannedResult.candidate?.fullName}</strong> ({scannedResult.candidate?.registrationNumber})</span>
            </div>
          )}
        </div>
      </div>

      {/* Secret Anonymat Table with Search */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-xs">
              سجل التشفير وأرقام الإغفال لمقياس: <span className="text-emerald-700">{selectedModule?.titleAr}</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono-code">({filteredRows.length} ورقة)</span>
          </div>

          <div className="w-64 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="بحث برقم الإغفال أو الاسم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono-code"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">#</th>
                <th className="py-2.5 px-3">رقم الإغفال السري (Anonymat)</th>
                <th className="py-2.5 px-3 text-center">الباركود المشفر</th>
                <th className="py-2.5 px-3 text-center">بصمة التحقق (SIG)</th>
                <th className="py-2.5 px-4">
                  {revealNames ? 'اللقب والاسم الكامل للمترشح' : 'هوية المترشح (محجوبة أمنياً بالخزينة)'}
                </th>
                <th className="py-2.5 px-3">رقم التسجيل</th>
                <th className="py-2.5 px-3">الفوج والقاعة</th>
                <th className="py-2.5 px-3 text-center">ورقة الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    لم يتم توليد أرقام الإغفال لهذا المقياس حتى الآن. انقر على "توليد أرقام الإغفال الآن" بالأعلى.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={row.mapping.anonymatCode} className="hover:bg-slate-50 transition">
                    <td className="py-2 px-3 text-center font-mono-code text-slate-400 text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-mono-code font-extrabold text-sm text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                        {row.mapping.anonymatCode}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-mono-code text-[11px] text-slate-600">
                      {row.mapping.barcodePayload}
                    </td>
                    <td className="py-2 px-3 text-center font-mono-code text-[11px] text-slate-500">
                      <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                        {row.mapping.checksum}
                      </span>
                    </td>
                    <td className="py-2 px-4 font-bold">
                      {revealNames ? (
                        <span className="text-slate-900 text-sm">{row.candidate?.fullName}</span>
                      ) : (
                        <span className="text-slate-400 font-mono-code italic tracking-widest text-xs flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>•••••••••••••••••••••</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono-code text-slate-600">
                      {revealNames ? row.candidate?.registrationNumber : '••••/••••/•••'}
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      {row.candidate?.groupNumber} • {row.candidate?.roomNumber}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedCandidateForSheet(row.candidate!);
                          setActiveModal('single_answer_sheet');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1 rounded text-xs font-semibold border border-slate-300 transition flex items-center justify-center gap-1 mx-auto cursor-pointer"
                        title="معاينة وطباعة ورقة الإجابة الصامتة لهذا المترشح"
                      >
                        <FileText className="w-3 h-3 text-indigo-700" />
                        <span>ورقة الإجراء</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ANSWER SHEET PREVIEW (SILENT EXAM PAPER FOR CANDIDATE)           */}
      {/* ========================================================================= */}
      {activeModal === 'single_answer_sheet' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-start p-2 md:p-4 overflow-y-auto">
          <div className="w-full max-w-4xl">
            <PrintAnswerSheet
              candidate={selectedCandidateForSheet}
              module={selectedModule}
              sessionTitle={currentSession?.name || ''}
              specialtyTitle={specialty?.titleAr || ''}
              defaultFormat={paperFormat}
              isBlankSheet={!selectedCandidateForSheet}
              onClose={() => setActiveModal(null)}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TWIN ANONYMAT STICKERS PRINT VIEW                                */}
      {/* ========================================================================= */}
      {activeModal === 'stickers' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-start p-2 md:p-4 overflow-y-auto">
          <div className="w-full max-w-5xl">
            <PrintAnonymatStickers
              module={selectedModule}
              sessionTitle={currentSession?.name || ''}
              specialtyTitle={specialty?.titleAr || ''}
              mappings={currentModuleMappings}
              candidates={candidates}
              onClose={() => setActiveModal(null)}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SECRET CONCORDANCE REGISTER (BORDEREAU DE CONCORDANCE)           */}
      {/* ========================================================================= */}
      {activeModal === 'concordance_report' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-start p-2 md:p-4 overflow-y-auto">
          <div className="w-full max-w-6xl">
            <PrintConcordanceReport
              module={selectedModule}
              sessionTitle={currentSession?.name || ''}
              specialtyTitle={specialty?.titleAr || ''}
              mappings={currentModuleMappings}
              candidates={candidates}
              onClose={() => setActiveModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
