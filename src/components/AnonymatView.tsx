import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  KeyRound, 
  Lock, 
  Unlock, 
  Printer, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Download, 
  Upload, 
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
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  UserX,
  Keyboard,
  RotateCcw,
  Sparkles,
  Info,
  Check,
  Building2,
  FileCheck2,
  BadgeAlert
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Candidate, ExamModule, AnonymatMapping, GradeRecord } from '../utils/crypto-anonymat';
import { generateAnonymatCodes } from '../utils/crypto-anonymat';
import type { AppDatabaseState, SecretariatMember } from '../db/sqlite-manager';
import { INSTITUTION } from '../constants/branding';
import { formatArabicDate, formatAcademicYear } from '../utils/date-formatter';
import { triggerPrintWithDynamicTitle } from '../utils/print-utils';
import { PrintAnswerSheet } from './PrintAnswerSheet';
import { PrintAnonymatStickers } from './PrintAnonymatStickers';
import { PrintConcordanceReport } from './PrintConcordanceReport';

interface AnonymatViewProps {
  dbState: AppDatabaseState;
  initialSubTab?: 'encryption_vault' | 'stickers_papers' | 'correcteur_pack' | 'grading_entry' | 'concordance_vault';
  onUpdateAnonymat: (mappings: AnonymatMapping[]) => void;
  onUpdateGrades: (grades: GradeRecord[]) => void;
  onAddAuditLog: (action: string, details: string, severity?: 'info' | 'warning' | 'security') => void;
}

type ModalViewType = 'single_answer_sheet' | 'stickers' | 'concordance_report' | 'correcteur_sheet' | 'pv_codage' | 'pv_levee' | null;

