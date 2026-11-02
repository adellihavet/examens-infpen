import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  PenTool, 
  CheckCircle2, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Search, 
  Filter, 
  Layers, 
  Barcode, 
  Keyboard, 
  RotateCcw, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  ChevronDown, 
  Info, 
  UserX, 
  ShieldCheck,
  Check,
  Printer
} from 'lucide-react';
import type { ExamModule, GradeRecord, AnonymatMapping } from '../utils/crypto-anonymat';
import type { AppDatabaseState } from '../db/sqlite-manager';
import { INSTITUTION } from '../constants/branding';
import * as XLSX from 'xlsx';

interface AnonymatGradingProps {
  dbState: AppDatabaseState;
  onUpdateGrades: (grades: GradeRecord[]) => void;
  onAddAuditLog: (action: string, details: string, severity?: 'info' | 'warning' | 'security') => void;
}

export const AnonymatGrading: React.FC<AnonymatGradingProps> = ({
  dbState,
  onUpdateGrades,
  onAddAuditLog
}) => {
  const currentSession = dbState.sessions.find(s => s.id === dbState.currentSessionId) || dbState.sessions[0];
  const specialty = dbState.specialties.find(sp => sp.id === currentSession?.specialtyId);
  const modules = dbState.modules.filter(m => m.specialtyId === currentSession?.specialtyId);

  const [selectedModuleId, setSelectedModuleId] = useState<string>(modules[0]?.id || '');
  const [filterType, setFilterType] = useState<'all' | 'pending' | 'completed' | 'absent'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeSearchInput, setBarcodeSearchInput] = useState('');
  const [showNumpad, setShowNumpad] = useState<boolean>(true);
  const [focusedAnonymatCode, setFocusedAnonymatCode] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'warning' | 'error' | 'info'; message: string } | null>(null);

  const selectedModule = modules.find(m => m.id === selectedModuleId) || modules[0];
  const moduleMappings = dbState.anonymatMappings.filter(m => m.moduleId === selectedModule?.id);

  // References for keyboard navigation across inputs
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Auto-dismiss notification after 4s
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Synchronize or initialize single grade record for a given anonymat code
  const getGradeRecord = (anonymatCode: string): GradeRecord => {
    const existing = dbState.grades.find(g => g.anonymatCode === anonymatCode && g.moduleId === selectedModule?.id);
    if (existing) return existing;

    return {
      id: `grade_${anonymatCode}_${selectedModule?.id}`,
      anonymatCode,
      moduleId: selectedModule?.id || '',
      sessionId: currentSession?.id || '',
      finalGrade: null,
      isAbsent: false,
      updatedAt: new Date().toISOString()
    };
  };

  // Update single grade entry logic
  const handleGradeChange = (
    anonymatCode: string,
    rawVal: string,
    skipLogging: boolean = false
  ) => {
    let numVal: number | null = null;
    if (rawVal.trim() !== '') {
      const parsed = parseFloat(rawVal);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= (selectedModule?.maxGrade || 20)) {
        numVal = parsed;
      } else {
        setNotification({
          type: 'error',
          message: `العلامة المدخلة غير مقبولة! يجب أن تكون بين 0 و ${selectedModule?.maxGrade || 20}`
        });
        return;
      }
    }

    const currentRecord = getGradeRecord(anonymatCode);
    const updatedRecord: GradeRecord = {
      ...currentRecord,
      finalGrade: numVal,
      isAbsent: false, // Entering a grade clears absence
      updatedAt: new Date().toISOString()
    };

    // Update state
    const existingIndex = dbState.grades.findIndex(
      g => g.anonymatCode === anonymatCode && g.moduleId === selectedModule?.id
    );

    let newGradesList = [...dbState.grades];
    if (existingIndex >= 0) {
      newGradesList[existingIndex] = updatedRecord;
    } else {
      newGradesList.push(updatedRecord);
    }

    onUpdateGrades(newGradesList);

    if (!skipLogging && numVal !== null) {
      onAddAuditLog(
        'حجز نقطة امتحان',
        `تم حجز النقطة (${numVal.toFixed(2)}/20) للورقة المغفلة: ${anonymatCode} في مقياس: ${selectedModule?.titleAr}`,
        'info'
      );
    }
  };

  // Toggle absence status
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
    onAddAuditLog(
      'تعديل حالة الحضور',
      `تم تأشير الورقة المغفلة (${anonymatCode}) كـ: ${isNowAbsent ? 'غائب عن الامتحان' : 'حاضر'}`,
      'info'
    );
  };

  // Jump to specific code using barcode scan input
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = barcodeSearchInput.trim().toUpperCase();
    if (!cleaned) return;

    // Remove any scanner prefix/suffix like *INFPE- or *
    const matched = moduleMappings.find(m => 
      m.anonymatCode.toUpperCase().includes(cleaned) ||
      cleaned.includes(m.anonymatCode.toUpperCase())
    );

    if (matched) {
      setFocusedAnonymatCode(matched.anonymatCode);
      const el = inputRefs.current[matched.anonymatCode];
      if (el) {
        el.focus();
        el.select();
      }
      setBarcodeSearchInput('');
      setNotification({
        type: 'success',
        message: `تم التعرف على الباركود وتحديد الورقة: ${matched.anonymatCode}`
      });
    } else {
      setNotification({
        type: 'warning',
        message: `لم يتم العثور على ورقة بالكود: ${cleaned} في هذا المقياس.`
      });
    }
  };

  // Virtual Numpad digit click
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

  // Navigate to next paper
  const handleNextPaper = () => {
    if (!focusedAnonymatCode) return;
    const currentIndex = moduleMappings.findIndex(m => m.anonymatCode === focusedAnonymatCode);
    if (currentIndex >= 0 && currentIndex < moduleMappings.length - 1) {
      const nextMapping = moduleMappings[currentIndex + 1];
      setFocusedAnonymatCode(nextMapping.anonymatCode);
      const el = inputRefs.current[nextMapping.anonymatCode];
      if (el) {
        el.focus();
        el.select();
      }
    }
  };

  // Navigate to previous paper
  const handlePreviousPaper = () => {
    if (!focusedAnonymatCode) return;
    const currentIndex = moduleMappings.findIndex(m => m.anonymatCode === focusedAnonymatCode);
    if (currentIndex > 0) {
      const prevMapping = moduleMappings[currentIndex - 1];
      setFocusedAnonymatCode(prevMapping.anonymatCode);
      const el = inputRefs.current[prevMapping.anonymatCode];
      if (el) {
        el.focus();
        el.select();
      }
    }
  };

  // Export Blank/Filled Anonymat Grade Sheet to Excel
  const handleExportGradeSheetExcel = () => {
    if (!selectedModule) return;

    const rows = moduleMappings.map((m, idx) => {
      const rec = getGradeRecord(m.anonymatCode);
      return {
        'الرقم الترتيبي': idx + 1,
        'رقم الإغفال والتشفير': m.anonymatCode,
        'المقياس': selectedModule.titleAr,
        'المعامل': selectedModule.coefficient,
        'نقطة الامتحان (من 20)': rec.isAbsent ? 'غائب' : rec.finalGrade ?? '',
        'حالة الحضور': rec.isAbsent ? 'غائب' : 'حاضر',
        'ملاحظات': rec.notes || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'كشف النقاط المغفل');

    const fileName = `كشف_نقاط_مغفل_${selectedModule.code}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    onAddAuditLog('تصدير كشف النقاط إكسل', `تم تصدير كشف النقاط المغفل لمقياس: ${selectedModule.titleAr}`);
    setNotification({ type: 'success', message: 'تم تصدير كشف النقاط المغفل بصيغة Excel بنجاح.' });
  };

  // Import grades from Excel
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
          const anoCode = row['رقم الإغفال والتشفير'] || row['كود الإغفال'] || row['Code Anonymat'];
          const rawNote = row['نقطة الامتحان (من 20)'] || row['نقطة الامتحان'] || row['Note'];
          const isAbs = row['حالة الحضور'] === 'غائب' || String(rawNote).trim() === 'غائب';

          if (anoCode) {
            const parsedGrade = !isAbs && !isNaN(parseFloat(rawNote)) ? parseFloat(rawNote) : null;
            const existingIdx = newGradesList.findIndex(
              g => g.anonymatCode === anoCode && g.moduleId === selectedModule?.id
            );

            const rec: GradeRecord = {
              id: `grade_${anoCode}_${selectedModule?.id}`,
              anonymatCode: anoCode,
              moduleId: selectedModule?.id || '',
              sessionId: currentSession?.id || '',
              finalGrade: parsedGrade,
              isAbsent: isAbs,
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

        onUpdateGrades(newGradesList);
        onAddAuditLog('استيراد نقاط إكسل', `تم استيراد ${importedCount} نقطة بنجاح لمقياس: ${selectedModule?.titleAr}`, 'security');
        setNotification({ type: 'success', message: `تم استيراد وتحديث ${importedCount} نقطة بنجاح من ملف Excel.` });
      } catch (err) {
        setNotification({ type: 'error', message: 'حدث خطأ أثناء قراءة ملف Excel! يرجى التأكد من تطابق الأعمدة.' });
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Filtered rows
  const filteredMappings = useMemo(() => {
    return moduleMappings.filter(m => {
      const rec = getGradeRecord(m.anonymatCode);

      if (filterType === 'pending') {
        if (rec.finalGrade !== null || rec.isAbsent) return false;
      } else if (filterType === 'completed') {
        if (rec.finalGrade === null || rec.isAbsent) return false;
      } else if (filterType === 'absent') {
        if (!rec.isAbsent) return false;
      }

      if (searchTerm) {
        return m.anonymatCode.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    });
  }, [moduleMappings, filterType, searchTerm, dbState.grades]);

  // Statistics for active module
  const totalModuleTarget = moduleMappings.length;
  const gradedCount = moduleMappings.filter(m => getGradeRecord(m.anonymatCode).finalGrade !== null).length;
  const absentsCount = moduleMappings.filter(m => getGradeRecord(m.anonymatCode).isAbsent).length;
  const pendingCount = totalModuleTarget - (gradedCount + absentsCount);
  const completionPercent = totalModuleTarget > 0 ? Math.round(((gradedCount + absentsCount) / totalModuleTarget) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
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

      {/* Module Selector & Header Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-orange-100 text-orange-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                نظام التصحيح الفردي المعتمد
              </span>
              <span className="text-xs text-slate-500">
                {specialty?.titleAr} ({currentSession?.name})
              </span>
            </div>
            <h2 className="text-xl font-bold font-cairo text-slate-900">
              حجز نقاط الامتحانات المغفلة — علامة الامتحان الفردية (/ 20)
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl">
              إدخال النقطة المعتمدة مباشرة عبر أرقام الإغفال فقط، مع دعم المسح السريع بالباركود واللوحة الرقمية التفاعلية.
            </p>
          </div>

          {/* Module Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">المقياس التكويني:</span>
            <select
              value={selectedModuleId}
              onChange={(e) => setSelectedModuleId(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {modules.map(mod => (
                <option key={mod.id} value={mod.id}>
                  {mod.titleAr} (معامل {mod.coefficient} • {mod.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Real-time KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
            <span className="text-[11px] text-slate-500 block">إجمالي أوراق المقياس</span>
            <strong className="text-xl font-black text-slate-900 font-mono mt-0.5 block">{totalModuleTarget}</strong>
          </div>

          <div className="bg-orange-50 p-3 rounded-xl border border-orange-200 text-center">
            <span className="text-[11px] text-orange-800 font-bold block">الأوراق المصححة</span>
            <strong className="text-xl font-black text-orange-950 font-mono mt-0.5 block">{gradedCount}</strong>
          </div>

          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
            <span className="text-[11px] text-emerald-800 font-bold block">نسبة الإنجاز</span>
            <strong className="text-xl font-black text-emerald-950 font-mono mt-0.5 block">{completionPercent}%</strong>
          </div>

          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
            <span className="text-[11px] text-amber-800 font-bold block">أوراق في الانتظار</span>
            <strong className="text-xl font-black text-amber-950 font-mono mt-0.5 block">{pendingCount}</strong>
          </div>

          <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-center">
            <span className="text-[11px] text-rose-800 font-bold block">الغيابات المسجلة</span>
            <strong className="text-xl font-black text-rose-950 font-mono mt-0.5 block">{absentsCount}</strong>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Barcode Scanner, Search, Filters, Excel Export/Import */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 no-print">
        {/* Barcode Fast Reader */}
        <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Barcode className="w-4 h-4 text-orange-600 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="امسح الباركود أو الصق الكود..."
              value={barcodeSearchInput}
              onChange={(e) => setBarcodeSearchInput(e.target.value)}
              className="bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl pr-9 pl-3 py-1.5 text-xs font-mono font-bold w-64 text-slate-900"
            />
          </div>
          <button
            type="submit"
            className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            تحديد الورقة
          </button>
        </form>

        {/* Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-xs font-semibold">تصفية:</span>
          {(['all', 'completed', 'pending', 'absent'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterType === type
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type === 'all' && 'الكل'}
              {type === 'completed' && 'المصححة'}
              {type === 'pending' && 'في الانتظار'}
              {type === 'absent' && 'الغيابات'}
            </button>
          ))}
        </div>

        {/* Excel Actions */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200">
            <Upload className="w-3.5 h-3.5 text-orange-600" />
            <span>استيراد Excel</span>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleImportGradesExcel}
              className="hidden"
            />
          </label>

          <button
            onClick={handleExportGradeSheetExcel}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>تصدير Excel</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Grid: Table on Right (8 cols), Quick Numpad on Left (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Grading Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3 w-40">رقم الإغفال والتشفير</th>
                  <th className="p-3 w-36 text-center">نقطة الامتحان (/ 20)</th>
                  <th className="p-3 w-28 text-center">حالة الحضور</th>
                  <th className="p-3 w-32 text-center">حالة الرصد</th>
                  <th className="p-3">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMappings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      لا توجد أوراق إجابة تطابق معايير التصفية المحددة.
                    </td>
                  </tr>
                ) : (
                  filteredMappings.map((mapping, idx) => {
                    const gradeRec = getGradeRecord(mapping.anonymatCode);
                    const isFocused = focusedAnonymatCode === mapping.anonymatCode;

                    return (
                      <tr 
                        key={mapping.anonymatCode}
                        className={`transition ${isFocused ? 'bg-orange-50/80 ring-2 ring-orange-500/30' : 'hover:bg-slate-50'}`}
                      >
                        <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                            {mapping.anonymatCode}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <input
                            ref={el => { inputRefs.current[mapping.anonymatCode] = el; }}
                            type="number"
                            step="0.25"
                            min="0"
                            max="20"
                            disabled={gradeRec.isAbsent}
                            value={gradeRec.finalGrade !== null ? gradeRec.finalGrade : ''}
                            onFocus={() => setFocusedAnonymatCode(mapping.anonymatCode)}
                            onChange={(e) => handleGradeChange(mapping.anonymatCode, e.target.value)}
                            placeholder={gradeRec.isAbsent ? 'غائب' : '0.00'}
                            className={`w-28 text-center font-mono font-bold text-sm px-2 py-1.5 rounded-lg border transition ${
                              gradeRec.isAbsent
                                ? 'bg-slate-100 text-slate-400 border-slate-200'
                                : gradeRec.finalGrade !== null
                                ? 'bg-white text-orange-950 border-orange-400 font-black'
                                : 'bg-slate-50 text-slate-900 border-slate-300 focus:bg-white focus:border-orange-500'
                            }`}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleAbsent(mapping.anonymatCode)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                              gradeRec.isAbsent
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {gradeRec.isAbsent ? 'غائب' : 'حاضر'}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          {gradeRec.isAbsent ? (
                            <span className="text-rose-700 font-bold text-[11px]">غياب مؤكد</span>
                          ) : gradeRec.finalGrade !== null ? (
                            <span className="text-emerald-700 font-bold text-[11px] flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>تم الرصد</span>
                            </span>
                          ) : (
                            <span className="text-amber-600 text-[11px]">في الانتظار</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-400 text-[11px]">
                          {gradeRec.finalGrade !== null && gradeRec.finalGrade < (selectedModule?.eliminatoryGrade || 5) && (
                            <span className="text-rose-600 font-bold">نقطة إقصائية (&lt; 05.00)</span>
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

        {/* Fast Touch / Numpad Panel */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sticky top-24 no-print space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-orange-600" />
              <span>لوحة الإدخال الرقمي السريع (Rapid Numpad)</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              {focusedAnonymatCode || 'اختر ورقة'}
            </span>
          </div>

          {/* Active Target Banner */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
            <span className="text-[11px] text-orange-800 font-medium block">الورقة المحددة حالياً:</span>
            <strong className="text-lg font-mono font-bold text-orange-950 mt-0.5 block">
              {focusedAnonymatCode || 'انقر على خانة أي ورقة'}
            </strong>
          </div>

          {/* Numpad Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', 'DEL'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleNumpadPress(key)}
                className={`h-11 rounded-xl font-bold font-mono text-base transition shadow-xs cursor-pointer flex items-center justify-center ${
                  key === 'DEL'
                    ? 'bg-rose-100 hover:bg-rose-200 text-rose-800'
                    : 'bg-slate-100 hover:bg-orange-100 hover:text-orange-900 text-slate-800'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          {/* Quick Step Controls */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handlePreviousPaper}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            <button
              type="button"
              onClick={handleNextPaper}
              className="bg-orange-600 hover:bg-orange-500 text-white p-2.5 rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>التالي</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
