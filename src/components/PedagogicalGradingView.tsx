import React, { useState, useMemo, useRef } from 'react';
import { 
  GraduationCap, 
  Save, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Printer, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  Sparkles, 
  Award,
  Layers,
  ChevronDown,
  Check,
  X,
  FileText,
  Eye,
  RotateCcw,
  Building,
  CheckSquare,
  HelpCircle
} from 'lucide-react';
import type { Candidate, ExamModule } from '../utils/crypto-anonymat';
import type { AppDatabaseState } from '../db/sqlite-manager';
import { INSTITUTION } from '../constants/branding';
import { 
  getRankById, 
  OFFICIAL_RANKS, 
  TRAINING_TRACKS, 
  getRankDeliverableInfo, 
  getRankTotalCoefficients 
} from '../data/promotionsData';
import { formatArabicDate, formatAcademicYear } from '../utils/date-formatter';
import { triggerPrintWithDynamicTitle } from '../utils/print-utils';
import * as XLSX from 'xlsx';

interface PedagogicalGradingViewProps {
  dbState: AppDatabaseState;
  onUpdateCandidates: (candidates: Candidate[]) => void;
  onAddAuditLog: (action: string, details: string, severity?: 'info' | 'warning' | 'security') => void;
  onSwitchSpecialty?: (specialtyId: string) => void;
}