export const AnonymatView: React.FC<AnonymatViewProps> = ({
  dbState,
  initialSubTab = 'encryption_vault',
  onUpdateAnonymat,
  onUpdateGrades,
  onAddAuditLog
}) => {
  const currentSession = dbState.sessions.find(s => s.id === dbState.currentSessionId) || dbState.sessions[0];
  const specialty = dbState.specialties.find(sp => sp.id === currentSession?.specialtyId);
  const candidates = dbState.candidates.filter(c => c.specialtyId === currentSession?.specialtyId);
  const modules = dbState.modules.filter(m => m.specialtyId === currentSession?.specialtyId);

  // Sub-tabs navigation
  const [activeSubTab, setActiveSubTab] = useState<'encryption_vault' | 'stickers_papers' | 'correcteur_pack' | 'grading_entry' | 'concordance_vault'>(
    initialSubTab
  );

  // Active module selector
  const [selectedModuleId, setSelectedModuleId] = useState<string>(modules[0]?.id || '');
  const selectedModule = modules.find(m => m.id === selectedModuleId) || modules[0];

  // Anonymat mappings for this module
  const currentModuleMappings = dbState.anonymatMappings.filter(m => m.moduleId === selectedModule?.id);

  // Security & Vault states
  const [securityKeyInput, setSecurityKeyInput] = useState<string>(dbState.secretKey);
  const [revealNames, setRevealNames] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeModal, setActiveModal] = useState<ModalViewType>(null);
  const [selectedCandidateForSheet, setSelectedCandidateForSheet] = useState<Candidate | null>(null);

  // Barcode scanner simulator state
  const [scanInput, setScanInput] = useState<string>('');
  const [scannedResult, setScannedResult] = useState<{
    candidate?: Candidate;
    module?: ExamModule;
    mapping?: AnonymatMapping;
    isAbsent?: boolean;
    grade?: number | null;
  } | null>(null);

  // Grading Entry States
  const [gradingFilter, setGradingFilter] = useState<'all' | 'pending' | 'completed' | 'absent'>('all');
  const [showNumpad, setShowNumpad] = useState<boolean>(false);
  const [focusedAnonymatCode, setFocusedAnonymatCode] = useState<string | null>(null);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'warning' | 'error' | 'info'; message: string } | null>(null);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Institution settings (from Dashboard)
  const activeDirectorName = dbState.institutionSettings?.directorName || currentSession?.presidentName || INSTITUTION.director;
  const activeDirectorTitle = dbState.institutionSettings?.directorTitle || 'مدير المعهد ورئيس مركز الامتحان';
  const activeSecretariat: SecretariatMember[] = dbState.institutionSettings?.secretariatMembers || [
    { id: 'sec_01', fullName: 'أ. لزهاري أحمد', role: 'مسؤول أمانة المركز والرقابة الإدارية' },
    { id: 'sec_02', fullName: 'أ. قادري فاطمة', role: 'عضو أمانة المركز ومتابعة الأظرفة' },
    { id: 'sec_03', fullName: 'أ. بلعيدي صالح', role: 'عضو أمانة المركز وتدقيق محاضر الحضور' }
  ];

  // Auto dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Sync or get Grade Record for an anonymat code
  const getGradeRecord = (anonymatCode: string): GradeRecord => {
    const existing = dbState.grades.find(g => g.anonymatCode === anonymatCode && g.moduleId === selectedModule?.id);
    if (existing) return existing;

    // Check if candidate is marked absent in candidate list
    const mapping = currentModuleMappings.find(m => m.anonymatCode === anonymatCode);
    const candidate = candidates.find(c => c.id === mapping?.candidateId);
    const isInitiallyAbsent = candidate?.attendanceStatus === 'absent';

    return {
      id: `grade_${anonymatCode}_${selectedModule?.id}`,
      anonymatCode,
      moduleId: selectedModule?.id || '',
      sessionId: currentSession?.id || '',
      finalGrade: null,
      isAbsent: isInitiallyAbsent,
      updatedAt: new Date().toISOString()
    };
  };

  // Grade Change Handler with Instant Auto-Save
  const handleGradeChange = (anonymatCode: string, rawVal: string, skipLogging: boolean = false) => {
    let numVal: number | null = null;
    if (rawVal.trim() !== '') {
      const parsed = parseFloat(rawVal);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= (selectedModule?.maxGrade || 20)) {
        numVal = parsed;
      } else {
        setNotification({
          type: 'error',
          message: `العلامة المدخلة غير مقبولة! يجب أن تكون محصورة بين 0 و ${selectedModule?.maxGrade || 20}`
        });
        return;
      }
    }

    const currentRecord = getGradeRecord(anonymatCode);
    const updatedRecord: GradeRecord = {
      ...currentRecord,
      finalGrade: numVal,
      isAbsent: false,
      updatedAt: new Date().toISOString()
    };

    const existingIndex = dbState.grades.findIndex(
      g => g.anonymatCode === anonymatCode && g.moduleId === selectedModule?.id
    );

    let newGradesList = [...dbState.grades];
    if (existingIndex >= 0) {
      newGradesList[existingIndex] = updatedRecord;
    } else {
      newGradesList.push(updatedRecord);
    }

    // Auto-Save into DB
    onUpdateGrades(newGradesList);
    setLastSavedTimestamp(new Date().toLocaleTimeString('ar-DZ'));

    if (!skipLogging && numVal !== null) {
      onAddAuditLog(
        'حجز وحفظ نقطة الامتحان المغفلة',
        `تم حفظ النقطة (${numVal.toFixed(2)}/20) آلياً للورقة المغفلة: ${anonymatCode} لمقياس: ${selectedModule?.titleAr}`,
        'info'
      );
    }
  };

  // Toggle Absence Handler with Auto-Save
  const handleToggleAbsent = (anonymatCode: string) => {
    const current = getGradeRecord(anonymatCode);
    const isNowAbsent = !current.isAbsent;

    const updated: GradeRecord = {
      ...current,
      isAbsent: isNowAbsent,
      finalGrade: isNowAbsent ? null : current.finalGrade,
      updatedAt: new Date().toISOString()
    };

    const existingIndex = dbState.grades.findIndex(
      g => g.anonymatCode === anonymatCode && g.moduleId === selectedModule?.id
    );

    let newGradesList = [...dbState.grades];
    if (existingIndex >= 0) {
      newGradesList[existingIndex] = updated;
    } else {
      newGradesList.push(updated);
    }

    onUpdateGrades(newGradesList);
    setLastSavedTimestamp(new Date().toLocaleTimeString('ar-DZ'));
    onAddAuditLog(
      'تحديث حالة حضور الورقة',
      `تم تأشير الورقة المغفلة (${anonymatCode}) كـ: ${isNowAbsent ? 'غائب (ورقة مسحوبة)' : 'حاضر'}`,
      'info'
    );
  };

  // Generate All Anonymat Codes
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
        `تم تشفير ${allMappings.length} ورقة إجابة بخوارزمية غير خطية فريدة لمصلحة تنظيم سير المسابقات والإمتحانات.`,
        'security'
      );
      setIsGenerating(false);
      setNotification({
        type: 'success',
        message: `تم بنجاح توليد أرقام الإغفال السرية لـ ${allMappings.length} ورقة وحفظها في الخزينة الفولاذية المحصنة!`
      });
    }, 200);
  };

  // Barcode Scanner Verification
  const handleScanCode = (code: string) => {
    const clean = code.trim().replace(/^\*|\*$/g, '').replace('INFPE-', '');
    const found = currentModuleMappings.find(m => m.anonymatCode === clean || clean.includes(m.anonymatCode));
    if (found) {
      const cand = candidates.find(c => c.id === found.candidateId);
      const gradeRec = getGradeRecord(found.anonymatCode);
      setScannedResult({ 
        candidate: cand, 
        module: selectedModule, 
        mapping: found,
        isAbsent: gradeRec.isAbsent,
        grade: gradeRec.finalGrade
      });
      setFocusedAnonymatCode(found.anonymatCode);
      const el = inputRefs.current[found.anonymatCode];
      if (el) {
        el.focus();
        el.select();
      }
      onAddAuditLog('مسح باركود إغفال', `تم مسح والتحقق من كود الإغفال: ${found.anonymatCode}`);
    } else {
      setScannedResult(null);
    }
  };

  // Export Anonymized Excel Template for Teacher (Strictly No Candidate Names!)
  const handleExportGradeSheetExcel = () => {
    if (!selectedModule) return;

    const rows = currentModuleMappings.map((m, idx) => {
      const rec = getGradeRecord(m.anonymatCode);
      const cand = candidates.find(c => c.id === m.candidateId);
      const isAbsent = rec.isAbsent || cand?.attendanceStatus === 'absent';

      return {
        'الرقم الترتيبي': idx + 1,
        'رقم الإغفال والتشفير': m.anonymatCode,
        'المقياس': selectedModule.titleAr,
        'المعامل': selectedModule.coefficient,
        'نقطة الامتحان (من 20)': isAbsent ? 'غائب' : (rec.finalGrade !== null ? rec.finalGrade : ''),
        'حالة الحضور': isAbsent ? 'غائب (ورقة مسحوبة)' : 'حاضر',
        'ملاحظات الأستاذ المصحح': rec.notes || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'تنقيط أوراق الامتحان المغفلة');

    const fileName = `تنقيط_مغفل_مقياس_${selectedModule.titleAr.replace(/\s+/g, '_')}_${specialty?.titleAr.replace(/\s+/g, '_')}_${formatArabicDate(new Date())}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    onAddAuditLog('تصدير كشف النقاط إكسل للمصحح', `تم تصدير كشف النقاط المغفل لمقياس: ${selectedModule.titleAr}`);
    setNotification({ 
      type: 'success', 
      message: `تم تصدير ملف Excel المغفل للمصحح بنجاح لمقياس: ${selectedModule.titleAr}` 
    });
  };

  // Import Filled Grades from Returned Excel
  const handleImportGradesExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(sheet);

        let importedCount = 0;
        let newGradesList = [...dbState.grades];

        json.forEach(row => {
          const anoCode = row['رقم الإغفال والتشفير'] || row['كود الإغفال'] || row['Code Anonymat'] || row['رقم الإغفال'];
          const rawNote = row['نقطة الامتحان (من 20)'] || row['نقطة الامتحان'] || row['Note /20'] || row['العلامة / 20'] || row['العلامة'];
          const rawNotesField = row['ملاحظات الأستاذ المصحح'] || row['ملاحظات'] || '';
          const attendanceField = String(row['حالة الحضور'] || '').trim();

          const isAbs = attendanceField.includes('غائب') || String(rawNote).trim().includes('غائب');

          if (anoCode) {
            const cleanCode = String(anoCode).trim();
            const parsedGrade = !isAbs && !isNaN(parseFloat(rawNote)) && parseFloat(rawNote) >= 0 && parseFloat(rawNote) <= 20
              ? parseFloat(rawNote)
              : null;

            const existingIdx = newGradesList.findIndex(
              g => g.anonymatCode === cleanCode && g.moduleId === selectedModule?.id
            );

            const rec: GradeRecord = {
              id: `grade_${cleanCode}_${selectedModule?.id}`,
              anonymatCode: cleanCode,
              moduleId: selectedModule?.id || '',
              sessionId: currentSession?.id || '',
              finalGrade: parsedGrade,
              isAbsent: isAbs,
              notes: rawNotesField,
              updatedAt: new Date().toISOString()
            };

            if (existingIdx >= 0) {
              newGradesList[existingIdx] = rec;
            } else {
              newGradesList.push(rec);
            }
            importedCount++;
          }
        });

        // Instant Auto-Save in DB
        onUpdateGrades(newGradesList);
        setLastSavedTimestamp(new Date().toLocaleTimeString('ar-DZ'));
        onAddAuditLog(
          'استيراد نقاط إكسل من المصحح',
          `تم استيراد وحفظ ${importedCount} نقطة بنجاح من ملف الأكسل لمقياس: ${selectedModule?.titleAr}`,
          'security'
        );
        setNotification({
          type: 'success',
          message: `✓ تم استيراد ورصد ${importedCount} علامة بنجاح من ملف Excel، وتم حفظها تلقائياً في قاعدة البيانات!`
        });
      } catch (err) {
        setNotification({
          type: 'error',
          message: 'حدث خطأ أثناء قراءة ملف Excel! يرجى التأكد من تطابق الأعمدة واستخدام القالب المعتمد.'
        });
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Numpad key press handler
  const handleNumpadPress = (digit: string) => {
    if (!focusedAnonymatCode) return;
    const currentRecord = getGradeRecord(focusedAnonymatCode);
    const currentStr = currentRecord.finalGrade !== null ? currentRecord.finalGrade.toString() : '';

    let nextStr = currentStr;
    if (digit === 'DEL') {
      nextStr = nextStr.slice(0, -1);
    } else if (digit === 'CLEAR') {
      nextStr = '';
    } else if (digit === '.') {
      if (!nextStr.includes('.')) {
        nextStr = nextStr === '' ? '0.' : nextStr + '.';
      }
    } else {
      nextStr = nextStr + digit;
    }

    handleGradeChange(focusedAnonymatCode, nextStr, true);
  };

  // Keyboard navigation up / down
  const handleKeyDownOnGrade = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentIndex < currentModuleMappings.length - 1) {
        const nextCode = currentModuleMappings[currentIndex + 1].anonymatCode;
        setFocusedAnonymatCode(nextCode);
        inputRefs.current[nextCode]?.focus();
        inputRefs.current[nextCode]?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentIndex > 0) {
        const prevCode = currentModuleMappings[currentIndex - 1].anonymatCode;
        setFocusedAnonymatCode(prevCode);
        inputRefs.current[prevCode]?.focus();
        inputRefs.current[prevCode]?.select();
      }
    }
  };

  // Metrics for grading progress
  const gradingMetrics = useMemo(() => {
    let completed = 0;
    let absent = 0;
    let pending = 0;
    let eliminatory = 0;

    currentModuleMappings.forEach(m => {
      const rec = getGradeRecord(m.anonymatCode);
      if (rec.isAbsent) {
        absent++;
      } else if (rec.finalGrade !== null) {
        completed++;
        if (rec.finalGrade < 5.0) {
          eliminatory++;
        }
      } else {
        pending++;
      }
    });

    const total = currentModuleMappings.length;
    const percentage = total > 0 ? Math.round(((completed + absent) / total) * 100) : 0;

    return { total, completed, absent, pending, eliminatory, percentage };
  }, [currentModuleMappings, dbState.grades]);

  // Filtered rows for vault table
  const filteredVaultRows = currentModuleMappings.map(mapping => {
    const cand = candidates.find(c => c.id === mapping.candidateId);
    const rec = getGradeRecord(mapping.anonymatCode);
    return { mapping, candidate: cand, gradeRec: rec };
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

  // Filtered rows for grading entry
  const filteredGradingRows = currentModuleMappings.map((mapping, idx) => {
    const cand = candidates.find(c => c.id === mapping.candidateId);
    const rec = getGradeRecord(mapping.anonymatCode);
    return { index: idx + 1, mapping, candidate: cand, rec };
  }).filter(row => {
    if (gradingFilter === 'pending') {
      if (row.rec.finalGrade !== null || row.rec.isAbsent) return false;
    } else if (gradingFilter === 'completed') {
      if (row.rec.finalGrade === null || row.rec.isAbsent) return false;
    } else if (gradingFilter === 'absent') {
      if (!row.rec.isAbsent) return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        row.mapping.anonymatCode.toLowerCase().includes(term) ||
        (revealNames && row.candidate?.fullName.toLowerCase().includes(term))
      );
    }
    return true;
  });

  // Reusable 5-Line Algerian Administrative Header with Black Logo
  const renderOfficialDocHeader = (subtitle?: string) => (
    <div className="border-b-2 border-black pb-2 mb-3">
      <div className="flex items-center justify-between">
        <div className="text-right flex-1">
          <h2 className="font-bold text-xs leading-tight">{INSTITUTION.republic}</h2>
          <h3 className="font-bold text-[11px] text-slate-800 leading-tight">{INSTITUTION.ministry}</h3>
          <h3 className="font-bold text-xs text-black mt-0.5 leading-tight">{INSTITUTION.name}</h3>
          <p className="text-[10px] text-slate-700 font-semibold">{INSTITUTION.deputyDirectorate} • {INSTITUTION.service}</p>
        </div>
        <div className="shrink-0 pl-3">
          <img 
            src={INSTITUTION.logoBlack} 
            alt="شعار المعهد" 
            className="h-14 w-auto object-contain filter contrast-125"
          />
        </div>
      </div>
      {subtitle && (
        <div className="text-center mt-1 border-t border-slate-300 pt-1">
          <span className="text-[10px] text-slate-700 font-bold">{subtitle}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Dynamic Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between shadow-xs ${
          notification.type === 'success'
            ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
            : notification.type === 'error'
            ? 'bg-rose-100 text-rose-950 border-rose-300'
            : notification.type === 'warning'
            ? 'bg-amber-100 text-amber-950 border-amber-300'
            : 'bg-blue-100 text-blue-950 border-blue-300'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-700" />}
            {notification.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-700" />}
            {notification.type === 'error' && <BadgeAlert className="w-4 h-4 text-rose-700" />}
            <span>{notification.message}</span>
          </div>
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
              <span className="bg-slate-800 text-slate-300 text-[11px] px-2.5 py-0.5 rounded-full font-mono border border-slate-700">
                فصل تام: أوراق الإجراء ⟷ وثائق التشفير ⟷ مصححو المقياس
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold font-cairo text-white">
              أمانة مركز التجميع والتشفير والإغفال ورصد النقاط
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-3xl leading-relaxed">
              توليد أرقام الإغفال غير الخطية، طباعة أوراق الامتحان ولواصق الباركود، تسليم المصحح نسخته الورقية والأكسل، مع الرصد الآلي واليدوي والحفظ التلقائي الفوري.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 w-full lg:w-auto">
            {/* Secret Key Input & Encryption Button */}
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-xl p-2 text-xs">
              <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-300 text-[11px] whitespace-nowrap">مفتاح التشفير السري:</span>
              <input
                type="password"
                value={securityKeyInput}
                onChange={(e) => setSecurityKeyInput(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-amber-300 rounded px-2 py-1 font-mono text-xs w-28 focus:outline-none focus:ring-1 focus:ring-amber-500"
                title="مفتاح التشفير السري المحفوظ في الخزينة الفولاذية"
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

      {/* Sub-Tabs Navigation (Unified Sections) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSubTab('encryption_vault')}
          className={`flex-1 min-w-[170px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'encryption_vault'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Lock className="w-4 h-4 text-amber-400" />
          <span>1. أمانة التشفير وتوليد الإغفال</span>
        </button>

        <button
          onClick={() => setActiveSubTab('stickers_papers')}
          className={`flex-1 min-w-[170px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'stickers_papers'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Tag className="w-4 h-4 text-emerald-400" />
          <span>2. لواصق الإغفال واستمارات الإجراء</span>
        </button>

        <button
          onClick={() => setActiveSubTab('correcteur_pack')}
          className={`flex-1 min-w-[170px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'correcteur_pack'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-blue-400" />
          <span>3. وثائق تسليم المصحح (ورقي + أكسل)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('grading_entry')}
          className={`flex-1 min-w-[170px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer relative ${
            activeSubTab === 'grading_entry'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <FileCheck2 className="w-4 h-4 text-white" />
          <span>4. رصد واستيراد وتدقيق النقاط</span>
          {gradingMetrics.completed > 0 && (
            <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {gradingMetrics.completed}/{gradingMetrics.total}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('concordance_vault')}
          className={`flex-1 min-w-[170px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'concordance_vault'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>5. محاضر المطابقة السري ورفع الإغفال</span>
        </button>
      </div>

      {/* Module Selector Strip (Common to All Tabs) */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap ml-1">المقياس المختار:</span>
          {modules.map(mod => {
            const isSelected = mod.id === selectedModule?.id;
            const countForMod = dbState.anonymatMappings.filter(m => m.moduleId === mod.id).length;
            const gradedForMod = dbState.grades.filter(g => g.moduleId === mod.id && g.finalGrade !== null).length;

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
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-orange-500 text-white' : 'bg-slate-300 text-slate-800'
                }`}>
                  {gradedForMod}/{countForMod}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Auto-save indicator */}
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs text-emerald-800 font-bold">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>الحفظ التلقائي نشط</span>
          {lastSavedTimestamp && (
            <span className="text-[10px] text-emerald-600 font-mono">(آخر حفظ: {lastSavedTimestamp})</span>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: ENCRYPTION VAULT (أمانة التشفير وتوليد الإغفال)                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'encryption_vault' && (
        <div className="space-y-6">
          {/* 4-Stage Operational Protocol Stepper */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Step 1: Blank Answer Sheets */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded">
                    المرحلة 01 • قبل الإجراء
                  </span>
                  <FileText className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">أوراق الإجابة الصامتة</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  أوراق الإجراء الرسمية ذات اللسان القابل للقص، خالية 100% من أرقام الإغفال لتوزيعها في القاعات.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setSelectedCandidateForSheet(null);
                    setActiveModal('single_answer_sheet');
                  }}
                  className="w-full py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-lg transition text-center cursor-pointer"
                >
                  معاينة وطباعة النموذج الفارغ
                </button>
              </div>
            </div>

            {/* Step 2: Vault Status */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
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
                  <strong className="font-mono text-slate-900">
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

            {/* Step 3: Twin Stickers */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
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
                  className="w-full py-1.5 px-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition text-center cursor-pointer"
                >
                  طباعة لواصق الإغفال بالباركود
                </button>
              </div>
            </div>

            {/* Step 4: Secret Concordance Register */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold bg-red-100 text-red-900 px-2 py-0.5 rounded">
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
                  className="w-full py-1.5 px-3 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition text-center cursor-pointer"
                >
                  طباعة محضر المطابقة السري
                </button>
              </div>
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
                className="px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-700 text-amber-300 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
              />
              {scannedResult && (
                <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-800 px-3 py-1 rounded text-xs text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>المترشح: <strong>{scannedResult.candidate?.fullName}</strong> ({scannedResult.candidate?.registrationNumber})</span>
                </div>
              )}
            </div>
          </div>

          {/* Secret Anonymat Table with Search and Security Toggle */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-xs">
                  سجل التشفير وأرقام الإغفال لمقياس: <span className="text-emerald-700 font-bold">{selectedModule?.titleAr}</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">({filteredVaultRows.length} ورقة)</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-64 relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="بحث برقم الإغفال أو الاسم..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-8 pl-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <button
                  onClick={() => {
                    const nextState = !revealNames;
                    setRevealNames(nextState);
                    if (nextState) {
                      onAddAuditLog('كشف هوية المترشحين بالأمانة', 'تم تفعيل كشف الأسماء الصريحة بجدول المطابقة', 'warning');
                      setNotification({
                        type: 'info',
                        message: 'تم تفعيل كشف الأسماء الصريحة لأعضاء أمانة المركز المعتمدين.'
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
                  <span>{revealNames ? 'حجب الأسماء (الوضع المشفر)' : 'كشف الأسماء (خاص برئيس المركز)'}</span>
                </button>
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
                    <th className="py-2.5 px-3">القاعة والفوج</th>
                    <th className="py-2.5 px-3 text-center">حالة الحضور</th>
                    <th className="py-2.5 px-3 text-center">ورقة الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVaultRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        لم يتم توليد أرقام الإغفال لهذا المقياس حتى الآن. انقر على "توليد أرقام الإغفال الآن" بالأعلى.
                      </td>
                    </tr>
                  ) : (
                    filteredVaultRows.map((row, idx) => {
                      const isAbsent = row.gradeRec.isAbsent || row.candidate?.attendanceStatus === 'absent';
                      return (
                        <tr key={row.mapping.anonymatCode} className="hover:bg-slate-50 transition">
                          <td className="py-2 px-3 text-center font-mono text-slate-400 text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-mono font-extrabold text-sm text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                              {row.mapping.anonymatCode}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-600">
                            {row.mapping.barcodePayload}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-500">
                            <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                              {row.mapping.checksum}
                            </span>
                          </td>
                          <td className="py-2 px-4 font-bold">
                            {revealNames ? (
                              <span className="text-slate-900 text-sm">{row.candidate?.fullName}</span>
                            ) : (
                              <span className="text-slate-400 font-mono italic tracking-widest text-xs flex items-center gap-1.5">
                                <Lock className="w-3 h-3 text-slate-400" />
                                <span>•••••••••••••••••••••</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600">
                            {revealNames ? row.candidate?.registrationNumber : '••••/••••/•••'}
                          </td>
                          <td className="py-2 px-3 text-slate-700">
                            {row.candidate?.roomNumber || 'القاعة 01'} • {row.candidate?.groupNumber || 'الفوج 01'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isAbsent ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                غائب (ورقة مسحوبة)
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                حاضر
                              </span>
                            )}
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: STICKERS & EXAM PAPERS (لواصق الإغفال وأوراق الامتحان)          */}
      {/* ========================================================================= */}
      {activeSubTab === 'stickers_papers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Action 1: Twin Stickers */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                  <Tag className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-cairo">
                  لواصق الإغفال المزدوجة بالباركود
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  طباعة قسائم الإغفال المزدوجة (Planches de Stickers A4) بالباركود وكود التحقق الأمني: قسيمة (أ) للسان الهوية، وقسيمة (ب) لصلب ورقة الإجابة. تتيح الفرز حسب القاعات وأظرف الامتحان.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => setActiveModal('stickers')}
                  disabled={currentModuleMappings.length === 0}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>فتح نافذة طباعة اللواصق</span>
                </button>
              </div>
            </div>

            {/* Action 2: Silent Answer Sheets */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-cairo">
                  استمارات أوراق الامتحان الصامتة
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  طباعة نموذج ورقة الإجابة الرسمية المعتمدة ذات اللسان القابل للقص، وشبكة التنقيط المعتمدة. خالية تماماً من أي رقم إغفال مسبق لتوزيعها بأمان في القاعات.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setSelectedCandidateForSheet(null);
                    setActiveModal('single_answer_sheet');
                  }}
                  className="w-full py-2.5 px-4 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>معاينة وطباعة ورقة الامتحان</span>
                </button>
              </div>
            </div>

            {/* Action 3: PV de Codage */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-300 flex items-center justify-center shadow-xs">
                  <Scissors className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-cairo">
                  محضر عملية التشفير وقص الألسنة
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  وثيقة إجرائية رسمية (PV de codage et d'anonymat) تثبت تاريخ وساعة فتح الأظرفة المشمعة، وتثبيت اللواصق، وفصل ألسنة الهوية، بحضور أعضاء الأمانة ورئيس المركز.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => setActiveModal('pv_codage')}
                  disabled={currentModuleMappings.length === 0}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-300" />
                  <span>طباعة محضر قص الألسنة والتشفير</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: CORRECTEUR PACK (وثائق تسليم المصحح ورقي وأكسل)                  */}
      {/* ========================================================================= */}
      {activeSubTab === 'correcteur_pack' && (
        <div className="space-y-6">
          {/* Institutional Process Notice */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-2xl p-5 text-xs text-blue-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
                <Info className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-blue-900 font-cairo">
                  بروتوكول تسليم حزمة المقياس للأستاذ المصحح (حزمة النسختين: ورقية + أكسل)
                </h4>
                <p className="text-slate-700 leading-relaxed">
                  تنفيذاً للتنظيم المعمول به، تسلم للأستاذ المصحح <strong>نسخة ورقية رسمية مشفرة</strong> رفقة حزمة الأوراق المشمعة، و<strong>نسخة ملف Excel مغفل</strong> بنفس أرقام الإغفال. بعد التصحيح، يعيد الأستاذ النسختين للمصلحة لإجراء الاستيراد الرقمي والتدقيق اليدوي من طرف رئيس المصلحة.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Official Printable Paper Sheet */}
            <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-slate-400 shadow-sm flex flex-col justify-between space-y-4 transition">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-300 flex items-center justify-center shadow-xs">
                    <Printer className="w-6 h-6" />
                  </div>
                  <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-300">
                    النسخة الورقية الرسمية
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 font-cairo">
                    جدول تنقيط المصحح المغفل (Bordereau de Notation)
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    وثيقة إدارية رسمية للطباعة والتوقيع اليدوي، تحمل الشعار الأسود للمعهد والترويسة الوزارية الكاملة، خالية 100% من أسماء المترشحين، مخصصة لتدوين النقاط بالأرقام وبالحروف مع توقيع المصحح وختم المركز.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5 font-semibold text-slate-700">
                  <div className="flex justify-between">
                    <span>المقياس التكويني:</span>
                    <strong className="text-black">{selectedModule?.titleAr}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>المعامل والمدة:</span>
                    <span>معامل: {selectedModule?.coefficient} • المدة: {selectedModule ? selectedModule.durationMinutes / 60 : 3} سا</span>
                  </div>
                  <div className="flex justify-between">
                    <span>عدد أوراق الإجابة:</span>
                    <strong className="text-black font-mono">{currentModuleMappings.length} ورقة مشفرة</strong>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <button
                  onClick={() => setActiveModal('correcteur_sheet')}
                  disabled={currentModuleMappings.length === 0}
                  className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-300" />
                  <span>معاينة وطباعة جدول التنقيط الورقي</span>
                </button>
              </div>
            </div>

            {/* Card 2: Anonymized Excel Export */}
            <div className="bg-white rounded-2xl p-6 border-2 border-emerald-200 hover:border-emerald-400 shadow-sm flex flex-col justify-between space-y-4 transition">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-300">
                    النسخة الرقمية أكسل
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 font-cairo">
                    تصدير كشف النقاط المغفل (Excel Anonymisé)
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    توليد وتنزيل ملف Excel منسق جاهز للتسليم للأستاذ المصحح عبر البريد أو فلاشة، يحتوي فقط على أرقام الإغفال وأعمدة التنقيط دون أي بيانات شخصية، لملئه وإعادته لإعادة رفعه بالنظام.
                  </p>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 text-xs space-y-1.5 font-semibold text-emerald-950">
                  <div className="flex justify-between">
                    <span>صيغة الملف:</span>
                    <strong className="font-mono">Microsoft Excel (.xlsx)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>أعمدة الملف:</span>
                    <span>الرقم، كود الإغفال، النقطة / 20، الملاحظات</span>
                  </div>
                  <div className="flex justify-between">
                    <span>سرية الهوية:</span>
                    <strong className="text-emerald-700">محجوبة 100% (أكواد إغفال فقط)</strong>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <button
                  onClick={handleExportGradeSheetExcel}
                  disabled={currentModuleMappings.length === 0}
                  className="flex-1 py-3 px-4 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>تصدير ملف أكسل مغفل للمصحح</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: GRADING ENTRY & SUPERVISION (رصد واستيراد وتدقيق النقاط)         */}
      {/* ========================================================================= */}
      {activeSubTab === 'grading_entry' && (
        <div className="space-y-6">
          {/* Top Control Bar: Import Excel, Filters, and Auto-Save Status */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* Import Excel Button */}
              <label className="relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 shadow-md cursor-pointer transition">
                <Upload className="w-4 h-4" />
                <span>استيراد نقاط المصحح من ملف Excel</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleImportGradesExcel}
                  className="hidden"
                />
              </label>

              {/* Export Blank/Filled Excel */}
              <button
                onClick={handleExportGradeSheetExcel}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                <span>تصدير كشف النقاط (Excel)</span>
              </button>

              {/* Virtual Numpad Toggle */}
              <button
                onClick={() => setShowNumpad(!showNumpad)}
                className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  showNumpad
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                <Keyboard className="w-4 h-4 text-amber-600" />
                <span>لوحة الأرقام اللمسية</span>
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setGradingFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  gradingFilter === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-black'
                }`}
              >
                الكل ({gradingMetrics.total})
              </button>
              <button
                onClick={() => setGradingFilter('pending')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  gradingFilter === 'pending' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-black'
                }`}
              >
                تنتظر الرصد ({gradingMetrics.pending})
              </button>
              <button
                onClick={() => setGradingFilter('completed')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  gradingFilter === 'completed' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-black'
                }`}
              >
                تم رصدها ({gradingMetrics.completed})
              </button>
              <button
                onClick={() => setGradingFilter('absent')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  gradingFilter === 'absent' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-black'
                }`}
              >
                الغيابات ({gradingMetrics.absent})
              </button>
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 block font-semibold">إجمالي الأوراق المشفرة</span>
              <span className="text-xl font-black text-slate-900 font-mono mt-1 block">{gradingMetrics.total}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-emerald-700 block font-semibold">تم رصدها بنجاح</span>
              <span className="text-xl font-black text-emerald-700 font-mono mt-1 block">{gradingMetrics.completed}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-orange-700 block font-semibold">في انتظار الرصد</span>
              <span className="text-xl font-black text-orange-700 font-mono mt-1 block">{gradingMetrics.pending}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-rose-700 block font-semibold">أوراق الغائبين</span>
              <span className="text-xl font-black text-rose-700 font-mono mt-1 block">{gradingMetrics.absent}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 block font-semibold">نسبة إنجاز الرصد</span>
              <span className="text-xl font-black text-blue-700 font-mono mt-1 block">{gradingMetrics.percentage}%</span>
            </div>
          </div>

          {/* Touch Numpad (if toggled) */}
          {showNumpad && (
            <div className="bg-slate-900 text-white p-4 rounded-2xl max-w-sm mx-auto shadow-xl border border-slate-800">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-bold text-amber-300">
                  لوحة إدخال العلامات للمس (الورقة: {focusedAnonymatCode || 'اختر ورقة'})
                </span>
                <button onClick={() => setShowNumpad(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', 'DEL'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleNumpadPress(d)}
                    className="p-3 bg-slate-800 hover:bg-slate-700 active:bg-orange-600 rounded-xl font-mono text-base font-bold transition cursor-pointer"
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Grading Entry Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-800">
                  جدول الرصد اليدوي والرقابة الميدانية لمقياس: <strong className="text-orange-700">{selectedModule?.titleAr}</strong>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">({filteredGradingRows.length} ورقة)</span>
              </div>

              <div className="w-64 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="بحث برقم الإغفال..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-8 pl-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">#</th>
                    <th className="py-2.5 px-4 w-36">رقم الإغفال والتشفير</th>
                    <th className="py-2.5 px-4 w-44">العلامة / 20 (حفظ فوري)</th>
                    <th className="py-2.5 px-3 text-center w-28">حالة الحضور</th>
                    <th className="py-2.5 px-3 text-center w-36">الحالة الإدارية</th>
                    <th className="py-2.5 px-4">ملاحظات التدقيق والمراقبة</th>
                    <th className="py-2.5 px-3 text-center w-24">مفتاح السرية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGradingRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        لا توجد أوراق مطابقة لمعايير البحث والفرز المحددة.
                      </td>
                    </tr>
                  ) : (
                    filteredGradingRows.map((row, idx) => {
                      const isGraded = row.rec.finalGrade !== null;
                      const isAbsent = row.rec.isAbsent;
                      const isEliminatory = isGraded && row.rec.finalGrade! < 5.0;

                      return (
                        <tr 
                          key={row.mapping.anonymatCode} 
                          className={`transition ${
                            focusedAnonymatCode === row.mapping.anonymatCode
                              ? 'bg-amber-50/80'
                              : isAbsent
                              ? 'bg-slate-50/70 text-slate-400'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                            {row.index}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-black text-sm text-slate-900">
                            <span className="bg-slate-100 border border-slate-300 px-2.5 py-1 rounded inline-block">
                              {row.mapping.anonymatCode}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              <input
                                ref={(el) => { inputRefs.current[row.mapping.anonymatCode] = el; }}
                                type="text"
                                disabled={isAbsent}
                                value={row.rec.finalGrade !== null ? row.rec.finalGrade : ''}
                                placeholder={isAbsent ? 'غائب' : '00.00'}
                                onFocus={() => setFocusedAnonymatCode(row.mapping.anonymatCode)}
                                onChange={(e) => handleGradeChange(row.mapping.anonymatCode, e.target.value)}
                                onKeyDown={(e) => handleKeyDownOnGrade(e, idx)}
                                className={`w-24 text-center font-mono font-black text-sm px-2.5 py-1.5 rounded-lg border transition focus:outline-none focus:ring-2 ${
                                  isAbsent
                                    ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed'
                                    : isEliminatory
                                    ? 'bg-rose-50 border-rose-400 text-rose-700 focus:ring-rose-500'
                                    : isGraded
                                    ? 'bg-emerald-50 border-emerald-400 text-emerald-900 focus:ring-emerald-500 font-bold'
                                    : 'bg-white border-slate-300 text-black focus:ring-orange-500'
                                }`}
                              />
                              <span className="text-[11px] font-bold text-slate-400">/ 20</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleAbsent(row.mapping.anonymatCode)}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold transition border cursor-pointer ${
                                isAbsent
                                  ? 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                              }`}
                              title={isAbsent ? 'إلغاء الغياب وتفعيل حجز النقطة' : 'تسجيل الورقة كـ غائب (مسحوبة)'}
                            >
                              {isAbsent ? 'غائب' : 'حاضر'}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isAbsent ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                ورقة غائب مسحوبة
                              </span>
                            ) : isEliminatory ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-400 animate-pulse">
                                نقطة إقصائية (&lt; 05)
                              </span>
                            ) : isGraded ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ✓ تم الرصد والحفظ
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-300">
                                في انتظار الرصد
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 text-xs">
                            {row.rec.notes || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400">
                            {revealNames ? row.candidate?.fullName : '••••••••'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: CONCORDANCE VAULT (محاضر المطابقة السري ورفع الإغفال)           */}
      {/* ========================================================================= */}
      {activeSubTab === 'concordance_vault' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Action 1: Bordereau de Concordance */}
            <div className="bg-white rounded-2xl p-6 border-2 border-red-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shadow-xs">
                    <Lock className="w-6 h-6" />
                  </div>
                  <span className="bg-red-100 text-red-900 text-[10px] font-bold px-2.5 py-1 rounded-full border border-red-300">
                    سري للغاية • الخزينة الفولاذية
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 font-cairo">
                  محضر المطابقة وجدول التشفير السري (Bordereau de Concordance)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  الوثيقة السرية المعتمدة التي تربط بين أرقام الإغفال وهوية المترشحين. تحفظ مشمعة بالشمع الأحمر في خزينة رئيس المركز ولا تفتح إلا وقت المداولات الرسمية بحضور لجنة المركز.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => setActiveModal('concordance_report')}
                  disabled={currentModuleMappings.length === 0}
                  className="w-full py-3 px-4 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>معاينة وطباعة محضر المطابقة السري</span>
                </button>
              </div>
            </div>

            {/* Action 2: PV de Levée d'Anonymat */}
            <div className="bg-white rounded-2xl p-6 border-2 border-slate-900 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-300 flex items-center justify-center shadow-xs">
                    <Unlock className="w-6 h-6" />
                  </div>
                  <span className="bg-slate-100 text-slate-900 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-300">
                    محضر فك الأختام الرسمي
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 font-cairo">
                  محضر رفع الإغفال السري وفك الشمع الأحمر (PV de Levée d'Anonymat)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  يحرر هذا المحضر رسمياً عند نهاية كافة أعمال التصحيح وتثبيت النقاط، لإعلان فك أختام الخزينة الشمعية وإسقاط التشفير، توطئة لعقد جلسة المداولات وإصدار كشوف النقاط.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => setActiveModal('pv_levee')}
                  disabled={currentModuleMappings.length === 0}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-300" />
                  <span>طباعة محضر رفع الإغفال وفك الشمع</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* ========================================================================= */}
      {/* MODAL 4: OFFICIAL BORDEREAU DE NOTATION POUR CORRECTEUR (PRINT & PREVIEW) */}
      {/* ========================================================================= */}
      {activeModal === 'correcteur_sheet' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-start p-2 md:p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-6 md:p-8 font-simplified-arabic text-black">
            <div className="flex items-center justify-between no-print border-b pb-3 mb-4 bg-slate-900 text-white p-3 rounded-xl -mt-2">
              <span className="text-xs font-bold text-amber-300">
                معاينة الطباعة: جدول تنقيط المصحح المغفل الرسمي
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const docTitle = `جدول_تنقيط_المصحح_المغفل_${selectedModule?.titleAr.replace(/\s+/g, '_')}_${formatArabicDate(new Date())}`;
                    triggerPrintWithDynamicTitle(docTitle);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة جدول التنقيط</span>
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>

            {/* Printable Content with Black Logo */}
            <div>
              {renderOfficialDocHeader()}

              <div className="text-center my-3">
                <h1 className="text-base font-black border-2 border-black inline-block px-6 py-1.5 rounded bg-slate-50">
                  جدول رصد علامات الامتحان المغفلة (BORDEREAU DE NOTATION ANONYME)
                </h1>
                <div className="text-xs font-bold text-slate-800 mt-1">
                  خاص بالأستاذ المصحح • امتحان نهاية التكوين لدورة: {formatAcademicYear(currentSession?.academicYear || '2026 / 2027')}
                </div>
              </div>

              {/* Module Metadata Box */}
              <div className="grid grid-cols-2 gap-2 text-xs border border-black p-2.5 rounded mb-3 bg-slate-50 font-semibold">
                <div>الرتبة التكوينية: <strong className="text-black">{specialty?.titleAr}</strong></div>
                <div>مقياس الاختبار: <strong className="text-black">{selectedModule?.titleAr} ({selectedModule?.code})</strong></div>
                <div>المعامل الرسمي: <strong className="font-mono">{selectedModule?.coefficient}</strong></div>
                <div>مدة الاختبار: <strong className="font-mono">{selectedModule ? selectedModule.durationMinutes / 60 : 3} ساعات</strong></div>
                <div>عدد الأوراق المسلمة للمصحح: <strong className="font-mono">{currentModuleMappings.length} ورقة مشفرة</strong></div>
                <div>تاريخ تسليم الأوراق: <strong className="font-mono">{formatArabicDate(new Date())}</strong></div>
              </div>

              {/* Notice to Corrector */}
              <div className="border border-black p-2 rounded text-[11px] bg-slate-50 mb-3 text-slate-800">
                <strong>تنبيه رسمي للأستاذ المصحح:</strong> تُسجل العلامات بدقة على 20 في الخانة المخصصة بالأرقام وبالحروف، دون أي تشطيب أو شطب. في حال وجود ورقة غائب يُشار إليها بعبارة «غائب». تُعاد هذه الوثيقة الموقعة رفقة حزمة أوراق الإجابات وملف الأكسل إلى أمانة المركز فور الانتهاء من التصحيح.
              </div>

              {/* Anonymized Grades Roster */}
              <table className="w-full text-right text-xs border-collapse border border-black mb-4">
                <thead className="bg-slate-100 font-bold border-b border-black">
                  <tr>
                    <th className="border border-black py-1 px-2 text-center w-10">#</th>
                    <th className="border border-black py-1 px-3 w-40 text-center">رقم الإغفال السري</th>
                    <th className="border border-black py-1 px-3 w-28 text-center">العلامة بالأرقام (/20)</th>
                    <th className="border border-black py-1 px-4 text-center">العلامة بالحروف</th>
                    <th className="border border-black py-1 px-3">ملاحظات الأستاذ المصحح</th>
                  </tr>
                </thead>
                <tbody>
                  {currentModuleMappings.map((m, idx) => {
                    const rec = getGradeRecord(m.anonymatCode);
                    const isAbs = rec.isAbsent;
                    return (
                      <tr key={m.anonymatCode} className="border-b border-black h-8">
                        <td className="border border-black py-1 px-2 text-center font-mono">{idx + 1}</td>
                        <td className="border border-black py-1 px-3 font-mono font-bold text-center text-sm">
                          {m.anonymatCode}
                        </td>
                        <td className="border border-black py-1 px-3 text-center font-mono font-bold">
                          {isAbs ? 'غائب' : (rec.finalGrade !== null ? rec.finalGrade.toFixed(2) : '......... / 20')}
                        </td>
                        <td className="border border-black py-1 px-4 text-center text-slate-400">
                          {isAbs ? 'غياب مسجل' : '...................................................'}
                        </td>
                        <td className="border border-black py-1 px-3 text-slate-700">
                          {isAbs ? 'ورقة غائب مسحوبة رسمياً' : (rec.notes || '')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Official Signatures Box */}
              <div className="border border-black p-3 rounded text-xs mt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <span className="font-bold block mb-1">الأستاذ المصحح:</span>
                    <div className="text-[11px] text-slate-700 mb-6">الاسم واللقب: .............................</div>
                    <div className="text-[10px] text-slate-500">التاريخ والتوقيع: ..........................</div>
                  </div>
                  <div>
                    <span className="font-bold block mb-1">رئيس لجنة الأمانة والتشفير:</span>
                    <div className="text-[11px] text-slate-700 mb-6">{activeSecretariat[0]?.fullName}</div>
                    <div className="text-[10px] text-slate-500">(التأشيرة والختم)</div>
                  </div>
                  <div>
                    <span className="font-bold block mb-1">رئيس مركز الامتحان:</span>
                    <div className="text-[11px] text-slate-700 mb-6">{activeDirectorName}</div>
                    <div className="text-[10px] text-slate-500">({activeDirectorTitle})</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: PV DE CODAGE ET D'ANONYMAT                                       */}
      {/* ========================================================================= */}
      {activeModal === 'pv_codage' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-start p-2 md:p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-6 md:p-8 font-simplified-arabic text-black">
            <div className="flex items-center justify-between no-print border-b pb-3 mb-4 bg-slate-900 text-white p-3 rounded-xl -mt-2">
              <span className="text-xs font-bold text-amber-300">
                معاينة الطباعة: محضر عملية التشفير وقص الألسنة
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const docTitle = `محضر_عملية_التشفير_وقص_الألسنة_${selectedModule?.titleAr.replace(/\s+/g, '_')}_${formatArabicDate(new Date())}`;
                    triggerPrintWithDynamicTitle(docTitle);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة المحضر</span>
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>

            {/* Printable PV de Codage */}
            <div>
              {renderOfficialDocHeader()}

              <div className="text-center my-4">
                <h1 className="text-base font-black border-2 border-black inline-block px-6 py-1.5 rounded bg-slate-50">
                  محضر عملية التشفير وفصل ألسنة الهوية (PV DE CODAGE ET D'ANONYMAT)
                </h1>
                <div className="text-xs font-bold text-slate-800 mt-1">
                  دورة: {formatAcademicYear(currentSession?.academicYear || '2026 / 2027')} • مركز: معهد الأغواط
                </div>
              </div>

              <div className="text-xs leading-relaxed space-y-3 p-4 border border-black rounded mb-4">
                <p>
                  في يوم: <strong>{formatArabicDate(new Date())}</strong>، على الساعة: <strong>{new Date().toLocaleTimeString('ar-DZ')}</strong>، اجتمعت اللجنة المكلفة بأمانة التشفير والإغفال بمركز الامتحان بالمعهد الوطني لتكوين موظفي قطاع التربية الوطنية الشيخ زاهية حسين بالأغواط، المكونة من السادة والسيدات أعضاء الأمانة المؤطرين أدناه، وتحت إشراف رئيس المركز السيد: <strong>{activeDirectorName}</strong>.
                </p>
                <p>
                  وقد قامت اللجنة رسمياً باستلام أظرفة أوراق إجابات امتحان مقياس: <strong>{selectedModule?.titleAr}</strong>، المخصصة للرتبة: <strong>{specialty?.titleAr}</strong>، ومطابقة عدد الأوراق الواردة مع محاضر سير الاختبارات بالقاعات.
                </p>
                <p>
                  وبعد التحقق التام، قامت اللجنة بتوليد أرقام الإغفال السرية غير الخطية المشفرة، وتثبيت القسائم المزدوجة بالباركود على لسان الهوية وعلى صلب ورقة الإجابة، ثم قامت بفصل وقص ألسنة الهوية بدقة متناهية، وإيداعها فوراً داخل ظرف سري مشمع بالشمع الأحمر مخصص للحفظ في الخزينة الفولاذية.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs border border-black p-3 rounded mb-4 bg-slate-50 font-semibold">
                <div>إجمالي أوراق الإجابة المستلمة: <strong className="font-mono">{currentModuleMappings.length} ورقة</strong></div>
                <div>أوراق المترشحين الحاضرين: <strong className="font-mono">{gradingMetrics.completed + gradingMetrics.pending} ورقة</strong></div>
                <div>أوراق المترشحين الغائبين (المسحوبة): <strong className="font-mono text-rose-700">{gradingMetrics.absent} ورقة</strong></div>
                <div>حالة الظرف المشمع الحاوي للألسنة: <strong className="text-emerald-800">مشمع ومختوم بالخزينة الفولاذية</strong></div>
              </div>

              {/* Signatures */}
              <div className="border border-black p-3 rounded text-xs mt-6">
                <h4 className="font-bold mb-3 text-center border-b pb-1">أعضاء أمانة المركز ولجنة التشفير الحاضرون:</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {activeSecretariat.map((sec, i) => (
                    <div key={sec.id || i}>
                      <span className="font-bold block">{sec.fullName}</span>
                      <span className="text-[10px] text-slate-600 block">{sec.role}</span>
                      <div className="text-[10px] text-slate-400 mt-5">التوقيع: ....................</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-3 border-t text-center">
                  <span className="font-bold block">رئيس مركز الامتحان</span>
                  <span className="text-xs text-slate-800 font-bold mt-1 block">{activeDirectorName} ({activeDirectorTitle})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: PV DE LEVEE D'ANONYMAT                                           */}
      {/* ========================================================================= */}
      {activeModal === 'pv_levee' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-start p-2 md:p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-6 md:p-8 font-simplified-arabic text-black">
            <div className="flex items-center justify-between no-print border-b pb-3 mb-4 bg-slate-900 text-white p-3 rounded-xl -mt-2">
              <span className="text-xs font-bold text-amber-300">
                معاينة الطباعة: محضر رفع الإغفال السري وفك الشمع الأحمر
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const docTitle = `محضر_رفع_الإغفال_وفك_الشمع_الأحمر_${selectedModule?.titleAr.replace(/\s+/g, '_')}_${formatArabicDate(new Date())}`;
                    triggerPrintWithDynamicTitle(docTitle);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة محضر رفع الإغفال</span>
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>

            {/* Printable PV de Levée */}
            <div>
              {renderOfficialDocHeader()}

              <div className="text-center my-4">
                <h1 className="text-base font-black border-2 border-black inline-block px-6 py-1.5 rounded bg-slate-50">
                  محضر رفع الإغفال وفك الشمع الأحمر (PV DE LEVÉE D'ANONYMAT)
                </h1>
                <div className="text-xs font-bold text-slate-800 mt-1">
                  جلسة المداولات الرسمية لدورة: {formatAcademicYear(currentSession?.academicYear || '2026 / 2027')}
                </div>
              </div>

              <div className="text-xs leading-relaxed space-y-3 p-4 border border-black rounded mb-4">
                <p>
                  في يوم: <strong>{formatArabicDate(new Date())}</strong>، التأمت لجنة الامتحانات والمداولات الرسمية لمركز الامتحان بالمعهد الوطني لتكوين موظفي قطاع التربية الوطنية بالأغواط، برئاسة مدير المعهد ورئيس المركز السيد: <strong>{activeDirectorName}</strong>، وبحضور أعضاء أمانة المركز المذكورين أدناه.
                </p>
                <p>
                  وبعد التأكد التام من استكمال كافة عمليات التصحيح ورصد النقاط لمقياس: <strong>{selectedModule?.titleAr}</strong> لرتبة: <strong>{specialty?.titleAr}</strong>، والتأكد من سلامة الأختام الشمعية لخزينة رئيس المركز، قامت اللجنة رسمياً بفض الشمع الأحمر واستخراج جدول المطابقة السري وألسنة الهوية، ومطابقة كل رقم إغفال سري بهوية المترشح الصريحة.
                </p>
                <p>
                  وتشهد اللجنة بأن عملية رفع الإغفال جرت في كنف السرية والنزاهة التامة ومطابقة محاضر التنقيط، توطئة لصب العلامات في سجل المداولات النهائية واستخراج كشوف النقاط.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs border border-black p-3 rounded mb-4 bg-slate-50 font-semibold">
                <div>عدد الأوراق التي تم رفع إغفالها: <strong className="font-mono">{gradingMetrics.completed} ورقة</strong></div>
                <div>عدد الأوراق المرصودة كـ غياب: <strong className="font-mono text-rose-700">{gradingMetrics.absent} ورقة</strong></div>
                <div>تاريخ وساعة فك الشمع الرسمي: <strong className="font-mono">{formatArabicDate(new Date())} — {new Date().toLocaleTimeString('ar-DZ')}</strong></div>
                <div>الوجهة اللاحقة: <strong>محاضر المداولات الرسمية وقوائم الناجحين</strong></div>
              </div>

              {/* Signatures */}
              <div className="border border-black p-3 rounded text-xs mt-6">
                <h4 className="font-bold mb-3 text-center border-b pb-1">أعضاء لجنة رفع الإغفال وأمانة المركز:</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {activeSecretariat.map((sec, i) => (
                    <div key={sec.id || i}>
                      <span className="font-bold block">{sec.fullName}</span>
                      <span className="text-[10px] text-slate-600 block">{sec.role}</span>
                      <div className="text-[10px] text-slate-400 mt-5">التوقيع: ....................</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-3 border-t text-center">
                  <span className="font-bold block">رئيس مركز الامتحان</span>
                  <span className="text-xs text-slate-800 font-bold mt-1 block">{activeDirectorName} ({activeDirectorTitle})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
