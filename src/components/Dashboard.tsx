import React, { useState, useMemo } from 'react';
import { 
  Users, 
  FileSpreadsheet, 
  Calendar, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Info, 
  Save, 
  Check, 
  AlertCircle,
  GraduationCap,
  Sparkles,
  Building2,
  BellRing,
  UserCheck,
  UserPlus,
  Compass,
  ArrowRight,
  ClipboardList,
  ShieldCheck,
  Trash2,
  Plus
} from 'lucide-react';
import type { AppDatabaseState, ExamSession, InstitutionSettings, SecretariatMember } from '../db/sqlite-manager';
import type { Candidate } from '../utils/crypto-anonymat';
import { 
  TRAINING_TRACKS, 
  OFFICIAL_RANKS, 
  getRankById, 
  getRankTotalCoefficients,
  type TrainingTrackId 
} from '../data/promotionsData';
import { TraineeImporter } from './TraineeImporter';
import { generateCandidateTemplateExcel } from '../utils/excel-handler';
import { INSTITUTION } from '../constants/branding';
import { formatArabicDate, formatAcademicYear } from '../utils/date-formatter';
import { DEFAULT_INSTITUTE_WILAYA_CODE, getRankNumericCode, generateRegistrationNumber } from '../utils/registration-number';

interface DashboardProps {
  dbState: AppDatabaseState;
  onNavigate: (tab: string) => void;
  onGenerateAnonymat: () => void;
  onSwitchSpecialty?: (specialtyId: string) => void;
  onAddCandidates?: (newCandidates: Candidate[]) => void;
  onUpdateSession?: (updatedSession: ExamSession) => void;
  onUpdateInstitutionSettings?: (settings: InstitutionSettings) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  dbState,
  onNavigate,
  onSwitchSpecialty,
  onAddCandidates,
  onUpdateSession,
  onUpdateInstitutionSettings
}) => {
  const currentSession = dbState.sessions.find(s => s.id === dbState.currentSessionId) || dbState.sessions[0];
  const currentSpecialtyId = currentSession?.specialtyId || 'dir_sec';
  const currentRank = getRankById(currentSpecialtyId) || OFFICIAL_RANKS[0];

  // Track selection state (Specialized vs Pre-promotion)
  const [selectedTrack, setSelectedTrack] = useState<TrainingTrackId>(currentRank.trackId || 'specialized');
  const [showModulesCatalog, setShowModulesCatalog] = useState<boolean>(false);
  const [isImporterOpen, setIsImporterOpen] = useState<boolean>(false);

  // Setup Form State (Academic Year, Dates, Slots)
  const [academicYearInput, setAcademicYearInput] = useState<string>(currentSession?.academicYear || '2026 / 2027');
  const [sessionNameInput, setSessionNameInput] = useState<string>(currentSession?.name || 'امتحان التخرج النهائي - دورة جوان 2027');
  const [trainingStartDateInput, setTrainingStartDateInput] = useState<string>(currentSession?.trainingYearStartDate || '2026-10-15');
  const [examStartDateInput, setExamStartDateInput] = useState<string>(currentSession?.examStartDate || currentSession?.startDate || '2027-06-13');
  const [examEndDateInput, setExamEndDateInput] = useState<string>(currentSession?.examEndDate || currentSession?.endDate || '2027-06-17');
  const [morningSlotInput, setMorningSlotInput] = useState<string>(currentSession?.morningTimeSlot || '08:30 - 11:30');
  const [afternoonSlotInput, setAfternoonSlotInput] = useState<string>(currentSession?.afternoonTimeSlot || '14:00 - 17:00');
  const [wilayaCodeInput, setWilayaCodeInput] = useState<string>(currentSession?.wilayaCode || DEFAULT_INSTITUTE_WILAYA_CODE);
  const [setupSavedBanner, setSetupSavedBanner] = useState<boolean>(false);

  // Director & Secretariat Staff State (Configurable in Dashboard - No arbitrary hardcoded name!)
  const initialDirectorName = dbState.institutionSettings?.directorName || currentSession?.presidentName || '';
  const initialDirectorTitle = dbState.institutionSettings?.directorTitle || 'مدير المعهد ورئيس مركز الامتحان';
  const initialSecretariat = dbState.institutionSettings?.secretariatMembers || [
    { id: 'sec_01', fullName: 'أ. لزهاري أحمد', role: 'مسؤول أمانة المركز والرقابة الإدارية' },
    { id: 'sec_02', fullName: 'أ. قادري فاطمة', role: 'عضو أمانة المركز ومتابعة الأظرفة' },
    { id: 'sec_03', fullName: 'أ. بلعيدي صالح', role: 'عضو أمانة المركز وتدقيق محاضر الحضور' }
  ];

  const [directorNameInput, setDirectorNameInput] = useState<string>(initialDirectorName);
  const [directorTitleInput, setDirectorTitleInput] = useState<string>(initialDirectorTitle);
  const [secretariatList, setSecretariatList] = useState<SecretariatMember[]>(initialSecretariat);
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<string>('عضو أمانة المركز');
  const [staffSavedBanner, setStaffSavedBanner] = useState<boolean>(false);

  const handleAddSecretariatMember = () => {
    if (!newMemberName.trim()) return;
    const newMember: SecretariatMember = {
      id: `sec_${Date.now()}`,
      fullName: newMemberName.trim(),
      role: newMemberRole.trim() || 'عضو أمانة المركز'
    };
    const updated = [...secretariatList, newMember];
    setSecretariatList(updated);
    setNewMemberName('');
    if (onUpdateInstitutionSettings) {
      onUpdateInstitutionSettings({
        directorName: directorNameInput.trim() || 'مدير المعهد ورئيس مركز الامتحان',
        directorTitle: directorTitleInput.trim() || 'مدير المعهد ورئيس مركز الامتحان',
        secretariatMembers: updated
      });
      setStaffSavedBanner(true);
      setTimeout(() => setStaffSavedBanner(false), 3000);
    }
  };

  const handleRemoveSecretariatMember = (id: string) => {
    const updated = secretariatList.filter(m => m.id !== id);
    setSecretariatList(updated);
    if (onUpdateInstitutionSettings) {
      onUpdateInstitutionSettings({
        directorName: directorNameInput.trim() || 'مدير المعهد ورئيس مركز الامتحان',
        directorTitle: directorTitleInput.trim() || 'مدير المعهد ورئيس مركز الامتحان',
        secretariatMembers: updated
      });
    }
  };

  const handleSaveStaffSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateInstitutionSettings) {
      onUpdateInstitutionSettings({
        directorName: directorNameInput.trim() || 'مدير المعهد ورئيس مركز الامتحان',
        directorTitle: directorTitleInput.trim() || 'مدير المعهد ورئيس مركز الامتحان',
        secretariatMembers: secretariatList
      });
    }
    setStaffSavedBanner(true);
    setTimeout(() => setStaffSavedBanner(false), 4000);
  };

  // Active track ranks
  const trackInfo = TRAINING_TRACKS[selectedTrack];
  const trackRanks = trackInfo.ranks;

  // Cohort modules and candidates
  const sessionModules = dbState.modules.filter(m => m.specialtyId === currentSpecialtyId);
  const candidates = dbState.candidates.filter(c => c.specialtyId === currentSpecialtyId);
  const proctors = dbState.proctors;

  // =========================================================================
  // UPCOMING EXAMS & TIMETABLE COUNTDOWN ALERT LOGIC
  // =========================================================================
  const examAlertInfo = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetStartDate = new Date(examStartDateInput || '2027-06-13');
    targetStartDate.setHours(0, 0, 0, 0);

    const targetEndDate = new Date(examEndDateInput || '2027-06-17');
    targetEndDate.setHours(23, 59, 59, 999);

    const diffTime = targetStartDate.getTime() - today.getTime();
    const daysUntilExam = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const isOngoing = today >= targetStartDate && today <= targetEndDate;
    const isPast = today > targetEndDate;

    // Check if slots are configured in timetable
    const slotsCount = dbState.timetable ? dbState.timetable.length : 0;

    return {
      daysUntilExam,
      isOngoing,
      isPast,
      startDateFormatted: formatArabicDate(targetStartDate),
      endDateFormatted: formatArabicDate(targetEndDate),
      slotsCount
    };
  }, [examStartDateInput, examEndDateInput, dbState.timetable]);

  // Save Session Settings Form Handler
  const handleSaveSetupSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;

    const normalizedYear = formatAcademicYear(academicYearInput.trim() || currentSession.academicYear);
    setAcademicYearInput(normalizedYear);

    const updated: ExamSession = {
      ...currentSession,
      name: sessionNameInput.trim() || currentSession.name,
      academicYear: normalizedYear,
      startDate: examStartDateInput,
      endDate: examEndDateInput,
      trainingYearStartDate: trainingStartDateInput,
      examStartDate: examStartDateInput,
      examEndDate: examEndDateInput,
      morningTimeSlot: morningSlotInput.trim() || '08:30 - 11:30',
      afternoonTimeSlot: afternoonSlotInput.trim() || '14:00 - 17:00',
      wilayaCode: wilayaCodeInput.trim().padStart(2, '0').slice(-2) || '03'
    };

    if (onUpdateSession) {
      onUpdateSession(updated);
    }

    if (onUpdateInstitutionSettings && directorNameInput.trim()) {
      onUpdateInstitutionSettings({
        directorName: directorNameInput.trim(),
        directorTitle: directorTitleInput.trim() || 'مدير المعهد ورئيس مركز الامتحان',
        secretariatMembers: secretariatList
      });
    }

    setSetupSavedBanner(true);
    setTimeout(() => setSetupSavedBanner(false), 4000);
  };

  // Handle rank change
  const handleSelectRank = (rankId: string) => {
    if (onSwitchSpecialty) {
      onSwitchSpecialty(rankId);
    }
  };

  // Direct download of official 9-column blank template
  const handleQuickDownloadTemplate = () => {
    const buffer = generateCandidateTemplateExcel(currentRank.titleAr, currentRank.id, wilayaCodeInput);
    const blob = new Blob([buffer.buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `استمارة_المتكونين_${currentRank.titleAr.replace(/\s+/g, '_')}_الرسمية.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalCoeffs = getRankTotalCoefficients(currentRank.id);

  return (
    <div className="space-y-6 pb-12 font-sans" dir="rtl">
      {/* ========================================================================= */}
      {/* 1. UPCOMING EXAM COUNTDOWN & DEADLINES ALERT BANNER                       */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white p-4 sm:p-5 shadow-lg border border-orange-400/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-inner">
              <BellRing className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full border border-white/30">
                  تنبيه المواعيد والرزنامة الرسمية
                </span>
                <span className="text-xs text-amber-100 font-bold">
                  {currentSession?.name}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black font-cairo mt-1">
                {examAlertInfo.isOngoing ? (
                  <span className="text-white flex items-center gap-2">
                    الامتحانات الكتابية الرسمية جارية حالياً بالقاعات والمدرجات
                  </span>
                ) : examAlertInfo.isPast ? (
                  <span>اختتمت فترة الامتحانات الكتابية لدورة التخرج</span>
                ) : (
                  <span>
                    العد التنازلي: متبقي <strong className="text-2xl sm:text-3xl font-black text-amber-200 font-mono px-1">{examAlertInfo.daysUntilExam}</strong> يوماً على انطلاق الامتحانات الكتابية
                  </span>
                )}
              </h3>
              <p className="text-xs text-orange-100 mt-0.5">
                فترة الإجراء الرسمية: من <strong className="text-white font-mono">{examAlertInfo.startDateFormatted}</strong> إلى <strong className="text-white font-mono">{examAlertInfo.endDateFormatted}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('scheduler')}
              className="relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs text-orange-950 bg-gradient-to-b from-amber-200 via-amber-300 to-amber-400 border-t border-white/60 shadow-[0_4px_0_#b45309,0_6px_10px_rgba(0,0,0,0.15)] hover:brightness-105 active:translate-y-1 active:shadow-[0_1px_0_#b45309] transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-orange-900" />
              <span>مراجعة وضبط الرزنامة ({examAlertInfo.slotsCount} فترة)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DIGNIFIED EXECUTIVE HERO: INPUTS & OVERVIEW CONSOLE                    */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-700/60">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            {/* Minimal Dignified Hierarchy */}
            <div className="flex items-center gap-2 text-xs text-orange-400 font-bold">
              <span>{INSTITUTION.ministry}</span>
              <span>•</span>
              <span>نيابة مديرية التكوين والمسابقات والإمتحانات المهنية</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white font-cairo leading-tight">
              {INSTITUTION.service}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {INSTITUTION.name}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700">
                <Building2 className="w-4 h-4 text-orange-400" />
                <span>الرتبة المعتمدة: <strong className="text-white font-black">{currentRank.titleAr}</strong></span>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-700">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>السنة التكوينية: <strong className="text-white font-mono">{formatAcademicYear(academicYearInput)}</strong></span>
              </div>
            </div>
          </div>

          {/* 3D Tactile Action Buttons (Data Input & Management Only) */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0">
            {/* 3D Import Candidates Button */}
            <button
              type="button"
              onClick={() => setIsImporterOpen(true)}
              className="relative inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-xs text-white bg-gradient-to-b from-orange-500 via-orange-600 to-orange-700 border-t border-white/30 shadow-[0_5px_0_#9a3412,0_8px_12px_rgba(0,0,0,0.25)] hover:brightness-105 active:translate-y-1 active:shadow-[0_1px_0_#9a3412] transition-all cursor-pointer select-none"
            >
              <FileSpreadsheet className="w-4 h-4 text-orange-100" />
              <span>استيراد وتأطير المتكونين (Excel)</span>
            </button>

            {/* 3D Download Official Excel Template (9 Columns) */}
            <button
              type="button"
              onClick={handleQuickDownloadTemplate}
              className="relative inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-xs text-slate-100 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 border-t border-white/20 shadow-[0_5px_0_#0f172a,0_8px_12px_rgba(0,0,0,0.2)] hover:text-white active:translate-y-1 active:shadow-[0_1px_0_#0f172a] transition-all cursor-pointer select-none"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>تحميل النموذج الرسمي للأكسل (9 أعمدة)</span>
            </button>

            {/* 3D Manual Add Candidate & Manage Proctors */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onNavigate('conduct')}
                className="relative inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-[11px] text-slate-200 bg-slate-800/90 border border-slate-700 hover:bg-slate-700 transition cursor-pointer"
              >
                <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
                <span>قسم الإجراء والقاعات</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('scheduler')}
                className="relative inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-[11px] text-slate-200 bg-slate-800/90 border border-slate-700 hover:bg-slate-700 transition cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-orange-400" />
                <span>الأساتذة والمكونون ({proctors.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SESSION & COHORT GENERAL SETUP FORM (إعدادات ومعطيات الدورة)           */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-cairo">
                معطيات السنة التكوينية ورزنامة دورة التخرج
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تحديد السنة التكوينية، تاريخ بداية التكوين، وفترة وتوقيت سير الامتحانات الرسمية
              </p>
            </div>
          </div>

          {setupSavedBanner && (
            <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-900 px-3 py-1 rounded-xl text-xs font-bold border border-emerald-300 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-700" />
              <span>تم حفظ وتثبيت إعدادات الدورة بنجاح في قاعدة البيانات المحلية!</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveSetupSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Academic Training Year */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                السنة التكوينية الرسمية:
              </label>
              <input
                type="text"
                required
                value={academicYearInput}
                onChange={(e) => setAcademicYearInput(e.target.value)}
                placeholder="2026 / 2027"
                className="w-full bg-slate-50 border border-slate-300 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 font-mono transition"
              />
            </div>

            {/* Official Training Start Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ بداية التكوين الرسمي:
              </label>
              <input
                type="date"
                required
                value={trainingStartDateInput}
                onChange={(e) => setTrainingStartDateInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 font-mono transition"
              />
            </div>

            {/* Session Full Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تسمية دورة التخرج الرسمية:
              </label>
              <input
                type="text"
                required
                value={sessionNameInput}
                onChange={(e) => setSessionNameInput(e.target.value)}
                placeholder="امتحان التخرج النهائي - دورة جوان 2027"
                className="w-full bg-slate-50 border border-slate-300 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 transition"
              />
            </div>

            {/* Written Exam Start Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ بداية الامتحانات الكتابية:
              </label>
              <input
                type="date"
                required
                value={examStartDateInput}
                onChange={(e) => setExamStartDateInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 font-mono transition"
              />
            </div>

            {/* Written Exam End Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ اختتام الامتحانات الكتابية:
              </label>
              <input
                type="date"
                required
                value={examEndDateInput}
                onChange={(e) => setExamEndDateInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 font-mono transition"
              />
            </div>

            {/* Morning & Afternoon Slots */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  الفترة الصباحية:
                </label>
                <input
                  type="text"
                  required
                  value={morningSlotInput}
                  onChange={(e) => setMorningSlotInput(e.target.value)}
                  placeholder="08:30 - 11:30"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-200 rounded-xl px-2.5 py-2.5 text-xs font-bold text-slate-900 font-mono transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  الفترة المسائية:
                </label>
                <input
                  type="text"
                  required
                  value={afternoonSlotInput}
                  onChange={(e) => setAfternoonSlotInput(e.target.value)}
                  placeholder="14:00 - 17:00"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-200 rounded-xl px-2.5 py-2.5 text-xs font-bold text-slate-900 font-mono transition"
                />
              </div>
            </div>

            {/* Wilaya Code & Custom Registration Numbering Scheme */}
            <div className="sm:col-span-2 lg:col-span-3 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200/80 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 font-mono">
                  {wilayaCodeInput.padStart(2, '0').slice(-2) || '03'}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800">
                    رمز ولاية المعهد ونظام الترقيم الوزاري المعتمد (8 أرقام):
                  </label>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    الترقيم التلقائي: [رمز الولاية <span className="font-mono font-bold text-orange-700">{wilayaCodeInput.padStart(2, '0').slice(-2) || '03'}</span>] + [رمز الرتبة <span className="font-mono font-bold text-orange-700">{getRankNumericCode(currentSpecialtyId)}</span>] + [الرقم التسلسلي <span className="font-mono font-bold text-orange-700">0001</span>]
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-200">
                  <span className="text-xs font-bold text-slate-600">رمز الولاية:</span>
                  <input
                    type="text"
                    maxLength={2}
                    value={wilayaCodeInput}
                    onChange={(e) => setWilayaCodeInput(e.target.value.replace(/\D/g, '').slice(0, 2))}
                    placeholder="03"
                    className="w-10 text-center text-xs font-bold text-orange-600 font-mono bg-transparent outline-none"
                  />
                </div>
                <div className="bg-white/90 border border-orange-200 text-orange-950 px-3 py-1.5 rounded-lg text-xs font-bold font-mono">
                  مثال: {generateRegistrationNumber(wilayaCodeInput || '03', getRankNumericCode(currentSpecialtyId), 1)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-orange-600" />
              <span>تُعتمد هذه التواريخ تلقائياً في استدعاءات الحراسة، رزنامة الاختبارات، ومحاضر المداولات الرسمية.</span>
            </span>

            {/* 3D Tactile Save Button */}
            <button
              type="submit"
              className="relative inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-xs text-white bg-gradient-to-b from-orange-500 via-orange-600 to-orange-700 border-t border-white/30 shadow-[0_5px_0_#9a3412,0_8px_12px_rgba(0,0,0,0.2)] hover:brightness-105 active:translate-y-1 active:shadow-[0_1px_0_#9a3412] transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ وتثبيت إعدادات الدورة</span>
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* 3B. OFFICIAL EXAM CENTER ADMINISTRATION & SECRETARIAT (تأطير المركز)      */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-300 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 font-cairo">
                  تأطير مركز الامتحان وإدارة المعهد (اسم المدير وأعضاء الأمانة)
                </h2>
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  البيانات الرسمية للمؤطرين
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تحديد الاسم الرسمي المعتمد لمدير المعهد ورئيس المركز، وضبط أعضاء أمانة المركز وتكليفاتهم الإدارية بدقة.
              </p>
            </div>
          </div>

          {staffSavedBanner && (
            <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-900 px-3 py-1 rounded-xl text-xs font-bold border border-emerald-300 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-700" />
              <span>تم حفظ وتثبيت تأطير المركز واسم المدير وأعضاء الأمانة بنجاح!</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveStaffSettings} className="space-y-5">
          {/* Director / Exam Center Head Identification */}
          <div className="bg-gradient-to-r from-slate-50 via-amber-50/40 to-slate-50 border border-slate-200 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>1. القيادة والإشراف الرسمي على مركز الامتحان:</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم واللقب الرسمي لمدير المعهد (رئيس المركز):
                </label>
                <input
                  type="text"
                  required
                  value={directorNameInput}
                  onChange={(e) => setDirectorNameInput(e.target.value)}
                  placeholder="أدخل الاسم الرسمي لمدير المعهد (مثال: أ.د. ... أو د. ...)"
                  className="w-full bg-white border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 transition"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  يُعتمد هذا الاسم في تأشيرات الاستدعاءات الفردية، شارات الصدر، ومحاضر سير الاختبارات والمداولات.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الصفة الرسمية في مركز الامتحان:
                </label>
                <input
                  type="text"
                  required
                  value={directorTitleInput}
                  onChange={(e) => setDirectorTitleInput(e.target.value)}
                  placeholder="مدير المعهد ورئيس مركز الامتحان"
                  className="w-full bg-white border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 transition"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  الصفة الإدارية الرسمية المصاحبة لختم رئيس المركز في كافة الوثائق المطبوعة.
                </span>
              </div>
            </div>
          </div>

          {/* Secretariat Members Section */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>2. أعضاء أمانة المركز ومصلحة تنظيم الامتحانات:</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-bold font-mono">
                {secretariatList.length} أعضاء معتمدين
              </span>
            </div>

            {/* Quick Add Member Row */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3 mb-3">
              <div className="w-full md:flex-1">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="اسم ولقب عضو الأمانة الجديد..."
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="w-full md:w-64">
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900"
                >
                  <option value="مسؤول أمانة المركز والرقابة الإدارية">مسؤول أمانة المركز والرقابة الإدارية</option>
                  <option value="عضو أمانة المركز ومتابعة الأظرفة">عضو أمانة المركز ومتابعة الأظرفة</option>
                  <option value="عضو أمانة المركز وتدقيق محاضر الحضور">عضو أمانة المركز وتدقيق محاضر الحضور</option>
                  <option value="عضو أمانة المركز وحفظ أوراق الإجابات">عضو أمانة المركز وحفظ أوراق الإجابات</option>
                  <option value="نائب رئيس المركز">نائب رئيس المركز</option>
                  <option value="ملاحظ ومفتش المتابعة البيداغوجية">ملاحظ ومفتش المتابعة البيداغوجية</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleAddSecretariatMember}
                className="w-full md:w-auto relative inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 text-amber-300" />
                <span>إضافة للأمانة</span>
              </button>
            </div>

            {/* List of Current Secretariat Members */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {secretariatList.map((member) => (
                <div
                  key={member.id}
                  className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 shadow-xs hover:border-slate-300 transition"
                >
                  <div className="space-y-0.5 overflow-hidden">
                    <h4 className="font-bold text-xs text-slate-900 truncate">
                      {member.fullName}
                    </h4>
                    <span className="inline-block bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-semibold px-2 py-0.5 rounded truncate max-w-full">
                      {member.role}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveSecretariatMember(member.id)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer shrink-0"
                    title="حذف من الأمانة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-orange-600" />
              <span>تنعكس هذه الأسماء مباشرة في شارات الصدر للمؤطرين، جدول تسليم وتسلم المواضيع، وتأشيرة رئيس المركز.</span>
            </span>

            {/* 3D Tactile Save Button for Staff */}
            <button
              type="submit"
              className="relative inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-xs text-white bg-gradient-to-b from-slate-800 via-slate-900 to-black border-t border-white/20 shadow-[0_5px_0_#0f172a,0_8px_12px_rgba(0,0,0,0.2)] hover:brightness-110 active:translate-y-1 active:shadow-[0_1px_0_#0f172a] transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>حفظ وتثبيت تأطير المركز (المدير والأمانة)</span>
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* 4. COHORT & OFFICIAL RANK SELECTOR (التسميات الرسمية الخالصة دون أكواد)   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/70">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-cairo">
                مسار التكوين والرتبة الرسمية المعتمدة
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                اختيار الرتبة لمتابعة فوج المتكونين وحساب معدلات التخرج بالمعادلة القانونية
              </p>
            </div>

            {/* Track Switcher (Specialized vs Pre-promotion) */}
            <div className="flex items-center bg-slate-200/80 p-1 rounded-xl gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedTrack('specialized')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedTrack === 'specialized'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                التكوين المتخصص (امتحان مهني)
              </button>
              <button
                type="button"
                onClick={() => setSelectedTrack('pre_promotion')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedTrack === 'pre_promotion'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                التكوين قبل الترقية
              </button>
            </div>
          </div>
        </div>

        {/* Clean Rank Selection Buttons without internal codes */}
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {trackRanks.map((rank) => {
              const isSelected = rank.id === currentSpecialtyId;
              const rankCandidatesCount = dbState.candidates.filter(c => c.specialtyId === rank.id).length;

              return (
                <button
                  key={rank.id}
                  type="button"
                  onClick={() => handleSelectRank(rank.id)}
                  className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50/90 text-orange-950 shadow-sm ring-2 ring-orange-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {/* Clean Official Rank Name Only - No codes! */}
                      <h4 className="font-bold text-xs leading-snug">
                        {rank.titleAr}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {rank.category} • {rank.theoreticalDuration}
                      </p>
                    </div>

                    {isSelected && (
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-600 shrink-0 mt-1" />
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">
                      المتكونون المسجلون: <strong className="font-mono text-slate-900">{rankCandidatesCount}</strong>
                    </span>
                    <span className="text-orange-700 font-semibold font-mono">
                      {rank.modules.length} مقياساً
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Cohort Summary Banner */}
          <div className="mt-5 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="font-black text-slate-900 text-sm block font-cairo">
                  الرتبة المعتمدة حالياً: {currentRank.titleAr}
                </span>
                <p className="text-slate-600 mt-0.5">
                  التربص التطبيقي: {currentRank.internshipDuration} • الحجم الساعي النظري: {currentRank.totalHours} ساعة • المعاملات: {totalCoeffs}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowModulesCatalog(!showModulesCatalog)}
                className="text-xs bg-white text-slate-800 hover:bg-slate-100 px-3.5 py-1.5 rounded-lg border border-slate-300 font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>{showModulesCatalog ? 'إخفاء جدول المقاييس' : 'عرض جدول المقاييس'}</span>
                {showModulesCatalog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Collapsible Modules Table */}
          {showModulesCatalog && (
            <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs animate-fadeIn">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">#</th>
                    <th className="py-2.5 px-3">اسم المقياس التكويني</th>
                    <th className="py-2.5 px-3 text-center w-24">المعامل</th>
                    <th className="py-2.5 px-3 text-center w-28">النقطة الإقصائية</th>
                    <th className="py-2.5 px-3 text-center w-28">مدة الامتحان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentRank.modules.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{m.titleAr}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-orange-700">{m.coefficient}</td>
                      <td className="py-2 px-3 text-center font-mono font-semibold text-rose-700">{m.eliminatoryGrade} / 20</td>
                      <td className="py-2 px-3 text-center text-slate-600 font-mono">{m.durationMinutes / 60} ساعات</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. COHORT METRICS SUMMARY CARDS                                           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Candidates Metric */}
        <div 
          onClick={() => onNavigate('candidates')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">المترشحون المسجلون</span>
            <Users className="w-5 h-5 text-orange-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-black text-slate-900 font-mono">{candidates.length}</span>
            <span className="text-xs text-slate-400">متكون</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {new Set(candidates.map(c => c.roomNumber)).size} قاعات إجراء
          </p>
        </div>

        {/* Modules Metric */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">المقاييس المبرمجة</span>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-black text-orange-600 font-mono">{currentRank.modules.length}</span>
            <span className="text-xs text-slate-400">مقياساً</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            مجموع المعاملات: <strong className="font-mono text-slate-900">{totalCoeffs}</strong>
          </p>
        </div>

        {/* Instructors & Proctors Metric */}
        <div 
          onClick={() => onNavigate('scheduler')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">الأساتذة والمكونون</span>
            <UserCheck className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-black text-emerald-700 font-mono">{proctors.length}</span>
            <span className="text-xs text-slate-400">مؤطر</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            موزعون على رزنامة الحراسة
          </p>
        </div>

        {/* Training Hours Metric */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">الحجم الساعي النظري</span>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-black text-slate-900 font-mono">{currentRank.totalHours}</span>
            <span className="text-xs text-slate-400">ساعة</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            التربص: {currentRank.internshipDuration}
          </p>
        </div>
      </div>

      {/* Trainee Importer Modal */}
      <TraineeImporter
        specialtyId={currentSpecialtyId}
        specialtyTitle={currentRank.titleAr}
        promotionYear={academicYearInput}
        existingCandidates={dbState.candidates}
        onCommitCandidates={(newCands) => {
          if (onAddCandidates) onAddCandidates(newCands);
        }}
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
      />
    </div>
  );
};
