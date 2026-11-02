import React, { useState, useMemo } from 'react';
import { 
  Users, 
  DoorOpen, 
  FileCheck, 
  Printer, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Clock, 
  Building, 
  ShieldCheck, 
  Search, 
  Filter, 
  Layers, 
  Edit3, 
  Tag, 
  FileText, 
  AlertTriangle,
  RotateCcw,
  Sparkles,
  UserCheck,
  ClipboardList,
  PenTool,
  Check,
  ChevronDown,
  X,
  UserPlus,
  Trash2,
  CalendarDays,
  Scissors,
  BadgeCheck,
  FileSpreadsheet,
  FolderCheck
} from 'lucide-react';
import type { Candidate, ExamModule } from '../utils/crypto-anonymat';
import type { AppDatabaseState, ExamRoom, ProctorTeacher, ExamSession, TimetableSlot, InstitutionSettings, SecretariatMember } from '../db/sqlite-manager';
import { INSTITUTION } from '../constants/branding';
import { OFFICIAL_RANKS, TRAINING_TRACKS, getRankById } from '../data/promotionsData';
import { formatArabicDate, formatAcademicYear } from '../utils/date-formatter';
import { 
  parseRegistrationNumber, 
  validateRegistrationNumber, 
  getNextRegistrationNumber, 
  getRankNumericCode, 
  DEFAULT_INSTITUTE_WILAYA_CODE 
} from '../utils/registration-number';
import { SchedulerView } from './SchedulerView';
import { triggerPrintWithDynamicTitle } from '../utils/print-utils';

export type PrintableDocType = 
  | 'attendance_blank' 
  | 'attendance_final' 
  | 'pv_deroulement' 
  | 'pv_descellement' 
  | 'envelope'
  | 'desk_labels'
  | 'door_poster'
  | 'staff_badges'
  | 'transmission_sheet'
  | 'candidate_convocation'
  | 'room_dossier_pack';

interface ExamConductViewProps {
  dbState: AppDatabaseState;
  initialSubTab?: 'rooms_distribution' | 'scheduler_proctors' | 'attendance_sheets' | 'exam_proceedings' | 'envelope_labels';
  onUpdateCandidates: (candidates: Candidate[]) => void;
  onUpdateRooms?: (rooms: ExamRoom[]) => void;
  onUpdateSession?: (updatedSession: ExamSession) => void;
  onUpdateProctors?: (proctors: ProctorTeacher[]) => void;
  onUpdateTimetable?: (slots: TimetableSlot[]) => void;
  onUpdateInstitutionSettings?: (settings: InstitutionSettings) => void;
  onAddAuditLog: (action: string, details: string, severity?: 'info' | 'warning' | 'security') => void;
  onSwitchSpecialty: (specialtyId: string) => void;
}

