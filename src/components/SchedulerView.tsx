import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  ShieldCheck, 
  Printer, 
  Sparkles, 
  UserPlus, 
  Trash2, 
  FileText, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Download,
  Shuffle,
  ChevronDown,
  Layers,
  MapPin,
  FileSpreadsheet
} from 'lucide-react';
import type { AppDatabaseState, ProctorTeacher, ExamRoom, TimetableSlot, ExamSession } from '../db/sqlite-manager';
import type { ExamModule } from '../utils/crypto-anonymat';
import { INSTITUTION } from '../constants/branding';
import { formatArabicDate, formatAcademicYear } from '../utils/date-formatter';
import { triggerPrintWithDynamicTitle } from '../utils/print-utils';

interface SchedulerViewProps {
  dbState: AppDatabaseState;
  effectiveRooms?: ExamRoom[];
  onUpdateSession: (updatedSession: ExamSession) => void;
  onUpdateProctors: (proctors: ProctorTeacher[]) => void;
  onUpdateRooms: (rooms: ExamRoom[]) => void;
  onUpdateTimetable: (slots: TimetableSlot[]) => void;
  onAddAuditLog: (action: string, details: string, severity?: 'info' | 'warning' | 'security') => void;
}

export const SchedulerView: React.FC<SchedulerViewProps> = ({
  dbState,
  effectiveRooms,
  onUpdateSession,
  onUpdateProctors,
  onUpdateRooms,
  onUpdateTimetable,
  onAddAuditLog
}) => {
  const currentSession = dbState.sessions.find(s => s.id === dbState.currentSessionId) || dbState.sessions[0];
  const specialty = dbState.specialties.find(sp => sp.id === currentSession?.specialtyId);
  const modules = dbState.modules.filter(m => m.specialtyId === currentSession?.specialtyId);

  const proctors = dbState.proctors || [];

  // Strictly adhere to rooms from Subtab 1 (rooms distribution)
  const rooms: ExamRoom[] = useMemo(() => {
    if (effectiveRooms && effectiveRooms.length > 0) {
      return effectiveRooms;
    }
    if (dbState.rooms && dbState.rooms.length > 0) {
      return dbState.rooms;
    }
    const sessionCandidates = dbState.candidates.filter(c => c.specialtyId === currentSession?.specialtyId);
    const count = Math.max(1, Math.ceil(sessionCandidates.length / 20));
    return Array.from({ length: count }, (_, i) => ({
      id: `room_${(i + 1).toString().padStart(2, '0')}`,
      name: `القاعة ${(i + 1).toString().padStart(2, '0')}`,
      capacity: 20,
      building: 'الجناح البيداغوجي'
    }));
  }, [effectiveRooms, dbState.rooms, dbState.candidates, currentSession?.specialtyId]);

  const timetable = dbState.timetable || [];

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'timetable' | 'proctors' | 'rooms' | 'print_schedule' | 'print_master_proctors' | 'print_summons'>('timetable');

  // New proctor modal/form state
  const [showAddProctorModal, setShowAddProctorModal] = useState(false);
  const [newProctorName, setNewProctorName] = useState('');
  const [newProctorInstitution, setNewProctorInstitution] = useState('المعهد الوطني بالأغواط');
  const [newProctorPhone, setNewProctorPhone] = useState('');
  const [newProctorSpecialty, setNewProctorSpecialty] = useState('');

  // Selected proctor for individual summons
  const [selectedProctorIdForSummons, setSelectedProctorIdForSummons] = useState<string>(proctors[0]?.id || '');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Auto timetable generation
  const handleGenerateAutomatedTimetable = () => {
    if (modules.length === 0) {
      setNotification({ type: 'error', message: 'لا توجد مقاييس مسجلة لهذه الرتبة لتوليد الرزنامة!' });
      return;
    }

    const startDateStr = currentSession?.examStartDate || currentSession?.startDate || '2027-06-13';
    const startDate = new Date(startDateStr);
    const morningTime = currentSession?.morningTimeSlot || '08:30 - 11:30';
    const afternoonTime = currentSession?.afternoonTimeSlot || '14:00 - 17:00';

    const newSlots: TimetableSlot[] = [];
    let currentDate = new Date(startDate);

    // Use the exact synchronized rooms from Subtab 1 (Rooms Distribution)
    const activeRooms = rooms;

    // Distribute modules 2 per day: morning then afternoon
    modules.forEach((mod, index) => {
      const dayOffset = Math.floor(index / 2);
      const isMorning = index % 2 === 0;

      // Calculate calendar day skipping Friday (day 5)
      const slotDate = new Date(startDate);
      let addedDays = 0;
      let checkDate = new Date(startDate);
      while (addedDays < dayOffset) {
        checkDate.setDate(checkDate.getDate() + 1);
        if (checkDate.getDay() !== 5) { // Skip Friday
          addedDays++;
        }
      }
      const dateString = checkDate.toISOString().slice(0, 10);

      // Allocations for each room strictly derived from Subtab 1
      const roomAllocations = activeRooms.map(r => ({
        roomId: r.id,
        proctorIds: [] as string[]
      }));

      newSlots.push({
        id: `slot_${mod.id}_${index}`,
        date: dateString,
        sessionTime: isMorning ? 'morning' : 'afternoon',
        timeRange: isMorning ? morningTime : afternoonTime,
        moduleId: mod.id,
        roomAllocations
      });
    });

    onUpdateTimetable(newSlots);
    onAddAuditLog('توليد رزنامة الامتحانات', `تم توليد رزنامة آلية موزعة على ${newSlots.length} فترة اختبار لمقاييس ${specialty?.titleAr} عبر ${activeRooms.length} قاعات موزعة.`, 'info');
    setNotification({ type: 'success', message: `تم توليد رزنامة الاختبارات بنجاح بمعدل مقياسين يومياً عبر ${activeRooms.length} قاعة مطابقة للتقسيم الإداري!` });
  };

  // Smart Fair Proctor Distribution (2 proctors per room per slot, balancing load)
  const handleAutoDistributeProctors = () => {
    if (proctors.length < 2) {
      setNotification({ type: 'error', message: 'يرجى تسجيل أستاذين على الأقل لتوزيع الحراسة!' });
      return;
    }
    if (timetable.length === 0) {
      setNotification({ type: 'error', message: 'يرجى توليد رزنامة الاختبارات أولاً قبل توزيع الحراس!' });
      return;
    }

    // Keep track of how many sessions each proctor has been assigned to
    const assignmentCounts: Record<string, number> = {};
    proctors.forEach(p => { assignmentCounts[p.id] = 0; });

    // Deep clone timetable
    const updatedSlots: TimetableSlot[] = JSON.parse(JSON.stringify(timetable));

    updatedSlots.forEach(slot => {
      const usedInThisSlot = new Set<string>();

      // Synchronize room allocations strictly with rooms from Subtab 1
      const existingAllocMap = new Map(slot.roomAllocations.map(a => [a.roomId, a.proctorIds]));
      slot.roomAllocations = rooms.map(r => ({
        roomId: r.id,
        proctorIds: existingAllocMap.get(r.id) || []
      }));

      slot.roomAllocations.forEach(alloc => {
        const assignedForRoom: string[] = [];

        for (let needed = 0; needed < 2; needed++) {
          // Find candidates not yet assigned in this slot, sorted by least total assignments
          const eligible = proctors
            .filter(p => !usedInThisSlot.has(p.id))
            .sort((a, b) => (assignmentCounts[a.id] || 0) - (assignmentCounts[b.id] || 0));

          if (eligible.length > 0) {
            // Pick fairly from the pool of least assigned
            const chosen = eligible[0];
            assignedForRoom.push(chosen.id);
            usedInThisSlot.add(chosen.id);
            assignmentCounts[chosen.id] = (assignmentCounts[chosen.id] || 0) + 1;
          }
        }

        alloc.proctorIds = assignedForRoom;
      });
    });

    onUpdateTimetable(updatedSlots);
    onAddAuditLog('توزيع الحراس الآلي', `تم توزيع الأساتذة على كافة القاعات وفترات الحراسة بعدالة وتوازن.`, 'info');
    setNotification({ type: 'success', message: 'تم إنجاز التوزيع العادل للحراس (حارسان لكل قاعة دون تضارب) بنجاح!' });
  };

  // Add new proctor
  const handleAddProctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProctorName.trim()) return;

    const newProc: ProctorTeacher = {
      id: `proc_${Date.now()}`,
      fullName: newProctorName.trim(),
      institution: newProctorInstitution.trim() || 'المعهد الوطني بالأغواط',
      phone: newProctorPhone.trim() || '0660000000',
      specialty: newProctorSpecialty.trim() || 'مكوّن'
    };

    const updated = [...proctors, newProc];
    onUpdateProctors(updated);
    setNewProctorName('');
    setNewProctorPhone('');
    setNewProctorSpecialty('');
    setShowAddProctorModal(false);
    onAddAuditLog('إضافة أستاذ حارس', `تم تسجيل الأستاذ(ة): ${newProc.fullName}`, 'info');
    setNotification({ type: 'success', message: `تمت إضافة الأستاذ(ة) ${newProc.fullName} إلى قائمة التأطير.` });
  };

  // Delete proctor
  const handleDeleteProctor = (id: string) => {
    const updated = proctors.filter(p => p.id !== id);
    onUpdateProctors(updated);
    onAddAuditLog('حذف أستاذ حارس', `تم حذف أستاذ من قائمة الحراسة.`, 'warning');
  };

  // Statistics
  const totalSlotsCount = timetable.length;
  const totalAllocatedProctorsCount = timetable.reduce((acc, slot) => {
    return acc + slot.roomAllocations.reduce((sub, r) => sub + r.proctorIds.length, 0);
  }, 0);

  // Proctors duty count map
  const proctorDutyStats = useMemo(() => {
    const map: Record<string, number> = {};
    proctors.forEach(p => { map[p.id] = 0; });
    timetable.forEach(slot => {
      slot.roomAllocations.forEach(r => {
        r.proctorIds.forEach(pid => {
          map[pid] = (map[pid] || 0) + 1;
        });
      });
    });
    return map;
  }, [proctors, timetable]);

  // Selected proctor data for individual summons
  const selectedProctor = proctors.find(p => p.id === selectedProctorIdForSummons) || proctors[0];
  const proctorAssignedSlots = useMemo(() => {
    if (!selectedProctor) return [];
    const list: { slot: TimetableSlot; module: ExamModule | undefined; room: ExamRoom | undefined; coProctorName: string }[] = [];

    timetable.forEach(slot => {
      const mod = modules.find(m => m.id === slot.moduleId);
      slot.roomAllocations.forEach(alloc => {
        if (alloc.proctorIds.includes(selectedProctor.id)) {
          const roomObj = rooms.find(r => r.id === alloc.roomId);
          const coProctorId = alloc.proctorIds.find(id => id !== selectedProctor.id);
          const coProc = proctors.find(p => p.id === coProctorId);
          list.push({
            slot,
            module: mod,
            room: roomObj,
            coProctorName: coProc ? coProc.fullName : '—'
          });
        }
      });
    });
    return list;
  }, [selectedProctor, timetable, modules, rooms, proctors]);

  return (
    <div className="space-y-6">
      {/* Alert / Notification Banner */}
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

      {/* Main Module Header (Hidden on print) */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white rounded-2xl p-6 shadow-md border border-orange-500/30 flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
            <Calendar className="w-7 h-7 text-amber-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-cairo tracking-wide">
                برمجة ورزنامة سير الاختبارات وتوزيع الحراسة
              </h2>
              <span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full font-mono" dir="ltr">
                {formatAcademicYear(currentSession?.academicYear)}
              </span>
            </div>
            <p className="text-xs text-orange-100 mt-1 max-w-2xl leading-relaxed">
              {INSTITUTION.name} • {INSTITUTION.service} — توزيع المقاييس على الفترات، وإسناد مهام الحراسة بقاعات الإجراء، واستخراج الاستدعاءات الفردية.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateAutomatedTimetable}
            className="flex items-center gap-1.5 bg-white text-orange-700 hover:bg-orange-50 px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
            title="توليد جدول زمني آلي للمقاييس (مقياسان يومياً: صباحاً ومساءً)"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            <span>توليد الرزنامة آلياً</span>
          </button>

          <button
            onClick={handleAutoDistributeProctors}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
            title="توزيع عادل للحراس (حارسان لكل قاعة)"
          >
            <Shuffle className="w-3.5 h-3.5 text-amber-400" />
            <span>توزيع الحراس عادلاً</span>
          </button>
        </div>
      </div>

      {/* Scheduler Navigation Bar (Hidden on print) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 no-print">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('timetable')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'timetable'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>جدول الاختبارات ({timetable.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('proctors')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'proctors'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>قائمة الأساتذة الحراس ({proctors.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'rooms'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>قاعات الإجراء ({rooms.length})</span>
          </button>
        </div>

        {/* Printable Views Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
          <span className="text-slate-500 text-[11px] px-2 font-bold flex items-center gap-1">
            <Printer className="w-3 h-3 text-orange-600" />
            <span>الطباعة الرسمية:</span>
          </span>

          <button
            onClick={() => setActiveTab('print_schedule')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'print_schedule' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            رزنامة الاختبارات
          </button>

          <button
            onClick={() => setActiveTab('print_master_proctors')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'print_master_proctors' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            جدول تسخير الحراسة
          </button>

          <button
            onClick={() => setActiveTab('print_summons')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'print_summons' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            استدعاء الحراسة الفردي
          </button>
        </div>
      </div>

      {/* TAB 1: TIMETABLE VIEW */}
      {activeTab === 'timetable' && (
        <div className="space-y-4 no-print">
          {timetable.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
              <Calendar className="w-12 h-12 text-orange-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-800">لم يتم توليد رزنامة الاختبارات بعد</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                اضغط على زر "توليد الرزنامة آلياً" أعلاه لتوزيع مقاييس رتبة ({specialty?.titleAr}) بمعدل مقياسين يومياً طبقاً للتواريخ المحددة.
              </p>
              <button
                onClick={handleGenerateAutomatedTimetable}
                className="mt-4 bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>توليد الرزنامة الآن</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    رزنامة سير الاختبارات الكتابية — {specialty?.titleAr}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    الدورة: {currentSession?.name} • التوقيت الصباحي: {currentSession?.morningTimeSlot} • التوقيت المسائي: {currentSession?.afternoonTimeSlot}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('print_schedule')}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>طباعة الرزنامة</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3 w-28">التاريخ</th>
                      <th className="p-3 w-28">الفترة</th>
                      <th className="p-3 w-32">التوقيت</th>
                      <th className="p-3">المقياس والمعامل</th>
                      <th className="p-3 w-24 text-center">المدة</th>
                      <th className="p-3">توزيع القاعات والحراس (2 حراس / قاعة)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {timetable.map((slot, idx) => {
                      const mod = modules.find(m => m.id === slot.moduleId);
                      const isMorning = slot.sessionTime === 'morning';

                      return (
                        <tr key={slot.id} className="hover:bg-orange-50/40 transition">
                          <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-3 font-mono font-bold text-slate-900">{formatArabicDate(slot.date)}</td>
                          <td className="p-3">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isMorning ? 'bg-amber-100 text-amber-900' : 'bg-indigo-100 text-indigo-900'
                            }`}>
                              {isMorning ? 'فترة صباحية' : 'فترة مسائية'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-700">{slot.timeRange}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{mod?.titleAr || slot.moduleId}</div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              المعامل: <span className="font-bold text-orange-600">{mod?.coefficient || 1}</span> • 
                              الكود: {mod?.code || '—'}
                            </div>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-700">
                            {mod ? `${mod.durationMinutes / 60} ساعات` : '03 ساعات'}
                          </td>
                          <td className="p-3">
                            <div className="space-y-1.5">
                              {slot.roomAllocations.map(alloc => {
                                const roomObj = rooms.find(r => r.id === alloc.roomId);
                                const assignedTeachers = alloc.proctorIds.map(pid => proctors.find(p => p.id === pid)?.fullName).filter(Boolean);

                                return (
                                  <div key={alloc.roomId} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px] flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-bold text-slate-800 flex items-center gap-1">
                                      <Building2 className="w-3 h-3 text-slate-500" />
                                      {roomObj?.name || alloc.roomId}
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                      {assignedTeachers.length > 0 ? (
                                        assignedTeachers.map((tName, tIdx) => (
                                          <span key={tIdx} className="bg-white border border-slate-300 text-slate-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                                            {tName}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-amber-600 text-[10px] font-semibold">
                                          لم يتم تعيين حراس بعد
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROCTORS ROSTER */}
      {activeTab === 'proctors' && (
        <div className="space-y-4 no-print">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-600" />
                  <span>قائمة الأساتذة والمؤطرين المسخرين للحراسة</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  العدد الكلي للأساتذة المسجلين: <strong className="text-slate-800">{proctors.length}</strong> أستاذ(ة)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddProctorModal(true)}
                  className="bg-orange-600 hover:bg-orange-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>إضافة أستاذ حارس</span>
                </button>
              </div>
            </div>

            {/* Proctors Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {proctors.map((proc, pIdx) => {
                const duties = proctorDutyStats[proc.id] || 0;

                return (
                  <div key={proc.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between hover:border-orange-300 transition">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-800 font-mono text-xs font-bold flex items-center justify-center">
                          {pIdx + 1}
                        </span>
                        <button
                          onClick={() => handleDeleteProctor(proc.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                          title="حذف الأستاذ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 mt-2">{proc.fullName}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{proc.institution}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{proc.phone}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px]">
                      <span className="text-slate-600">فترات الحراسة:</span>
                      <span className="font-bold text-orange-600 font-mono bg-orange-100/80 px-2 py-0.5 rounded-full">
                        {duties} فترة
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXAM ROOMS */}
      {activeTab === 'rooms' && (
        <div className="space-y-4 no-print">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-orange-600" />
              <span>قاعات إجراء الاختبارات الكتابية (ملتزمة بمدخلات تبويب الرتب وتوزيع القاعات - سقف 20)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {rooms.map((room, rIdx) => (
                <div key={room.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-lg bg-orange-500 text-white font-mono text-xs font-bold flex items-center justify-center">
                      {rIdx + 1}
                    </span>
                    <span className="text-[11px] text-orange-800 bg-orange-50 border border-orange-200 font-bold px-2 py-0.5 rounded">
                      سقف: 20 متكوناً
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mt-3">{room.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{room.building || 'الجناح البيداغوجي'}</p>
                  <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-600 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>2 حراس في كل فترة</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINT TEMPLATE 1: EXAM TIMETABLE (رزنامة سير الاختبارات الكتابية)        */}
      {/* ========================================================================= */}
      {activeTab === 'print_schedule' && (
        <div className="space-y-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 bg-slate-900 text-white p-3.5 rounded-xl no-print shadow-md">
            <span className="text-xs font-bold text-amber-300">
              معاينة طباعة: رزنامة سير الاختبارات الكتابية (Simplified Arabic)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const scheduleTitle = `رزنامة_سير_الاختبارات_الكتابية_${specialty?.titleAr || 'الامتحانات'}_${formatArabicDate(currentSession?.examStartDate || currentSession?.startDate || new Date())}`;
                  triggerPrintWithDynamicTitle(scheduleTitle);
                }}
                className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الوثيقة</span>
              </button>
              <button
                onClick={() => setActiveTab('timetable')}
                className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>

          <div className="print-document max-w-[850px] mx-auto bg-white border-2 border-slate-900 p-8 shadow-xl font-simplified-arabic text-black print:shadow-none print:border-none print:p-0">
            {/* 5-Line Official Ministerial Header */}
            <div className="text-center border-b-2 border-slate-900 pb-3 mb-4 leading-snug">
              <p className="text-xs font-bold text-slate-900">{INSTITUTION.republic}</p>
              <p className="text-xs font-bold text-slate-900">{INSTITUTION.ministry}</p>
              <h1 className="text-sm md:text-base font-bold text-slate-950 mt-0.5 print-bold">
                {INSTITUTION.name}
              </h1>
              <p className="text-xs font-semibold text-slate-800 mt-0.5">
                {INSTITUTION.deputyDirectorate}
              </p>
              <p className="text-xs font-bold text-slate-900 mt-0.5 print-bold">
                {INSTITUTION.service}
              </p>
              <div className="inline-block bg-slate-900 text-white text-xs font-bold px-4 py-1 rounded-full mt-2 print-bold">
                رزنامة سير الاختبارات الكتابية لنهاية التكوين
              </div>
            </div>

            {/* Session Info Details */}
            <div className="border border-slate-900 p-3 rounded-lg mb-4 text-xs leading-relaxed bg-slate-50/50">
              <div className="grid grid-cols-2 gap-2">
                <p><strong>الدورة التكوينية:</strong> {currentSession?.name}</p>
                <p><strong>الرتبة التكوينية:</strong> {specialty?.titleAr}</p>
                <p><strong>السنة التكوينية:</strong> <span dir="ltr">{formatAcademicYear(currentSession?.academicYear)}</span></p>
                <p><strong>فترة الامتحانات:</strong> من {formatArabicDate(currentSession?.examStartDate || currentSession?.startDate)} إلى {formatArabicDate(currentSession?.examEndDate || currentSession?.endDate)}</p>
              </div>
            </div>

            {/* Official Table */}
            <table className="w-full text-right text-xs border-collapse border-2 border-slate-900 mb-6">
              <thead>
                <tr className="bg-slate-200 text-slate-950 border-b-2 border-slate-900 font-bold text-center">
                  <th className="border-r border-slate-900 p-2 w-10">#</th>
                  <th className="border-r border-slate-900 p-2 w-28">اليوم والتاريخ</th>
                  <th className="border-r border-slate-900 p-2 w-24">الفترة</th>
                  <th className="border-r border-slate-900 p-2 w-28">التوقيت</th>
                  <th className="border-r border-slate-900 p-2">مقياس الاختبار</th>
                  <th className="border-r border-slate-900 p-2 w-14 text-center">المعامل</th>
                  <th className="border-r border-slate-900 p-2 w-16 text-center">المدة</th>
                  <th className="p-2 w-32">قاعات الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {timetable.map((slot, idx) => {
                  const mod = modules.find(m => m.id === slot.moduleId);
                  const isMorning = slot.sessionTime === 'morning';

                  return (
                    <tr key={slot.id} className="border-b border-slate-400">
                      <td className="border-r border-slate-400 p-2 text-center font-bold">{idx + 1}</td>
                      <td className="border-r border-slate-400 p-2 font-bold font-mono">{formatArabicDate(slot.date)}</td>
                      <td className="border-r border-slate-400 p-2 text-center">
                        {isMorning ? 'صباحية' : 'مسائية'}
                      </td>
                      <td className="border-r border-slate-400 p-2 font-mono text-center">{slot.timeRange}</td>
                      <td className="border-r border-slate-400 p-2 font-bold">{mod?.titleAr}</td>
                      <td className="border-r border-slate-400 p-2 text-center font-bold">{mod?.coefficient}</td>
                      <td className="border-r border-slate-400 p-2 text-center">{mod ? mod.durationMinutes / 60 : 3} سا</td>
                      <td className="p-2 text-[10px]">
                        {rooms.map(r => r.name).join(' ، ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Official Administrative Stamp & Signatures */}
            <div className="grid grid-cols-2 gap-8 text-center text-xs mt-8 pt-4">
              <div>
                <p className="font-bold text-slate-800">رئيس مصلحة تنظيم سير المسابقات والإمتحانات</p>
                <div className="h-16"></div>
                <p className="text-[11px] text-slate-600">(الختم والتأشيرة)</p>
              </div>

              <div>
                <p className="font-bold text-slate-800">مدير المعهد الوطني</p>
                <div className="h-16"></div>
                <p className="font-bold text-slate-950">{INSTITUTION.director}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINT TEMPLATE 2: PROCTORING MASTER SCHEDULE (جدول تسخير الأساتذة للحراسة) */}
      {/* ========================================================================= */}
      {activeTab === 'print_master_proctors' && (
        <div className="space-y-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 bg-slate-900 text-white p-3.5 rounded-xl no-print shadow-md">
            <span className="text-xs font-bold text-amber-300">
              معاينة طباعة: جدول تسخير الأساتذة للحراسة وتأطير القاعات
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const masterProctorsTitle = `جدول_تسخير_الأساتذة_للحراسة_العام_${specialty?.titleAr || 'الامتحانات'}_${formatArabicDate(currentSession?.examStartDate || new Date())}`;
                  triggerPrintWithDynamicTitle(masterProctorsTitle);
                }}
                className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الجدول العام</span>
              </button>
              <button
                onClick={() => setActiveTab('timetable')}
                className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>

          <div className="print-document max-w-[950px] mx-auto bg-white border-2 border-slate-900 p-8 shadow-xl font-simplified-arabic text-black print:shadow-none print:border-none print:p-0">
            {/* 5-Line Official Ministerial Header */}
            <div className="text-center border-b-2 border-slate-900 pb-3 mb-4 leading-snug">
              <p className="text-xs font-bold text-slate-900">{INSTITUTION.republic}</p>
              <p className="text-xs font-bold text-slate-900">{INSTITUTION.ministry}</p>
              <h1 className="text-sm md:text-base font-bold text-slate-950 mt-0.5 print-bold">
                {INSTITUTION.name}
              </h1>
              <p className="text-xs font-semibold text-slate-800 mt-0.5">
                {INSTITUTION.deputyDirectorate}
              </p>
              <p className="text-xs font-bold text-slate-900 mt-0.5 print-bold">
                {INSTITUTION.service}
              </p>
              <div className="inline-block bg-slate-900 text-white text-xs font-bold px-4 py-1 rounded-full mt-2 print-bold">
                جدول تسخير الأساتذة والمؤطرين لحراسة الاختبارات الكتابية
              </div>
            </div>

            {/* Master Matrix */}
            <table className="w-full text-right text-xs border-collapse border-2 border-slate-900 mb-6">
              <thead>
                <tr className="bg-slate-200 text-slate-950 border-b-2 border-slate-900 font-bold text-center">
                  <th className="border-r border-slate-900 p-2 w-10">#</th>
                  <th className="border-r border-slate-900 p-2 w-28">التاريخ</th>
                  <th className="border-r border-slate-900 p-2 w-24">الفترة</th>
                  <th className="border-r border-slate-900 p-2 w-44">المقياس</th>
                  <th className="border-r border-slate-900 p-2 w-32">قاعة الإجراء</th>
                  <th className="p-2">الأساتذة الحراس المسخرون (حارسان لكل قاعة)</th>
                </tr>
              </thead>
              <tbody>
                {timetable.flatMap((slot, sIdx) => {
                  const mod = modules.find(m => m.id === slot.moduleId);
                  return slot.roomAllocations.map((alloc, rIdx) => {
                    const roomObj = rooms.find(r => r.id === alloc.roomId);
                    const assignedNames = alloc.proctorIds.map(pid => proctors.find(p => p.id === pid)?.fullName).filter(Boolean);

                    return (
                      <tr key={`${slot.id}_${alloc.roomId}`} className="border-b border-slate-400">
                        <td className="border-r border-slate-400 p-2 text-center">{sIdx + 1}.{rIdx + 1}</td>
                        <td className="border-r border-slate-400 p-2 font-bold font-mono">{formatArabicDate(slot.date)}</td>
                        <td className="border-r border-slate-400 p-2 text-center">
                          {slot.sessionTime === 'morning' ? 'صباحاً (08:30)' : 'مساءً (14:00)'}
                        </td>
                        <td className="border-r border-slate-400 p-2 font-bold">{mod?.titleAr}</td>
                        <td className="border-r border-slate-400 p-2 font-bold text-slate-800">{roomObj?.name}</td>
                        <td className="p-2 font-bold text-slate-900">
                          {assignedNames.length > 0 ? assignedNames.join('  •  ') : '—'}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>

            {/* Official Signatures */}
            <div className="grid grid-cols-2 gap-8 text-center text-xs mt-8 pt-4">
              <div>
                <p className="font-bold text-slate-800">رئيس مصلحة تنظيم سير المسابقات والإمتحانات</p>
                <div className="h-16"></div>
                <p className="text-[11px] text-slate-600">(التأشيرة والختم)</p>
              </div>

              <div>
                <p className="font-bold text-slate-800">مدير المعهد الوطني</p>
                <div className="h-16"></div>
                <p className="font-bold text-slate-950">{INSTITUTION.director}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINT TEMPLATE 3: INDIVIDUAL SUMMONS (استدعاء الحراسة الفردي)             */}
      {/* ========================================================================= */}
      {activeTab === 'print_summons' && (
        <div className="space-y-4">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-3.5 rounded-xl no-print shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-300">اختيار الأستاذ للاستدعاء:</span>
              <select
                value={selectedProctorIdForSummons}
                onChange={(e) => setSelectedProctorIdForSummons(e.target.value)}
                className="bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none"
              >
                {proctors.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.institution})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const proctorName = selectedProctor?.fullName?.trim().replace(/[\s/]/g, '_') || 'أستاذ_حارس';
                  const summonTitle = `استدعاء_تسخير_حراسة_${proctorName}_${formatArabicDate(new Date())}`;
                  triggerPrintWithDynamicTitle(summonTitle);
                }}
                className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الاستدعاء الفردي</span>
              </button>
              <button
                onClick={() => setActiveTab('timetable')}
                className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>

          {selectedProctor ? (
            <div className="print-document max-w-[800px] mx-auto bg-white border-2 border-slate-900 p-8 shadow-xl font-simplified-arabic text-black print:shadow-none print:border-none print:p-0">
              {/* 5-Line Official Ministerial Header */}
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-4 leading-snug">
                <p className="text-xs font-bold text-slate-900">{INSTITUTION.republic}</p>
                <p className="text-xs font-bold text-slate-900">{INSTITUTION.ministry}</p>
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
                  استدعاء لتأطير وحراسة الاختبارات الكتابية
                </div>
              </div>

              {/* Administrative Reference and Subject */}
              <div className="my-4 border-2 border-slate-800 rounded-lg p-4 bg-slate-50/40 text-xs leading-relaxed space-y-1.5">
                <div className="flex justify-between">
                  <p><strong>الرقم الترتيبي:</strong> <span className="font-mono">INFPE/EXAM/{new Date().getFullYear()}/{selectedProctor.id.slice(-4)}</span></p>
                  <p><strong>الأغواط في:</strong> <span className="font-mono">{formatArabicDate(new Date())}</span></p>
                </div>
                <p className="text-sm font-bold text-slate-950 mt-2">
                  إلى السيد(ة): <span className="text-orange-950 underline">{selectedProctor.fullName}</span>
                </p>
                <p><strong>المؤسسة الأصلية / الرتبة:</strong> {selectedProctor.institution} — {selectedProctor.specialty}</p>
              </div>

              {/* Formal Summon Body */}
              <div className="my-4 text-xs leading-loose text-justify text-slate-900">
                <p>
                  يشرفني أن أنهي إلى علمكم أنه قد تم تسخيركم رسمياً من قِبل إدارة المعهد للمشاركة في تأطير وحراسة الاختبارات الكتابية لـ: <strong>{specialty?.titleAr}</strong>، لدورة: <strong>{currentSession?.name}</strong>، وذلك طبقاً للجدول الزمني المفصل أدناه:
                </p>
              </div>

              {/* Assigned Sessions Table */}
              <table className="w-full text-right text-xs border-collapse border-2 border-slate-900 my-4">
                <thead>
                  <tr className="bg-slate-200 text-slate-950 border-b-2 border-slate-900 font-bold text-center">
                    <th className="border-r border-slate-900 p-2 w-10">#</th>
                    <th className="border-r border-slate-900 p-2 w-28">اليوم والتاريخ</th>
                    <th className="border-r border-slate-900 p-2 w-24">الفترة والتوقيت</th>
                    <th className="border-r border-slate-900 p-2">مقياس الاختبار</th>
                    <th className="border-r border-slate-900 p-2 w-32">قاعة الإجراء</th>
                    <th className="p-2 w-36">الأستاذ المرافق (الحارس 2)</th>
                  </tr>
                </thead>
                <tbody>
                  {proctorAssignedSlots.length > 0 ? (
                    proctorAssignedSlots.map((item, iIdx) => (
                      <tr key={iIdx} className="border-b border-slate-400">
                        <td className="border-r border-slate-400 p-2 text-center font-bold">{iIdx + 1}</td>
                        <td className="border-r border-slate-400 p-2 font-bold font-mono">{formatArabicDate(item.slot.date)}</td>
                        <td className="border-r border-slate-400 p-2 text-center font-mono">
                          {item.slot.timeRange}
                        </td>
                        <td className="border-r border-slate-400 p-2 font-bold">{item.module?.titleAr}</td>
                        <td className="border-r border-slate-400 p-2 font-bold text-slate-900">{item.room?.name}</td>
                        <td className="p-2 text-slate-800">{item.coProctorName}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-500">
                        لم يتم تعيين أي فترات حراسة لهذا الأستاذ في الجدول الحالي.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Strict Exam Instructions */}
              <div className="bg-amber-50/70 border border-amber-300 rounded-lg p-3 text-[11px] leading-relaxed text-amber-950 my-4">
                <p className="font-bold underline mb-1">تعليمات وتوجيهات تنظيمية هامة:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>الحضور إلى مركز الامتحان نصف ساعة (30 دقيقة) قبل انطلاق الاختبار لاستلام أوراق الأسئلة والإجابة.</li>
                  <li>التأكد الصارم من هوية المترشحين، وتوقيعهم على قسيمة الحضور باللسان القابل للقص.</li>
                  <li>يُمنع منعاً باتاً إدخال أو استخدام الهواتف النقالة داخل قاعات الإجراء سواء للمترشحين أو المؤطرين.</li>
                  <li>تسليم أوراق الإجابات مرتبة عددياً لمصلحة تنظيم سير الامتحانات فور انتهاء الفترة المحددة.</li>
                </ul>
              </div>

              {/* Official Signatures */}
              <div className="grid grid-cols-2 gap-8 text-center text-xs mt-8 pt-4">
                <div>
                  <p className="font-bold text-slate-800">رئيس مصلحة تنظيم سير المسابقات والإمتحانات</p>
                  <div className="h-16"></div>
                  <p className="text-[11px] text-slate-600">(التأشيرة والختم)</p>
                </div>

                <div>
                  <p className="font-bold text-slate-800">مدير المعهد الوطني</p>
                  <div className="h-16"></div>
                  <p className="font-bold text-slate-950">{INSTITUTION.director}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ADD PROCTOR MODAL */}
      {showAddProctorModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-orange-600" />
              <span>إضافة أستاذ حارس جديد</span>
            </h3>

            <form onSubmit={handleAddProctor} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">الاسم واللقب:</label>
                <input
                  type="text"
                  required
                  value={newProctorName}
                  onChange={(e) => setNewProctorName(e.target.value)}
                  placeholder="مثال: أ. لخضر بلعربي"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المؤسسة الأصلية:</label>
                <input
                  type="text"
                  value={newProctorInstitution}
                  onChange={(e) => setNewProctorInstitution(e.target.value)}
                  placeholder="المعهد الوطني بالأغواط أو مفتشية التربية"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم الهاتف:</label>
                  <input
                    type="text"
                    value={newProctorPhone}
                    onChange={(e) => setNewProctorPhone(e.target.value)}
                    placeholder="0661000000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">التخصص / المادة:</label>
                  <input
                    type="text"
                    value={newProctorSpecialty}
                    onChange={(e) => setNewProctorSpecialty(e.target.value)}
                    placeholder="التشريع / الإدارة..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddProctorModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                >
                  حفظ وتأكيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
