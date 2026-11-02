import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Printer, 
  Tag, 
  Key, 
  ShieldCheck, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  DoorOpen, 
  Calendar, 
  Clock, 
  Download,
  Building,
  Layers,
  ChevronRight,
  FileCheck2,
  FolderLock
} from 'lucide-react';
import type { AppDatabaseState } from '../db/sqlite-manager';
import { INSTITUTION } from '../constants/branding';
import { getRankById, OFFICIAL_RANKS } from '../data/promotionsData';
import { getRankNumericCode, DEFAULT_INSTITUTE_WILAYA_CODE } from '../utils/registration-number';
import { formatArabicDate, formatAcademicYear } from '../utils/date-formatter';

interface ExamProceedingsViewProps {
  dbState: AppDatabaseState;
  onAddAuditLog: (action: string, details: string, severity?: 'info' | 'warning' | 'security') => void;
}

export const ExamProceedingsView: React.FC<ExamProceedingsViewProps> = ({
  dbState,
  onAddAuditLog
}) => {
  const currentSession = dbState.sessions.find(s => s.id === dbState.currentSessionId) || dbState.sessions[0];
  const currentSpecialtyId = currentSession?.specialtyId || 'dir_sec';
  const currentRank = getRankById(currentSpecialtyId) || OFFICIAL_RANKS[0];
  const rankNumericCode = getRankNumericCode(currentSpecialtyId);
  const wilayaCode = currentSession?.wilayaCode || DEFAULT_INSTITUTE_WILAYA_CODE;

  const candidates = useMemo(() => {
    return dbState.candidates.filter(c => c.specialtyId === currentSpecialtyId);
  }, [dbState.candidates, currentSpecialtyId]);

  const modules = useMemo(() => {
    return dbState.modules.filter(m => m.specialtyId === currentSpecialtyId);
  }, [dbState.modules, currentSpecialtyId]);

  const rooms = useMemo(() => {
    return dbState.rooms.length > 0 ? dbState.rooms : [
      { id: 'room-1', name: 'المدرج الرئيسي - الشيخ زاهية', capacity: 60, floor: 'الطابق الأرضي' },
      { id: 'room-2', name: 'القاعة 01 (جناح التكوين)', capacity: 25, floor: 'الطابق الأول' },
      { id: 'room-3', name: 'القاعة 02 (جناح التكوين)', capacity: 25, floor: 'الطابق الأول' }
    ];
  }, [dbState.rooms]);

  const proctors = useMemo(() => {
    return dbState.proctors.length > 0 ? dbState.proctors : [
      { id: 'proc-1', fullName: 'أ. د. بن عيسى عبد القادر', specialty: 'التشريع المدرسي', institution: 'معهد الشيخ زاهية', phone: '' },
      { id: 'proc-2', fullName: 'أ. مسعودي عبد الرزاق', specialty: 'التسيير الإداري', institution: 'معهد الشيخ زاهية', phone: '' },
      { id: 'proc-3', fullName: 'أ. عائشة بلحاج', specialty: 'علوم التربية', institution: 'معهد الشيخ زاهية', phone: '' }
    ];
  }, [dbState.proctors]);

  // Active Tab: 'pv_deroulement' | 'envelope_labels' | 'pv_ouverture_plis'
  const [activeSubTab, setActiveSubTab] = useState<'pv_deroulement' | 'envelope_labels' | 'pv_ouverture_plis'>('pv_deroulement');

  // Form selections
  const [selectedModuleId, setSelectedModuleId] = useState<string>(modules[0]?.id || '');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || '');
  const [examDateInput, setExamDateInput] = useState<string>(currentSession?.examStartDate || '2027-06-13');
  const [timeSlot, setTimeSlot] = useState<string>('morning'); // 'morning' or 'afternoon'
  const [envelopeType, setEnvelopeType] = useState<'subjects' | 'answers'>('subjects');

  // PV deroulement state
  const [incidentsText, setIncidentsText] = useState<string>('سارت مجريات الاختبار في ظروف عادية وهادئة، دون تسجيل أي حادث انضباطي أو مخالفة للتنظيم العام للامتحانات.');
  const [customAbsentIds, setCustomAbsentIds] = useState<string[]>([]);
  const [witness1Name, setWitness1Name] = useState<string>('');
  const [witness1Reg, setWitness1Reg] = useState<string>('');
  const [witness2Name, setWitness2Name] = useState<string>('');
  const [witness2Reg, setWitness2Reg] = useState<string>('');

  const selectedModule = modules.find(m => m.id === selectedModuleId) || modules[0];
  const selectedRoom = rooms.find(r => r.id === selectedRoomId) || rooms[0];

  // Candidates in selected room
  const roomCandidates = useMemo(() => {
    // If candidates have roomNumber matching, filter, else show all
    const matching = candidates.filter(c => c.roomNumber === selectedRoom.name);
    return matching.length > 0 ? matching : candidates;
  }, [candidates, selectedRoom]);

  // Present & Absent counts
  const absentCandidates = useMemo(() => {
    return roomCandidates.filter(c => customAbsentIds.includes(c.id));
  }, [roomCandidates, customAbsentIds]);

  const presentCount = roomCandidates.length - absentCandidates.length;

  const toggleAbsent = (candId: string) => {
    setCustomAbsentIds(prev => 
      prev.includes(candId) ? prev.filter(id => id !== candId) : [...prev, candId]
    );
  };

  const timeSlotString = timeSlot === 'morning' 
    ? (currentSession?.morningTimeSlot || '08:30 - 11:30') 
    : (currentSession?.afternoonTimeSlot || '14:00 - 17:00');

  // Pre-fill witnesses with first two present candidates
  const handleAutoFillWitnesses = () => {
    const presentPool = roomCandidates.filter(c => !customAbsentIds.includes(c.id));
    if (presentPool.length >= 2) {
      setWitness1Name(presentPool[0].fullName);
      setWitness1Reg(presentPool[0].registrationNumber);
      setWitness2Name(presentPool[1].fullName);
      setWitness2Reg(presentPool[1].registrationNumber);
    }
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Top Controller Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600">
              <FolderLock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-cairo">
                وثائق وسير الامتحانات والأظرفة الرسمية
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                محاضر سير الاختبارات، قصاصات الأظرفة المشمعة الكبرى، ومحضر فك الأختام بقاعات الامتحان.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الوثيقة المحددة الآن</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs Selection */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white p-2 rounded-xl shadow-xs no-print">
        <button
          type="button"
          onClick={() => setActiveSubTab('pv_deroulement')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'pv_deroulement'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>1. محضر سير وسيرورة الاختبارات (PV de Déroulement)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('envelope_labels')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'envelope_labels'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>2. قصاصات ولافتات أظرفة الامتحانات الكبرى (Étiquettes d'Enveloppes)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('pv_ouverture_plis')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'pv_ouverture_plis'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>3. محضر فك أختام المواضيع بالقاعة (PV d'Ouverture des Plis)</span>
        </button>
      </div>

      {/* Document Configuration Parameters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {/* Module Selection */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">مقياس الاختبار:</label>
            <select
              value={selectedModuleId}
              onChange={(e) => setSelectedModuleId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-orange-500"
            >
              {modules.map(m => (
                <option key={m.id} value={m.id}>
                  {m.titleAr} (معامل {m.coefficient})
                </option>
              ))}
            </select>
          </div>

          {/* Room Selection */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">قاعة الإجراء / المدرج:</label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-orange-500"
            >
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Date */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">تاريخ إجراء الاختبار:</label>
            <input
              type="date"
              value={examDateInput}
              onChange={(e) => setExamDateInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 font-mono focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Time Slot */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">الفترة الزمنية:</label>
            <select
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-orange-500"
            >
              <option value="morning">الفترة الصباحية ({currentSession?.morningTimeSlot || '08:30 - 11:30'})</option>
              <option value="afternoon">الفترة المسائية ({currentSession?.afternoonTimeSlot || '14:00 - 17:00'})</option>
            </select>
          </div>
        </div>

        {/* Envelope type toggle for envelope tab */}
        {activeSubTab === 'envelope_labels' && (
          <div className="flex items-center gap-4 pt-3 border-t border-slate-100 text-xs">
            <span className="font-bold text-slate-700">نوع الظرف المراد توليد قصاصته:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="envType"
                checked={envelopeType === 'subjects'}
                onChange={() => setEnvelopeType('subjects')}
                className="text-orange-600 focus:ring-orange-500"
              />
              <span className="font-semibold text-slate-800">ظرف مواضيع الاختبارات المشمع (Sujets d'Examen)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="envType"
                checked={envelopeType === 'answers'}
                onChange={() => setEnvelopeType('answers')}
                className="text-orange-600 focus:ring-orange-500"
              />
              <span className="font-semibold text-slate-800">ظرف أوراق الإجابات المغلقة والمشمعة (Copies d'Examen)</span>
            </label>
          </div>
        )}

        {/* Absent toggler for PV deroulement */}
        {activeSubTab === 'pv_deroulement' && (
          <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">
                تسجيل الغيابات في هذه القاعة (انقر على المترشح لتحويله إلى غائب):
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                الحاضرون: <strong className="text-emerald-700">{presentCount}</strong> / الغائبون: <strong className="text-rose-700">{absentCandidates.length}</strong>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
              {roomCandidates.map(c => {
                const isAbs = customAbsentIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleAbsent(c.id)}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                      isAbs 
                        ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>{c.fullName}</span>
                    <span className="font-mono text-[10px] text-slate-500">({c.registrationNumber})</span>
                    {isAbs && <span className="text-rose-600 font-bold">[غائب]</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Witnesses auto-fill for PV ouverture des plis */}
        {activeSubTab === 'pv_ouverture_plis' && (
          <div className="pt-3 border-t border-slate-100 text-xs flex flex-wrap items-center justify-between gap-3">
            <span className="font-bold text-slate-700">شهود فك الأختام من المترشحين بالقاعة:</span>
            <button
              type="button"
              onClick={handleAutoFillWitnesses}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1 rounded-lg font-bold border border-slate-300 transition cursor-pointer"
            >
              ملء تلقائي بأسماء أول مترشحين حاضرين
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================================= */}
      {/* 1. DOCUMENT PREVIEW & PRINT: PV DE DÉROULEMENT DE L'ÉPREUVE                             */}
      {/* ========================================================================================= */}
      {activeSubTab === 'pv_deroulement' && (
        <div className="print-document bg-white border-2 border-slate-900 rounded-xl p-8 max-w-[850px] mx-auto shadow-xl print:shadow-none print:border-none print:p-0 min-h-[1100px] flex flex-col justify-between">
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
              <div className="inline-block bg-slate-900 text-white text-xs font-bold px-5 py-1 rounded-full mt-2 print-bold">
                محضر سير وسيرورة اختبارات نهاية التكوين التأهيلي
              </div>
            </div>

            {/* Exam Session & Identification Details */}
            <div className="border border-slate-700 rounded-lg p-3 bg-slate-50/70 mb-4 text-xs space-y-1.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-600 font-semibold">الدورة التكوينية:</span>{' '}
                  <strong className="text-slate-950 font-bold">{currentSession?.name}</strong>
                </div>
                <div>
                  <span className="text-slate-600 font-semibold">السنة التكوينية:</span>{' '}
                  <strong className="text-slate-950 font-mono">{formatAcademicYear(currentSession?.academicYear)}</strong>
                </div>
                <div>
                  <span className="text-slate-600 font-semibold">الرتبة المعنية:</span>{' '}
                  <strong className="text-orange-950 font-bold">{currentRank.titleAr}</strong> (رمز الرتبة: <span className="font-mono">{rankNumericCode}</span>)
                </div>
                <div>
                  <span className="text-slate-600 font-semibold">مقياس الاختبار:</span>{' '}
                  <strong className="text-slate-950 font-bold">{selectedModule.titleAr}</strong> (معامل: <span className="font-mono">{selectedModule.coefficient}</span>)
                </div>
                <div>
                  <span className="text-slate-600 font-semibold">قاعة الإجراء / المدرج:</span>{' '}
                  <strong className="text-slate-950 font-bold">{selectedRoom.name}</strong>
                </div>
                <div>
                  <span className="text-slate-600 font-semibold">تاريخ وتوقيت الاختبار:</span>{' '}
                  <strong className="text-slate-950 font-mono">{formatArabicDate(examDateInput)}</strong> — <span className="font-mono font-bold">{timeSlotString}</span>
                </div>
              </div>
            </div>

            {/* Attendance Statistics Table */}
            <div className="mb-4">
              <table className="w-full text-center text-xs border-collapse border-2 border-slate-800">
                <thead className="bg-slate-200 text-slate-950 font-bold">
                  <tr>
                    <th className="border border-slate-700 py-1.5 px-2">عدد المترشحين المسجلين بالقاعة</th>
                    <th className="border border-slate-700 py-1.5 px-2 bg-emerald-100 text-emerald-950">عدد الحاضرين</th>
                    <th className="border border-slate-700 py-1.5 px-2 bg-rose-100 text-rose-950">عدد الغائبين</th>
                    <th className="border border-slate-700 py-1.5 px-2">عدد أوراق الإجابة المسترجعة</th>
                    <th className="border border-slate-700 py-1.5 px-2">الأوراق الفائضة أو الملغاة</th>
                  </tr>
                </thead>
                <tbody className="font-mono font-bold text-sm">
                  <tr>
                    <td className="border border-slate-500 py-2">{roomCandidates.length}</td>
                    <td className="border border-slate-500 py-2 text-emerald-800 bg-emerald-50/50">{presentCount}</td>
                    <td className="border border-slate-500 py-2 text-rose-800 bg-rose-50/50">{absentCandidates.length}</td>
                    <td className="border border-slate-500 py-2 text-slate-950">{presentCount}</td>
                    <td className="border border-slate-500 py-2 text-slate-600">0</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* List of Absent Candidates if Any */}
            <div className="mb-4">
              <span className="font-bold text-xs text-slate-900 block mb-1">
                جدول حصر المترشحين الغائبين (يُدون بدقة حسب بطاقات الهوية والاستدعاء):
              </span>
              <table className="w-full text-right text-xs border-collapse border border-slate-700">
                <thead className="bg-slate-100 font-bold">
                  <tr>
                    <th className="border border-slate-400 py-1 px-2 text-center w-8">#</th>
                    <th className="border border-slate-400 py-1 px-2 w-28">رقم التسجيل</th>
                    <th className="border border-slate-400 py-1 px-3">اللقب والاسم الكامل</th>
                    <th className="border border-slate-400 py-1 px-2 w-28">الفوج التربوي</th>
                    <th className="border border-slate-400 py-1 px-3">مبرر الغياب وملاحظة المصلحة</th>
                  </tr>
                </thead>
                <tbody>
                  {absentCandidates.length > 0 ? (
                    absentCandidates.map((c, i) => (
                      <tr key={c.id}>
                        <td className="border border-slate-400 py-1 px-2 text-center font-mono">{i + 1}</td>
                        <td className="border border-slate-400 py-1 px-2 font-mono font-bold">{c.registrationNumber}</td>
                        <td className="border border-slate-400 py-1 px-3 font-bold">{c.fullName}</td>
                        <td className="border border-slate-400 py-1 px-2">{c.groupNumber}</td>
                        <td className="border border-slate-400 py-1 px-3 text-slate-600">غياب أثناء انطلاق الاختبار</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="border border-slate-400 py-2 text-center text-slate-500 font-medium">
                        لم يُسجّل أي غياب في هذه القاعة (حضور كامل بنسبة 100%).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Exam Proceedings and Incidents Box */}
            <div className="border border-slate-700 rounded-lg p-3 bg-slate-50/50 mb-6 text-xs">
              <span className="font-bold text-slate-900 block mb-1">
                وقائع وسير الاختبار والحوادث الانضباطية إن وُجدت:
              </span>
              <p className="text-slate-800 leading-relaxed font-medium">
                {incidentsText}
              </p>
            </div>
          </div>

          {/* Signatures Grid */}
          <div className="border-t-2 border-slate-900 pt-4 text-xs">
            <span className="font-bold text-slate-900 block mb-2 text-center">
              أسماء وتوقيعات الأساتذة الحراس المشرفين على القاعة
            </span>
            <div className="grid grid-cols-3 gap-3 text-center">
              {proctors.slice(0, 3).map((p, idx) => (
                <div key={p.id} className="border border-slate-400 rounded-lg p-2 bg-slate-50/30">
                  <span className="font-bold text-slate-900 block">{p.fullName}</span>
                  <span className="text-[10px] text-slate-600 block">{p.specialty || p.institution || 'أستاذ مؤطر'}</span>
                  <span className="text-[10px] text-slate-400 block mt-1">الحارس رقم 0{idx + 1}</span>
                  <div className="h-10 border-b border-dotted border-slate-400 mt-1"></div>
                  <span className="text-[9px] text-slate-500">التوقيع</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-8 mt-6 text-center">
              <div>
                <span className="font-bold text-slate-900 block">مسؤول القاعة / الحارس الرئيسي:</span>
                <p className="text-[11px] text-slate-500 mt-0.5">مصادق على صحة الإحصائيات</p>
                <div className="h-12"></div>
              </div>
              <div>
                <span className="font-bold text-slate-900 block print-bold">
                  رئيس المركز / مسؤول {INSTITUTION.service}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">الأغواط في: {formatArabicDate(examDateInput)}</p>
                <div className="h-12"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* 2. DOCUMENT PREVIEW & PRINT: GRANDES ÉTIQUETTES D'ENVELOPPES SCELLÉES                     */}
      {/* ========================================================================================= */}
      {activeSubTab === 'envelope_labels' && (
        <div className="space-y-6">
          {/* Printable Large Sticker Box (Designed for A4 or A5 Cut/Paste on Envelopes) */}
          <div className="print-document bg-white border-4 border-slate-950 rounded-2xl p-6 md:p-8 max-w-[800px] mx-auto shadow-2xl print:shadow-none print:border-4 print:border-slate-950 min-h-[600px] flex flex-col justify-between">
            <div>
              {/* Official 5-Line Header */}
              <div className="text-center border-b-2 border-slate-900 pb-2 mb-3 leading-snug">
                <p className="text-[11px] font-bold text-slate-800">{INSTITUTION.republic}</p>
                <p className="text-[11px] font-bold text-slate-800">{INSTITUTION.ministry}</p>
                <h1 className="text-xs md:text-sm font-black text-slate-950 mt-0.5 print-bold">
                  {INSTITUTION.name}
                </h1>
                <p className="text-[11px] font-semibold text-slate-800 mt-0.5">
                  {INSTITUTION.deputyDirectorate}
                </p>
                <p className="text-[11px] font-bold text-slate-900 mt-0.5 print-bold">
                  {INSTITUTION.service}
                </p>
              </div>

              {/* Bold Envelope Identification Badge */}
              <div className="text-center my-3">
                <div className={`inline-block text-white text-base md:text-lg font-black px-6 py-2 rounded-xl shadow-md border-2 border-white tracking-wide print-bold ${
                  envelopeType === 'subjects' ? 'bg-orange-700' : 'bg-slate-900'
                }`}>
                  {envelopeType === 'subjects' 
                    ? 'ظرف مواضيع الامتحانات المشمع (CONFIDENTIEL - SUJETS D\'EXAMEN)' 
                    : 'ظرف أوراق الإجابات المشمع والمغلق (COPIES D\'EXAMEN ANONYMAT)'}
                </div>
                <p className="text-[11px] text-slate-600 font-bold mt-1">
                  يُحظر فض هذا الظرف أو المساس بأختامه إلا في المكان والزمان المحددين نظامياً
                </p>
              </div>

              {/* Major Examination Details Grid */}
              <div className="border-2 border-slate-900 rounded-xl p-4 bg-slate-50/70 mb-4 text-xs">
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                  <div>
                    <span className="text-slate-600 font-bold block text-[11px]">الدورة التكوينية:</span>
                    <strong className="text-slate-950 text-sm font-bold">{currentSession?.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600 font-bold block text-[11px]">السنة التكوينية:</span>
                    <strong className="text-slate-950 font-mono text-sm">{formatAcademicYear(currentSession?.academicYear)}</strong>
                  </div>

                  <div className="col-span-2 pt-1 border-t border-slate-300">
                    <span className="text-slate-600 font-bold block text-[11px]">الرتبة التكوينية المعتمدة:</span>
                    <strong className="text-orange-950 text-base font-black">{currentRank.titleAr}</strong>{' '}
                    <span className="text-xs bg-orange-100 text-orange-900 px-2 py-0.5 rounded font-mono font-bold mr-2">
                      كود الرتبة: {rankNumericCode}
                    </span>
                  </div>

                  <div className="col-span-2 pt-1 border-t border-slate-300">
                    <span className="text-slate-600 font-bold block text-[11px]">مقياس الاختبار:</span>
                    <strong className="text-slate-950 text-base font-black">{selectedModule.titleAr}</strong>{' '}
                    <span className="text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-mono font-bold mr-2">
                      كود: {selectedModule.code} • المعامل: {selectedModule.coefficient}
                    </span>
                  </div>

                  <div className="pt-1 border-t border-slate-300">
                    <span className="text-slate-600 font-bold block text-[11px]">تاريخ إجراء الاختبار:</span>
                    <strong className="text-slate-950 text-sm font-mono font-bold">{formatArabicDate(examDateInput)}</strong>
                  </div>
                  <div className="pt-1 border-t border-slate-300">
                    <span className="text-slate-600 font-bold block text-[11px]">الفترة والتوقيت:</span>
                    <strong className="text-slate-950 text-sm font-mono font-bold">{timeSlotString}</strong>
                  </div>

                  <div className="col-span-2 pt-1 border-t-2 border-slate-400 grid grid-cols-3 gap-2 text-center bg-white p-2 rounded-lg border border-slate-300">
                    <div>
                      <span className="text-slate-500 font-bold block text-[10px]">قاعة الإجراء / المدرج</span>
                      <strong className="text-slate-950 text-sm font-black">{selectedRoom.name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-[10px]">عدد المترشحين بالقاعة</span>
                      <strong className="text-orange-700 text-base font-mono font-black">{roomCandidates.length}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-[10px]">
                        {envelopeType === 'subjects' ? 'عدد نسخ المواضيع' : 'عدد أوراق الإجابة المودعة'}
                      </span>
                      <strong className="text-slate-950 text-base font-mono font-black">
                        {envelopeType === 'subjects' ? roomCandidates.length + 2 : presentCount}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status and Verification Box */}
              <div className="border border-slate-800 rounded-lg p-2.5 bg-amber-50/60 mb-4 text-[11px] text-slate-900 flex items-center justify-between">
                <span className="font-bold">
                  حالة الأختام والشمع الأحمر: <span className="text-emerald-800 font-black">محكمة وسليمة 100% ✓</span>
                </span>
                <span className="font-mono text-slate-600">
                  كود التتبع: ENV-{rankNumericCode}-{selectedModule.code}-{selectedRoom.id.slice(-4).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Official Stamp & Signatures Box */}
            <div className="border-t-2 border-slate-950 pt-3 grid grid-cols-2 gap-6 text-xs text-center">
              <div className="border border-slate-400 rounded-lg p-2 bg-slate-50/40">
                <span className="font-bold text-slate-900 block text-[11px]">
                  {envelopeType === 'subjects' ? 'تسليم الظرف من الأمانة العامة:' : 'استلام ظرف الإجابات في مصلحة الامتحانات:'}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">الاسم، التوقيع وختم المصلحة</p>
                <div className="h-12"></div>
              </div>

              <div className="border border-slate-400 rounded-lg p-2 bg-slate-50/40">
                <span className="font-bold text-slate-900 block text-[11px]">
                  {envelopeType === 'subjects' ? 'استلام الظرف في قاعة الاختبار:' : 'تسليم أوراق الإجابات من طرف الحراس:'}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">توقيع رئيس القاعة والحراس</p>
                <div className="h-12"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* 3. DOCUMENT PREVIEW & PRINT: PV D'OUVERTURE ET DE DESCELLEMENT DES PLIS                  */}
      {/* ========================================================================================= */}
      {activeSubTab === 'pv_ouverture_plis' && (
        <div className="print-document bg-white border-2 border-slate-900 rounded-xl p-8 max-w-[850px] mx-auto shadow-xl print:shadow-none print:border-none print:p-0 min-h-[1100px] flex flex-col justify-between">
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
              <div className="inline-block bg-slate-900 text-white text-xs font-bold px-5 py-1 rounded-full mt-2 print-bold">
                محضر فك الأختام وفتح أظرفة مواضيع الامتحانات بقاعة الإجراء
              </div>
            </div>

            {/* Declaration Body */}
            <div className="border border-slate-700 rounded-lg p-4 bg-slate-50/60 mb-6 text-xs leading-relaxed space-y-3">
              <p className="text-justify font-medium text-slate-900">
                في يوم: <strong className="font-mono text-sm underline">{formatArabicDate(examDateInput)}</strong>، وعلى الساعة: <strong className="font-mono text-sm underline">{timeSlotString.split('-')[0].trim()}</strong>،
                بقاعة الامتحان / المدرج: <strong className="text-slate-950 underline">{selectedRoom.name}</strong>، 
                التابعة لمركز إجراء امتحانات نهاية التكوين بالمعهد الوطني لتكوين موظفي قطاع التربية الوطنية الشيخ زاهية حسين بالأغواط.
              </p>

              <p className="text-justify font-medium text-slate-900">
                نحن الموقعون أسفله؛ الأساتذة الحراس المكلفون بالحراسة والمترشحان الشاهدان المذكوران أدناه من المترشحين الحاضرين في القاعة:
              </p>

              <div className="p-3 bg-white border border-slate-400 rounded-lg space-y-1 font-bold text-slate-950">
                <div>• الرتبة التكوينية: <span className="text-orange-950">{currentRank.titleAr}</span> (رمز: {rankNumericCode})</div>
                <div>• مقياس الاختبار: <span>{selectedModule.titleAr}</span> (كود: {selectedModule.code} • معامل: {selectedModule.coefficient})</div>
                <div>• عدد المترشحين بالقاعة: <span className="font-mono">{roomCandidates.length}</span> مترشحاً.</div>
              </div>

              <p className="text-justify font-bold text-slate-950 leading-relaxed bg-amber-50/70 p-3 rounded border border-amber-300">
                « نشهد جماعياً وبكامل المسؤولية القانونية والإدارية، بأننا عاينّا ظرف مواضيع الاختبار المذكور أعلاه قبل فتحه، وتأكدنا تماماً من سلامة أختامه وشمع مصلحة تنظيم سير المسابقات والامتحانات، وأنه لم تمتد إليه يد قبلاً، وقد تم فض أختامه وفتحه علناً أمام أعين كافة المترشحين في القاعة، وتبيّن تطابق موضوع الاختبار المطبوع مع الرتبة والمقياس المبرمجين. »
              </p>
            </div>

            {/* Candidate Witnesses Table */}
            <div className="mb-6">
              <span className="font-bold text-xs text-slate-900 block mb-1.5">
                المترشحان الشاهدان من القاعة على سلامة الأختام ولحظة الفتح:
              </span>
              <table className="w-full text-right text-xs border-collapse border-2 border-slate-800">
                <thead className="bg-slate-200 text-slate-950 font-bold">
                  <tr>
                    <th className="border border-slate-600 py-1.5 px-2 text-center w-10">الشاهد</th>
                    <th className="border border-slate-600 py-1.5 px-3">اللقب والاسم الكامل للمترشح</th>
                    <th className="border border-slate-600 py-1.5 px-3 text-center w-36">رقم التسجيل الرسمي</th>
                    <th className="border border-slate-600 py-1.5 px-3 text-center w-36">توقيع المترشح الشاهد</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-400 py-2 text-center font-bold">01</td>
                    <td className="border border-slate-400 py-2 px-3 font-bold text-slate-950">
                      {witness1Name || '...................................................'}
                    </td>
                    <td className="border border-slate-400 py-2 px-3 text-center font-mono font-bold">
                      {witness1Reg || '.....................'}
                    </td>
                    <td className="border border-slate-400 py-2 px-3 text-center text-slate-400">
                      .....................
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-400 py-2 text-center font-bold">02</td>
                    <td className="border border-slate-400 py-2 px-3 font-bold text-slate-950">
                      {witness2Name || '...................................................'}
                    </td>
                    <td className="border border-slate-400 py-2 px-3 text-center font-mono font-bold">
                      {witness2Reg || '.....................'}
                    </td>
                    <td className="border border-slate-400 py-2 px-3 text-center text-slate-400">
                      .....................
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Invigilators Table */}
            <div className="mb-6">
              <span className="font-bold text-xs text-slate-900 block mb-1.5">
                الأساتذة الحراس الحاضرون بالقاعة:
              </span>
              <table className="w-full text-right text-xs border-collapse border border-slate-700">
                <thead className="bg-slate-100 font-bold">
                  <tr>
                    <th className="border border-slate-400 py-1 px-2 text-center w-8">#</th>
                    <th className="border border-slate-400 py-1 px-3">اللقب والاسم الكامل للأستاذ الحارس</th>
                    <th className="border border-slate-400 py-1 px-3 text-center w-40">الصفة / الرتبة</th>
                    <th className="border border-slate-400 py-1 px-3 text-center w-36">التوقيع</th>
                  </tr>
                </thead>
                <tbody>
                  {proctors.slice(0, 3).map((p, idx) => (
                    <tr key={p.id}>
                      <td className="border border-slate-400 py-2 text-center font-mono font-bold">{idx + 1}</td>
                      <td className="border border-slate-400 py-2 px-3 font-bold text-slate-950">{p.fullName}</td>
                      <td className="border border-slate-400 py-2 px-3 text-center text-slate-700">{p.specialty || p.institution || 'أستاذ مؤطر'}</td>
                      <td className="border border-slate-400 py-2 px-3 text-center text-slate-400">.....................</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Official Certification */}
          <div className="border-t-2 border-slate-900 pt-4 text-xs flex items-center justify-between">
            <span className="text-[11px] text-slate-600 font-medium">
              حرر بالقاعة في التاريخ والساعة المذكورين أعلاه بحضور المعنيين.
            </span>
            <div className="text-center">
              <span className="font-bold text-slate-900 block print-bold">
                مسؤول القاعة / الحارس الرئيسي
              </span>
              <div className="h-10"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