export const ExamConductView: React.FC<ExamConductViewProps> = ({
  dbState,
  initialSubTab = 'rooms_distribution',
  onUpdateCandidates,
  onUpdateRooms,
  onUpdateSession,
  onUpdateProctors,
  onUpdateTimetable,
  onUpdateInstitutionSettings,
  onAddAuditLog,
  onSwitchSpecialty
}) => {
  const currentSession = dbState.sessions.find(s => s.id === dbState.currentSessionId) || dbState.sessions[0];
  const currentSpecialtyId = currentSession?.specialtyId || 'dir_sec';
  const currentRank = getRankById(currentSpecialtyId) || OFFICIAL_RANKS[0];

  // Dynamic Director & Secretariat Staff from Database (No arbitrary hardcoding!)
  const activeDirectorName = dbState.institutionSettings?.directorName || currentSession?.presidentName || INSTITUTION.director;
  const activeDirectorTitle = dbState.institutionSettings?.directorTitle || 'مدير المعهد ورئيس مركز الامتحان';
  const activeSecretariatMembers: SecretariatMember[] = dbState.institutionSettings?.secretariatMembers && dbState.institutionSettings.secretariatMembers.length > 0
    ? dbState.institutionSettings.secretariatMembers
    : [
        { id: 'sec_01', fullName: 'أ. لزهاري أحمد', role: 'مسؤول أمانة المركز والرقابة الإدارية' },
        { id: 'sec_02', fullName: 'أ. قادري فاطمة', role: 'عضو أمانة المركز ومتابعة الأظرفة' },
        { id: 'sec_03', fullName: 'أ. بلعيدي صالح', role: 'عضو أمانة المركز وتدقيق محاضر الحضور' }
      ];

  // Candidates for currently active rank
  const candidates = useMemo(() => {
    return dbState.candidates.filter(c => c.specialtyId === currentSpecialtyId);
  }, [dbState.candidates, currentSpecialtyId]);

  // Modules for currently active rank
  const modules = useMemo(() => {
    return dbState.modules.filter(m => m.specialtyId === currentSpecialtyId);
  }, [dbState.modules, currentSpecialtyId]);

  // Subtab navigation:
  // 1. 'rooms_distribution': الرتب وتوزيع القاعات (سقف 20)
  // 2. 'scheduler_proctors': الرزنامة وتوزيع الحراسة
  // 3. 'attendance_sheets': قوائم الحضور والتوقيع (ميدانية + رصد إلكتروني)
  // 4. 'exam_proceedings': محضر سير الاختبارات وفك الأختام
  // 5. 'envelope_labels': بطاقات الأظرفة الكبرى
  const [activeSubTab, setActiveSubTab] = useState<'rooms_distribution' | 'scheduler_proctors' | 'attendance_sheets' | 'exam_proceedings' | 'envelope_labels'>(initialSubTab);

  // Modal State: Rank Picker
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);

  // Modal State: Live Preview (when non-null, modal is visible)
  const [previewDocument, setPreviewDocument] = useState<{
    type: PrintableDocType;
    title: string;
    roomId?: string;
    candidateId?: string;
  } | null>(null);

  // Dedicated Print Target State
  const [directPrintType, setDirectPrintType] = useState<PrintableDocType | null>(null);

  // Notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // =========================================================================
  // SUBTAB 1: ROOMS DISTRIBUTION (سقف 20 متكوناً)
  // =========================================================================
  const [roomNamesInput, setRoomNamesInput] = useState<string>('القاعة 01, القاعة 02, القاعة 03, القاعة 04');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [candidateSearch, setCandidateSearch] = useState<string>('');

  const currentAssignedRooms = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach(c => {
      if (c.roomNumber) set.add(c.roomNumber);
    });
    return Array.from(set).sort();
  }, [candidates]);

  const neededRoomsCount = Math.max(1, Math.ceil(candidates.length / 20));

  // Strictly derive active rooms adhering to candidate distribution in Subtab 1 (ceiling 20 candidates per room)
  const activeRankRooms: ExamRoom[] = useMemo(() => {
    if (currentAssignedRooms.length > 0) {
      return currentAssignedRooms.map((rName, idx) => ({
        id: `room_${(idx + 1).toString().padStart(2, '0')}`,
        name: rName,
        capacity: 20,
        building: 'الجناح البيداغوجي'
      }));
    }
    const count = Math.max(1, Math.ceil(candidates.length / 20));
    return Array.from({ length: count }, (_, i) => ({
      id: `room_${(i + 1).toString().padStart(2, '0')}`,
      name: `القاعة ${(i + 1).toString().padStart(2, '0')}`,
      capacity: 20,
      building: 'الجناح البيداغوجي'
    }));
  }, [currentAssignedRooms, candidates.length]);

  const handleAutoDistributeRooms = () => {
    if (candidates.length === 0) {
      showToast('لا يوجد متكونون مسجلون في هذه الرتبة لتوزيعهم!', 'error');
      return;
    }

    let names = roomNamesInput
      .split(/[,،\n]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (names.length === 0) {
      names = Array.from({ length: neededRoomsCount }, (_, i) => `القاعة ${(i + 1).toString().padStart(2, '0')}`);
    } else if (names.length < neededRoomsCount) {
      for (let i = names.length; i < neededRoomsCount; i++) {
        names.push(`القاعة ${(i + 1).toString().padStart(2, '0')}`);
      }
    }

    const sortedCandidates = [...candidates].sort((a, b) => {
      return a.registrationNumber.localeCompare(b.registrationNumber, undefined, { numeric: true });
    });

    const updatedRankCandidates: Candidate[] = [];
    sortedCandidates.forEach((cand, idx) => {
      const roomIndex = Math.floor(idx / 20);
      const assignedRoom = names[roomIndex] || `القاعة ${(roomIndex + 1).toString().padStart(2, '0')}`;
      const groupNum = `الفوج ${(roomIndex + 1).toString().padStart(2, '0')}`;
      updatedRankCandidates.push({
        ...cand,
        roomNumber: assignedRoom,
        groupNumber: cand.groupNumber || groupNum
      });
    });

    const otherCandidates = dbState.candidates.filter(c => c.specialtyId !== currentSpecialtyId);
    onUpdateCandidates([...otherCandidates, ...updatedRankCandidates]);

    // Synchronize rooms to global state for Scheduler and Proctors
    const synchronizedRooms: ExamRoom[] = names.slice(0, neededRoomsCount).map((rName, idx) => ({
      id: `room_${(idx + 1).toString().padStart(2, '0')}`,
      name: rName,
      capacity: 20,
      building: 'الجناح البيداغوجي'
    }));

    if (onUpdateRooms) {
      onUpdateRooms(synchronizedRooms);
    }

    onAddAuditLog(
      'توزيع القاعات الآلي',
      `تم توزيع ${candidates.length} متكون على ${neededRoomsCount} قاعات وفق المعيار الرسمي (سقف 20 متكوناً لكل قاعة) ومزامنتها مع رزنامة الحراسة.`,
      'info'
    );

    showToast(
      `تم بنجاح توزيع ${candidates.length} متكون على ${neededRoomsCount} قاعة بمعدل أقصاه 20 متكوناً ومزامنتها فورياً مع جدول الحراسة!`,
      'success'
    );
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter(cand => {
      const matchRoom = selectedRoomFilter === 'all' || cand.roomNumber === selectedRoomFilter;
      const matchSearch = 
        cand.fullName.toLowerCase().includes(candidateSearch.toLowerCase()) ||
        cand.registrationNumber.toLowerCase().includes(candidateSearch.toLowerCase()) ||
        (cand.birthPlace && cand.birthPlace.toLowerCase().includes(candidateSearch.toLowerCase()));
      return matchRoom && matchSearch;
    });
  }, [candidates, selectedRoomFilter, candidateSearch]);

  // =========================================================================
  // SUBTAB 3: ATTENDANCE SHEETS & DIGITAL REGISTRATION
  // =========================================================================
  const [attendanceModuleId, setAttendanceModuleId] = useState<string>(modules[0]?.id || '');
  const [attendanceRoomId, setAttendanceRoomId] = useState<string>(currentAssignedRooms[0] || 'all');
  const [attendanceMode, setAttendanceMode] = useState<'field_sheet' | 'digital_register'>('field_sheet');

  const selectedModule = modules.find(m => m.id === attendanceModuleId) || modules[0];

  const attendanceCandidates = useMemo(() => {
    if (attendanceRoomId === 'all') return candidates;
    return candidates.filter(c => c.roomNumber === attendanceRoomId);
  }, [candidates, attendanceRoomId]);

  const handleToggleAttendance = (candidateId: string) => {
    const updated = dbState.candidates.map(c => {
      if (c.id === candidateId) {
        const nextStatus: 'present' | 'absent' = c.attendanceStatus === 'absent' ? 'present' : 'absent';
        return {
          ...c,
          attendanceStatus: nextStatus,
          absenceReason: nextStatus === 'absent' ? (c.absenceReason || 'غياب غير مبرر') : undefined
        };
      }
      return c;
    });
    onUpdateCandidates(updated);
  };

  const handleSetAbsenceReason = (candidateId: string, reason: string) => {
    const updated = dbState.candidates.map(c => {
      if (c.id === candidateId) {
        return { ...c, absenceReason: reason };
      }
      return c;
    });
    onUpdateCandidates(updated);
  };

  const attendanceStats = useMemo(() => {
    const total = attendanceCandidates.length;
    const present = attendanceCandidates.filter(c => c.attendanceStatus !== 'absent').length;
    const absent = total - present;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : '100.0';
    return { total, present, absent, percentage };
  }, [attendanceCandidates]);

  // =========================================================================
  // SUBTAB 4: EXAM PROCEEDINGS PV & UNSEALING (محضر سير الاختبارات وفك الأختام)
  // =========================================================================
  const [pvModuleId, setPvModuleId] = useState<string>(modules[0]?.id || '');
  const [pvRoomName, setPvRoomName] = useState<string>(currentAssignedRooms[0] || 'القاعة 01');
  const [pvDate, setPvDate] = useState<string>(currentSession?.examStartDate || '2027-06-13');
  const [pvTimeSlot, setPvTimeSlot] = useState<string>('morning');
  const [pvIncidents, setPvIncidents] = useState<string>(
    'سارت مجريات الاختبار في ظروف عادية وهادئة ومطابقة للتنظيم العام للامتحانات، دون تسجيل أي حادث أو مخالفة انضباطية.'
  );

  const proctorsList = useMemo(() => {
    return dbState.proctors.length > 0 ? dbState.proctors : [
      { id: 'p1', fullName: 'أ. د. بن عيسى عبد القادر', specialty: 'التشريع المدرسي', institution: 'معهد الشيخ زاهية', phone: '' },
      { id: 'p2', fullName: 'أ. مسعودي عبد الرزاق', specialty: 'التسيير الإداري', institution: 'معهد الشيخ زاهية', phone: '' },
      { id: 'p3', fullName: 'أ. عائشة بلحاج', specialty: 'علوم التربية', institution: 'معهد الشيخ زاهية', phone: '' }
    ];
  }, [dbState.proctors]);

  const [witness1, setWitness1] = useState<{ name: string; reg: string }>({ name: '', reg: '' });
  const [witness2, setWitness2] = useState<{ name: string; reg: string }>({ name: '', reg: '' });

  const handleAutoFillWitnesses = () => {
    const pool = candidates.filter(c => !pvRoomName || c.roomNumber === pvRoomName);
    const validPool = pool.length >= 2 ? pool : candidates;
    if (validPool.length >= 2) {
      setWitness1({ name: validPool[0].fullName, reg: validPool[0].registrationNumber });
      setWitness2({ name: validPool[1].fullName, reg: validPool[1].registrationNumber });
      showToast('تم تعيين شاهدي فك الأختام تلقائياً من قائمة المتكونين بالقاعة!', 'info');
    }
  };

  const selectedPvModule = modules.find(m => m.id === pvModuleId) || modules[0];
  const pvCandidates = useMemo(() => {
    return candidates.filter(c => !pvRoomName || c.roomNumber === pvRoomName);
  }, [candidates, pvRoomName]);

  const pvPresentCount = pvCandidates.filter(c => c.attendanceStatus !== 'absent').length;
  // Automatically retrieve absent candidates for the selected room
  const pvAbsentCandidates = useMemo(() => {
    return pvCandidates.filter(c => c.attendanceStatus === 'absent');
  }, [pvCandidates]);

  // =========================================================================
  // SUBTAB 5: ENVELOPE LABELS, DESK LABELS, BADGES & PROCEDURAL DOCUMENTS
  // =========================================================================
  const [subDocType, setSubDocType] = useState<
    'envelope' | 'desk_labels' | 'door_poster' | 'staff_badges' | 'transmission_sheet' | 'candidate_convocation' | 'room_dossier_pack'
  >('desk_labels');
  const [selectedCandidateIdForConvocation, setSelectedCandidateIdForConvocation] = useState<string>('all');
  const [envelopeModuleId, setEnvelopeModuleId] = useState<string>(modules[0]?.id || '');
  const [envelopeRoomName, setEnvelopeRoomName] = useState<string>(currentAssignedRooms[0] || 'القاعة 01');
  const [envelopeType, setEnvelopeType] = useState<'subjects' | 'answers'>('answers');

  const selectedEnvelopeModule = modules.find(m => m.id === envelopeModuleId) || modules[0];
  const envelopeCandidates = candidates.filter(c => !envelopeRoomName || c.roomNumber === envelopeRoomName);
  const envFirstReg = envelopeCandidates[0]?.registrationNumber || '03010001';
  const envLastReg = envelopeCandidates[envelopeCandidates.length - 1]?.registrationNumber || '03010020';

  const selectedRoomCandidates = useMemo(() => {
    const list = candidates.filter(c => !envelopeRoomName || c.roomNumber === envelopeRoomName);
    const sorted = [...list].sort((a, b) => 
      a.registrationNumber.localeCompare(b.registrationNumber, undefined, { numeric: true })
    );
    return sorted.length > 0 ? sorted : candidates.slice(0, 20);
  }, [candidates, envelopeRoomName]);

  const getCandidateTableNumber = (cand: Candidate): string => {
    const rName = cand.roomNumber || envelopeRoomName;
    const roomCands = candidates
      .filter(c => c.roomNumber === rName)
      .sort((a, b) => a.registrationNumber.localeCompare(b.registrationNumber, undefined, { numeric: true }));
    const idx = roomCands.findIndex(c => c.id === cand.id);
    return idx >= 0 ? String(idx + 1).padStart(2, '0') : '01';
  };

  // Clean Subtab Switcher: closes any open modal and clears print target
  const handleSwitchSubTab = (tab: 'rooms_distribution' | 'scheduler_proctors' | 'attendance_sheets' | 'exam_proceedings' | 'envelope_labels') => {
    setActiveSubTab(tab);
    setPreviewDocument(null);
    setDirectPrintType(null);
  };

  // Helper to generate a precise, official document title for PDF export and printing
  const getPrintDocumentTitle = (docType: PrintableDocType, candId?: string, rName?: string): string => {
    const targetRoom = rName || previewDocument?.roomId || (
      docType === 'candidate_convocation' || docType === 'room_dossier_pack' || docType === 'desk_labels' || docType === 'door_poster' || docType === 'envelope'
        ? envelopeRoomName
        : (docType === 'attendance_blank' || docType === 'attendance_final')
        ? attendanceRoomId
        : pvRoomName
    ) || 'القاعة_01';

    const targetDate = pvDate || currentSession?.examStartDate || new Date().toISOString().slice(0, 10);
    const rankTitle = (currentRank.titleAr || 'الرتبة').trim().replace(/[\s/]/g, '_');
    const modTitle = (selectedEnvelopeModule?.titleAr || selectedModule?.titleAr || 'المقياس').trim().replace(/[\s/]/g, '_');
    const cleanRoom = targetRoom === 'all' ? 'جميع_القاعات' : targetRoom.trim().replace(/[\s/]/g, '_');

    switch (docType) {
      case 'candidate_convocation': {
        const targetCandId = candId || previewDocument?.candidateId || selectedCandidateIdForConvocation;
        if (targetCandId && targetCandId !== 'all') {
          const cand = candidates.find(c => c.id === targetCandId);
          if (cand) {
            const tableNum = getCandidateTableNumber(cand);
            const candName = cand.fullName.trim().replace(/[\s/]/g, '_');
            return `استدعاء_المترشح_${candName}_${cand.registrationNumber}_${cleanRoom}_طاولة_${tableNum}_${targetDate}`;
          }
        }
        return `استدعاءات_المترشحين_${cleanRoom}_${rankTitle}_${targetDate}`;
      }
      case 'room_dossier_pack':
        return `حزمة_ملف_القاعة_الموحد_${cleanRoom}_${rankTitle}_${targetDate}`;
      case 'desk_labels':
        return `ملصقات_طاولات_المترشحين_${cleanRoom}_${rankTitle}_${targetDate}`;
      case 'door_poster':
        return `لافتة_باب_قاعة_الامتحان_${cleanRoom}_${rankTitle}_${targetDate}`;
      case 'attendance_blank':
        return `ورقة_حضور_وتوقيع_المترشحين_${cleanRoom}_${rankTitle}_${modTitle}_${targetDate}`;
      case 'attendance_final':
        return `سجل_الغياب_والحضور_الإلكتروني_${cleanRoom}_${rankTitle}_${modTitle}_${targetDate}`;
      case 'pv_deroulement':
        return `محضر_سير_الاختبارات_${cleanRoom}_${rankTitle}_${modTitle}_${targetDate}`;
      case 'pv_descellement':
        return `محضر_فك_أختام_أظرفة_المواضيع_${cleanRoom}_${modTitle}_${targetDate}`;
      case 'staff_badges':
        return `شارات_الصدر_الرسمية_لمؤطري_المركز_${formatAcademicYear(currentSession?.academicYear || '2026/2027').replace(/[\s/]/g, '_')}_${targetDate}`;
      case 'transmission_sheet':
        return `جدول_تسليم_وتسلم_المواضيع_والإجابات_${modTitle}_${pvTimeSlot === 'morning' ? 'صباحا' : 'مساء'}_${targetDate}`;
      case 'envelope':
        return `ملصق_ظرف_${envelopeType === 'answers' ? 'أوراق_الإجابات' : 'مواضيع_الامتحان'}_${cleanRoom}_${modTitle}_${targetDate}`;
      default:
        return `وثيقة_امتحان_${rankTitle}_${targetDate}`;
    }
  };

  // Global Print Trigger: sets directPrintType, applies dynamic title for PDF saving, and executes window.print()
  const handleTriggerPrint = (docType: PrintableDocType, candId?: string, rName?: string) => {
    setDirectPrintType(docType);
    const dynamicDocTitle = getPrintDocumentTitle(docType, candId, rName);
    triggerPrintWithDynamicTitle(
      dynamicDocTitle,
      undefined,
      () => {
        setDirectPrintType(null);
      }
    );
  };

  // Determine which document to render inside the dedicated print-only container
  const activePrintDocumentType: PrintableDocType = useMemo(() => {
    if (previewDocument) {
      return previewDocument.type;
    }
    if (directPrintType) {
      return directPrintType;
    }
    if (activeSubTab === 'attendance_sheets') {
      return attendanceMode === 'field_sheet' ? 'attendance_blank' : 'attendance_final';
    }
    if (activeSubTab === 'exam_proceedings') {
      return 'pv_deroulement';
    }
    if (activeSubTab === 'envelope_labels') {
      return subDocType;
    }
    return 'attendance_blank';
  }, [previewDocument, directPrintType, activeSubTab, attendanceMode, subDocType]);

  // =========================================================================
  // PURE REACT DOCUMENT RENDERER (Used by both Preview Modal & Print Sheet)
  // =========================================================================
  const renderDocumentContent = (docType: PrintableDocType) => {
    if (docType === 'attendance_blank' || docType === 'attendance_final') {
      return (
        <div className="max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between font-simplified-arabic text-black bg-white p-4">
          <div>
            <div className="text-center border-b-2 border-black pb-2 mb-3">
              <h2 className="font-bold text-sm leading-tight">{INSTITUTION.republic}</h2>
              <h3 className="font-bold text-xs text-slate-800 leading-tight">{INSTITUTION.ministry}</h3>
              <h3 className="font-bold text-sm text-black mt-0.5 leading-tight">{INSTITUTION.name}</h3>
              <p className="text-[11px] text-slate-700 font-semibold">{INSTITUTION.deputyDirectorate} • {INSTITUTION.service}</p>
            </div>

            <div className="text-center mb-3">
              <h1 className="text-base font-black border-2 border-black inline-block px-6 py-1 rounded bg-slate-50">
                قائمة حضور وتوقيع المترشحين (ورقة الإمضاء الميدانية)
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs border border-black p-2.5 rounded mb-3 bg-slate-50">
              <div><strong>الرتبة:</strong> {currentRank.titleAr}</div>
              <div><strong>المقياس / المادة:</strong> {selectedModule?.titleAr}</div>
              <div><strong>الدورة التكوينية:</strong> {formatAcademicYear(currentSession?.academicYear || '2026 / 2027')}</div>
              <div><strong>القاعة:</strong> {attendanceRoomId === 'all' ? 'جميع القاعات' : attendanceRoomId}</div>
              <div><strong>تاريخ الإجراء:</strong> {formatArabicDate(pvDate)}</div>
              <div><strong>التوقيت:</strong> {pvTimeSlot === 'morning' ? (currentSession?.morningTimeSlot || '08:30 - 11:30') : (currentSession?.afternoonTimeSlot || '14:00 - 17:00')}</div>
            </div>

            <table className="w-full text-right text-xs border-collapse border border-black mb-4">
              <thead className="bg-slate-100 text-black font-bold border-b border-black">
                <tr>
                  <th className="border border-black py-1 px-2 text-center w-8">#</th>
                  <th className="border border-black py-1 px-2 text-center w-24">رقم التسجيل</th>
                  <th className="border border-black py-1 px-3">اللقب والاسم الكامل</th>
                  <th className="border border-black py-1 px-2 text-center w-24">تاريخ الميلاد</th>
                  <th className="border border-black py-1 px-3 text-center w-40">
                    إمضاء المترشح عند تسليم الإجابة
                  </th>
                  <th className="border border-black py-1 px-2 text-center w-20">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {attendanceCandidates.slice(0, 20).map((cand, idx) => (
                  <tr key={cand.id} className="border-b border-black h-8">
                    <td className="border border-black py-1 px-2 text-center font-mono">{idx + 1}</td>
                    <td className="border border-black py-1 px-2 text-center font-mono font-bold">{cand.registrationNumber}</td>
                    <td className="border border-black py-1 px-3 font-bold">{cand.fullName}</td>
                    <td className="border border-black py-1 px-2 text-center font-mono">{formatArabicDate(cand.birthDate)}</td>
                    <td className="border border-black py-1 px-3 text-center text-slate-300">
                      ...................
                    </td>
                    <td className="border border-black py-1 px-2 text-center text-[10px]">
                      {cand.attendanceStatus === 'absent' ? 'غائب' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border border-black p-3 rounded text-xs mt-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-bold block mb-1">الأساتذة الحراس بالقاعة:</span>
                <div className="space-y-1 text-slate-800">
                  <div>1. {proctorsList[0]?.fullName || '.............................................'} (التوقيع: .....................)</div>
                  <div>2. {proctorsList[1]?.fullName || '.............................................'} (التوقيع: .....................)</div>
                </div>
              </div>
              <div className="text-center flex flex-col justify-between">
                <span className="font-bold">توقيع وختم رئيس مركز الامتحان</span>
                <span className="text-[11px] text-slate-700 mt-4">{INSTITUTION.director}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (docType === 'pv_deroulement') {
      return (
        <div className="max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between font-simplified-arabic text-black bg-white p-4">
          <div>
            <div className="text-center border-b-2 border-black pb-2 mb-3">
              <h2 className="font-bold text-sm leading-tight">{INSTITUTION.republic}</h2>
              <h3 className="font-bold text-xs text-slate-800 leading-tight">{INSTITUTION.ministry}</h3>
              <h3 className="font-bold text-sm text-black mt-0.5 leading-tight">{INSTITUTION.name}</h3>
              <p className="text-[11px] text-slate-700 font-semibold">{INSTITUTION.deputyDirectorate} • {INSTITUTION.service}</p>
            </div>

            <div className="text-center mb-3">
              <h1 className="text-base font-black border-2 border-black inline-block px-6 py-1 rounded bg-slate-50">
                محضر سير الاختبارات
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs border border-black p-2.5 rounded mb-3 bg-slate-50">
              <div><strong>الرتبة:</strong> {currentRank.titleAr}</div>
              <div><strong>المقياس:</strong> {selectedPvModule?.titleAr}</div>
              <div><strong>القاعة:</strong> {pvRoomName}</div>
              <div><strong>تاريخ وتوقيت الإجراء:</strong> {formatArabicDate(pvDate)} ({pvTimeSlot === 'morning' ? 'صباحاً' : 'مساءً'})</div>
            </div>

            {/* Statistics */}
            <div className="border border-black p-2.5 rounded mb-3 text-xs">
              <h4 className="font-bold mb-1.5">إحصائيات المترشحين بالقاعة:</h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="border border-black p-1.5 rounded">عدد المسجلين بالقاعة: <strong>{pvCandidates.length}</strong></div>
                <div className="border border-black p-1.5 rounded">عدد الحاضرين: <strong>{pvPresentCount}</strong></div>
                <div className="border border-black p-1.5 rounded">عدد الغائبين: <strong>{pvAbsentCandidates.length}</strong></div>
              </div>
            </div>

            {/* AUTOMATED ABSENTEES SECTION */}
            <div className="border border-black p-2.5 rounded mb-3 text-xs">
              <h4 className="font-bold mb-1.5">قائمة المترشحين الغائبين (المرصودون آلياً من ورقة الحضور):</h4>
              {pvAbsentCandidates.length === 0 ? (
                <div className="p-2 bg-slate-50 border border-slate-300 rounded text-center text-slate-800 font-bold">
                  ✓ لم يُسجل أي غياب في هذه القاعة (حضور تام لجميع المترشحين بنسبة 100%).
                </div>
              ) : (
                <table className="w-full text-right text-xs border-collapse border border-black">
                  <thead className="bg-slate-100 font-bold">
                    <tr>
                      <th className="border border-black py-1 px-2 text-center w-10">الرقم</th>
                      <th className="border border-black py-1 px-3 text-center w-28">رقم التسجيل</th>
                      <th className="border border-black py-1 px-3">اللقب والاسم الكامل</th>
                      <th className="border border-black py-1 px-3">طبيعة ومبرر الغياب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pvAbsentCandidates.map((cand, idx) => (
                      <tr key={cand.id} className="border-b border-black">
                        <td className="border border-black py-1 px-2 text-center font-mono">{idx + 1}</td>
                        <td className="border border-black py-1 px-3 text-center font-mono font-bold">{cand.registrationNumber}</td>
                        <td className="border border-black py-1 px-3 font-bold">{cand.fullName}</td>
                        <td className="border border-black py-1 px-3">{cand.absenceReason || 'غياب غير مبرر'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Observations */}
            <div className="border border-black p-2.5 rounded mb-3 text-xs">
              <h4 className="font-bold mb-1">ملاحظات وتصريحات الأساتذة الحراس حول سير الاختبار والحوادث إن وجدت:</h4>
              <p className="text-slate-800 leading-relaxed mb-2">
                {pvIncidents || 'سارت مجريات الاختبار في ظروف عادية وهادئة ومطابقة للتنظيم العام للامتحانات، دون تسجيل أي حادث انضباطي.'}
              </p>
              <div className="space-y-2 pt-1">
                <div className="border-b border-dashed border-slate-400 h-5"></div>
                <div className="border-b border-dashed border-slate-400 h-5"></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border border-black p-3 rounded text-xs mt-auto">
            <div>
              <span className="font-bold block mb-1">الأساتذة الحراس بالقاعة:</span>
              <div className="space-y-1.5 pt-1 text-slate-800">
                <div>• {proctorsList[0]?.fullName} (التوقيع: .....................)</div>
                <div>• {proctorsList[1]?.fullName} (التوقيع: .....................)</div>
              </div>
            </div>
            <div className="text-center flex flex-col justify-between">
              <span className="font-bold">توقيع وختم رئيس مركز الامتحان</span>
              <span className="text-[11px] text-slate-700 mt-4">{INSTITUTION.director}</span>
            </div>
          </div>
        </div>
      );
    }

    if (docType === 'pv_descellement') {
      return (
        <div className="max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between font-simplified-arabic text-black bg-white p-4">
          <div>
            <div className="text-center border-b-2 border-black pb-2 mb-4">
              <h2 className="font-bold text-sm leading-tight">{INSTITUTION.republic}</h2>
              <h3 className="font-bold text-xs text-slate-800 leading-tight">{INSTITUTION.ministry}</h3>
              <h3 className="font-bold text-sm text-black mt-0.5 leading-tight">{INSTITUTION.name}</h3>
              <p className="text-[11px] text-slate-700 font-semibold">{INSTITUTION.deputyDirectorate} • {INSTITUTION.service}</p>
            </div>

            <div className="text-center mb-4">
              <h1 className="text-base font-black border-2 border-black inline-block px-6 py-1 rounded bg-slate-50">
                محضر فك أختام مواضيع الاختبار (PV d'Ouverture et de Descellement)
              </h1>
            </div>

            <div className="text-xs leading-relaxed space-y-3 p-4 border border-black rounded mb-4">
              <p>
                نحن الموقعون أسفله، الأساتذة الحراس ومترشحا القاعة الشاهدان، نشهد بأننا عاينّا الظرف المشمع الحاوي لمواضيع اختبار مقياس: <strong>{selectedPvModule?.titleAr}</strong> المخصص لـ <strong>{currentRank.titleAr}</strong>، بقاعة الامتحان: <strong>{pvRoomName}</strong>.
              </p>
              <p>
                ونشهد بأن الظرف كان سليماً ومحكم الإغلاق بالشمع الأحمر وخالياً من أي أثر للفتح أو التمزيق، وقد تم فك أختامه رسمياً بحضورنا عند تمام الساعة: <strong>{pvTimeSlot === 'morning' ? '08:30' : '14:00'}</strong> بتاريخ: <strong>{formatArabicDate(pvDate)}</strong>.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border border-black p-3 rounded text-xs mb-4">
              <div>
                <h4 className="font-bold mb-2">الشاهد الأول من المترشحين:</h4>
                <div>الاسم واللقب: <strong>{witness1.name || '...........................................'}</strong></div>
                <div>رقم التسجيل: <strong>{witness1.reg || '...........................................'}</strong></div>
                <div className="mt-4">التوقيع: .......................................</div>
              </div>
              <div>
                <h4 className="font-bold mb-2">الشاهد الثاني من المترشحين:</h4>
                <div>الاسم واللقب: <strong>{witness2.name || '...........................................'}</strong></div>
                <div>رقم التسجيل: <strong>{witness2.reg || '...........................................'}</strong></div>
                <div className="mt-4">التوقيع: .......................................</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border border-black p-3 rounded text-xs mt-auto">
            <div>
              <span className="font-bold block mb-1">الأساتذة الحراس بالقاعة:</span>
              <div className="space-y-1.5 pt-1 text-slate-800">
                <div>• {proctorsList[0]?.fullName} (التوقيع: .....................)</div>
                <div>• {proctorsList[1]?.fullName} (التوقيع: .....................)</div>
              </div>
            </div>
            <div className="text-center flex flex-col justify-between">
              <span className="font-bold">تأشيرة رئيس المركز</span>
              <span className="text-[11px] text-slate-700 mt-6">{INSTITUTION.director}</span>
            </div>
          </div>
        </div>
      );
    }

    if (docType === 'envelope') {
      return (
        <div className="max-w-[210mm] mx-auto p-4 border-4 border-black rounded-xl font-simplified-arabic text-black bg-white">
          <div className="text-center border-b-2 border-black pb-2 mb-3">
            <h2 className="font-bold text-sm leading-tight">{INSTITUTION.republic}</h2>
            <h3 className="font-bold text-xs text-slate-800 leading-tight">{INSTITUTION.ministry}</h3>
            <h3 className="font-bold text-sm text-black mt-0.5 leading-tight">{INSTITUTION.name}</h3>
            <p className="text-[11px] text-slate-700 font-semibold">{INSTITUTION.deputyDirectorate} • {INSTITUTION.service}</p>
          </div>

          <div className="text-center my-3">
            <span className="inline-block bg-black text-white font-bold text-sm px-6 py-1 rounded mb-2">
              {envelopeType === 'answers' ? 'ظرف أوراق الإجابات المشمع' : 'ظرف مواضيع الامتحان المشمع'}
            </span>
            <h2 className="text-xl font-black text-black">{currentRank.titleAr}</h2>
            <div className="text-base font-bold text-black mt-1">
              المقياس: {selectedEnvelopeModule?.titleAr}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs border-t-2 border-b-2 border-black py-2.5 font-semibold mb-3">
            <div>القاعة: <span className="font-bold text-black text-sm">{envelopeRoomName}</span></div>
            <div>الدورة التكوينية: <span className="font-bold">{formatAcademicYear(currentSession?.academicYear || '2026 / 2027')}</span></div>
            <div>تاريخ الإجراء: <span className="font-bold font-mono">{formatArabicDate(pvDate)}</span></div>
            <div>عدد الأوراق بالظرف: <span className="font-bold font-mono text-sm">{envelopeCandidates.length} ورقة</span></div>
            <div className="col-span-2">
              مجال أرقام التسجيل بالقاعة: من <span className="font-bold font-mono text-black text-sm">{envFirstReg}</span> إلى <span className="font-bold font-mono text-black text-sm">{envLastReg}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center text-xs">
            <div className="border border-black p-3 rounded h-24 flex flex-col justify-between">
              <span className="font-bold">توقيعات الأساتذة الحراس بالقاعة:</span>
              <span className="text-slate-400">...................................................</span>
            </div>
            <div className="border border-black p-3 rounded h-24 flex flex-col justify-between">
              <span className="font-bold">توقيع وختم رئيس مركز الامتحان:</span>
              <span className="text-[11px] text-slate-700">{INSTITUTION.director}</span>
            </div>
          </div>
        </div>
      );
    }

    // 1. ملصقات طاولات المترشحين (Étiquettes de tables - سقف 20 / شبكة A4 مع خطوط قص متقطعة)
    if (docType === 'desk_labels') {
      const roomCandidates = selectedRoomCandidates.slice(0, 20);
      return (
        <div className="max-w-[210mm] mx-auto min-h-[297mm] font-simplified-arabic text-black bg-white p-3">
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-2 mb-3">
            <h2 className="font-bold text-xs leading-tight">{INSTITUTION.republic}</h2>
            <h3 className="font-bold text-[11px] text-slate-800 leading-tight">{INSTITUTION.ministry}</h3>
            <h3 className="font-bold text-xs text-black mt-0.5 leading-tight">{INSTITUTION.name}</h3>
            <p className="text-[10px] text-slate-700 font-semibold">{INSTITUTION.deputyDirectorate} • {INSTITUTION.service}</p>
            <div className="mt-1 flex items-center justify-between text-[11px] font-bold border-t border-slate-300 pt-1">
              <span>ملصقات طاولات المترشحين (Étiquettes de Tables)</span>
              <span>الرتبة: {currentRank.titleAr}</span>
              <span>القاعة: {envelopeRoomName}</span>
              <span>تعداد القاعة: {roomCandidates.length} متكوناً</span>
            </div>
          </div>

          {/* Grid of Desk Cards (2 columns x 3 rows = 6 cards per page) */}
          <div className="grid grid-cols-2 gap-3 text-right">
            {roomCandidates.map((cand, idx) => (
              <div 
                key={cand.id || idx} 
                className="border-2 border-dashed border-black rounded-lg p-2.5 relative flex flex-col justify-between bg-white avoid-break min-h-[78mm]"
              >
                {/* Scissors indicator */}
                <div className="absolute -top-2.5 right-4 bg-white px-1.5 text-[9px] text-slate-600 font-mono flex items-center gap-1 border border-dashed border-slate-400 rounded">
                  <span>✂ قص الملصق</span>
                </div>

                {/* Top Badge & Header */}
                <div className="flex items-start justify-between border-b border-black pb-1.5 mb-1.5">
                  <div>
                    <h4 className="font-bold text-[10px] leading-tight text-slate-900">{INSTITUTION.name}</h4>
                    <span className="text-[9px] text-slate-600 block">امتحان التكوين المتخصص • دورة {formatAcademicYear(currentSession?.academicYear || '2026 / 2027')}</span>
                  </div>
                  <div className="bg-black text-white px-2 py-0.5 rounded text-xs font-black text-center min-w-[70px]">
                    طاولة رقم {String(idx + 1).padStart(2, '0')}
                  </div>
                </div>

                {/* Candidate Information */}
                <div className="space-y-1 text-xs">
                  <div className="bg-slate-100 p-1.5 rounded border border-slate-300 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">رقم التسجيل:</span>
                    <span className="font-mono font-black text-sm text-black tracking-wider">{cand.registrationNumber}</span>
                  </div>
                  <div className="pt-0.5">
                    <span className="text-[10px] text-slate-500 block">الاسم واللقب الكامل:</span>
                    <span className="font-black text-xs text-black block leading-snug">{cand.fullName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-700 pt-0.5">
                    <div>
                      <span className="text-slate-500 block text-[9px]">تاريخ الميلاد:</span>
                      <span className="font-mono font-bold">{formatArabicDate(cand.birthDate)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">مكان الميلاد:</span>
                      <span className="font-bold truncate">{cand.birthPlace || 'الأغواط'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-700 border-t border-slate-200 pt-1">
                    <div>
                      <span className="text-slate-500 text-[9px]">القاعة:</span> <strong className="text-black">{envelopeRoomName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[9px]">الفوج:</span> <strong className="text-black">{cand.groupNumber || 'الفوج 01'}</strong>
                    </div>
                  </div>
                </div>

                {/* Simulated Barcode & Security stamp */}
                <div className="mt-2 pt-1 border-t border-black flex items-center justify-between">
                  <div className="flex flex-col">
                    <div className="flex gap-[1.5px] items-center h-4">
                      {cand.registrationNumber.split('').map((char, i) => (
                        <div 
                          key={i} 
                          className="bg-black h-4" 
                          style={{ width: `${(parseInt(char, 10) % 3) + 1.5}px` }} 
                        />
                      ))}
                      <div className="bg-black h-4 w-1"></div>
                      <div className="bg-black h-4 w-0.5"></div>
                    </div>
                    <span className="font-mono text-[8px] text-slate-600 mt-0.5">{cand.registrationNumber}</span>
                  </div>
                  <div className="text-[8px] text-slate-500 text-left font-sans">
                    <div>مصلحة الامتحانات</div>
                    <div className="font-bold text-slate-700">تأشيرة المركز</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-2 border-t border-black text-center text-[10px] text-slate-600">
            ملاحظة تنظيمية: تلصق هذه البطاقات على زاوية طاولات الامتحان المقابلة للمترشح قبل فتح أبواب المركز.
          </div>
        </div>
      );
    }

    // 2. لافتة باب قاعة الامتحان (Affichette de porte de salle) - استثناء أسماء الأساتذة الحراس كلياً
    if (docType === 'door_poster') {
      const roomCandidates = selectedRoomCandidates.slice(0, 20);
      const firstReg = roomCandidates[0]?.registrationNumber || '03010001';
      const lastReg = roomCandidates[roomCandidates.length - 1]?.registrationNumber || '03010020';

      return (
        <div className="max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between font-simplified-arabic text-black bg-white p-5 border-4 border-black rounded-lg">
          <div>
            {/* Institutional Header */}
            <div className="text-center border-b-2 border-black pb-2 mb-3">
              <h2 className="font-bold text-sm leading-tight">{INSTITUTION.republic}</h2>
              <h3 className="font-bold text-xs text-slate-800 leading-tight">{INSTITUTION.ministry}</h3>
              <h3 className="font-bold text-sm text-black mt-0.5 leading-tight">{INSTITUTION.name}</h3>
              <p className="text-[11px] text-slate-700 font-semibold">{INSTITUTION.deputyDirectorate} • {INSTITUTION.service}</p>
            </div>

            {/* Title Banner */}
            <div className="text-center mb-3">
              <div className="bg-black text-white font-black text-base px-6 py-1.5 rounded inline-block tracking-wide">
                لافتة باب قاعة الامتحان (AFFICHETTE DE PORTE DE SALLE)
              </div>
            </div>

            {/* Room Big Box */}
            <div className="border-2 border-black rounded-lg p-3 text-center mb-3 bg-slate-50">
              <h1 className="text-2xl font-black text-black">
                {envelopeRoomName}
              </h1>
              <div className="text-sm font-bold text-slate-800 mt-1">
                الرتبة: <span className="text-black font-black">{currentRank.titleAr}</span>
              </div>
            </div>

            {/* Meta Details */}
            <div className="grid grid-cols-2 gap-2 text-xs border border-black p-2.5 rounded mb-3 bg-slate-50">
              <div><strong>الدورة التكوينية:</strong> {formatAcademicYear(currentSession?.academicYear || '2026 / 2027')}</div>
              <div><strong>تعداد المترشحين بالقاعة:</strong> <span className="font-bold font-mono text-sm">{roomCandidates.length} متكوناً</span> (سقف 20)</div>
              <div><strong>تاريخ الإجراء:</strong> {formatArabicDate(pvDate)}</div>
              <div><strong>مجال أرقام التسجيل:</strong> من <span className="font-bold font-mono">{firstReg}</span> إلى <span className="font-bold font-mono">{lastReg}</span></div>
            </div>

            {/* Candidate Roster Table for this Room */}
            <div className="mb-3">
              <h4 className="font-bold text-xs mb-1">جدول المترشحين الموزعين على القاعة (حسب أرقام الطاولات):</h4>
              <table className="w-full text-right text-xs border-collapse border border-black">
                <thead className="bg-slate-100 text-black font-bold border-b border-black">
                  <tr>
                    <th className="border border-black py-1 px-2 text-center w-14">الطاولة</th>
                    <th className="border border-black py-1 px-2 text-center w-24">رقم التسجيل</th>
                    <th className="border border-black py-1 px-3">اللقب والاسم الكامل للمترشح</th>
                    <th className="border border-black py-1 px-2 text-center w-24">تاريخ الميلاد</th>
                    <th className="border border-black py-1 px-2 text-center w-24">مكان الميلاد</th>
                  </tr>
                </thead>
                <tbody>
                  {roomCandidates.map((cand, idx) => (
                    <tr key={cand.id || idx} className="border-b border-black h-7">
                      <td className="border border-black py-0.5 px-2 text-center font-mono font-bold bg-slate-50">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="border border-black py-0.5 px-2 text-center font-mono font-bold">{cand.registrationNumber}</td>
                      <td className="border border-black py-0.5 px-3 font-bold">{cand.fullName}</td>
                      <td className="border border-black py-0.5 px-2 text-center font-mono">{formatArabicDate(cand.birthDate)}</td>
                      <td className="border border-black py-0.5 px-2 text-center text-[11px] truncate max-w-[100px]">{cand.birthPlace || 'الأغواط'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* STRICT DISCIPLINARY INSTRUCTIONS FOR CANDIDATES */}
            <div className="border border-black p-2.5 rounded text-xs bg-slate-50 mb-3">
              <h4 className="font-bold text-black mb-1">تعليمات انضباطية رسمية صارمة للمترشحين:</h4>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-800 leading-relaxed font-semibold">
                <li>يمنع منعاً باتاً حيازة أو إدخال الهواتف النقالة، الساعات الذكية، أو أي وسيلة اتصال إلكترونية داخل قاعة الامتحان.</li>
                <li>إلزامية إبراز بطاقة التعريف الوطنية الرسمية والاستدعاء الفردي عند الدخول وعند كل طلب.</li>
                <li>الالتحاق بالقاعة 30 دقيقة على الأقل قبل التوقيت المحدد لانطلاق الاختبارات؛ وتغلق أبواب المركز رسمياً مع بداية الامتحان.</li>
                <li>الالتزام التام بالجلوس في الطاولة المخصصة لكل مترشح والمطابقة لرقم التسجيل المدون أعلاه.</li>
                <li>يمنع منعاً كلياً مغادرة قاعة الامتحان قبل انقضاء نصف المدة الرسمية المخصصة للاختبار.</li>
              </ul>
            </div>
          </div>

          {/* Institutional Stamp & Signature - STRICTLY NO PROCTOR NAMES */}
          <div className="border-t-2 border-black pt-3 mt-auto">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-bold block">مصلحة تنظيم الامتحانات والتأهيل</span>
                <span className="text-[10px] text-slate-600">وثيقة إجرائية معتمدة تعلق على مدخل القاعة</span>
              </div>
              <div className="text-center pl-8">
                <span className="font-bold block">ختم وتوقيع رئيس مركز الامتحان</span>
                <span className="text-xs text-slate-800 font-bold mt-3 block">{activeDirectorName}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 3. شارات الصدر الرسمية للمؤطرين (Badges officiels d'encadrement) - استثناء الفريق الطبي وشبه الطبي
    if (docType === 'staff_badges') {
      const staffList = [
        {
          name: activeDirectorName,
          role: activeDirectorTitle,
          roleColor: 'bg-amber-100 text-amber-900 border-amber-400',
          institution: INSTITUTION.name,
          mission: 'الإشراف العام وتأطير المركز'
        },
        ...activeSecretariatMembers.map((sec) => ({
          name: sec.fullName,
          role: sec.role,
          roleColor: 'bg-blue-100 text-blue-900 border-blue-400',
          institution: INSTITUTION.name,
          mission: sec.role
        })),
        ...proctorsList.slice(0, 4).map((p, idx) => ({
          name: p.fullName,
          role: 'أستاذ حارس بالقاعة',
          roleColor: 'bg-emerald-100 text-emerald-900 border-emerald-400',
          institution: p.institution || INSTITUTION.name,
          mission: `حراسة وانضباط قاعات الامتحان (${idx % 2 === 0 ? 'القاعة 01' : 'القاعة 02'})`
        }))
      ];

      return (
        <div className="max-w-[210mm] mx-auto min-h-[297mm] font-simplified-arabic text-black bg-white p-3">
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-2 mb-3">
            <h2 className="font-bold text-xs leading-tight">{INSTITUTION.republic}</h2>
            <h3 className="font-bold text-[11px] text-slate-800 leading-tight">{INSTITUTION.ministry}</h3>
            <h3 className="font-bold text-xs text-black mt-0.5 leading-tight">{INSTITUTION.name}</h3>
            <p className="text-[10px] text-slate-700 font-semibold">{INSTITUTION.deputyDirectorate} • {INSTITUTION.service}</p>
            <div className="mt-1 flex items-center justify-between text-[11px] font-bold border-t border-slate-300 pt-1">
              <span>شارات الصدر الرسمية للمؤطرين (Badges Officiels d'Encadrement)</span>
              <span>دورة: {formatAcademicYear(currentSession?.academicYear || '2026 / 2027')}</span>
              <span>مركز الامتحان: معهد الأغواط</span>
            </div>
          </div>

          {/* Badges Grid (2 columns x 4 rows) */}
          <div className="grid grid-cols-2 gap-3 text-right">
            {staffList.map((staff, idx) => (
              <div 
                key={idx} 
                className="border-2 border-black rounded-xl p-3 relative flex flex-col justify-between bg-white avoid-break min-h-[62mm] shadow-xs"
              >
                {/* Scissors indicator */}
                <div className="absolute -top-2.5 right-4 bg-white px-1.5 text-[9px] text-slate-600 font-mono flex items-center gap-1 border border-dashed border-slate-400 rounded">
                  <span>✂ قص الشارة</span>
                </div>

                {/* Badge Top Header */}
                <div className="bg-slate-900 text-white text-center py-1 px-2 rounded-t-lg -mx-3 -mt-3 mb-2">
                  <div className="text-[9px] font-bold leading-tight">الجمهورية الجزائرية الديمقراطية الشعبية</div>
                  <div className="text-[10px] font-black text-amber-300">{INSTITUTION.name}</div>
                </div>

                <div className="flex gap-3 items-center my-auto">
                  {/* Photo Box */}
                  <div className="w-18 h-22 border-2 border-dashed border-slate-400 rounded-md flex flex-col items-center justify-center text-center p-1 bg-slate-50 shrink-0">
                    <span className="text-[8px] text-slate-400 leading-tight">مكان الصورة الشمسية الرسمية (4×3)</span>
                  </div>

                  {/* Staff Info */}
                  <div className="space-y-1 flex-1">
                    <div>
                      <span className="text-[9px] text-slate-500 block">الاسم واللقب:</span>
                      <h4 className="font-black text-xs text-black leading-snug">{staff.name}</h4>
                    </div>
                    <div className="pt-0.5">
                      <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded border ${staff.roleColor}`}>
                        {staff.role}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-700 pt-0.5">
                      <span>المهمة: </span><strong className="text-black">{staff.mission}</strong>
                    </div>
                  </div>
                </div>

                {/* Badge Footer with Stamp Area */}
                <div className="border-t border-slate-300 pt-1 mt-2 flex items-center justify-between text-[8px] text-slate-600">
                  <div>
                    <span>امتحان التكوين المتخصص</span>
                    <div className="font-mono text-slate-500">{formatAcademicYear(currentSession?.academicYear || '2026 / 2027')}</div>
                  </div>
                  <div className="text-left font-bold text-black">
                    <div>تأشيرة رئيس المركز</div>
                    <div className="text-[7px] text-slate-700 font-bold">{activeDirectorName}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-2 border-t border-black text-center text-[10px] text-slate-600">
            تنبيه: يجب على كل مؤطر حمل هذه الشارة الرسمية بشكل بارز طيلة فترة سير الامتحانات داخل المركز.
          </div>
        </div>
      );
    }

    // 4. جدول تسليم وتسلم مواضيع وأوراق الإجابات (Bordereau de transmission)
    if (docType === 'transmission_sheet') {
      const roomList = activeRankRooms.length > 0 ? activeRankRooms : [
        { id: 'r1', name: 'القاعة 01', capacity: 20, building: 'الجناح البيداغوجي' },
        { id: 'r2', name: 'القاعة 02', capacity: 20, building: 'الجناح البيداغوجي' },
        { id: 'r3', name: 'القاعة 03', capacity: 20, building: 'الجناح البيداغوجي' }
      ];

      return (
        <div className="max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between font-simplified-arabic text-black bg-white p-4">
          <div>
            {/* Institutional Header */}
            <div className="text-center border-b-2 border-black pb-2 mb-3">
              <h2 className="font-bold text-sm leading-tight">{INSTITUTION.republic}</h2>
              <h3 className="font-bold text-xs text-slate-800 leading-tight">{INSTITUTION.ministry}</h3>
              <h3 className="font-bold text-sm text-black mt-0.5 leading-tight">{INSTITUTION.name}</h3>
              <p className="text-[11px] text-slate-700 font-semibold">{INSTITUTION.deputyDirectorate} • {INSTITUTION.service}</p>
            </div>

            {/* Title */}
            <div className="text-center mb-3">
              <h1 className="text-base font-black border-2 border-black inline-block px-6 py-1.5 rounded bg-slate-50">
                جدول تسليم وتسلم مواضيع وأوراق الإجابات المشمعة (Bordereau de Transmission)
              </h1>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-2 text-xs border border-black p-2.5 rounded mb-3 bg-slate-50">
              <div><strong>الرتبة:</strong> {currentRank.titleAr}</div>
              <div><strong>المقياس / المادة:</strong> {selectedEnvelopeModule?.titleAr}</div>
              <div><strong>الدورة التكوينية:</strong> {formatAcademicYear(currentSession?.academicYear || '2026 / 2027')}</div>
              <div><strong>تاريخ الإجراء:</strong> {formatArabicDate(pvDate)}</div>
              <div className="col-span-2">
                <strong>الفترة:</strong> {pvTimeSlot === 'morning' ? `الفترة الصباحية (${currentSession?.morningTimeSlot || '08:30 - 11:30'})` : `الفترة المسائية (${currentSession?.afternoonTimeSlot || '14:00 - 17:00'})`}
              </div>
            </div>

            {/* Comprehensive Transmission Table */}
            <table className="w-full text-right text-xs border-collapse border border-black mb-4">
              <thead className="bg-slate-100 text-black font-bold border-b border-black text-[11px]">
                <tr>
                  <th rowSpan={2} className="border border-black py-1 px-2 text-center w-20">القاعة</th>
                  <th rowSpan={2} className="border border-black py-1 px-1 text-center w-12">التعداد</th>
                  <th colSpan={3} className="border border-black py-1 px-2 text-center bg-amber-50">تسليم أظرفة المواضيع (قبل الامتحان)</th>
                  <th colSpan={3} className="border border-black py-1 px-2 text-center bg-emerald-50">استرجاع أوراق الإجابات المشمعة (بعد الامتحان)</th>
                  <th rowSpan={2} className="border border-black py-1 px-2 text-center w-20">تأشيرة الأمانة المستلمة</th>
                </tr>
                <tr>
                  <th className="border border-black py-1 px-1 text-center w-14 bg-amber-50 text-[10px]">الوقت</th>
                  <th className="border border-black py-1 px-2 bg-amber-50 text-[10px]">اسم الحارس المستلم</th>
                  <th className="border border-black py-1 px-2 text-center w-16 bg-amber-50 text-[10px]">توقيعه</th>
                  <th className="border border-black py-1 px-1 text-center w-14 bg-emerald-50 text-[10px]">الوقت</th>
                  <th className="border border-black py-1 px-1 text-center w-14 bg-emerald-50 text-[10px]">عدد الأوراق</th>
                  <th className="border border-black py-1 px-2 text-center w-16 bg-emerald-50 text-[10px]">توقيع الحارس</th>
                </tr>
              </thead>
              <tbody>
                {roomList.map((room, idx) => {
                  const rCandidates = candidates.filter(c => c.roomNumber === room.name);
                  const count = rCandidates.length > 0 ? rCandidates.length : Math.min(20, Math.max(1, candidates.length));
                  const defaultProctor = proctorsList[idx % proctorsList.length]?.fullName || 'أستاذ حارس';
                  return (
                    <tr key={room.id} className="border-b border-black h-10">
                      <td className="border border-black py-1 px-2 text-center font-bold bg-slate-50">{room.name}</td>
                      <td className="border border-black py-1 px-1 text-center font-mono font-bold">{count}</td>
                      <td className="border border-black py-1 px-1 text-center font-mono text-[11px]">{pvTimeSlot === 'morning' ? '08:15' : '13:45'}</td>
                      <td className="border border-black py-1 px-2 text-[10px] font-semibold">{defaultProctor}</td>
                      <td className="border border-black py-1 px-1 text-center text-slate-300">...........</td>
                      <td className="border border-black py-1 px-1 text-center font-mono text-[11px]">{pvTimeSlot === 'morning' ? '11:35' : '17:05'}</td>
                      <td className="border border-black py-1 px-1 text-center font-mono font-bold">{count}</td>
                      <td className="border border-black py-1 px-1 text-center text-slate-300">...........</td>
                      <td className="border border-black py-1 px-1 text-center text-slate-300">...........</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Secretariat Handover Instructions */}
            <div className="border border-black p-2.5 rounded text-xs bg-slate-50 mb-3">
              <h4 className="font-bold text-black mb-1">تعليمات أمانة المركز لتسليم وحفظ أوراق الإجابات:</h4>
              <p className="text-[11px] text-slate-800 leading-relaxed">
                تُسلّم أظرفة المواضيع للحراس المشرفين 15 دقيقة قبل انطلاق التوقيت الرسمي. عند نهاية الاختبار، يستلم عضو الأمانة أظرفة أوراق الإجابات مشمعة ومختومة وموقعة من طرف الحراس، بعد التحقق الدقيق من مطابقة عدد أوراق الإجابات مع عدد الحاضرين الفعليين بالقاعة.
              </p>
            </div>
          </div>

          {/* Validation signatures */}
          <div className="grid grid-cols-3 gap-3 border border-black p-3 rounded text-xs mt-auto">
            <div className="text-center">
              <span className="font-bold block mb-1">مسؤول أمانة المركز</span>
              <span className="text-[10px] text-slate-600 block mb-6">الاسم والتوقيع: {activeSecretariatMembers[0]?.fullName || 'أ. لزهاري أحمد'}</span>
              <span className="text-slate-400">..............................</span>
            </div>
            <div className="text-center border-r border-l border-black px-2">
              <span className="font-bold block mb-1">رئيس مصلحة تنظيم الامتحانات</span>
              <span className="text-[10px] text-slate-600 block mb-6">التأشيرة والتدقيق الإداري</span>
              <span className="text-slate-400">..............................</span>
            </div>
            <div className="text-center">
              <span className="font-bold block mb-1">ختم وتوقيع رئيس المركز</span>
              <span className="text-[11px] text-slate-800 font-bold block mt-4">{activeDirectorName}</span>
            </div>
          </div>
        </div>
      );
    }

    // 5. استدعاء المترشح الرسمي لاجتياز الامتحانات (Convocation Officielle du Candidat)
    if (docType === 'candidate_convocation') {
      const convocationList = selectedCandidateIdForConvocation === 'all'
        ? selectedRoomCandidates
        : selectedRoomCandidates.filter(c => c.id === selectedCandidateIdForConvocation);
      
      const targetCandidates = convocationList.length > 0 ? convocationList : selectedRoomCandidates.slice(0, 1);

      return (
        <div className="font-simplified-arabic text-black bg-white">
          {targetCandidates.map((cand, candIdx) => {
            const tableNum = getCandidateTableNumber(cand);
            return (
              <div 
                key={cand.id || candIdx} 
                className={`max-w-[210mm] mx-auto min-h-[297mm] p-5 flex flex-col justify-between bg-white text-black border-2 border-black rounded-lg ${
                  candIdx < targetCandidates.length - 1 ? 'page-break-after mb-8' : ''
                }`}
              >
                <div>
                  {/* Institutional Header */}
                  <div className="text-center border-b-2 border-black pb-2 mb-3">
                    <h2 className="font-bold text-sm leading-tight">{INSTITUTION.republic}</h2>
                    <h3 className="font-bold text-xs text-slate-800 leading-tight">{INSTITUTION.ministry}</h3>
                    <h3 className="font-bold text-sm text-black mt-0.5 leading-tight">{INSTITUTION.name}</h3>
                    <p className="text-[11px] text-slate-700 font-semibold">{INSTITUTION.deputyDirectorate} • {INSTITUTION.service}</p>
                  </div>

                  {/* Title Banner */}
                  <div className="text-center mb-3">
                    <div className="bg-black text-white font-black text-sm md:text-base px-6 py-1.5 rounded inline-block tracking-wide">
                      استدعاء فردي رسمي لاجتياز امتحانات التخرج (CONVOCATION OFFICIELLE)
                    </div>
                    <div className="text-xs font-bold text-slate-800 mt-1">
                      {currentSession?.name || 'امتحان التخرج النهائي - دورة جوان 2027'} • السنة التكوينية: {formatAcademicYear(currentSession?.academicYear || '2026 / 2027')}
                    </div>
                  </div>

                  {/* Candidate Identification Box with Table and Room Number */}
                  <div className="border-2 border-black rounded-xl p-3.5 mb-3 bg-slate-50 text-xs">
                    <div className="flex items-center justify-between border-b border-black pb-2 mb-2.5">
                      <div>
                        <span className="text-slate-600 block text-[11px]">الرتبة التكوينية:</span>
                        <h3 className="font-black text-sm text-black">{currentRank.titleAr}</h3>
                      </div>
                      <div className="bg-black text-white px-3 py-1 rounded-lg text-center">
                        <span className="text-[10px] block opacity-80">رقم التسجيل الرسمي</span>
                        <span className="font-mono font-black text-sm tracking-wider">{cand.registrationNumber}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 leading-relaxed">
                      <div>
                        <span className="text-slate-600">الاسم واللقب الكامل:</span> <strong className="text-sm font-black text-black">{cand.fullName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-600">تاريخ ومكان الميلاد:</span> <strong className="font-mono">{formatArabicDate(cand.birthDate)}</strong> ({cand.birthPlace || 'الأغواط'})
                      </div>
                      <div>
                        <span className="text-slate-600">ولاية المترشح / المؤسسة:</span> <strong>{cand.originalInstitution || cand.wilaya || cand.candidateWilaya || cand.birthPlace || 'الأغواط'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-600">الفوج التربوي:</span> <strong className="font-mono">{cand.groupNumber || 'الفوج 01'}</strong>
                      </div>
                    </div>

                    {/* Room and Table Highlight Box */}
                    <div className="mt-3 pt-2.5 border-t border-dashed border-slate-400 grid grid-cols-2 gap-3 bg-white p-2.5 rounded-lg border border-slate-300 text-center">
                      <div className="border-l border-slate-300">
                        <span className="text-[11px] text-slate-600 block font-bold">قاعة الامتحان المخصصة:</span>
                        <span className="text-base font-black text-black">{cand.roomNumber || envelopeRoomName}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-600 block font-bold">رقم الطاولة الفردية:</span>
                        <span className="text-base font-black text-black font-mono">طاولة رقم {tableNum}</span>
                      </div>
                    </div>
                  </div>

                  {/* Modules Timetable Schedule Box */}
                  <div className="mb-3">
                    <h4 className="font-bold text-xs mb-1.5 flex items-center justify-between">
                      <span>جدول تواريخ وتوقيت مقاييس الامتحان المعني باجتيازها:</span>
                      <span className="text-[10px] text-slate-600 font-mono">مركز الإجراء: الجناح البيداغوجي بالمعهد</span>
                    </h4>

                    <table className="w-full text-right text-xs border-collapse border border-black">
                      <thead className="bg-slate-100 text-black font-bold border-b border-black">
                        <tr>
                          <th className="border border-black py-1 px-2 text-center w-8">#</th>
                          <th className="border border-black py-1 px-3">المقياس التكويني</th>
                          <th className="border border-black py-1 px-2 text-center w-28">تاريخ الإجراء</th>
                          <th className="border border-black py-1 px-2 text-center w-28">توقيت الاختبار</th>
                          <th className="border border-black py-1 px-2 text-center w-14">المعامل</th>
                          <th className="border border-black py-1 px-2 text-center w-16">المدة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modules.map((mod, mIdx) => {
                          const examDateStr = currentSession?.examStartDate || '2027-06-13';
                          const isMorning = mIdx % 2 === 0;
                          const slotTime = isMorning 
                            ? (currentSession?.morningTimeSlot || '08:30 - 11:30')
                            : (currentSession?.afternoonTimeSlot || '14:00 - 17:00');
                          return (
                            <tr key={mod.id || mIdx} className="border-b border-black h-7">
                              <td className="border border-black py-0.5 px-2 text-center font-mono">{mIdx + 1}</td>
                              <td className="border border-black py-0.5 px-3 font-bold">{mod.titleAr}</td>
                              <td className="border border-black py-0.5 px-2 text-center font-mono">{formatArabicDate(examDateStr)}</td>
                              <td className="border border-black py-0.5 px-2 text-center font-mono font-bold text-[11px]">{slotTime}</td>
                              <td className="border border-black py-0.5 px-2 text-center font-mono font-bold">{mod.coefficient}</td>
                              <td className="border border-black py-0.5 px-2 text-center font-mono">{mod.durationMinutes / 60} سا</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Internal Exam Regulations & Discipline */}
                  <div className="border border-black p-2.5 rounded text-xs bg-slate-50 mb-3">
                    <h4 className="font-bold text-black mb-1">شروط ونظام الانضباط الداخلي للامتحانات (إلزامية التقيد):</h4>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-800 leading-relaxed font-semibold">
                      <li>يجب الحضور إلى مركز الامتحان ثلاثين (30) دقيقة على الأقل قبل الموعد الرسمي لانطلاق الاختبار، وتغلق الأبواب مع بداية الامتحان.</li>
                      <li>إلزامية الاستظهار بهذا الاستدعاء وبطاقة التعريف الوطنية الرسمية عند الدخول وعند كل طلب من الحراس.</li>
                      <li>يمنع منعاً باتاً إدخال أو استخدام الهواتف النقالة، الساعات الذكية، أو أي جهاز اتصال داخل القاعة تحت طائلة الإقصاء الفوري والمتابعة التأديبية.</li>
                      <li>الالتزام الصارم بالجلوس في الطاولة الفردية المخصصة وفق رقم الطاولة ورقم التسجيل المبينين بهذا الاستدعاء.</li>
                      <li>يمنع مغادرة قاعة الامتحان قبل انقضاء نصف المدة المخصصة للاختبار، وتسلّم ورقة الإجابة موقعة من المترشح.</li>
                    </ul>
                  </div>
                </div>

                {/* Validation & Stamp */}
                <div className="border-t-2 border-black pt-3 mt-auto">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-bold block">مصلحة تنظيم سير الامتحانات</span>
                      <span className="text-[10px] text-slate-600 block mt-1">حرر بـ {INSTITUTION.wilaya} في: {formatArabicDate(new Date())}</span>
                      <span className="text-[10px] text-slate-500 mt-4 block">تأشيرة الأمانة: .......................................</span>
                    </div>
                    <div className="text-center flex flex-col justify-between">
                      <span className="font-bold block">ختم وإمضاء مدير المعهد (رئيس المركز)</span>
                      <span className="text-xs text-slate-900 font-black mt-5 block">{activeDirectorName}</span>
                      <span className="text-[10px] text-slate-600">{activeDirectorTitle}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // 6. ميزة «حزمة ملف القاعة الموحد» (Pack complet de la salle en 1 clic)
    if (docType === 'room_dossier_pack') {
      return (
        <div className="font-simplified-arabic text-black bg-white">
          {/* 1. لافتة باب القاعة */}
          <div className="page-break-after">
            {renderDocumentContent('door_poster')}
          </div>

          {/* 2. ملصقات طاولات المترشحين */}
          <div className="page-break-after">
            {renderDocumentContent('desk_labels')}
          </div>

          {/* 3. ورقة الحضور والإمضاء الميدانية */}
          <div className="page-break-after">
            {renderDocumentContent('attendance_blank')}
          </div>

          {/* 4. محضر فك أختام مواضيع الاختبار */}
          <div className="page-break-after">
            {renderDocumentContent('pv_descellement')}
          </div>

          {/* 5. محضر سير الاختبارات */}
          <div className="page-break-after">
            {renderDocumentContent('pv_deroulement')}
          </div>

          {/* 6. ملصق ظرف مواضيع الامتحان وملصق ظرف أوراق الإجابات المشمع */}
          <div className="page-break-after">
            <div className="mb-4">
              {renderDocumentContent('envelope')}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in" dir="rtl">
      {/* Toast Notification */}
      {toast && (
        <div className={`no-print p-4 rounded-xl text-xs font-bold border flex items-center justify-between shadow-lg transition ${
          toast.type === 'success'
            ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
            : toast.type === 'error'
            ? 'bg-rose-100 text-rose-950 border-rose-300'
            : 'bg-orange-100 text-orange-950 border-orange-300'
        }`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-slate-600 hover:text-slate-900 px-2 font-black cursor-pointer">✕</button>
        </div>
      )}

      {/* Main Section Header & Rank Selector */}
      <div className="no-print bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-amber-600 to-slate-800 flex items-center justify-center text-white shadow-md border border-orange-400/40">
              <ClipboardList className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 font-cairo">
                  قسم الإجراء وسير الامتحانات والتأطير
                </h2>
                <span className="bg-orange-100 text-orange-900 border border-orange-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  المنظومة الإجرائية الموحدة
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                توزيع القاعات آلياً (سقف 20)، الرزنامة وتوزيع الحراسة، أوراق الحضور والتوقيع، محضر سير الاختبارات، وفك الأختام.
              </p>
            </div>
          </div>
        </div>

        {/* Current Active Rank Badge & 3D Switch Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-right">
            <span className="text-[10px] text-slate-500 block font-semibold">الرتبة التكوينية المستهدفة حالياً:</span>
            <div className="text-sm font-black text-slate-900 font-cairo flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{currentRank.titleAr}</span>
            </div>
            <span className="text-[10px] text-orange-700 font-bold block mt-0.5">
              {candidates.length} متكون مسجل في قاعدة البيانات
            </span>
          </div>

          <button
            onClick={() => setIsRankModalOpen(true)}
            className="relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-b from-orange-500 via-orange-600 to-orange-700 border-t border-white/30 border-b-4 border-b-orange-950 shadow-[0_4px_0_#9a3412,0_4px_6px_rgba(0,0,0,0.2)] hover:brightness-105 active:translate-y-0.5 active:border-b-2 active:shadow-[0_1px_0_#9a3412] transition-all cursor-pointer select-none"
          >
            <Layers className="w-4 h-4 text-amber-200" />
            <span>تغيير / اختيار الرتبة المستهدفة</span>
          </button>
        </div>
      </div>

      {/* 5 Ordered Subtabs Navigation Bar */}
      <div className="no-print bg-slate-900 text-white rounded-xl p-1.5 flex flex-wrap items-center gap-1.5 shadow-md">
        <button
          onClick={() => handleSwitchSubTab('rooms_distribution')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'rooms_distribution'
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <DoorOpen className="w-4 h-4" />
          <span>1. الرتب وتوزيع القاعات (سقف 20)</span>
        </button>

        <button
          onClick={() => handleSwitchSubTab('scheduler_proctors')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'scheduler_proctors'
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>2. الرزنامة وتوزيع الحراسة</span>
        </button>

        <button
          onClick={() => handleSwitchSubTab('attendance_sheets')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'attendance_sheets'
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <PenTool className="w-4 h-4" />
          <span>3. قوائم الحضور وتوقيع المترشحين</span>
        </button>

        <button
          onClick={() => handleSwitchSubTab('exam_proceedings')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'exam_proceedings'
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>4. محضر سير الاختبارات وفك الأختام</span>
        </button>

        <button
          onClick={() => handleSwitchSubTab('envelope_labels')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'envelope_labels'
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>5. بطاقات الأظرفة والملصقات</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. SUBTAB: ROOMS DISTRIBUTION                                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'rooms_distribution' && (
        <div className="no-print space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 block">إجمالي المتكونين المسجلين:</span>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                {candidates.length} <span className="text-xs font-sans text-slate-600">متكون</span>
              </div>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold mt-1 inline-block">
                مستوردون من قاعدة البيانات المحلية
              </span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 block">المعيار الإلزامي لكل قاعة:</span>
              <div className="text-2xl font-black text-orange-600 mt-1 font-mono">
                20 <span className="text-xs font-sans text-slate-600">متكون كحد أقصى</span>
              </div>
              <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium mt-1 inline-block">
                محدد بقرار تنظيم الامتحانات الوطنية
              </span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 block">عدد القاعات الإلزامي المطلوب:</span>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                {neededRoomsCount} <span className="text-xs font-sans text-slate-600">قاعات</span>
              </div>
              <span className="text-[10px] text-slate-500 font-sans mt-1 block">
                $\lceil {candidates.length} \div 20 \rceil = {neededRoomsCount}$
              </span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 block">القاعات المفعلة حالياً:</span>
              <div className="text-2xl font-black text-slate-800 mt-1 font-mono">
                {currentAssignedRooms.length || 0} <span className="text-xs font-sans text-slate-600">قاعة</span>
              </div>
              <span className="text-[10px] text-slate-600 truncate block mt-1" title={currentAssignedRooms.join(' • ')}>
                {currentAssignedRooms.length > 0 ? currentAssignedRooms.join(' • ') : 'لم يتم التوزيع بعد'}
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-xl border border-slate-700">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black font-cairo text-white">
                  التوزيع الآلي للمتكونين على القاعات وفق المعيار الرسمي (سقف 20 متكوناً)
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                يقوم النظام تلقائياً بفرز متكوني الرتبة تصاعدياً وفق <strong>رقم التسجيل الرسمي (8 أرقام)</strong>، ثم حجز ما يصل إلى 20 متكوناً في كل قاعة متسلسلة، مع تحديث قيد كل متكون في قاعدة البيانات دون أي تدخل يدوي.
              </p>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                    مسميات القاعات المقترحة (مفصولة بفواصل):
                  </label>
                  <input
                    type="text"
                    value={roomNamesInput}
                    onChange={(e) => setRoomNamesInput(e.target.value)}
                    placeholder="القاعة 01, القاعة 02, القاعة 03, المدرج أ..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <button
                    onClick={handleAutoDistributeRooms}
                    className="w-full relative inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-b from-orange-500 via-orange-600 to-orange-700 border-t border-white/30 border-b-4 border-b-orange-950 shadow-[0_4px_0_#9a3412] hover:brightness-105 active:translate-y-0.5 active:border-b-2 active:shadow-[0_1px_0_#9a3412] transition-all cursor-pointer select-none"
                  >
                    <DoorOpen className="w-4 h-4 text-amber-200" />
                    <span>تنفيذ التقسيم الآلي (سقف 20)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
              <div className="flex-1 min-w-[240px] relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث باسم المتكون، رقم التسجيل، أو مكان الميلاد..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  className="w-full pr-9 pl-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-600 font-bold">تصفية حسب القاعة:</span>
                <select
                  value={selectedRoomFilter}
                  onChange={(e) => setSelectedRoomFilter(e.target.value)}
                  className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white font-medium"
                >
                  <option value="all">جميع القاعات ({candidates.length})</option>
                  {currentAssignedRooms.map(r => (
                    <option key={r} value={r}>
                      {r} ({candidates.filter(c => c.roomNumber === r).length} متكون)
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    setEnvelopeRoomName(selectedRoomFilter === 'all' ? (currentAssignedRooms[0] || 'القاعة 01') : selectedRoomFilter);
                    setSelectedCandidateIdForConvocation('all');
                    setSubDocType('candidate_convocation');
                    setActiveSubTab('envelope_labels');
                  }}
                  className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 bg-gradient-to-b from-slate-100 to-slate-200 border border-slate-300 border-b-2 hover:bg-slate-200 cursor-pointer"
                  title="استخراج استدعاءات المترشحين الرسمية"
                >
                  <FileText className="w-3.5 h-3.5 text-orange-600" />
                  <span>استدعاءات المترشحين (A4)</span>
                </button>

                <button
                  onClick={() => {
                    setEnvelopeRoomName(selectedRoomFilter === 'all' ? (currentAssignedRooms[0] || 'القاعة 01') : selectedRoomFilter);
                    setSubDocType('room_dossier_pack');
                    setActiveSubTab('envelope_labels');
                  }}
                  className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black text-white bg-gradient-to-b from-orange-500 to-orange-700 border-b-2 border-orange-950 hover:brightness-105 cursor-pointer"
                  title="طباعة الملف الشامل للقاعة في دفعة واحدة"
                >
                  <FolderCheck className="w-3.5 h-3.5 text-amber-200" />
                  <span>حزمة ملف القاعة (1-Click)</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="py-3 px-3 text-center w-12">#</th>
                    <th className="py-3 px-2 text-center w-14">الطاولة</th>
                    <th className="py-3 px-3">رقم التسجيل الرسمي</th>
                    <th className="py-3 px-4">إسم ولقب المتكون</th>
                    <th className="py-3 px-3">تاريخ ومكان الميلاد</th>
                    <th className="py-3 px-3">السلك / التخصص</th>
                    <th className="py-3 px-3">القاعة المسندة (سقف 20)</th>
                    <th className="py-3 px-3 text-center">حالة الحضور</th>
                    <th className="py-3 px-3 text-center">الاستدعاء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        لا يوجد أي متكون مسجل في القاعة المحددة أو مطابق لمعايير البحث.
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((cand, idx) => {
                      const tableNum = getCandidateTableNumber(cand);
                      return (
                        <tr key={cand.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="bg-black text-white font-mono font-bold text-[11px] px-2 py-0.5 rounded">
                              {tableNum}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            <span className="bg-orange-50 text-orange-950 px-2 py-0.5 rounded border border-orange-200">
                              {cand.registrationNumber}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900 text-sm">
                            {cand.fullName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-mono">
                            {formatArabicDate(cand.birthDate)} ({cand.birthPlace || cand.birthCommune || 'الأغواط'})
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            <div>{cand.corps || 'موظفو الإدارة والتسيير'}</div>
                            <span className="text-[10px] text-slate-500">{cand.specialtyField || currentRank.titleAr}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="bg-slate-900 text-white font-bold px-2.5 py-0.5 rounded text-[11px] shadow-xs">
                              {cand.roomNumber || 'غير محدد'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              cand.attendanceStatus === 'absent'
                                ? 'bg-rose-50 text-rose-700 border-rose-300'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            }`}>
                              {cand.attendanceStatus === 'absent' ? 'غائب' : 'حاضر'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => {
                                setEnvelopeRoomName(cand.roomNumber || currentAssignedRooms[0] || 'القاعة 01');
                                setSelectedCandidateIdForConvocation(cand.id);
                                setSubDocType('candidate_convocation');
                                setActiveSubTab('envelope_labels');
                                setPreviewDocument({
                                  type: 'candidate_convocation',
                                  title: `استدعاء المترشح: ${cand.fullName} (${cand.registrationNumber})`,
                                  candidateId: cand.id,
                                  roomId: cand.roomNumber
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 hover:text-orange-900 transition cursor-pointer"
                              title="معاينة وطباعة الاستدعاء الفردي لهذا المترشح"
                            >
                              <FileText className="w-3 h-3 text-orange-600" />
                              <span>استدعاء</span>
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
      {/* 2. SUBTAB: SCHEDULER & PROCTORS (الرزنامة وتوزيع الحراسة)                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'scheduler_proctors' && (
        <div className="space-y-4">
          <SchedulerView
            dbState={dbState}
            effectiveRooms={activeRankRooms}
            onUpdateSession={onUpdateSession || (() => {})}
            onUpdateProctors={onUpdateProctors || (() => {})}
            onUpdateRooms={onUpdateRooms || (() => {})}
            onUpdateTimetable={onUpdateTimetable || (() => {})}
            onAddAuditLog={onAddAuditLog}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUBTAB: ATTENDANCE SHEETS & DIGITAL REGISTRATION                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'attendance_sheets' && (
        <div className="no-print space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">المقياس / المادة:</label>
                <select
                  value={attendanceModuleId}
                  onChange={(e) => setAttendanceModuleId(e.target.value)}
                  className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900"
                >
                  {modules.map(m => (
                    <option key={m.id} value={m.id}>{m.titleAr} (معامل {m.coefficient})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">القاعة المستهدفة:</label>
                <select
                  value={attendanceRoomId}
                  onChange={(e) => setAttendanceRoomId(e.target.value)}
                  className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900"
                >
                  <option value="all">جميع القاعات ({candidates.length} متكون)</option>
                  {currentAssignedRooms.map(r => (
                    <option key={r} value={r}>
                      {r} ({candidates.filter(c => c.roomNumber === r).length} متكون)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">وضع العمل:</label>
                <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100">
                  <button
                    onClick={() => setAttendanceMode('field_sheet')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                      attendanceMode === 'field_sheet' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    1. ورقة الإمضاء الميدانية (A4)
                  </button>
                  <button
                    onClick={() => setAttendanceMode('digital_register')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                      attendanceMode === 'digital_register' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    2. الرصد الإلكتروني للغيابات
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewDocument({
                  type: attendanceMode === 'field_sheet' ? 'attendance_blank' : 'attendance_final',
                  title: attendanceMode === 'field_sheet' 
                    ? `قائمة حضور وتوقيع المترشحين - ${attendanceRoomId === 'all' ? 'جميع القاعات' : attendanceRoomId}` 
                    : `محضر الحضور والغياب النهائي المعتمد - ${attendanceRoomId === 'all' ? 'جميع القاعات' : attendanceRoomId}`,
                  roomId: attendanceRoomId
                })}
                className="relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 bg-gradient-to-b from-slate-100 to-slate-200 border border-slate-300 border-b-4 border-b-slate-400 shadow-[0_3px_0_#94a3b8] hover:bg-slate-200 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer select-none"
              >
                <Eye className="w-4 h-4 text-orange-600" />
                <span>معاينة مباشرة للوثيقة (A4)</span>
              </button>

              <button
                onClick={() => handleTriggerPrint(attendanceMode === 'field_sheet' ? 'attendance_blank' : 'attendance_final')}
                className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-b from-orange-500 via-orange-600 to-orange-700 border-t border-white/30 border-b-4 border-b-orange-950 shadow-[0_3px_0_#9a3412] hover:brightness-105 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer select-none"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الوثيقة (A4)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] text-slate-500 font-bold block">إجمالي المترشحين بالقاعة:</span>
              <span className="text-xl font-black text-slate-900 font-mono">{attendanceStats.total}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] text-emerald-700 font-bold block">المترشحون الحاضرون:</span>
              <span className="text-xl font-black text-emerald-700 font-mono">{attendanceStats.present}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] text-rose-700 font-bold block">المترشحون الغائبون:</span>
              <span className="text-xl font-black text-rose-700 font-mono">{attendanceStats.absent}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] text-orange-700 font-bold block">نسبة الحضور الرسمية:</span>
              <span className="text-xl font-black text-orange-700 font-mono">{attendanceStats.percentage}%</span>
            </div>
          </div>

          {attendanceMode === 'field_sheet' && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 text-amber-950">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-900 flex items-center justify-center shrink-0">
                  <PenTool className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm font-cairo">
                    ورقة الحضور الميدانية المعدة للتوقيع الشخصي للمترشح (Feuille d'émargement)
                  </h4>
                  <p className="text-xs text-amber-900/80 mt-1 leading-relaxed">
                    تُطبع هذه الوثيقة الورقية الرسمية وتُسلّم للأساتذة الحراس مع أظرفة مواضيع الامتحانات. تحتوي كل ورقة على 20 متكوناً كحد أقصى مع <strong>خانة مخصصة وعريضة لتوقيع المترشح يدوياً لإثبات حضوره الفعلي واستلام ورقة الإجابة</strong>. بعد انتهاء الامتحان تُعاد الورقة للمصلحة للرصد الإلكتروني.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => setPreviewDocument({
                        type: 'attendance_blank',
                        title: `قائمة حضور وتوقيع المترشحين - ${attendanceRoomId === 'all' ? 'جميع القاعات' : attendanceRoomId}`,
                        roomId: attendanceRoomId
                      })}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                    >
                      فتح المعاينة المباشرة A4 الآن
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {attendanceMode === 'digital_register' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold font-cairo">
                    الرصد الإلكتروني السريع للحضور والغياب (بعد عودة القوائم الموقعة من القاعات)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    الافتراضي هو حضور كافة المترشحين. انقر على زر الحالة لتأشير الغائبين فقط وتحديد طبيعة ومبرر الغياب.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onAddAuditLog('تحديث الحضور والغياب', `تم اعتماد وتثبيت رصد الحضور لمقياس: ${selectedModule?.titleAr}`, 'info');
                    showToast('تم حفظ وتثبيت بيانات الحضور والغياب في قاعدة البيانات بنجاح!', 'success');
                  }}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  حفظ وتثبيت الرصد
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12">#</th>
                      <th className="py-2.5 px-3">رقم التسجيل (8 أرقام)</th>
                      <th className="py-2.5 px-4">إسم ولقب المتكون</th>
                      <th className="py-2.5 px-3">القاعة</th>
                      <th className="py-2.5 px-3 text-center">حالة الحضور الفعلية</th>
                      <th className="py-2.5 px-4">طبيعة ومبرر الغياب (إذا كان غائباً)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceCandidates.map((cand, idx) => (
                      <tr key={cand.id} className={`transition ${cand.attendanceStatus === 'absent' ? 'bg-rose-50/70' : 'hover:bg-slate-50'}`}>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {cand.registrationNumber}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 text-sm">
                          {cand.fullName}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">
                          {cand.roomNumber}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleToggleAttendance(cand.id)}
                            className={`px-3 py-1 rounded-full text-xs font-black transition cursor-pointer border ${
                              cand.attendanceStatus === 'absent'
                                ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                                : 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                            }`}
                          >
                            {cand.attendanceStatus === 'absent' ? 'غائب ✗' : 'حاضر ✓'}
                          </button>
                        </td>
                        <td className="py-2.5 px-4">
                          {cand.attendanceStatus === 'absent' ? (
                            <select
                              value={cand.absenceReason || 'غياب غير مبرر'}
                              onChange={(e) => handleSetAbsenceReason(cand.id, e.target.value)}
                              className="text-xs py-1 px-2 rounded border border-rose-300 bg-white font-medium text-rose-900"
                            >
                              <option value="غياب غير مبرر">غياب غير مبرر (إقصاء من الدورة العادية)</option>
                              <option value="غياب مبرر قانوناً (شهادة طبية رسمية)">غياب مبرر قانوناً (شهادة طبية رسمية)</option>
                              <option value="مهمة إدارية رسمية">مهمة إدارية رسمية</option>
                              <option value="قوة قاهرة مثبتة">قوة قاهرة مثبتة</option>
                            </select>
                          ) : (
                            <span className="text-slate-400 text-[11px]">— حاضر وموقع على الورقة</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUBTAB: EXAM PROCEEDINGS PV & UNSEALING (محضر سير الاختبارات)           */}
      {/* ========================================================================= */}
      {activeSubTab === 'exam_proceedings' && (
        <div className="no-print space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">المقياس:</label>
                <select
                  value={pvModuleId}
                  onChange={(e) => setPvModuleId(e.target.value)}
                  className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white font-semibold"
                >
                  {modules.map(m => (
                    <option key={m.id} value={m.id}>{m.titleAr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">القاعة:</label>
                <select
                  value={pvRoomName}
                  onChange={(e) => setPvRoomName(e.target.value)}
                  className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white font-semibold"
                >
                  {currentAssignedRooms.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الإجراء:</label>
                <input
                  type="date"
                  value={pvDate}
                  onChange={(e) => setPvDate(e.target.value)}
                  className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الفترة الزمنية:</label>
                <select
                  value={pvTimeSlot}
                  onChange={(e) => setPvTimeSlot(e.target.value)}
                  className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white font-semibold"
                >
                  <option value="morning">الفترة الصباحية ({currentSession?.morningTimeSlot || '08:30 - 11:30'})</option>
                  <option value="afternoon">الفترة المسائية ({currentSession?.afternoonTimeSlot || '14:00 - 17:00'})</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewDocument({
                  type: 'pv_deroulement',
                  title: `محضر سير الاختبارات - ${pvRoomName} (${selectedPvModule?.titleAr})`,
                  roomId: pvRoomName
                })}
                className="relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 bg-gradient-to-b from-slate-100 to-slate-200 border border-slate-300 border-b-4 border-b-slate-400 shadow-[0_3px_0_#94a3b8] active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer select-none"
              >
                <Eye className="w-4 h-4 text-orange-600" />
                <span>معاينة محضر سير الاختبارات (A4)</span>
              </button>

              <button
                onClick={() => handleTriggerPrint('pv_deroulement')}
                className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-b from-orange-500 via-orange-600 to-orange-700 border-t border-white/30 border-b-4 border-b-orange-950 shadow-[0_3px_0_#9a3412] hover:brightness-105 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer select-none"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة محضر السير (A4)</span>
              </button>

              <button
                onClick={() => setPreviewDocument({
                  type: 'pv_descellement',
                  title: `محضر فك أختام مواضيع الاختبار - ${pvRoomName} (${selectedPvModule?.titleAr})`,
                  roomId: pvRoomName
                })}
                className="relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 bg-gradient-to-b from-slate-100 to-slate-200 border border-slate-300 border-b-4 border-b-slate-400 shadow-[0_3px_0_#94a3b8] active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer select-none"
              >
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>محضر فك الأختام (A4)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Auto Absentees Banner in PV Tab */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 font-cairo flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-orange-600" />
                  <span>المتكونون الغائبون بالقاعة (المرصودون آلياً من ورقة الحضور)</span>
                </h4>
                <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {pvAbsentCandidates.length} غائب
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                تُدرج أسماء وأرقام تسجيل المتكونين الغائبين آلياً في محضر سير الاختبارات المطبوع دون الحاجة لكتابتها يدوياً.
              </p>

              {pvAbsentCandidates.length === 0 ? (
                <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>لم يُسجل أي غياب في {pvRoomName} (حضور تام بنسبة 100%).</span>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {pvAbsentCandidates.map(cand => (
                    <div key={cand.id} className="p-2 bg-rose-50 border border-rose-200 rounded text-xs flex items-center justify-between">
                      <div>
                        <strong className="text-rose-950">{cand.fullName}</strong>
                        <span className="text-[10px] text-rose-700 font-mono block">رقم التسجيل: {cand.registrationNumber}</span>
                      </div>
                      <span className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-bold">
                        {cand.absenceReason || 'غياب غير مبرر'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes & Incidents card */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-900 font-cairo flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-orange-600" />
                <span>ملاحظات وتصريحات الأساتذة الحراس حول سير الاختبار</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                يمكن تدوين الملاحظات هنا لتطبع جاهزة في المحضر، كما تترك مساحة مسطرة بالأسفل للتوقيعات.
              </p>
              <textarea
                rows={3}
                value={pvIncidents}
                onChange={(e) => setPvIncidents(e.target.value)}
                className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SUBTAB: ENVELOPE LABELS, DESK LABELS, BADGES & PROCEDURAL DOCUMENTS     */}
      {/* ========================================================================= */}
      {activeSubTab === 'envelope_labels' && (
        <div className="no-print space-y-6">
          {/* Sub-document Category Selector - Compact Single Row Layout */}
          <div className="bg-slate-900 text-white rounded-xl p-1 shadow-sm grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1">
            <button
              onClick={() => setSubDocType('desk_labels')}
              className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer truncate ${
                subDocType === 'desk_labels'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="ملصقات طاولات المترشحين (سقف 20)"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">ملصقات الطاولات</span>
            </button>

            <button
              onClick={() => setSubDocType('door_poster')}
              className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer truncate ${
                subDocType === 'door_poster'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="لافتة باب قاعة الامتحان الرسمية"
            >
              <DoorOpen className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">لافتة باب القاعة</span>
            </button>

            <button
              onClick={() => setSubDocType('candidate_convocation')}
              className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer truncate ${
                subDocType === 'candidate_convocation'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="استدعاء المترشح الرسمي لاجتياز الامتحانات (A4)"
            >
              <FileText className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">استدعاء المترشح</span>
            </button>

            <button
              onClick={() => setSubDocType('room_dossier_pack')}
              className={`py-1.5 px-1 rounded-lg text-[11px] font-black transition flex items-center justify-center gap-1 cursor-pointer truncate ${
                subDocType === 'room_dossier_pack'
                  ? 'bg-gradient-to-r from-amber-500 via-orange-600 to-red-600 text-white shadow-xs'
                  : 'text-amber-300 hover:text-white hover:bg-slate-800'
              }`}
              title="حزمة ملف القاعة الموحد الشامل (1-Click)"
            >
              <FolderCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">حزمة القاعة (1-Click)</span>
            </button>

            <button
              onClick={() => setSubDocType('staff_badges')}
              className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer truncate ${
                subDocType === 'staff_badges'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="شارات الصدر الرسمية للمؤطرين"
            >
              <BadgeCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">شارات المؤطرين</span>
            </button>

            <button
              onClick={() => setSubDocType('transmission_sheet')}
              className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer truncate ${
                subDocType === 'transmission_sheet'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="جدول تسليم وتسلم أوراق الإجابات والمواضيع"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">جدول التسليم</span>
            </button>

            <button
              onClick={() => setSubDocType('envelope')}
              className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer truncate ${
                subDocType === 'envelope'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="بطاقات الأظرفة المشمعة الكبرى"
            >
              <Tag className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">بطاقات الأظرفة</span>
            </button>
          </div>

          {/* Context Control & Action Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Document specific filters */}
              {(subDocType === 'desk_labels' || subDocType === 'door_poster' || subDocType === 'envelope' || subDocType === 'candidate_convocation' || subDocType === 'room_dossier_pack') && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">القاعة المستهدفة:</label>
                  <select
                    value={envelopeRoomName}
                    onChange={(e) => setEnvelopeRoomName(e.target.value)}
                    className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    {currentAssignedRooms.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Candidate Picker for Convocation */}
              {subDocType === 'candidate_convocation' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">المترشح المستهدف:</label>
                  <select
                    value={selectedCandidateIdForConvocation}
                    onChange={(e) => setSelectedCandidateIdForConvocation(e.target.value)}
                    className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white font-semibold max-w-xs truncate"
                  >
                    <option value="all">جميع مترشحي {envelopeRoomName} ({selectedRoomCandidates.length} استدعاء A4)</option>
                    {selectedRoomCandidates.map((c, i) => (
                      <option key={c.id} value={c.id}>
                        طاولة {String(i + 1).padStart(2, '0')}: {c.fullName} ({c.registrationNumber})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(subDocType === 'transmission_sheet' || subDocType === 'envelope') && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">المقياس:</label>
                  <select
                    value={envelopeModuleId}
                    onChange={(e) => setEnvelopeModuleId(e.target.value)}
                    className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    {modules.map(m => (
                      <option key={m.id} value={m.id}>{m.titleAr}</option>
                    ))}
                  </select>
                </div>
              )}

              {subDocType === 'transmission_sheet' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الفترة:</label>
                  <select
                    value={pvTimeSlot}
                    onChange={(e) => setPvTimeSlot(e.target.value)}
                    className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="morning">الفترة الصباحية (08:30 - 11:30)</option>
                    <option value="afternoon">الفترة المسائية (14:00 - 17:00)</option>
                  </select>
                </div>
              )}

              {subDocType === 'envelope' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع الظرف:</label>
                  <select
                    value={envelopeType}
                    onChange={(e) => setEnvelopeType(e.target.value as 'subjects' | 'answers')}
                    className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="answers">ظرف أوراق الإجابات المشمع</option>
                    <option value="subjects">ظرف مواضيع الامتحان المشمع</option>
                  </select>
                </div>
              )}

              {/* Status Info Chips */}
              {subDocType === 'desk_labels' && (
                <div className="bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg text-xs font-bold text-orange-950">
                  <span>تعداد القاعة: </span>
                  <span className="font-mono text-orange-800">{selectedRoomCandidates.length} متكوناً</span>
                  <span className="text-[10px] text-slate-600 block">طاولات من 01 إلى {String(selectedRoomCandidates.length).padStart(2, '0')} بحد أقصى 20</span>
                </div>
              )}

              {subDocType === 'door_poster' && (
                <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-950">
                  <span>لافتة باب رسمية معتمدة</span>
                  <span className="text-[10px] text-emerald-800 block">تم استثناء أسماء الأساتذة الحراس حفاظاً على سرية التكليفات</span>
                </div>
              )}

              {subDocType === 'candidate_convocation' && (
                <div className="bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-950">
                  <span>استدعاء رسمي فردي لاجتياز الامتحانات (A4)</span>
                  <span className="text-[10px] text-indigo-800 block">
                    يشمل رقم الطاولة، القاعة، جدول الرزنامة، النظام الداخلي، وختم المدير ({activeDirectorName})
                  </span>
                </div>
              )}

              {subDocType === 'room_dossier_pack' && (
                <div className="bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-lg text-xs font-black text-amber-950">
                  <span>الملف الإجرائي الشامل والموحد للقاعة (1-Click)</span>
                  <span className="text-[10px] text-amber-800 block">
                    طباعة دفعة واحدة: لافتة الباب + ملصقات 20 طاولة + ورقة الحضور + محضر فك الأختام + محضر السير + ملصقات الأظرفة
                  </span>
                </div>
              )}

              {subDocType === 'staff_badges' && (
                <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-950">
                  <span>شارات تأطير المركز الرسمية</span>
                  <span className="text-[10px] text-blue-800 block">
                    رئيس المركز ({activeDirectorName}) • الأمانة ({activeSecretariatMembers.length}) • الحراس (مستثنى الفريق الطبي)
                  </span>
                </div>
              )}

              {subDocType === 'transmission_sheet' && (
                <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-950">
                  <span>سجل تسليم وتسلم المواضيع والإجابات</span>
                  <span className="text-[10px] text-amber-800 block">متابعة دقيقة للأظرفة المشمعة وتوقيعات الحراس والأمانة</span>
                </div>
              )}
            </div>

            {/* 3D Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  let docTitle = '';
                  if (subDocType === 'desk_labels') docTitle = `ملصقات طاولات المترشحين - ${envelopeRoomName} (${currentRank.titleAr})`;
                  else if (subDocType === 'door_poster') docTitle = `لافتة باب قاعة الامتحان - ${envelopeRoomName} (${currentRank.titleAr})`;
                  else if (subDocType === 'candidate_convocation') {
                    const cand = selectedCandidateIdForConvocation === 'all'
                      ? null
                      : selectedRoomCandidates.find(c => c.id === selectedCandidateIdForConvocation);
                    docTitle = cand 
                      ? `استدعاء المترشح: ${cand.fullName} (${envelopeRoomName} - طاولة ${getCandidateTableNumber(cand)})`
                      : `استدعاءات مترشحي ${envelopeRoomName} (${selectedRoomCandidates.length} متكون)`;
                  }
                  else if (subDocType === 'room_dossier_pack') docTitle = `الملف الإجرائي الشامل والموحد - ${envelopeRoomName} (${currentRank.titleAr})`;
                  else if (subDocType === 'staff_badges') docTitle = `شارات الصدر الرسمية للمؤطرين (دورة الامتحانات)`;
                  else if (subDocType === 'transmission_sheet') docTitle = `جدول تسليم وتسلم أوراق الإجابات والمواضيع (${selectedEnvelopeModule?.titleAr})`;
                  else docTitle = `بطاقة الظرف الكبير - ${envelopeRoomName} (${selectedEnvelopeModule?.titleAr})`;

                  setPreviewDocument({
                    type: subDocType,
                    title: docTitle,
                    roomId: envelopeRoomName,
                    candidateId: selectedCandidateIdForConvocation
                  });
                }}
                className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-800 bg-gradient-to-b from-slate-100 to-slate-200 border border-slate-300 border-b-4 border-b-slate-400 shadow-[0_3px_0_#94a3b8] active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer select-none"
              >
                <Eye className="w-4 h-4 text-orange-600" />
                <span>معاينة مباشرة للوثيقة (A4)</span>
              </button>

              <button
                onClick={() => handleTriggerPrint(subDocType, selectedCandidateIdForConvocation, envelopeRoomName)}
                className={`relative inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white border-t border-white/30 border-b-4 shadow-md hover:brightness-105 active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer select-none ${
                  subDocType === 'room_dossier_pack'
                    ? 'bg-gradient-to-b from-amber-500 via-orange-600 to-red-600 border-b-red-950 shadow-[0_3px_0_#7f1d1d]'
                    : 'bg-gradient-to-b from-orange-500 via-orange-600 to-orange-700 border-b-orange-950 shadow-[0_3px_0_#9a3412]'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>{subDocType === 'room_dossier_pack' ? 'طباعة الملف الشامل للقاعة (دفعة واحدة)' : 'طباعة الوثيقة (A4)'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Screen Preview Container for the Active Sub-Document */}
          <div className="bg-slate-100/70 border border-slate-200 rounded-2xl p-4 md:p-6 shadow-xs flex justify-center">
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-md border border-slate-300 p-5 font-simplified-arabic text-slate-900">
              {/* Render Selected Document Preview Directly */}
              {subDocType === 'desk_labels' && (
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-orange-600" />
                      <h3 className="font-bold text-sm font-cairo text-slate-900">
                        معاينة ملصقات طاولات المترشحين ({envelopeRoomName})
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {selectedRoomCandidates.length} ملصق جاهز للقص والطباعة (سقف 20)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedRoomCandidates.slice(0, 4).map((cand, idx) => (
                      <div key={cand.id || idx} className="border-2 border-dashed border-slate-400 rounded-lg p-3 bg-slate-50 relative">
                        <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-2">
                          <span className="text-[10px] font-bold text-slate-700">{INSTITUTION.name}</span>
                          <span className="bg-black text-white text-[11px] font-bold px-2 py-0.5 rounded font-mono">
                            طاولة رقم {String(idx + 1).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="font-mono font-black text-sm text-orange-700">
                            رقم التسجيل: {cand.registrationNumber}
                          </div>
                          <div className="font-bold text-slate-900 text-xs">
                            الاسم واللقب: {cand.fullName}
                          </div>
                          <div className="text-[10px] text-slate-600">
                            تاريخ الميلاد: {formatArabicDate(cand.birthDate)} ({cand.birthPlace || 'الأغواط'})
                          </div>
                          <div className="text-[10px] text-slate-700 font-bold border-t border-slate-200 pt-1">
                            {envelopeRoomName} • {cand.groupNumber || 'الفوج 01'} • {currentRank.titleAr}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedRoomCandidates.length > 4 && (
                    <div className="text-center mt-3 text-xs text-slate-500 font-semibold">
                      ... وباقي ملصقات القاعة ({selectedRoomCandidates.length} ملصقاً) تظهر كاملة في المعاينة المباشرة والطباعة الورقية.
                    </div>
                  )}
                </div>
              )}

              {subDocType === 'door_poster' && (
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                    <div className="flex items-center gap-2">
                      <DoorOpen className="w-4 h-4 text-orange-600" />
                      <h3 className="font-bold text-sm font-cairo text-slate-900">
                        معاينة لافتة باب قاعة الامتحان ({envelopeRoomName})
                      </h3>
                    </div>
                    <span className="text-[11px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                      بدون أسماء الأساتذة الحراس
                    </span>
                  </div>

                  <div className="border-4 border-slate-900 rounded-xl p-4 bg-white text-center">
                    <div className="text-xs text-slate-600 font-bold">{INSTITUTION.ministry}</div>
                    <div className="text-xs text-slate-900 font-black mt-0.5">{INSTITUTION.name}</div>
                    <div className="text-xs text-slate-600">{INSTITUTION.deputyDirectorate} • {INSTITUTION.service}</div>
                    
                    <div className="my-3 py-2 border-y-2 border-slate-900 bg-slate-50">
                      <span className="text-xs text-slate-500 block">لافتة باب قاعة الامتحان</span>
                      <h2 className="text-2xl font-black text-slate-900 mt-1">{envelopeRoomName}</h2>
                      <div className="text-sm font-bold text-orange-700 mt-0.5">{currentRank.titleAr}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs border border-slate-300 p-2 rounded mb-3 text-right">
                      <div>التعداد: <strong>{selectedRoomCandidates.length} متكوناً</strong> (سقف 20)</div>
                      <div>الدورة: <strong>{formatAcademicYear(currentSession?.academicYear || '2026 / 2027')}</strong></div>
                      <div className="col-span-2">مجال التسجيل: من <strong>{envFirstReg}</strong> إلى <strong>{envLastReg}</strong></div>
                    </div>

                    <div className="bg-amber-50 border border-amber-300 p-2 rounded text-right text-[11px] text-amber-950 font-semibold mb-2">
                      <div className="font-bold mb-0.5">تعليمات انضباطية للمترشحين:</div>
                      <div>• يمنع منعاً باتاً إدخال أو استخدام الهواتف النقالة والأجهزة الذكية داخل القاعة.</div>
                      <div>• إلزامية إبراز الاستدعاء الرسمي وبطاقة التعريف الوطنية عند الدخول.</div>
                    </div>

                    <div className="text-left text-xs pt-2 font-bold text-slate-700">
                      ختم وتوقيع رئيس المركز: {activeDirectorName}
                    </div>
                  </div>
                </div>
              )}

              {/* CANDIDATE CONVOCATION ON-SCREEN PREVIEW */}
              {subDocType === 'candidate_convocation' && (() => {
                const previewCand = (selectedCandidateIdForConvocation !== 'all'
                  ? selectedRoomCandidates.find(c => c.id === selectedCandidateIdForConvocation)
                  : null) || selectedRoomCandidates[0] || candidates[0];
                const tableNo = previewCand ? getCandidateTableNumber(previewCand) : '01';

                return (
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-600" />
                        <h3 className="font-bold text-sm font-cairo text-slate-900">
                          معاينة استدعاء المترشح الرسمي (Convocation)
                        </h3>
                      </div>
                      <span className="text-[11px] bg-indigo-100 text-indigo-900 border border-indigo-300 px-2 py-0.5 rounded-full font-bold">
                        طاولة رقم: {tableNo} • {envelopeRoomName}
                      </span>
                    </div>

                    {previewCand ? (
                      <div className="border-2 border-slate-900 rounded-xl p-4 bg-white space-y-3">
                        <div className="text-center border-b border-slate-300 pb-2">
                          <h4 className="font-bold text-xs">{INSTITUTION.republic}</h4>
                          <h5 className="text-[11px] text-slate-700 font-semibold">{INSTITUTION.ministry}</h5>
                          <h5 className="font-bold text-xs text-slate-900">{INSTITUTION.name}</h5>
                          <div className="inline-block bg-slate-900 text-white font-bold text-xs px-3 py-0.5 rounded mt-1">
                            استدعاء رسمي لاجتياز الامتحانات المهنية
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs border border-slate-300 rounded p-2.5 bg-slate-50">
                          <div><strong>الاسم واللقب:</strong> <span className="font-bold text-slate-900">{previewCand.fullName}</span></div>
                          <div><strong>رقم التسجيل:</strong> <span className="font-mono font-black text-orange-700">{previewCand.registrationNumber}</span></div>
                          <div><strong>تاريخ ومكان الميلاد:</strong> {formatArabicDate(previewCand.birthDate)} ({previewCand.birthPlace || 'الأغواط'})</div>
                          <div><strong>الرتبة التكوينية:</strong> {currentRank.titleAr}</div>
                          <div><strong>قاعة الامتحان:</strong> <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[11px] font-bold">{previewCand.roomNumber || envelopeRoomName}</span></div>
                          <div><strong>رقم الطاولة المسندة:</strong> <span className="bg-orange-600 text-white px-2 py-0.5 rounded text-[11px] font-mono font-bold">طاولة {tableNo}</span></div>
                        </div>

                        <div>
                          <h5 className="font-bold text-xs mb-1">جدول رزنامة وتوقيت المقاييس المعني بها:</h5>
                          <table className="w-full text-right text-[11px] border border-slate-300">
                            <thead className="bg-slate-100 font-bold border-b border-slate-300">
                              <tr>
                                <th className="border border-slate-300 p-1">المقياس</th>
                                <th className="border border-slate-300 p-1 text-center">التاريخ</th>
                                <th className="border border-slate-300 p-1 text-center">التوقيت</th>
                                <th className="border border-slate-300 p-1 text-center">المعامل</th>
                              </tr>
                            </thead>
                            <tbody>
                              {modules.slice(0, 3).map(m => (
                                <tr key={m.id} className="border-b border-slate-200">
                                  <td className="border border-slate-300 p-1 font-semibold">{m.titleAr}</td>
                                  <td className="border border-slate-300 p-1 text-center font-mono">{formatArabicDate(pvDate)}</td>
                                  <td className="border border-slate-300 p-1 text-center font-mono">08:30 - 11:30</td>
                                  <td className="border border-slate-300 p-1 text-center font-mono font-bold">{m.coefficient}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="bg-amber-50 border border-amber-300 p-2 rounded text-[10px] text-amber-950 font-semibold space-y-0.5">
                          <div className="font-bold text-[11px]">شروط ونظام الانضباط الداخلي للامتحانات:</div>
                          <div>• يمنع منعاً باتاً إدخال أو استخدام الهواتف النقالة والأجهزة الذكية داخل المركز وقاعات الامتحان.</div>
                          <div>• الحضور 30 دقيقة قبل بدء الاختبار، مع إجبارية إبراز بطاقة التعريف الوطنية الرسمية وهذا الاستدعاء.</div>
                          <div>• يمنع مغادرة القاعة قبل انقضاء نصف المدة القانونية المحددة لكل مقياس.</div>
                        </div>

                        <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                          <span className="text-[11px] text-slate-500">ملاحظة: هذا الاستدعاء وثيقة رسمية تسحب عند أي مخالفة.</span>
                          <span className="font-bold text-slate-900">ختم وتوقيع مدير المعهد: {activeDirectorName}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-400">لا يوجد متكونون في هذه القاعة</div>
                    )}
                  </div>
                );
              })()}

              {/* UNIFIED ROOM DOSSIER PACK ON-SCREEN PREVIEW */}
              {subDocType === 'room_dossier_pack' && (
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                    <div className="flex items-center gap-2">
                      <FolderCheck className="w-5 h-5 text-orange-600" />
                      <h3 className="font-black text-sm font-cairo text-slate-900">
                        معاينة الحزمة الشاملة لملف القاعة الموحد ({envelopeRoomName})
                      </h3>
                    </div>
                    <span className="text-[11px] bg-amber-100 text-amber-900 border border-amber-400 px-2.5 py-0.5 rounded-full font-black font-mono">
                      Pack complet en 1 clic
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                      <div>
                        <span className="text-xs text-slate-500 block">القاعة المستهدفة بالملف:</span>
                        <h4 className="text-lg font-black text-slate-900 font-cairo">{envelopeRoomName} • {currentRank.titleAr}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">التعداد الإجمالي المسند:</span>
                        <span className="text-sm font-mono font-black text-orange-700">{selectedRoomCandidates.length} متكوناً (سقف 20)</span>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-700">
                      عند النقر على زر <strong className="text-orange-700">«طباعة الملف الشامل للقاعة»</strong>، ستقوم المنظومة تلقائياً بتجميع وطباعة الوثائق الرسمية الست (06) التالية في دفعة واحدة متناسقة مع فواصل صفحات معيارية:
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="border border-slate-300 rounded-lg p-3 bg-white flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                        1
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900">لافتة باب قاعة الامتحان الرسمية</h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">تعلق على باب القاعة، متضمنة الرتبة والتعداد ومجال أرقام التسجيل (مستثنى منها أسماء الحراس حفاظاً على السرية).</p>
                      </div>
                    </div>

                    <div className="border border-slate-300 rounded-lg p-3 bg-white flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-800 flex items-center justify-center font-bold text-xs shrink-0">
                        2
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900">ملصقات طاولات المترشحين (20 ملصقاً)</h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">مرقمة تسلسلياً من 01 إلى 20 حسب أرقام التسجيل الرسمية مع خطوط تنقيط جاهزة للقص والإلصاق على الطاولات.</p>
                      </div>
                    </div>

                    <div className="border border-slate-300 rounded-lg p-3 bg-white flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                        3
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900">ورقة الحضور والإمضاء الميدانية</h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">مصفوفة توقيع المترشحين الحاضرين وخانة تأشيرة الحراس لمطابقة الهوية وتسليم أوراق الإجابات.</p>
                      </div>
                    </div>

                    <div className="border border-slate-300 rounded-lg p-3 bg-white flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                        4
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900">محضر فك أختام أظرفة المواضيع</h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">معاينة سلامة الشمع الأحمر وتوقيعات شاهدي القاعة من المترشحين بحضور الأساتذة الحراس في التوقيت القانوني.</p>
                      </div>
                    </div>

                    <div className="border border-slate-300 rounded-lg p-3 bg-white flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs shrink-0">
                        5
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900">محضر سير الاختبارات الرسمي وحصر الغياب</h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">التوثيق الإداري الشامل لسريان الامتحان مع الجدول التلقائي للمتكونين الغائبين وأسباب غيابهم وتوقيعات الحراس.</p>
                      </div>
                    </div>

                    <div className="border border-slate-300 rounded-lg p-3 bg-white flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs shrink-0">
                        6
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900">ملصقات الأظرفة الكبرى المشمعة</h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">بطاقة تثبيت بيانات ظرف المواضيع وظرف أوراق الإجابات المشمع بالشمع الأحمر وتأشيرة الأمانة.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-bold">
                      رئيس مركز الامتحان المعتمد بالوثائق: <strong className="text-slate-900">{activeDirectorName}</strong>
                    </span>
                    <button
                      onClick={() => handleTriggerPrint('room_dossier_pack', undefined, envelopeRoomName)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-105 shadow-md cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>طباعة الحزمة كاملة للقاعة الآن</span>
                    </button>
                  </div>
                </div>
              )}

              {subDocType === 'staff_badges' && (
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="w-4 h-4 text-orange-600" />
                      <h3 className="font-bold text-sm font-cairo text-slate-900">
                        معاينة شارات الصدر الرسمية للمؤطرين
                      </h3>
                    </div>
                    <span className="text-[11px] bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.5 rounded-full font-bold">
                      مستثنى الفريق الطبي
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="border-2 border-slate-900 rounded-xl p-3 bg-white shadow-xs">
                      <div className="bg-slate-900 text-white text-center py-1 px-2 rounded -mx-3 -mt-3 mb-2 text-[9px] font-bold">
                        {INSTITUTION.name}
                      </div>
                      <div className="flex gap-2.5 items-center">
                        <div className="w-14 h-18 border-2 border-dashed border-slate-400 rounded flex items-center justify-center text-[7px] text-slate-400 text-center p-1">
                          صورة رسمية 4×3
                        </div>
                        <div className="text-right space-y-0.5 flex-1">
                          <h4 className="font-bold text-xs text-slate-900">{activeDirectorName}</h4>
                          <span className="inline-block bg-amber-100 text-amber-900 border border-amber-400 text-[10px] font-black px-2 py-0.5 rounded">
                            {activeDirectorTitle}
                          </span>
                          <p className="text-[9px] text-slate-600">الإشراف العام وتأطير المركز</p>
                        </div>
                      </div>
                    </div>

                    {activeSecretariatMembers.slice(0, 2).map((sec, sIdx) => (
                      <div key={sec.id || sIdx} className="border-2 border-slate-900 rounded-xl p-3 bg-white shadow-xs">
                        <div className="bg-slate-900 text-white text-center py-1 px-2 rounded -mx-3 -mt-3 mb-2 text-[9px] font-bold">
                          {INSTITUTION.name}
                        </div>
                        <div className="flex gap-2.5 items-center">
                          <div className="w-14 h-18 border-2 border-dashed border-slate-400 rounded flex items-center justify-center text-[7px] text-slate-400 text-center p-1">
                            صورة رسمية 4×3
                          </div>
                          <div className="text-right space-y-0.5 flex-1">
                            <h4 className="font-bold text-xs text-slate-900">{sec.fullName}</h4>
                            <span className="inline-block bg-blue-100 text-blue-900 border border-blue-400 text-[10px] font-black px-2 py-0.5 rounded">
                              {sec.role}
                            </span>
                            <p className="text-[9px] text-slate-600">أمانة مركز الامتحان والتأطير</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="border-2 border-slate-900 rounded-xl p-3 bg-white shadow-xs">
                      <div className="bg-slate-900 text-white text-center py-1 px-2 rounded -mx-3 -mt-3 mb-2 text-[9px] font-bold">
                        {INSTITUTION.name}
                      </div>
                      <div className="flex gap-2.5 items-center">
                        <div className="w-14 h-18 border-2 border-dashed border-slate-400 rounded flex items-center justify-center text-[7px] text-slate-400 text-center p-1">
                          صورة رسمية 4×3
                        </div>
                        <div className="text-right space-y-0.5 flex-1">
                          <h4 className="font-bold text-xs text-slate-900">{proctorsList[0]?.fullName}</h4>
                          <span className="inline-block bg-emerald-100 text-emerald-900 border border-emerald-400 text-[10px] font-black px-2 py-0.5 rounded">
                            أستاذ حارس بالقاعة
                          </span>
                          <p className="text-[9px] text-slate-600">حراسة وانضباط قاعات الامتحان</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {subDocType === 'transmission_sheet' && (
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-orange-600" />
                      <h3 className="font-bold text-sm font-cairo text-slate-900">
                        معاينة جدول تسليم وتسلم مواضيع وأوراق الإجابات المشمعة
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-500 font-bold">
                      {formatArabicDate(pvDate)} • {pvTimeSlot === 'morning' ? 'صباحاً' : 'مساءً'}
                    </span>
                  </div>

                  <div className="border border-slate-300 rounded-xl p-4 bg-white space-y-3">
                    <div className="text-center font-bold text-xs text-slate-900">
                      {INSTITUTION.name} • {currentRank.titleAr} • {selectedEnvelopeModule?.titleAr}
                    </div>

                    <table className="w-full text-right text-[11px] border-collapse border border-slate-300">
                      <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                        <tr>
                          <th className="border border-slate-300 py-1 px-2 text-center">القاعة</th>
                          <th className="border border-slate-300 py-1 px-1 text-center">التعداد</th>
                          <th className="border border-slate-300 py-1 px-2 text-center bg-amber-50">تسليم المواضيع</th>
                          <th className="border border-slate-300 py-1 px-2 text-center bg-emerald-50">استرجاع الإجابات</th>
                          <th className="border border-slate-300 py-1 px-2 text-center">تأشيرة الأمانة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activeRankRooms.length > 0 ? activeRankRooms : [{ id: 'r1', name: 'القاعة 01' }, { id: 'r2', name: 'القاعة 02' }]).map((r) => (
                          <tr key={r.id} className="border-b border-slate-200">
                            <td className="border border-slate-300 py-1.5 px-2 text-center font-bold">{r.name}</td>
                            <td className="border border-slate-300 py-1.5 px-1 text-center font-mono font-bold">20</td>
                            <td className="border border-slate-300 py-1.5 px-2 text-center font-mono text-[10px] bg-amber-50/50">
                              {pvTimeSlot === 'morning' ? '08:15' : '13:45'} (توقيع الحارس: ........)
                            </td>
                            <td className="border border-slate-300 py-1.5 px-2 text-center font-mono text-[10px] bg-emerald-50/50">
                              {pvTimeSlot === 'morning' ? '11:35' : '17:05'} (20 ورقة: ........)
                            </td>
                            <td className="border border-slate-300 py-1.5 px-2 text-center text-slate-400">........</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="grid grid-cols-2 gap-4 pt-2 text-xs border-t border-slate-200">
                      <div>مسؤول أمانة المركز: <strong>{activeSecretariatMembers[0]?.fullName || 'أمانة الامتحان'}</strong></div>
                      <div className="text-left">ختم رئيس المركز: <strong>{activeDirectorName}</strong></div>
                    </div>
                  </div>
                </div>
              )}

              {subDocType === 'envelope' && (
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-5 text-slate-900 bg-white">
                  <div className="text-center border-b-2 border-slate-800 pb-3">
                    <h3 className="font-bold text-sm">{INSTITUTION.republic}</h3>
                    <h4 className="font-bold text-xs text-slate-700">{INSTITUTION.ministry}</h4>
                    <h4 className="font-bold text-sm text-slate-800 mt-0.5">{INSTITUTION.name}</h4>
                    <p className="text-[11px] text-slate-600">{INSTITUTION.deputyDirectorate} • {INSTITUTION.service}</p>
                  </div>

                  <div className="py-3 text-center">
                    <span className="inline-block bg-slate-900 text-white font-bold text-xs px-4 py-1 rounded mb-1.5">
                      {envelopeType === 'answers' ? 'ظرف أوراق الإجابات المشمع' : 'ظرف مواضيع الامتحان المشمع'}
                    </span>
                    <h2 className="text-lg font-black text-slate-900">{currentRank.titleAr}</h2>
                    <div className="text-xs font-bold text-orange-700 mt-0.5">
                      المقياس: {selectedEnvelopeModule?.titleAr}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-slate-300 py-2.5 font-semibold">
                    <div>القاعة: <span className="font-bold text-slate-900">{envelopeRoomName}</span></div>
                    <div>الدورة التكوينية: <span className="font-bold">{formatAcademicYear(currentSession?.academicYear || '2026 / 2027')}</span></div>
                    <div>تاريخ وتوقيت الإجراء: <span className="font-bold font-mono">{formatArabicDate(pvDate)}</span></div>
                    <div>عدد الأوراق بالداخل: <span className="font-bold font-mono">{selectedRoomCandidates.length} ورقة</span></div>
                    <div className="col-span-2">مجال أرقام التسجيل: من <span className="font-bold font-mono text-orange-700">{envFirstReg}</span> إلى <span className="font-bold font-mono text-orange-700">{envLastReg}</span></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4 pt-1 text-center text-xs">
                    <div className="border border-slate-300 p-2.5 rounded h-20 flex flex-col justify-between">
                      <span className="font-bold text-[11px]">توقيعات الأساتذة الحراس:</span>
                      <span className="text-[9px] text-slate-400">..................................</span>
                    </div>
                    <div className="border border-slate-300 p-2.5 rounded h-20 flex flex-col justify-between">
                      <span className="font-bold text-[11px]">ختم وإمضاء رئيس مركز الامتحان:</span>
                      <span className="text-[10px] text-slate-600">{activeDirectorName}</span>
                    </div>
                  </div>
                </div>
              )}
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
                  <h3 className="font-bold text-base font-cairo">اختيار الرتبة التكوينية المستهدفة للإجراء</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    تظهر جميع الرتب المعتمدة مع عدد المتكونين المسجلين فعلياً في قاعدة البيانات المحلية.
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
              <div>
                <div className="flex items-center gap-2 mb-3 pb-1 border-b border-orange-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
                  <h4 className="font-bold text-slate-900 text-sm font-cairo">
                    {TRAINING_TRACKS.specialized.titleAr} (امتحان مهني)
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
                          onSwitchSpecialty(rank.id);
                          setIsRankModalOpen(false);
                          showToast(`تم الانتقال بنجاح إلى متابعة وإجراء رتبة: ${rank.titleAr}`, 'success');
                        }}
                        className={`text-right p-3 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50/80 text-orange-950 font-bold shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-sm font-cairo">{rank.titleAr}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{rank.category}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          count > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {count} متكون
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3 pb-1 border-b border-indigo-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  <h4 className="font-bold text-slate-900 text-sm font-cairo">
                    {TRAINING_TRACKS.pre_promotion.titleAr}
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
                          onSwitchSpecialty(rank.id);
                          setIsRankModalOpen(false);
                          showToast(`تم الانتقال بنجاح إلى متابعة وإجراء رتبة: ${rank.titleAr}`, 'success');
                        }}
                        className={`text-right p-3 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50/80 text-orange-950 font-bold shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-sm font-cairo">{rank.titleAr}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{rank.category}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          count > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
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
      {/* DEDICATED PRINT CONTAINER (#printable-official-document)                  */}
      {/* 100% HIDDEN ON SCREEN, ISOLATED & VISIBLE ONLY DURING PHYSICAL PRINTING   */}
      {/* ========================================================================= */}
      {activeSubTab !== 'scheduler_proctors' && (
        <div id="printable-official-document" className="hidden print:block font-simplified-arabic text-black bg-white p-6">
          {renderDocumentContent(activePrintDocumentType)}
        </div>
      )}

      {/* ========================================================================= */}
      {/* UNIVERSAL LIVE IN-PLATFORM A4 PREVIEW MODAL (معاينة مباشرة للطباعة)       */}
      {/* ========================================================================= */}
      {previewDocument && (
        <div className="no-print fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-2 md:p-6">
          <div className="w-full max-w-4xl bg-slate-900 text-white rounded-t-2xl p-4 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-2.5">
              <Eye className="w-5 h-5 text-orange-400" />
              <div>
                <h3 className="font-bold text-sm md:text-base font-cairo">
                  {previewDocument.title}
                </h3>
                <span className="text-[10px] text-slate-400">
                  معاينة مباشرة مطابقة بنسبة 100% لمخرجات الطابعة الرسمية الورقية (A4) بخط Simplified Arabic
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  handleTriggerPrint(previewDocument.type, previewDocument.candidateId, previewDocument.roomId);
                }}
                className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-b from-orange-500 to-amber-600 shadow-[0_3px_0_#9a3412] active:translate-y-0.5 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الورقة الآن</span>
              </button>
              <button
                onClick={() => {
                  setPreviewDocument(null);
                  setDirectPrintType(null);
                }}
                className="text-slate-400 hover:text-white p-1 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="w-full max-w-4xl bg-slate-800/90 rounded-b-2xl p-4 md:p-8 overflow-y-auto max-h-[82vh] flex justify-center">
            <div className="w-full max-w-[210mm] bg-white text-slate-900 p-6 shadow-2xl rounded-sm font-simplified-arabic border border-slate-300 min-h-[297mm]">
              {/* Direct Pure React JSX Rendering based on exact preview document type */}
              {renderDocumentContent(previewDocument.type)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