export const PedagogicalGradingView: React.FC<PedagogicalGradingViewProps> = ({
  dbState,
  onUpdateCandidates,
  onAddAuditLog,
  onSwitchSpecialty
}) => {
  // Current session & active rank
  const currentSession = dbState.sessions.find(s => s.id === dbState.currentSessionId) || dbState.sessions[0];
  const currentSpecialtyId = currentSession?.specialtyId || 'dir_sec';
  const currentRank = getRankById(currentSpecialtyId) || OFFICIAL_RANKS[0];
  const deliverableInfo = getRankDeliverableInfo(currentRank);
  const rankModules = currentRank.modules || [];
  const totalCoefficients = getRankTotalCoefficients(currentRank.id) || 1;

  // Active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'continuous_control' | 'overall_pedagogical'>('continuous_control');

  // Modal states & Active print doc target
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);
  const [previewModalDoc, setPreviewModalDoc] = useState<'continuous_control' | 'overall_pedagogical' | null>(null);
  const [activePrintDoc, setActivePrintDoc] = useState<'continuous_control' | 'overall_pedagogical'>('continuous_control');

  // Hidden file input refs for imports
  const importModuleExcelRef = useRef<HTMLInputElement>(null);
  const importInternshipExcelRef = useRef<HTMLInputElement>(null);
  const importMemoirExcelRef = useRef<HTMLInputElement>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [focusedModuleId, setFocusedModuleId] = useState<string>('all');

  // Toast / notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' | 'warning' } | null>(null);
  const showToast = (message: string, type: 'success' | 'info' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Candidates belonging to the currently active rank
  const candidates = useMemo(() => {
    return dbState.candidates.filter(c => c.specialtyId === currentSpecialtyId);
  }, [dbState.candidates, currentSpecialtyId]);

  // Groups present in this rank
  const groups = useMemo(() => {
    return Array.from(new Set(candidates.map(c => c.groupNumber).filter(Boolean)));
  }, [candidates]);

  // ---------------------------------------------------------------------------
  // LOCAL DRAFT GRADES STATE
  // ---------------------------------------------------------------------------
  // 1. Module continuous control grades: candidateId -> { moduleId: grade }
  const [moduleGradesDraft, setModuleGradesDraft] = useState<Record<string, Record<string, number | ''>>>(() => {
    const initial: Record<string, Record<string, number | ''>> = {};
    candidates.forEach(c => {
      initial[c.id] = {};
      rankModules.forEach(m => {
        const stored = c.continuousControlGrades ? c.continuousControlGrades[m.id] : undefined;
        initial[c.id][m.id] = stored !== undefined ? stored : '';
      });
    });
    return initial;
  });

  // 2. Internship and Memoir/Report grades: candidateId -> value
  const [internshipGradesDraft, setInternshipGradesDraft] = useState<Record<string, number | ''>>(() => {
    const initial: Record<string, number | ''> = {};
    candidates.forEach(c => {
      initial[c.id] = c.internshipGrade !== undefined ? c.internshipGrade : '';
    });
    return initial;
  });

  const [memoirGradesDraft, setMemoirGradesDraft] = useState<Record<string, number | ''>>(() => {
    const initial: Record<string, number | ''> = {};
    candidates.forEach(c => {
      initial[c.id] = c.memoirGrade !== undefined ? c.memoirGrade : '';
    });
    return initial;
  });

  // Calculate the continuous control weighted average for a given candidate
  const calculateCandidateCC = (candidateId: string): { weightedSum: number; sumCoeffs: number; average: number | null } => {
    const cGrades = moduleGradesDraft[candidateId] || {};
    let weightedSum = 0;
    let sumCoeffs = 0;
    let hasAnyGrade = false;

    rankModules.forEach(mod => {
      const g = cGrades[mod.id];
      if (g !== undefined && g !== '' && typeof g === 'number' && !isNaN(g)) {
        weightedSum += g * mod.coefficient;
        sumCoeffs += mod.coefficient;
        hasAnyGrade = true;
      }
    });

    if (!hasAnyGrade || sumCoeffs === 0) {
      // If no module grades were entered yet, fallback to candidate's stored continuousAssessment if present
      const fallback = candidates.find(c => c.id === candidateId)?.continuousAssessment;
      if (fallback !== undefined && fallback !== null && !isNaN(fallback)) {
        return { weightedSum: fallback * totalCoefficients, sumCoeffs: totalCoefficients, average: fallback };
      }
      return { weightedSum: 0, sumCoeffs: totalCoefficients, average: null };
    }

    // Normal calculation: divide by total official coefficients of the rank
    const avg = Number((weightedSum / totalCoefficients).toFixed(2));
    return { weightedSum, sumCoeffs: totalCoefficients, average: avg };
  };

  // Helper to parse input grade from user or Excel
  const parseGradeInput = (val: string | number): number | '' => {
    if (val === '' || val === null || val === undefined) return '';
    if (typeof val === 'number') {
      if (isNaN(val)) return '';
      return Math.min(20, Math.max(0, val));
    }
    // Replace comma with dot
    const cleanStr = String(val).replace(',', '.').trim();
    const parsed = parseFloat(cleanStr);
    if (isNaN(parsed)) return '';
    return Math.min(20, Math.max(0, parsed));
  };

  // Handle direct module grade change in Tab 1
  const handleModuleGradeChange = (candidateId: string, moduleId: string, value: string) => {
    const clean = parseGradeInput(value);
    setModuleGradesDraft(prev => ({
      ...prev,
      [candidateId]: {
        ...(prev[candidateId] || {}),
        [moduleId]: clean
      }
    }));
  };

  // Handle internship grade change in Tab 2
  const handleInternshipGradeChange = (candidateId: string, value: string) => {
    const clean = parseGradeInput(value);
    setInternshipGradesDraft(prev => ({
      ...prev,
      [candidateId]: clean
    }));
  };

  // Handle memoir/report grade change in Tab 2
  const handleMemoirGradeChange = (candidateId: string, value: string) => {
    const clean = parseGradeInput(value);
    setMemoirGradesDraft(prev => ({
      ...prev,
      [candidateId]: clean
    }));
  };

  // Filtered candidates for display
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchGroup = selectedGroup === 'all' || c.groupNumber === selectedGroup;
      const matchSearch = !searchTerm || 
        c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.registrationNumber.includes(searchTerm) ||
        (c.originalInstitution && c.originalInstitution.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchGroup && matchSearch;
    });
  }, [candidates, selectedGroup, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    let ccFilledCount = 0;
    let ccSum = 0;
    let internFilledCount = 0;
    let internSum = 0;
    let memoirFilledCount = 0;
    let memoirSum = 0;

    candidates.forEach(c => {
      const cc = calculateCandidateCC(c.id).average;
      if (cc !== null) {
        ccFilledCount++;
        ccSum += cc;
      }

      const intern = internshipGradesDraft[c.id];
      if (typeof intern === 'number') {
        internFilledCount++;
        internSum += intern;
      }

      const mem = memoirGradesDraft[c.id];
      if (typeof mem === 'number') {
        memoirFilledCount++;
        memoirSum += mem;
      }
    });

    const total = candidates.length;
    return {
      total,
      ccFilledCount,
      ccAvg: ccFilledCount > 0 ? (ccSum / ccFilledCount).toFixed(2) : '—',
      internFilledCount,
      internAvg: internFilledCount > 0 ? (internSum / internFilledCount).toFixed(2) : '—',
      memoirFilledCount,
      memoirAvg: memoirFilledCount > 0 ? (memoirSum / memoirFilledCount).toFixed(2) : '—'
    };
  }, [candidates, moduleGradesDraft, internshipGradesDraft, memoirGradesDraft]);

  // ---------------------------------------------------------------------------
  // SAVE ACTION: COMMITS ALL GRADES TO DATABASE
  // ---------------------------------------------------------------------------
  const handleSaveAllGrades = () => {
    const updatedCandidates = dbState.candidates.map(cand => {
      if (cand.specialtyId !== currentSpecialtyId) return cand;

      // Extract continuous control grades mapping
      const cGrades = moduleGradesDraft[cand.id] || {};
      const cleanModuleGrades: Record<string, number> = {};
      rankModules.forEach(m => {
        const val = cGrades[m.id];
        if (typeof val === 'number') {
          cleanModuleGrades[m.id] = val;
        }
      });

      // Calculate weighted CC average
      const ccResult = calculateCandidateCC(cand.id);

      // Extract internship & memoir
      const intern = internshipGradesDraft[cand.id];
      const mem = memoirGradesDraft[cand.id];

      return {
        ...cand,
        continuousControlGrades: cleanModuleGrades,
        continuousAssessment: ccResult.average !== null ? ccResult.average : cand.continuousAssessment,
        internshipGrade: typeof intern === 'number' ? intern : cand.internshipGrade,
        memoirGrade: typeof mem === 'number' ? mem : cand.memoirGrade
      };
    });

    onUpdateCandidates(updatedCandidates);
    onAddAuditLog(
      'حفظ التقييم البيداغوجي',
      `تم تثبيت علامات المراقبة المستمرة (${rankModules.length} مقاييس) وعلامات التربص و${deliverableInfo.labelAr} لرتبة: ${currentRank.titleAr}`
    );
    showToast(`تم حفظ وتثبيت كافة النقاط البيداغوجية لرتبة ${currentRank.titleAr} بنجاح!`, 'success');
  };

  // Quick default simulation fill
  const handleQuickSimulationFill = () => {
    if (!window.confirm('هل ترغب في ملء العلامات الشاغرة بنقاط نموذجية معتمدة لاختبار منظومة الحساب والتقارير؟')) {
      return;
    }

    setModuleGradesDraft(prev => {
      const next = { ...prev };
      candidates.forEach((c, cIdx) => {
        next[c.id] = next[c.id] || {};
        rankModules.forEach((m, mIdx) => {
          if (next[c.id][m.id] === '' || next[c.id][m.id] === undefined) {
            // Realistic simulated grade between 13.0 and 16.5
            const base = 13.5 + ((cIdx + mIdx) % 4) * 0.75;
            next[c.id][m.id] = Number(base.toFixed(2));
          }
        });
      });
      return next;
    });

    setInternshipGradesDraft(prev => {
      const next = { ...prev };
      candidates.forEach((c, cIdx) => {
        if (next[c.id] === '' || next[c.id] === undefined) {
          next[c.id] = 15.0 + (cIdx % 3) * 0.5;
        }
      });
      return next;
    });

    setMemoirGradesDraft(prev => {
      const next = { ...prev };
      candidates.forEach((c, cIdx) => {
        if (next[c.id] === '' || next[c.id] === undefined) {
          next[c.id] = 14.5 + (cIdx % 4) * 0.5;
        }
      });
      return next;
    });

    showToast('تم الملء الافتراضي التجريبي بنجاح! تذكر النقر على "حفظ وتثبيت النقاط" لاعتمادها.', 'info');
  };

  // ---------------------------------------------------------------------------
  // EXCEL EXPORTS
  // ---------------------------------------------------------------------------

  // 1. Export Excel for Continuous Control: either focused on 1 module for a teacher, or all modules
  const handleExportContinuousControlExcel = (forSpecificModuleId?: string) => {
    const isSingle = !!forSpecificModuleId && forSpecificModuleId !== 'all';
    const targetModule = isSingle ? rankModules.find(m => m.id === forSpecificModuleId) : null;

    const wb = XLSX.utils.book_new();

    if (isSingle && targetModule) {
      // Export Sheet specifically designed to hand over to the module professor
      const headers = [
        'رقم التسجيل',
        'اللقب والاسم الكامل للمتكون',
        'الفوج',
        'المؤسسة الأصلية',
        'المقياس',
        'المعامل',
        'علامة المراقبة المستمرة (من 20)',
        'توقيع الأستاذ وملاحظاته'
      ];

      const rows = candidates.map(c => {
        const val = moduleGradesDraft[c.id]?.[targetModule.id];
        return [
          c.registrationNumber,
          c.fullName,
          c.groupNumber || 'الفوج 01',
          c.originalInstitution || '—',
          targetModule.titleAr,
          targetModule.coefficient,
          typeof val === 'number' ? val : '',
          ''
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([
        [INSTITUTION.republic],
        [INSTITUTION.ministry],
        [INSTITUTION.name],
        [`كشف نقاط المراقبة البيداغوجية المستمرة — المقياس: ${targetModule.titleAr} (معامل ${targetModule.coefficient})`],
        [`الرتبة المستهدفة: ${currentRank.titleAr} • الدورة التكوينية: ${formatAcademicYear(currentSession?.academicYear || '2026/2027')}`],
        [],
        headers,
        ...rows,
        [],
        ['', '', '', '', '', 'توقيع وتأشيرة أستاذ المقياس:', '....................................']
      ]);

      ws['!cols'] = [
        { wch: 15 },
        { wch: 30 },
        { wch: 12 },
        { wch: 25 },
        { wch: 30 },
        { wch: 10 },
        { wch: 25 },
        { wch: 25 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'نقاط المقياس');
      const fileName = `كشف_مراقبة_مستمرة_${targetModule.titleAr.replace(/\s+/g, '_')}_${currentRank.titleAr.replace(/\s+/g, '_')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast(`تم تصدير كشف أستاذ المقياس بنجاح: ${targetModule.titleAr}`, 'success');
    } else {
      // Export all modules in a comprehensive sheet
      const headers = [
        'رقم التسجيل',
        'اللقب والاسم الكامل',
        'الفوج',
        ...rankModules.map(m => `${m.titleAr} (معامل ${m.coefficient})`),
        `مجموع النقاط الموزونة (من ${totalCoefficients * 20})`,
        'معدل المراقبة المستمرة (من 20)'
      ];

      const rows = candidates.map(c => {
        const cGrades = moduleGradesDraft[c.id] || {};
        const moduleCols = rankModules.map(m => {
          const val = cGrades[m.id];
          return typeof val === 'number' ? val : '';
        });
        const ccRes = calculateCandidateCC(c.id);

        return [
          c.registrationNumber,
          c.fullName,
          c.groupNumber || 'الفوج 01',
          ...moduleCols,
          ccRes.weightedSum > 0 ? ccRes.weightedSum.toFixed(2) : '',
          ccRes.average !== null ? ccRes.average.toFixed(2) : ''
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([
        [INSTITUTION.republic],
        [INSTITUTION.ministry],
        [INSTITUTION.name],
        [`الكشف الشامل لنقاط المراقبة المستمرة لجميع المقاييس (${rankModules.length} مقياساً - مجموع معاملات ${totalCoefficients})`],
        [`الرتبة: ${currentRank.titleAr} • الدورة: ${formatAcademicYear(currentSession?.academicYear || '2026/2027')}`],
        [],
        headers,
        ...rows
      ]);

      ws['!cols'] = [
        { wch: 15 },
        { wch: 28 },
        { wch: 10 },
        ...rankModules.map(() => ({ wch: 22 })),
        { wch: 20 },
        { wch: 20 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'المراقبة المستمرة الشاملة');
      XLSX.writeFile(wb, `كشف_المراقبة_المستمرة_الشامل_${currentRank.titleAr.replace(/\s+/g, '_')}.xlsx`);
      showToast('تم تصدير الكشف الشامل لجميع مقاييس المراقبة المستمرة بنجاح!', 'success');
    }
  };

  // 2. Export Excel for Practical Internship
  const handleExportInternshipExcel = () => {
    const headers = [
      'رقم التسجيل',
      'اللقب والاسم الكامل للمتكون',
      'الفوج',
      'المؤسسة المستقبلة للتربص',
      'فترة التربص الميداني',
      'المؤطر الميداني',
      'علامة التربص التطبيقي (من 20)',
      'ملاحظات وتأشيرة المؤطر'
    ];

    const rows = candidates.map(c => {
      const val = internshipGradesDraft[c.id];
      return [
        c.registrationNumber,
        c.fullName,
        c.groupNumber || 'الفوج 01',
        c.originalInstitution || 'مؤسسة التربص الميداني',
        currentRank.internshipDuration,
        'أستاذ / مفتش مطبق',
        typeof val === 'number' ? val : '',
        ''
      ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      [INSTITUTION.republic],
      [INSTITUTION.ministry],
      [INSTITUTION.name],
      [`كشف حصر وتقييم علامات التربص التطبيقي الميداني — الرتبة: ${currentRank.titleAr}`],
      [`المدة المقررة: ${currentRank.internshipDuration} (معامل 1 في حساب المداولات)`],
      [],
      headers,
      ...rows
    ]);

    ws['!cols'] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 12 },
      { wch: 28 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 25 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'علامات التربص التطبيقي');
    XLSX.writeFile(wb, `كشف_علامات_التربص_التطبيقي_${currentRank.titleAr.replace(/\s+/g, '_')}.xlsx`);
    showToast('تم تصدير كشف علامات التربص التطبيقي بنجاح!', 'success');
  };

  // 3. Export Excel for Memoir / Report
  const handleExportMemoirExcel = () => {
    const headers = [
      'رقم التسجيل',
      'اللقب والاسم الكامل للمتكون',
      'الفوج',
      'عنوان المذكرة أو تقرير التخرج',
      'الأستاذ المشرف / المؤطر',
      `علامة ${deliverableInfo.labelAr} (من 20)`,
      'تقدير اللجنة والقرار النهائي'
    ];

    const rows = candidates.map(c => {
      const val = memoirGradesDraft[c.id];
      return [
        c.registrationNumber,
        c.fullName,
        c.groupNumber || 'الفوج 01',
        'عنوان بحث نهاية التكوين التخصصي',
        'أستاذ المعهد المؤطر',
        typeof val === 'number' ? val : '',
        typeof val === 'number' && val >= 10 ? 'مقبول' : ''
      ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      [INSTITUTION.republic],
      [INSTITUTION.ministry],
      [INSTITUTION.name],
      [`كشف حجز علامات ${deliverableInfo.labelAr} — الرتبة: ${currentRank.titleAr}`],
      [`السند القانوني: ${deliverableInfo.decreeArticle}`],
      [],
      headers,
      ...rows
    ]);

    ws['!cols'] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 12 },
      { wch: 35 },
      { wch: 25 },
      { wch: 25 },
      { wch: 22 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'علامات المذكرة والتقرير');
    XLSX.writeFile(wb, `كشف_علامات_${deliverableInfo.type === 'memoir' ? 'المذكرة' : 'التقرير'}_${currentRank.titleAr.replace(/\s+/g, '_')}.xlsx`);
    showToast(`تم تصدير كشف علامات ${deliverableInfo.labelAr} بنجاح!`, 'success');
  };

  // 4. Export Combined Overall Pedagogical Bilan (Excel)
  const handleExportOverallPedagogicalExcel = () => {
    const headers = [
      'رقم التسجيل',
      'اللقب والاسم الكامل للمتكون',
      'الفوج التربوي',
      'المؤسسة الأصلية',
      'معدل المراقبة المستمرة (من 20)',
      'علامة التربص التطبيقي (من 20)',
      `علامة ${deliverableInfo.labelAr} (من 20) [معامل ${deliverableInfo.coeff}]`,
      'المعدل البيداغوجي الموزون',
      'حالة التقييم'
    ];

    const rows = candidates.map(c => {
      const cc = calculateCandidateCC(c.id).average;
      const intern = internshipGradesDraft[c.id];
      const mem = memoirGradesDraft[c.id];

      let weightedSum = 0;
      let totalCoeff = 0;
      let isComplete = true;

      if (cc !== null) {
        weightedSum += cc * 1;
        totalCoeff += 1;
      } else isComplete = false;

      if (typeof intern === 'number') {
        weightedSum += intern * 1;
        totalCoeff += 1;
      } else isComplete = false;

      if (typeof mem === 'number') {
        weightedSum += mem * deliverableInfo.coeff;
        totalCoeff += deliverableInfo.coeff;
      } else isComplete = false;

      const overall = totalCoeff > 0 ? (weightedSum / totalCoeff).toFixed(2) : '—';

      return [
        c.registrationNumber,
        c.fullName,
        c.groupNumber || 'الفوج 01',
        c.originalInstitution || '—',
        cc !== null ? cc.toFixed(2) : 'غير مرصود',
        typeof intern === 'number' ? intern : 'غير مرصود',
        typeof mem === 'number' ? mem : 'غير مرصود',
        overall,
        isComplete ? 'مكتمل' : 'قيد الاستكمال'
      ];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      [INSTITUTION.republic],
      [INSTITUTION.ministry],
      [INSTITUTION.name],
      [`الكشف الإجمالي الموحد للتقييم البيداغوجي — الرتبة: ${currentRank.titleAr}`],
      [`السنة التكوينية: ${formatAcademicYear(currentSession?.academicYear || '2026/2027')}`],
      [],
      headers,
      ...rows
    ]);

    ws['!cols'] = [
      { wch: 15 },
      { wch: 28 },
      { wch: 12 },
      { wch: 24 },
      { wch: 22 },
      { wch: 22 },
      { wch: 28 },
      { wch: 22 },
      { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'الكشف الإجمالي');
    XLSX.writeFile(wb, `الكشف_البيداغوجي_الشامل_${currentRank.titleAr.replace(/\s+/g, '_')}.xlsx`);
    showToast('تم تصدير الكشف البيداغوجي الإجمالي بنجاح!', 'success');
  };

  // ---------------------------------------------------------------------------
  // EXCEL IMPORTS (ACCURATE & BULLETPROOF COLUMN MATCHING)
  // ---------------------------------------------------------------------------

  // 1. Import continuous control Excel file
  const handleImportContinuousControlExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[firstSheetName];
        const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Find header row (looks for "رقم التسجيل")
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(json.length, 12); i++) {
          const row = json[i] || [];
          if (row.some(cell => String(cell).includes('رقم التسجيل'))) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx === -1) {
          showToast('لم يتم العثور على عمود "رقم التسجيل" في الملف المرفوع! تأكد من استخدام القالب النموذجي للمنصة.', 'error');
          return;
        }

        const headerRow = json[headerRowIdx].map(c => String(c || '').trim());
        const regColIdx = headerRow.findIndex(c => c.includes('رقم التسجيل'));

        let updatedCount = 0;
        const newModuleGrades = { ...moduleGradesDraft };

        // Check if single module file or multi-module file
        const moduleColumnMappings: { colIdx: number; moduleId: string }[] = [];
        headerRow.forEach((colName, cIdx) => {
          if (cIdx === regColIdx) return;
          const foundMod = rankModules.find(m => 
            colName.includes(m.titleAr) || 
            (colName.includes('علامة المراقبة') && focusedModuleId !== 'all')
          );
          if (foundMod) {
            moduleColumnMappings.push({ colIdx: cIdx, moduleId: foundMod.id });
          } else if (colName.includes('علامة المراقبة') && focusedModuleId !== 'all') {
            moduleColumnMappings.push({ colIdx: cIdx, moduleId: focusedModuleId });
          }
        });

        if (moduleColumnMappings.length === 0 && focusedModuleId !== 'all') {
          const gradeCol = headerRow.findIndex(c => 
            (c.includes('علامة') || c.includes('نقطة')) && !c.includes('الاسم') && !c.includes('التسجيل')
          );
          if (gradeCol !== -1) {
            moduleColumnMappings.push({ colIdx: gradeCol, moduleId: focusedModuleId });
          }
        }

        if (moduleColumnMappings.length === 0) {
          showToast('تعذر التعرف على أعمدة المقاييس في ملف الإكسل! يرجى تصدير القالب من المنصة أولاً.', 'error');
          return;
        }

        // Parse candidate rows
        for (let r = headerRowIdx + 1; r < json.length; r++) {
          const row = json[r];
          if (!row || row.length === 0) continue;
          const regNum = String(row[regColIdx] || '').trim();
          if (!regNum) continue;

          const cand = candidates.find(c => c.registrationNumber === regNum);
          if (!cand) continue;

          moduleColumnMappings.forEach(mapping => {
            const rawVal = row[mapping.colIdx];
            const parsedVal = parseGradeInput(rawVal);
            if (parsedVal !== '') {
              newModuleGrades[cand.id] = newModuleGrades[cand.id] || {};
              newModuleGrades[cand.id][mapping.moduleId] = parsedVal;
              updatedCount++;
            }
          });
        }

        if (updatedCount === 0) {
          showToast('تمت قراءة الملف لكن لم يتم العثور على درجات صالحة للرصد!', 'warning');
          return;
        }

        setModuleGradesDraft(newModuleGrades);

        // Immediate persistence to candidates in dbState
        const updatedCandidates = dbState.candidates.map(cand => {
          if (cand.specialtyId !== currentSpecialtyId) return cand;
          const cGrades = newModuleGrades[cand.id] || {};
          const cleanModuleGrades: Record<string, number> = {};
          rankModules.forEach(m => {
            const val = cGrades[m.id];
            if (typeof val === 'number') {
              cleanModuleGrades[m.id] = val;
            }
          });

          // Calculate weighted average
          let wSum = 0;
          let sCoeffs = 0;
          rankModules.forEach(mod => {
            const g = cleanModuleGrades[mod.id];
            if (typeof g === 'number' && !isNaN(g)) {
              wSum += g * mod.coefficient;
              sCoeffs += mod.coefficient;
            }
          });
          const ccAvg = sCoeffs > 0 ? Number((wSum / totalCoefficients).toFixed(2)) : cand.continuousAssessment;

          return {
            ...cand,
            continuousControlGrades: cleanModuleGrades,
            continuousAssessment: ccAvg !== undefined ? ccAvg : cand.continuousAssessment
          };
        });

        onUpdateCandidates(updatedCandidates);
        onAddAuditLog(
          'استيراد نقاط المراقبة المستمرة',
          `تم استيراد وحفظ ${updatedCount} نقطة مراقبة مستمرة لرتبة: ${currentRank.titleAr}`
        );
        showToast(`تم استيراد وحفظ ${updatedCount} نقطة مراقبة مستمرة بنجاح في المنصة!`, 'success');
      } catch (err) {
        showToast('حدث خطأ أثناء قراءة ملف Excel، تأكد من سلامة تنسيق الملف.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // 2. Import Internship Excel file (Explicit & Safe Column Extraction)
  const handleImportInternshipExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(json.length, 12); i++) {
          const row = json[i] || [];
          if (row.some(cell => String(cell).includes('رقم التسجيل'))) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx === -1) {
          showToast('لم يتم العثور على عمود "رقم التسجيل" في ملف التربص!', 'error');
          return;
        }

        const headerRow = json[headerRowIdx].map(c => String(c || '').trim());
        const regColIdx = headerRow.findIndex(c => c.includes('رقم التسجيل'));

        // Bulletproof search for Internship Grade column (avoiding institution, period, supervisor columns)
        let gradeColIdx = headerRow.findIndex(c => 
          (c.includes('علامة') || c.includes('نقطة') || c.toLowerCase().includes('note') || c.toLowerCase().includes('grade')) &&
          !c.includes('المؤسسة') && !c.includes('المستقبلة') && !c.includes('المؤطر') && !c.includes('ملاحظات') && !c.includes('فترة')
        );

        if (gradeColIdx === -1) {
          gradeColIdx = headerRow.findIndex(c => 
            c.includes('التربص') && 
            !c.includes('المؤسسة') && !c.includes('المستقبلة') && !c.includes('المؤطر') && !c.includes('ملاحظات') && !c.includes('فترة')
          );
        }

        if (gradeColIdx === -1) {
          gradeColIdx = headerRow.findIndex(c => 
            (c.includes('20') || c.includes('/20')) && 
            !c.includes('المؤسسة') && !c.includes('المستقبلة') && !c.includes('المؤطر') && !c.includes('ملاحظات')
          );
        }

        // Fallback: standard column 6 if template has 8 columns
        if (gradeColIdx === -1 && headerRow.length >= 7) {
          gradeColIdx = 6;
        }

        if (regColIdx === -1 || gradeColIdx === -1) {
          showToast('تعذر العثور على عمود علامة التربص التطبيقي في الملف. تأكد من استخدام قالب المنصة المصدر.', 'error');
          return;
        }

        let count = 0;
        const nextDraft = { ...internshipGradesDraft };

        for (let r = headerRowIdx + 1; r < json.length; r++) {
          const row = json[r];
          if (!row || row.length === 0) continue;
          const reg = String(row[regColIdx] || '').trim();
          if (!reg) continue;

          const cand = candidates.find(c => c.registrationNumber === reg);
          if (cand) {
            const rawVal = row[gradeColIdx];
            const parsed = parseGradeInput(rawVal);
            if (parsed !== '') {
              nextDraft[cand.id] = parsed;
              count++;
            }
          }
        }

        if (count === 0) {
          showToast('تمت قراءة الملف لكن لم يتم العثور على علامات صالحة (بين 0 و 20) في عمود النقاط!', 'warning');
          return;
        }

        setInternshipGradesDraft(nextDraft);

        // Immediate persistence to candidates in dbState
        const updatedCandidates = dbState.candidates.map(c => {
          if (c.specialtyId === currentSpecialtyId && nextDraft[c.id] !== undefined && typeof nextDraft[c.id] === 'number') {
            return { ...c, internshipGrade: nextDraft[c.id] as number };
          }
          return c;
        });
        onUpdateCandidates(updatedCandidates);

        onAddAuditLog(
          'استيراد علامات التربص التطبيقي',
          `تم استيراد وحفظ علامات التربص التطبيقي لعدد ${count} متكون برتبة: ${currentRank.titleAr}`
        );
        showToast(`تم بنجاح رصد واستيراد وحفظ علامات التربص التطبيقي لعدد ${count} متكون بالمنصة!`, 'success');
      } catch (err) {
        showToast('خطأ أثناء قراءة ملف التربص التطبيقي.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // 3. Import Memoir/Report Excel file (Explicit & Safe Column Extraction)
  const handleImportMemoirExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(json.length, 12); i++) {
          const row = json[i] || [];
          if (row.some(cell => String(cell).includes('رقم التسجيل'))) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx === -1) {
          showToast('لم يتم العثور على عمود "رقم التسجيل" في ملف المذكرة/التقرير!', 'error');
          return;
        }

        const headerRow = json[headerRowIdx].map(c => String(c || '').trim());
        const regColIdx = headerRow.findIndex(c => c.includes('رقم التسجيل'));

        // Bulletproof search for Memoir/Report Grade column (avoiding topic/title, supervisor, jury decision columns)
        let gradeColIdx = headerRow.findIndex(c => 
          (c.includes('علامة') || c.includes('نقطة') || c.toLowerCase().includes('note') || c.toLowerCase().includes('grade')) &&
          !c.includes('عنوان') && !c.includes('المشرف') && !c.includes('المؤطر') && !c.includes('القرار') && !c.includes('تقدير')
        );

        if (gradeColIdx === -1) {
          gradeColIdx = headerRow.findIndex(c => 
            (c.includes('المذكرة') || c.includes('التقرير') || c.includes('التخرج')) && 
            !c.includes('عنوان') && !c.includes('المشرف') && !c.includes('المؤطر') && !c.includes('القرار') && !c.includes('تقدير')
          );
        }

        if (gradeColIdx === -1) {
          gradeColIdx = headerRow.findIndex(c => 
            (c.includes('20') || c.includes('/20')) && 
            !c.includes('عنوان') && !c.includes('المشرف') && !c.includes('المؤطر') && !c.includes('القرار')
          );
        }

        // Fallback: standard column 5 if template has 7 columns
        if (gradeColIdx === -1 && headerRow.length >= 6) {
          gradeColIdx = 5;
        }

        if (regColIdx === -1 || gradeColIdx === -1) {
          showToast(`تعذر العثور على عمود علامة ${deliverableInfo.labelAr} في الملف. تأكد من استخدام قالب المنصة.`, 'error');
          return;
        }

        let count = 0;
        const nextDraft = { ...memoirGradesDraft };

        for (let r = headerRowIdx + 1; r < json.length; r++) {
          const row = json[r];
          if (!row || row.length === 0) continue;
          const reg = String(row[regColIdx] || '').trim();
          if (!reg) continue;

          const cand = candidates.find(c => c.registrationNumber === reg);
          if (cand) {
            const rawVal = row[gradeColIdx];
            const parsed = parseGradeInput(rawVal);
            if (parsed !== '') {
              nextDraft[cand.id] = parsed;
              count++;
            }
          }
        }

        if (count === 0) {
          showToast('تمت قراءة الملف لكن لم يتم العثور على علامات صالحة (بين 0 و 20) في عمود النقاط!', 'warning');
          return;
        }

        setMemoirGradesDraft(nextDraft);

        // Immediate persistence to candidates in dbState
        const updatedCandidates = dbState.candidates.map(c => {
          if (c.specialtyId === currentSpecialtyId && nextDraft[c.id] !== undefined && typeof nextDraft[c.id] === 'number') {
            return { ...c, memoirGrade: nextDraft[c.id] as number };
          }
          return c;
        });
        onUpdateCandidates(updatedCandidates);

        onAddAuditLog(
          `استيراد علامات ${deliverableInfo.labelAr}`,
          `تم استيراد وحفظ علامات ${deliverableInfo.labelAr} لعدد ${count} متكون برتبة: ${currentRank.titleAr}`
        );
        showToast(`تم بنجاح رصد واستيراد وحفظ علامات ${deliverableInfo.labelAr} لعدد ${count} متكون بالمنصة!`, 'success');
      } catch (err) {
        showToast('خطأ أثناء قراءة ملف المذكرة/التقرير.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // ---------------------------------------------------------------------------
  // PRINT ACTION WITH DYNAMIC PDF TITLE
  // ---------------------------------------------------------------------------
  const handleTriggerPrint = (docType: 'continuous_control' | 'overall_pedagogical') => {
    setActivePrintDoc(docType);
    const today = new Date().toISOString().slice(0, 10);
    const cleanRank = currentRank.titleAr.trim().replace(/[\s/]/g, '_');
    let title = '';

    if (docType === 'continuous_control') {
      title = `كشف_نقاط_المراقبة_البيداغوجية_المستمرة_${cleanRank}_${today}`;
    } else {
      title = `الكشف_الإجمالي_للنقاط_البيداغوجية_${cleanRank}_${today}`;
    }

    triggerPrintWithDynamicTitle(title);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans" dir="rtl">
      {/* Toast Notification */}
      {toast && (
        <div className={`no-print p-4 rounded-xl text-xs font-bold border flex items-center justify-between shadow-lg transition ${
          toast.type === 'success'
            ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
            : toast.type === 'error'
            ? 'bg-rose-100 text-rose-950 border-rose-300'
            : toast.type === 'warning'
            ? 'bg-amber-100 text-amber-950 border-amber-300'
            : 'bg-orange-100 text-orange-950 border-orange-300'
        }`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-slate-600 hover:text-slate-900 px-2 font-black cursor-pointer">✕</button>
        </div>
      )}

      {/* Hidden File Inputs for Excel Import */}
      <input 
        type="file" 
        ref={importModuleExcelRef} 
        onChange={handleImportContinuousControlExcel} 
        accept=".xlsx, .xls" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={importInternshipExcelRef} 
        onChange={handleImportInternshipExcel} 
        accept=".xlsx, .xls" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={importMemoirExcelRef} 
        onChange={handleImportMemoirExcel} 
        accept=".xlsx, .xls" 
        className="hidden" 
      />

      {/* Main Section Header & Rank Selector */}
      <div className="no-print bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-amber-600 to-slate-800 flex items-center justify-center text-white shadow-md border border-orange-400/40">
              <GraduationCap className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 font-cairo">
                  قسم التقييم البيداغوجي والمذكرات
                </h2>
                <span className="bg-orange-100 text-orange-900 border border-orange-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  مصلحة تنظيم الامتحانات والتقييم
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                حجز ومعالجة نقاط المراقبة المستمرة، التربص التطبيقي الميداني، ومذكرات/تقارير التخرج مع قوالب Excel المخصصة.
              </p>
            </div>
          </div>
        </div>

        {/* Current Active Rank Badge & Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-right">
            <span className="text-[10px] text-slate-500 block font-semibold">الرتبة التكوينية المستهدفة حالياً:</span>
            <div className="text-sm font-black text-slate-900 font-cairo flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{currentRank.titleAr}</span>
            </div>
            <div className="text-[10px] text-slate-600 font-bold block mt-0.5">
              <span>{currentRank.trackId === 'specialized' ? 'مسار امتحان مهني' : 'مسار قبل الترقية'}</span> • 
              <span className="text-orange-700 mx-1">{deliverableInfo.labelAr} (معامل {deliverableInfo.coeff})</span>
            </div>
          </div>

          <button
            onClick={() => setIsRankModalOpen(true)}
            className="relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-b from-orange-500 via-orange-600 to-orange-700 border-t border-white/30 border-b-4 border-b-orange-950 shadow-[0_4px_0_#9a3412] hover:brightness-105 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer select-none"
          >
            <Layers className="w-4 h-4 text-amber-200" />
            <span>تغيير الرتبة</span>
          </button>
        </div>
      </div>

      {/* 2 Main Subtabs Navigation Bar */}
      <div className="no-print bg-slate-900 text-white rounded-xl p-1.5 flex flex-wrap items-center gap-2 shadow-md">
        <button
          onClick={() => setActiveSubTab('continuous_control')}
          className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-lg text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'continuous_control'
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-300" />
          <span>1. المراقبة البيداغوجية المستمرة (المقاييس والمعاملات)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('overall_pedagogical')}
          className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-lg text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'overall_pedagogical'
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-amber-300" />
          <span>2. الحصر البيداغوجي الشامل (مراقبة مستمرة + تربص تطبيقي + {deliverableInfo.type === 'memoir' ? 'مذكرة' : 'تقرير'})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. SUBTAB: CONTINUOUS ASSESSMENT (المراقبة البيداغوجية المستمرة)            */}
      {/* ========================================================================= */}
      {activeSubTab === 'continuous_control' && (
        <div className="no-print space-y-6">
          {/* Executive Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 block">إجمالي المتكونين المسجلين:</span>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                {candidates.length} <span className="text-xs font-sans text-slate-600">متكون</span>
              </div>
              <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium mt-1 inline-block">
                {currentRank.titleAr}
              </span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 block">عدد المقاييس المعتمدة:</span>
              <div className="text-2xl font-black text-orange-600 mt-1 font-mono">
                {rankModules.length} <span className="text-xs font-sans text-slate-600">مقياساً رسمياً</span>
              </div>
              <span className="text-[10px] text-orange-800 bg-orange-50 px-2 py-0.5 rounded-md font-bold mt-1 inline-block">
                مجموع المعاملات: {totalCoefficients}
              </span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 block">المتكونون المكتملة نقاطهم:</span>
              <div className="text-2xl font-black text-emerald-700 mt-1 font-mono">
                {stats.ccFilledCount} <span className="text-xs font-sans text-slate-600">/ {candidates.length}</span>
              </div>
              <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md font-bold mt-1 inline-block">
                نسبة الإنجاز: {candidates.length > 0 ? ((stats.ccFilledCount / candidates.length) * 100).toFixed(0) : 0}%
              </span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 block">متوسط المراقبة المستمرة:</span>
              <div className="text-2xl font-black text-blue-700 mt-1 font-mono">
                {stats.ccAvg} <span className="text-xs font-sans text-slate-600">/ 20</span>
              </div>
              <span className="text-[10px] text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md font-bold mt-1 inline-block">
                معدل موزون بالمعاملات
              </span>
            </div>
          </div>

          {/* Action and Filter Controls Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث باسم المتكون أو رقم التسجيل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Group Filter */}
              <div>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white font-semibold"
                >
                  <option value="all">جميع الأفواج ({candidates.length})</option>
                  {groups.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Focus on single module or all */}
              <div>
                <select
                  value={focusedModuleId}
                  onChange={(e) => setFocusedModuleId(e.target.value)}
                  className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white font-bold text-orange-900"
                >
                  <option value="all">عرض جدول جميع المقاييس ({rankModules.length} مقياس)</option>
                  {rankModules.map(m => (
                    <option key={m.id} value={m.id}>
                      مقياس: {m.titleAr} (معامل {m.coefficient})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Actions (Excel, Simulation, Print, Save) */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Export Excel for professor */}
              <button
                type="button"
                onClick={() => handleExportContinuousControlExcel(focusedModuleId)}
                className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                title={focusedModuleId === 'all' ? 'تصدير جدول المراقبة المستمرة لجميع المقاييس' : 'تصدير كشف علامات هذا المقياس لتسليمه للأستاذ'}
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>{focusedModuleId === 'all' ? 'تصدير كل المقاييس (Excel)' : 'تصدير كشف الأستاذ (Excel)'}</span>
              </button>

              {/* Import Excel filled by professor */}
              <button
                type="button"
                onClick={() => importModuleExcelRef.current?.click()}
                className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                title="استيراد ملف Excel المعبأ من طرف أستاذ المقياس وتفريغ نقاطه مباشرة"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>استيراد نقاط الأستاذ (Excel)</span>
              </button>

              {/* Quick default simulation fill */}
              <button
                type="button"
                onClick={handleQuickSimulationFill}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                title="ملء تجريبي سريع للمساعدة في المعاينة والفحص"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>ملء تجريبي</span>
              </button>

              {/* Preview Print */}
              <button
                type="button"
                onClick={() => {
                  setActivePrintDoc('continuous_control');
                  setPreviewModalDoc('continuous_control');
                }}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-orange-400" />
                <span>معاينة (A4)</span>
              </button>

              {/* Direct Print */}
              <button
                type="button"
                onClick={() => handleTriggerPrint('continuous_control')}
                className="inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                title="طباعة كشف المراقبة المستمرة مباشرة"
              >
                <Printer className="w-3.5 h-3.5 text-amber-200" />
                <span>طباعة مباشرة</span>
              </button>

              {/* 3D Save Button */}
              <button
                type="button"
                onClick={handleSaveAllGrades}
                className="relative inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black text-white bg-gradient-to-b from-orange-500 via-orange-600 to-orange-700 border-t border-white/30 border-b-4 border-b-orange-950 shadow-[0_3px_0_#9a3412] hover:brightness-105 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer select-none"
              >
                <Save className="w-4 h-4" />
                <span>حفظ وتثبيت النقاط</span>
              </button>
            </div>
          </div>

          {/* Interactive Continuous Control Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-orange-600" />
                <span>
                  جدول حجز علامات المراقبة المستمرة (من 20) • مقسوم على مجموع المعاملات ({totalCoefficients})
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {filteredCandidates.length} متكون معروض
              </span>
            </div>

            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-right text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="py-2.5 px-2 text-center w-10 border-l border-slate-200">#</th>
                    <th className="py-2.5 px-3 w-28 border-l border-slate-200 font-mono">رقم التسجيل</th>
                    <th className="py-2.5 px-4 w-48 border-l border-slate-200">الاسم واللقب الكامل</th>
                    <th className="py-2.5 px-2 text-center w-20 border-l border-slate-200">الفوج</th>

                    {/* Render Module Headers */}
                    {(focusedModuleId === 'all' 
                      ? rankModules 
                      : rankModules.filter(m => m.id === focusedModuleId)
                    ).map(mod => (
                      <th key={mod.id} className="py-2.5 px-2 text-center min-w-[130px] border-l border-slate-200 bg-orange-50/50">
                        <div className="font-bold text-slate-900 leading-tight">{mod.titleAr}</div>
                        <span className="text-[10px] text-orange-700 bg-orange-100 px-1.5 py-0.2 rounded font-mono font-bold inline-block mt-0.5">
                          معامل {mod.coefficient}
                        </span>
                      </th>
                    ))}

                    <th className="py-2.5 px-3 text-center w-28 border-l border-slate-200 bg-slate-200">
                      <div>المجموع الموزون</div>
                      <span className="text-[10px] text-slate-600 font-mono font-normal">∑(ن×م)</span>
                    </th>

                    <th className="py-2.5 px-3 text-center w-32 bg-amber-100 text-amber-950 font-black">
                      <div>معدل المراقبة / 20</div>
                      <span className="text-[10px] text-amber-800 font-mono font-bold">∑(ن×م) ÷ {totalCoefficients}</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={6 + rankModules.length} className="py-10 text-center text-slate-400">
                        لا يوجد متكونون مطابقون لمعايير البحث في هذه الرتبة.
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((cand, idx) => {
                      const cGrades = moduleGradesDraft[cand.id] || {};
                      const ccRes = calculateCandidateCC(cand.id);

                      return (
                        <tr key={cand.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-2 px-2 text-center font-mono text-slate-400 border-l border-slate-200">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900 border-l border-slate-200">
                            <span className="bg-orange-50 text-orange-950 px-2 py-0.5 rounded border border-orange-200">
                              {cand.registrationNumber}
                            </span>
                          </td>
                          <td className="py-2 px-4 font-bold text-slate-900 border-l border-slate-200">
                            <div>{cand.fullName}</div>
                            <span className="text-[10px] text-slate-500 font-normal">{cand.originalInstitution || '—'}</span>
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-700 border-l border-slate-200">
                            {cand.groupNumber || 'الفوج 01'}
                          </td>

                          {/* Module Inputs */}
                          {(focusedModuleId === 'all' 
                            ? rankModules 
                            : rankModules.filter(m => m.id === focusedModuleId)
                          ).map(mod => {
                            const val = cGrades[mod.id] !== undefined ? cGrades[mod.id] : '';
                            return (
                              <td key={mod.id} className="py-1.5 px-2 text-center border-l border-slate-200">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={val}
                                  placeholder="—"
                                  onChange={(e) => handleModuleGradeChange(cand.id, mod.id, e.target.value)}
                                  className={`w-18 text-center py-1 px-1 text-xs rounded border font-mono font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                                    val === '' 
                                      ? 'bg-white border-slate-300 text-slate-400' 
                                      : Number(val) < 10 
                                      ? 'bg-rose-50 border-rose-300 text-rose-700' 
                                      : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                  }`}
                                />
                              </td>
                            );
                          })}

                          {/* Weighted Sum */}
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-800 border-l border-slate-200 bg-slate-50">
                            {ccRes.weightedSum > 0 ? ccRes.weightedSum.toFixed(2) : '—'}
                          </td>

                          {/* Resulting Continuous Assessment Average */}
                          <td className="py-2 px-3 text-center font-mono font-black text-sm bg-amber-50 text-amber-950 border-l border-amber-200">
                            {ccRes.average !== null ? (
                              <span className={`inline-block px-2.5 py-0.5 rounded ${
                                ccRes.average >= 10 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-rose-600 text-white'
                              }`}>
                                {ccRes.average.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs font-normal">شاغر</span>
                            )}
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
      {/* 2. SUBTAB: OVERALL PEDAGOGICAL BILAN (الحصر البيداغوجي الشامل)            */}
      {/* ========================================================================= */}
      {activeSubTab === 'overall_pedagogical' && (
        <div className="no-print space-y-6">
          {/* Information & Regulation Alert Banner */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
            <Award className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 leading-relaxed">
              <span className="font-black text-sm font-cairo block mb-0.5">
                الحصر البيداغوجي الشامل لرتبة: {currentRank.titleAr}
              </span>
              <p>
                يتم هنا تجميع الكتل البيداغوجية الثلاث المعتمدة رسمياً لتغذية محرك المداولات النهائية:
                <strong> «معدل المراقبة المستمرة»</strong> المنقول آلياً من التبويب السابق، مع
                <strong> «علامة التربص التطبيقي الميداني»</strong> (معامل 1)، و
                <strong> «علامة {deliverableInfo.labelAr}»</strong> (معامل {deliverableInfo.coeff} وفقاً لـ {deliverableInfo.decreeArticle}).
              </p>
            </div>
          </div>

          {/* Action and Filter Controls Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث باسم المتكون أو رقم التسجيل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Group Filter */}
              <div>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white font-semibold"
                >
                  <option value="all">جميع الأفواج ({candidates.length})</option>
                  {groups.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Excel & Print Buttons for Tab 2 */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Internship Excel */}
              <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={handleExportInternshipExcel}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-emerald-700 hover:bg-white rounded transition cursor-pointer"
                  title="تصدير كشف علامات التربص التطبيقي إلى Excel"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>أكسل التربص</span>
                </button>
                <button
                  type="button"
                  onClick={() => importInternshipExcelRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-blue-700 hover:bg-white rounded transition cursor-pointer"
                  title="استيراد علامات التربص التطبيقي من ملف Excel"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>استيراد</span>
                </button>
              </div>

              {/* Memoir/Report Excel */}
              <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={handleExportMemoirExcel}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-emerald-700 hover:bg-white rounded transition cursor-pointer"
                  title={`تصدير كشف علامات ${deliverableInfo.labelAr} إلى Excel`}
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>أكسل {deliverableInfo.type === 'memoir' ? 'المذكرة' : 'التقرير'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => importMemoirExcelRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-blue-700 hover:bg-white rounded transition cursor-pointer"
                  title={`استيراد علامات ${deliverableInfo.labelAr} من ملف Excel`}
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>استيراد</span>
                </button>
              </div>

              {/* Overall Export */}
              <button
                type="button"
                onClick={handleExportOverallPedagogicalExcel}
                className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>الكشف الإجمالي (Excel)</span>
              </button>

              {/* Preview Print */}
              <button
                type="button"
                onClick={() => {
                  setActivePrintDoc('overall_pedagogical');
                  setPreviewModalDoc('overall_pedagogical');
                }}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-orange-400" />
                <span>معاينة (A4)</span>
              </button>

              {/* Direct Print */}
              <button
                type="button"
                onClick={() => handleTriggerPrint('overall_pedagogical')}
                className="inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                title="طباعة الكشف الإجمالي للنقاط البيداغوجية مباشرة"
              >
                <Printer className="w-3.5 h-3.5 text-amber-200" />
                <span>طباعة مباشرة</span>
              </button>

              {/* 3D Save Button */}
              <button
                type="button"
                onClick={handleSaveAllGrades}
                className="relative inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black text-white bg-gradient-to-b from-orange-500 via-orange-600 to-orange-700 border-t border-white/30 border-b-4 border-b-orange-950 shadow-[0_3px_0_#9a3412] hover:brightness-105 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer select-none"
              >
                <Save className="w-4 h-4" />
                <span>حفظ وتثبيت النقاط</span>
              </button>
            </div>
          </div>

          {/* Interactive Overall Bilan Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-orange-600" />
                <span>
                  مصفوفة العلامات البيداغوجية الثلاث المعتمدة للمداولات الرسمية
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {filteredCandidates.length} متكون معروض
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">
                  <tr>
                    <th className="py-3 px-2 text-center w-12 border-l border-slate-200">#</th>
                    <th className="py-3 px-3 w-28 border-l border-slate-200 font-mono">رقم التسجيل</th>
                    <th className="py-3 px-4 border-l border-slate-200">الاسم واللقب الكامل</th>
                    <th className="py-3 px-3 w-24 text-center border-l border-slate-200">الفوج</th>
                    
                    {/* Continuous Control Average (auto-imported from Tab 1) */}
                    <th className="py-3 px-3 text-center w-36 border-l border-slate-200 bg-amber-50">
                      <div className="text-amber-950 font-black">معدل المراقبة المستمرة</div>
                      <span className="text-[10px] text-amber-700 font-mono font-bold block">مستورد آلياً (معامل 1)</span>
                    </th>

                    {/* Internship Grade */}
                    <th className="py-3 px-3 text-center w-36 border-l border-slate-200 bg-blue-50">
                      <div className="text-blue-950 font-black">علامة التربص التطبيقي</div>
                      <span className="text-[10px] text-blue-700 font-mono font-bold block">من 20 (معامل 1)</span>
                    </th>

                    {/* Memoir / Report Grade */}
                    <th className="py-3 px-3 text-center w-44 border-l border-slate-200 bg-emerald-50">
                      <div className="text-emerald-950 font-black">علامة {deliverableInfo.labelAr}</div>
                      <span className="text-[10px] text-emerald-800 font-mono font-bold block">من 20 (معامل {deliverableInfo.coeff})</span>
                    </th>

                    {/* Overall Weighted Result */}
                    <th className="py-3 px-3 text-center w-32 border-l border-slate-200 bg-slate-200 text-slate-900 font-black">
                      <div>المعدل الجزئي</div>
                      <span className="text-[10px] text-slate-600 font-mono block">من 20</span>
                    </th>

                    <th className="py-3 px-3 text-center w-28">حالة الاكتمال</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        لا يوجد متكونون مطابقون لمعايير البحث.
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((cand, idx) => {
                      const ccRes = calculateCandidateCC(cand.id);
                      const internVal = internshipGradesDraft[cand.id];
                      const memVal = memoirGradesDraft[cand.id];

                      let sum = 0;
                      let coeffs = 0;
                      let isComplete = true;

                      if (ccRes.average !== null) {
                        sum += ccRes.average * 1;
                        coeffs += 1;
                      } else isComplete = false;

                      if (typeof internVal === 'number') {
                        sum += internVal * 1;
                        coeffs += 1;
                      } else isComplete = false;

                      if (typeof memVal === 'number') {
                        sum += memVal * deliverableInfo.coeff;
                        coeffs += deliverableInfo.coeff;
                      } else isComplete = false;

                      const partialAverage = coeffs > 0 ? (sum / coeffs).toFixed(2) : '—';

                      return (
                        <tr key={cand.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-2 text-center font-mono text-slate-400 border-l border-slate-200">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 border-l border-slate-200">
                            <span className="bg-orange-50 text-orange-950 px-2 py-0.5 rounded border border-orange-200">
                              {cand.registrationNumber}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900 border-l border-slate-200">
                            <div>{cand.fullName}</div>
                            <span className="text-[10px] text-slate-500 font-normal">{cand.originalInstitution || '—'}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-700 border-l border-slate-200">
                            {cand.groupNumber || 'الفوج 01'}
                          </td>

                          {/* Continuous Control Average (auto-fed from Tab 1) */}
                          <td className="py-2.5 px-3 text-center font-mono font-black border-l border-slate-200 bg-amber-50/50">
                            {ccRes.average !== null ? (
                              <span className="inline-block px-2.5 py-1 rounded bg-amber-100 text-amber-950 border border-amber-300 font-mono font-black text-sm">
                                {ccRes.average.toFixed(2)}
                              </span>
                            ) : (
                              <button
                                onClick={() => setActiveSubTab('continuous_control')}
                                className="text-orange-600 underline text-[11px] font-bold cursor-pointer hover:text-orange-800"
                              >
                                حجز بالمقاييس ←
                              </button>
                            )}
                          </td>

                          {/* Internship Input */}
                          <td className="py-2.5 px-3 text-center border-l border-slate-200 bg-blue-50/30">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={internVal !== undefined ? internVal : ''}
                              placeholder="—"
                              onChange={(e) => handleInternshipGradeChange(cand.id, e.target.value)}
                              className={`w-20 text-center py-1 px-1.5 text-xs rounded border font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                internVal === ''
                                  ? 'bg-white border-slate-300 text-slate-400'
                                  : Number(internVal) < 10
                                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                                  : 'bg-blue-50 border-blue-300 text-blue-900'
                              }`}
                            />
                          </td>

                          {/* Memoir / Report Input */}
                          <td className="py-2.5 px-3 text-center border-l border-slate-200 bg-emerald-50/30">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={memVal !== undefined ? memVal : ''}
                              placeholder="—"
                              onChange={(e) => handleMemoirGradeChange(cand.id, e.target.value)}
                              className={`w-20 text-center py-1 px-1.5 text-xs rounded border font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                memVal === ''
                                  ? 'bg-white border-slate-300 text-slate-400'
                                  : Number(memVal) < 10
                                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                              }`}
                            />
                          </td>

                          {/* Overall Partial Result */}
                          <td className="py-2.5 px-3 text-center font-mono font-black text-sm bg-slate-50 border-l border-slate-200 text-slate-900">
                            {partialAverage !== '—' ? (
                              <span className={`inline-block px-2.5 py-0.5 rounded font-black ${
                                Number(partialAverage) >= 10 ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' : 'bg-rose-100 text-rose-950'
                              }`}>
                                {partialAverage}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">قيد الحجز</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isComplete 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-amber-50 text-amber-700 border-amber-300'
                            }`}>
                              {isComplete ? 'مكتمل الحجز' : 'قيد الاستكمال'}
                            </span>
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
      {/* RANK SELECTION MODAL                                                      */}
      {/* ========================================================================= */}
      {isRankModalOpen && (
        <div className="no-print fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-cairo">اختيار الرتبة التكوينية المستهدفة للتقييم</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    تظهر جميع الرتب المعتمدة في التكوين المتخصص والتكوين قبل الترقية.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRankModalOpen(false)}
                className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {/* Specialized Track */}
              <div>
                <div className="flex items-center gap-2 mb-3 pb-1 border-b border-orange-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
                  <h4 className="font-bold text-slate-900 text-sm font-cairo">
                    {TRAINING_TRACKS.specialized.titleAr} (مذكرة نهاية التكوين - معامل 1)
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {TRAINING_TRACKS.specialized.ranks.map(rank => {
                    const count = dbState.candidates.filter(c => c.specialtyId === rank.id).length;
                    const isSelected = rank.id === currentSpecialtyId;
                    return (
                      <button
                        key={rank.id}
                        onClick={() => {
                          if (onSwitchSpecialty) onSwitchSpecialty(rank.id);
                          setIsRankModalOpen(false);
                          showToast(`تم الانتقال إلى تقييم ومراقبة رتبة: ${rank.titleAr}`, 'success');
                        }}
                        className={`text-right p-3 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected 
                            ? 'border-orange-500 bg-orange-50/70 shadow-xs' 
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="font-black text-xs text-slate-900">{rank.titleAr}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{rank.modules.length} مقياساً • مذكرة تخرج</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                          count > 0 ? 'bg-orange-100 text-orange-900' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {count} متكون
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pre-promotion Track */}
              <div>
                <div className="flex items-center gap-2 mb-3 pb-1 border-b border-blue-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <h4 className="font-bold text-slate-900 text-sm font-cairo">
                    {TRAINING_TRACKS.pre_promotion.titleAr} (تقرير نهاية التكوين - معامل 2)
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {TRAINING_TRACKS.pre_promotion.ranks.map(rank => {
                    const count = dbState.candidates.filter(c => c.specialtyId === rank.id).length;
                    const isSelected = rank.id === currentSpecialtyId;
                    return (
                      <button
                        key={rank.id}
                        onClick={() => {
                          if (onSwitchSpecialty) onSwitchSpecialty(rank.id);
                          setIsRankModalOpen(false);
                          showToast(`تم الانتقال إلى تقييم ومراقبة رتبة: ${rank.titleAr}`, 'success');
                        }}
                        className={`text-right p-3 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50/70 shadow-xs' 
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="font-black text-xs text-slate-900">{rank.titleAr}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{rank.modules.length} مقياساً • تقرير تخرج</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                          count > 0 ? 'bg-blue-100 text-blue-900' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {count} متكون
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RENDER OFFICIAL DOCUMENT HELPER FUNCTION (SHARED BETWEEN PREVIEW & PRINT) */}
      {/* ========================================================================= */}
      {(() => {
        // Internal renderer for official A4 printable documents
        const renderOfficialDocumentContent = (docType: 'continuous_control' | 'overall_pedagogical') => (
          <div className="w-full bg-white text-slate-900 font-simplified-arabic">
            {/* Ministerial Header */}
            <div className="text-center border-b-2 border-black pb-2 mb-3">
              <h2 className="font-bold text-xs">{INSTITUTION.republic}</h2>
              <h3 className="font-bold text-[11px] text-slate-800">{INSTITUTION.ministry}</h3>
              <h3 className="font-bold text-xs text-black mt-0.5">{INSTITUTION.name}</h3>
              <p className="text-[10px] text-slate-700">{INSTITUTION.deputyDirectorate} • مصلحة تنظيم الامتحانات والتقييم</p>
              <div className="mt-1 inline-block border-2 border-black px-4 py-0.5 rounded font-black text-sm bg-slate-50">
                {docType === 'continuous_control' 
                  ? 'كشف نقاط المراقبة البيداغوجية المستمرة (المقاييس والمعاملات الرسمية)'
                  : `الكشف الإجمالي للنقاط البيداغوجية (المراقبة المستمرة + التربص التطبيقي + ${deliverableInfo.labelAr})`}
              </div>
            </div>

            {/* Administrative Subheader */}
            <div className="grid grid-cols-2 gap-2 text-xs border border-black p-2 rounded mb-3 bg-slate-50">
              <div><strong>الرتبة التكوينية:</strong> {currentRank.titleAr} ({currentRank.trackId === 'specialized' ? 'تكوين متخصص - امتحان مهني' : 'تكوين قبل الترقية'})</div>
              <div><strong>الدورة التكوينية:</strong> {formatAcademicYear(currentSession?.academicYear || '2026/2027')}</div>
              <div><strong>تعداد المتكونين:</strong> {candidates.length} متكون</div>
              <div><strong>تاريخ استخراج الوثيقة:</strong> {formatArabicDate(new Date())}</div>
            </div>

            {/* Document Specific Table */}
            {docType === 'continuous_control' ? (
              <div>
                <table className="w-full text-right text-[11px] border-collapse border border-black mb-4">
                  <thead className="bg-slate-100 font-bold border-b border-black">
                    <tr>
                      <th className="border border-black p-1 text-center w-8">#</th>
                      <th className="border border-black p-1 text-center w-20 font-mono">رقم التسجيل</th>
                      <th className="border border-black p-1">اللقب والاسم الكامل</th>
                      <th className="border border-black p-1 text-center w-14">الفوج</th>
                      {rankModules.map(m => (
                        <th key={m.id} className="border border-black p-1 text-center text-[10px]">
                          <div>{m.code}</div>
                          <span className="font-mono">م{m.coefficient}</span>
                        </th>
                      ))}
                      <th className="border border-black p-1 text-center font-mono w-16">المجموع</th>
                      <th className="border border-black p-1 text-center font-mono w-16 bg-slate-200">المعدل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((c, idx) => {
                      const cGrades = moduleGradesDraft[c.id] || {};
                      const ccRes = calculateCandidateCC(c.id);

                      return (
                        <tr key={c.id} className="border-b border-black">
                          <td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
                          <td className="border border-black p-1 text-center font-mono font-bold">{c.registrationNumber}</td>
                          <td className="border border-black p-1 font-bold">{c.fullName}</td>
                          <td className="border border-black p-1 text-center font-mono text-[10px]">{c.groupNumber || '01'}</td>
                          {rankModules.map(m => {
                            const v = cGrades[m.id];
                            return (
                              <td key={m.id} className="border border-black p-1 text-center font-mono text-[10px]">
                                {typeof v === 'number' ? v.toFixed(1) : '—'}
                              </td>
                            );
                          })}
                          <td className="border border-black p-1 text-center font-mono font-bold">
                            {ccRes.weightedSum > 0 ? ccRes.weightedSum.toFixed(1) : '—'}
                          </td>
                          <td className="border border-black p-1 text-center font-mono font-bold bg-slate-50">
                            {ccRes.average !== null ? ccRes.average.toFixed(2) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="text-[10px] text-slate-600 mb-6">
                  * المقاييس أعلاه تمثل المقاييس الرسمية المعتمدة للرتبة، والقاسم الإجمالي لحساب معدل المراقبة المستمرة هو مجموع المعاملات ({totalCoefficients}).
                </div>
              </div>
            ) : (
              <div>
                <table className="w-full text-right text-xs border-collapse border border-black mb-6">
                  <thead className="bg-slate-100 font-bold border-b border-black">
                    <tr>
                      <th className="border border-black p-1.5 text-center w-10">#</th>
                      <th className="border border-black p-1.5 text-center w-24 font-mono">رقم التسجيل</th>
                      <th className="border border-black p-1.5">اللقب والاسم الكامل</th>
                      <th className="border border-black p-1.5 text-center w-16">الفوج</th>
                      <th className="border border-black p-1.5 text-center w-24">مراقبة مستمرة (م1)</th>
                      <th className="border border-black p-1.5 text-center w-24">تربص تطبيقي (م1)</th>
                      <th className="border border-black p-1.5 text-center w-28">{deliverableInfo.type === 'memoir' ? 'المذكرة' : 'التقرير'} (م{deliverableInfo.coeff})</th>
                      <th className="border border-black p-1.5 text-center w-24 bg-slate-200">المعدل الجزئي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((c, idx) => {
                      const ccRes = calculateCandidateCC(c.id);
                      const intern = internshipGradesDraft[c.id];
                      const mem = memoirGradesDraft[c.id];

                      let s = 0;
                      let cf = 0;
                      if (ccRes.average !== null) { s += ccRes.average * 1; cf += 1; }
                      if (typeof intern === 'number') { s += intern * 1; cf += 1; }
                      if (typeof mem === 'number') { s += mem * deliverableInfo.coeff; cf += deliverableInfo.coeff; }

                      const partAvg = cf > 0 ? (s / cf).toFixed(2) : '—';

                      return (
                        <tr key={c.id} className="border-b border-black">
                          <td className="border border-black p-1.5 text-center font-mono">{idx + 1}</td>
                          <td className="border border-black p-1.5 text-center font-mono font-bold">{c.registrationNumber}</td>
                          <td className="border border-black p-1.5 font-bold">{c.fullName}</td>
                          <td className="border border-black p-1.5 text-center font-mono text-[11px]">{c.groupNumber || '01'}</td>
                          <td className="border border-black p-1.5 text-center font-mono font-bold">
                            {ccRes.average !== null ? ccRes.average.toFixed(2) : '—'}
                          </td>
                          <td className="border border-black p-1.5 text-center font-mono font-bold">
                            {typeof intern === 'number' ? intern.toFixed(2) : '—'}
                          </td>
                          <td className="border border-black p-1.5 text-center font-mono font-bold">
                            {typeof mem === 'number' ? mem.toFixed(2) : '—'}
                          </td>
                          <td className="border border-black p-1.5 text-center font-mono font-bold bg-slate-50">
                            {partAvg}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Signatures & Seal */}
            <div className="grid grid-cols-2 gap-8 text-center text-xs pt-4 border-t-2 border-black mt-auto">
              <div>
                <span className="font-bold block"></span>
                <span className="text-[10px] text-slate-600"></span>
                <div className="h-14"></div>
                <span className="font-bold"></span>
              </div>
              <div>
                <span className="font-bold block">مدير المعهد</span>
                <span className="text-[10px] text-slate-600"></span>
                <div className="h-14"></div>
                <span className="font-bold text-slate-900">
                  {dbState.institutionSettings?.directorName || INSTITUTION.director}
                </span>
              </div>
            </div>
          </div>
        );

        return (
          <>
            {/* ========================================================================= */}
            {/* DEDICATED PRINT CONTAINER (#printable-official-document)                  */}
            {/* ISOLATED & VISIBLE ONLY DURING PHYSICAL PRINTING (@media print)           */}
            {/* ========================================================================= */}
            <div id="printable-official-document" className="hidden print:block font-simplified-arabic text-black bg-white p-6 print-document">
              {renderOfficialDocumentContent(activePrintDoc)}
            </div>

            {/* ========================================================================= */}
            {/* LIVE PRINT PREVIEW MODAL (A4 WITH DYNAMIC TITLE)                          */}
            {/* ========================================================================= */}
            {previewModalDoc && (
              <div className="no-print fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-3 md:p-6 overflow-y-auto">
                <div className="w-full max-w-4xl bg-slate-900 text-white rounded-t-2xl p-4 flex items-center justify-between shadow-xl">
                  <div className="flex items-center gap-2.5">
                    <Eye className="w-5 h-5 text-orange-400" />
                    <div>
                      <h3 className="font-bold text-sm md:text-base font-cairo">
                        {previewModalDoc === 'continuous_control' 
                          ? `معاينة كشف المراقبة البيداغوجية المستمرة - ${currentRank.titleAr}`
                          : `معاينة الكشف الإجمالي للنقاط البيداغوجية - ${currentRank.titleAr}`}
                      </h3>
                      <span className="text-[10px] text-slate-400">
                        مخرجات رسمية معتمدة للطباعة المباشرة وحفظ PDF
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTriggerPrint(previewModalDoc)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-b from-orange-500 to-amber-600 shadow-md active:translate-y-0.5 transition-all cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>طباعة الوثيقة الآن</span>
                    </button>
                    <button
                      onClick={() => setPreviewModalDoc(null)}
                      className="text-slate-400 hover:text-white p-1 text-xl font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="w-full max-w-4xl bg-slate-800/90 rounded-b-2xl p-4 md:p-6 overflow-y-auto max-h-[82vh] flex justify-center">
                  <div className="w-full max-w-[210mm] bg-white text-slate-900 p-6 shadow-2xl rounded-sm font-simplified-arabic border border-slate-300 min-h-[297mm]">
                    {renderOfficialDocumentContent(previewModalDoc)}
                  </div>
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
};
