import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Search, 
  Filter, 
  Printer, 
  Check, 
  Trash2, 
  Edit2,
  Calendar,
  MapPin,
  Building2
} from 'lucide-react';
import type { Candidate } from '../utils/crypto-anonymat';
import type { AppDatabaseState } from '../db/sqlite-manager';
import { generateCandidateTemplateExcel, parseCandidatesExcel } from '../utils/excel-handler';
import { formatArabicDate } from '../utils/date-formatter';
import { 
  generateRegistrationNumber,
  getNextRegistrationNumber, 
  parseRegistrationNumber, 
  validateRegistrationNumber, 
  getRankNumericCode, 
  DEFAULT_INSTITUTE_WILAYA_CODE 
} from '../utils/registration-number';

interface CandidatesViewProps {
  dbState: AppDatabaseState;
  onUpdateCandidates: (candidates: Candidate[]) => void;
  onAddAuditLog: (action: string, details: string, severity?: 'info' | 'warning' | 'security') => void;
}

export const CandidatesView: React.FC<CandidatesViewProps> = ({
  dbState,
  onUpdateCandidates,
  onAddAuditLog
}) => {
  const currentSession = dbState.sessions.find(s => s.id === dbState.currentSessionId) || dbState.sessions[0];
  const specialty = dbState.specialties.find(sp => sp.id === currentSession?.specialtyId);
  const candidates = dbState.candidates.filter(c => c.specialtyId === currentSession?.specialtyId);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);

  // New Candidate Form State with 9 official administrative fields
  const [formData, setFormData] = useState({
    registrationNumber: '',
    fullName: '',
    corps: 'سلك موظفي الإدارة والتسيير',
    rankName: specialty?.titleAr || 'مدير مدرسة ابتدائية',
    specialtyField: 'إدارة وتسيير المؤسسات التربوية',
    birthDate: '1985-01-01',
    birthCommune: 'الأغواط',
    birthWilaya: 'الأغواط (03)',
    birthPlace: 'الأغواط',
    candidateWilaya: 'الأغواط (03)',
    gender: 'ذكر' as 'ذكر' | 'أنثى',
    groupNumber: 'الفوج 01',
    roomNumber: 'مدرج الشيخ زاهية'
  });

  // Extract unique rooms and groups
  const rooms = Array.from(new Set(candidates.map(c => c.roomNumber))).filter(Boolean);
  const groups = Array.from(new Set(candidates.map(c => c.groupNumber))).filter(Boolean);

  // Filter candidates
  const filteredCandidates = candidates.filter(cand => {
    const matchesSearch = 
      cand.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cand.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cand.birthPlace && cand.birthPlace.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cand.candidateWilaya && cand.candidateWilaya.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cand.specialtyField && cand.specialtyField.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRoom = selectedRoom === 'all' || cand.roomNumber === selectedRoom;
    const matchesGroup = selectedGroup === 'all' || cand.groupNumber === selectedGroup;

    return matchesSearch && matchesRoom && matchesGroup;
  });

  // Handle Excel Template Download
  const handleDownloadTemplate = () => {
    const buffer = generateCandidateTemplateExcel(
      specialty?.titleAr || 'المترشحين',
      currentSession?.specialtyId,
      currentSession?.wilayaCode || DEFAULT_INSTITUTE_WILAYA_CODE
    );
    const blob = new Blob([buffer.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `قالب_استيراد_مترشحي_المعهد_الرسمي_9_أعمدة.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    onAddAuditLog('تنزيل قالب إكسل', 'تم تنزيل نموذج استيراد المترشحين الرسمي (9 أعمدة) بصيغة XLSX');
  };

  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Handle Excel Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as ArrayBuffer;
      try {
        const res = parseCandidatesExcel(data, currentSession?.specialtyId, currentSession?.academicYear, dbState.candidates);
        const imported = res.candidates;
        if (imported.length > 0) {
          const updated = [...dbState.candidates, ...imported];
          onUpdateCandidates(updated);
          onAddAuditLog('استيراد إكسل محلي', `تم استيراد ${imported.length} متكون بنجاح من ملف ${file.name}`);
          setNotification({
            type: 'success',
            message: `تم بنجاح استيراد ${imported.length} متكون وفق النموذج الرسمي المعتمد (9 أعمدة) وتخزينهم في قاعدة البيانات!`
          });
        } else {
          setNotification({
            type: 'error',
            message: 'لم يتم العثور على أي بيانات صالحة في الملف المرفق. تأكد من مطابقة النموذج الرسمي ذي الأعمدة التسعة.'
          });
        }
      } catch (err) {
        console.error(err);
        setNotification({
          type: 'error',
          message: 'حدث خطأ أثناء قراءة ملف الإكسل.'
        });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Save new or edited candidate
  const handleSaveCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.registrationNumber.trim()) {
      setNotification({
        type: 'error',
        message: 'يرجى ملء الاسم الكامل ورقم التسجيل.'
      });
      return;
    }

    const birthPlaceCombined = formData.birthCommune && formData.birthWilaya
      ? `${formData.birthCommune} (${formData.birthWilaya})`
      : (formData.birthPlace || formData.birthCommune || 'الأغواط');

    if (editingCandidate) {
      const updated = dbState.candidates.map(c => 
        c.id === editingCandidate.id 
          ? { 
              ...c, 
              ...formData, 
              birthPlace: birthPlaceCombined,
              wilaya: formData.candidateWilaya || c.wilaya 
            }
          : c
      );
      onUpdateCandidates(updated);
      onAddAuditLog('تعديل مترشح', `تم تعديل بيانات المتكون: ${formData.fullName}`);
      setNotification({
        type: 'success',
        message: `تم تعديل بيانات المتكون: ${formData.fullName}`
      });
    } else {
      const newCand: Candidate = {
        id: `cand_${Date.now()}`,
        registrationNumber: formData.registrationNumber,
        fullName: formData.fullName,
        corps: formData.corps,
        rankName: formData.rankName || specialty?.titleAr,
        specialtyField: formData.specialtyField,
        birthDate: formData.birthDate,
        birthCommune: formData.birthCommune,
        birthWilaya: formData.birthWilaya,
        birthPlace: birthPlaceCombined,
        candidateWilaya: formData.candidateWilaya,
        wilaya: formData.candidateWilaya,
        gender: formData.gender,
        specialtyId: currentSession?.specialtyId || 'dir_sec',
        promotionYear: currentSession?.academicYear || '2024-2025',
        groupNumber: formData.groupNumber,
        roomNumber: formData.roomNumber,
        attendanceStatus: 'present'
      };
      onUpdateCandidates([...dbState.candidates, newCand]);
      onAddAuditLog('إضافة مترشح', `تم تسجيل المتكون الجديد: ${formData.fullName}`);
      setNotification({
        type: 'success',
        message: `تم تسجيل المتكون الجديد: ${formData.fullName}`
      });
    }

    setIsAddModalOpen(false);
    setEditingCandidate(null);
  };

  const handleDeleteCandidate = (id: string, name: string) => {
    const updated = dbState.candidates.filter(c => c.id !== id);
    onUpdateCandidates(updated);
    onAddAuditLog('حذف مترشح', `تم حذف المترشح: ${name}`, 'warning');
    setNotification({
      type: 'info',
      message: `تم حذف المترشح "${name}" من سجل الدورة.`
    });
  };

  const handlePrintAttendance = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between ${
          notification.type === 'success'
            ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
            : notification.type === 'error'
            ? 'bg-rose-100 text-rose-950 border-rose-300'
            : 'bg-blue-100 text-blue-950 border-blue-300'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-slate-600 hover:text-slate-900 px-2 font-black">✕</button>
        </div>
      )}

      {/* Top Header & Toolbar */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 font-cairo">
              سجل المترشحين للدورة — {specialty?.titleAr}
            </h2>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {candidates.length} مترشح
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة وتأطير المترشحين، إدخال أرقام التسجيل يدوياً، واستيراد القوائم الرسمية من ملفات Excel المعتمدة.
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[11px] bg-slate-100 text-slate-700 font-mono px-2.5 py-0.5 rounded border border-slate-300">
              نظام رقم التسجيل الرسمي (8 أرقام): ولاية المعهد ({currentSession?.wilayaCode || DEFAULT_INSTITUTE_WILAYA_CODE}) + رمز الرتبة ({getRankNumericCode(currentSession?.specialtyId)}) + تسلسل ({generateRegistrationNumber(currentSession?.wilayaCode || DEFAULT_INSTITUTE_WILAYA_CODE, getRankNumericCode(currentSession?.specialtyId), 1).slice(4)}...)
            </span>
            <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded">
              مثال: {generateRegistrationNumber(currentSession?.wilayaCode || DEFAULT_INSTITUTE_WILAYA_CODE, getRankNumericCode(currentSession?.specialtyId), 1)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Excel Template Button - 3D Tactile */}
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 border-b-4 border-b-slate-400 shadow-[0_3px_0_#94a3b8] active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-700" />
            <span>تحميل نموذج Excel الرسمي (9 أعمدة)</span>
          </button>

          {/* Import Excel - 3D Tactile */}
          <label className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold border-t border-emerald-400/30 border-b-4 border-b-emerald-900 shadow-[0_4px_0_#064e3b] active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>استيراد ملف Excel</span>
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload} 
              className="hidden" 
            />
          </label>

          {/* Add Candidate Button - 3D Tactile */}
          <button
            onClick={() => {
              const nextReg = getNextRegistrationNumber(
                dbState.candidates,
                currentSession?.specialtyId || 'dir_sec',
                currentSession?.wilayaCode || DEFAULT_INSTITUTE_WILAYA_CODE
              );
              setEditingCandidate(null);
              setFormData({
                registrationNumber: nextReg,
                fullName: '',
                corps: 'سلك موظفي الإدارة والتسيير',
                rankName: specialty?.titleAr || 'مدير مدرسة ابتدائية',
                specialtyField: 'إدارة وتسيير المؤسسات التربوية',
                birthDate: '1985-01-01',
                birthCommune: 'الأغواط',
                birthWilaya: 'الأغواط (03)',
                birthPlace: 'الأغواط',
                candidateWilaya: 'الأغواط (03)',
                gender: 'ذكر',
                groupNumber: 'الفوج 01',
                roomNumber: 'مدرج الشيخ زاهية'
              });
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold border-t border-amber-300/40 border-b-4 border-b-orange-950 shadow-[0_4px_0_#9a3412] active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-amber-200" />
            <span>إضافة متكون يدوي</span>
          </button>

          {/* Print Attendance - 3D Tactile */}
          <button
            onClick={handlePrintAttendance}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold border-t border-slate-600 border-b-4 border-b-slate-950 shadow-[0_3px_0_#0f172a] active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة قائمة الحضور</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="بحث بالاسم، رقم التسجيل، الولاية، أو مكان الميلاد..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>القاعة:</span>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="py-1 px-2 text-xs rounded-md border border-slate-300 bg-white"
            >
              <option value="all">جميع القاعات ({candidates.length})</option>
              {rooms.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>الفوج:</span>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="py-1 px-2 text-xs rounded-md border border-slate-300 bg-white"
            >
              <option value="all">جميع الأفواج</option>
              {groups.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Candidate Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-3">رقم التسجيل (8 أرقام)</th>
                <th className="py-3 px-4">إسم ولقب المتكون / الهيكل الإداري</th>
                <th className="py-3 px-3">تاريخ ومكان الميلاد</th>
                <th className="py-3 px-3">ولاية المترشح والجنس</th>
                <th className="py-3 px-3">الفوج والقاعة</th>
                <th className="py-3 px-3 text-center">حالة الحضور</th>
                <th className="py-3 px-3 text-center no-print">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    لا يوجد أي مترشح مطابق لمعايير البحث.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((cand, idx) => (
                  <tr key={cand.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      <span className="bg-orange-50 text-orange-950 px-2 py-0.5 rounded border border-orange-200">
                        {cand.registrationNumber}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 text-sm">
                      <div>{cand.fullName}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {cand.corps && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-normal border border-slate-200">
                            {cand.corps}
                          </span>
                        )}
                        {cand.specialtyField && (
                          <span className="text-[10px] bg-sky-50 text-sky-800 px-1.5 py-0.2 rounded font-normal border border-sky-200">
                            {cand.specialtyField}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-mono">
                      <div>{formatArabicDate(cand.birthDate)}</div>
                      <div className="text-[11px] text-slate-500 font-sans">
                        {cand.birthCommune ? `${cand.birthCommune} (${cand.birthWilaya || ''})` : cand.birthPlace}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      <div className="font-semibold">{cand.candidateWilaya || cand.wilaya || 'الأغواط'}</div>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        cand.gender === 'أنثى' ? 'bg-pink-100 text-pink-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {cand.gender || 'ذكر'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      <div className="font-medium text-slate-900">{cand.groupNumber}</div>
                      <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px] border border-slate-200">
                        {cand.roomNumber}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => {
                          const updated = dbState.candidates.map(c => 
                            c.id === cand.id 
                              ? { ...c, attendanceStatus: c.attendanceStatus === 'absent' ? 'present' : 'absent' } as Candidate
                              : c
                          );
                          onUpdateCandidates(updated);
                        }}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                          cand.attendanceStatus === 'absent'
                            ? 'bg-rose-50 text-rose-700 border-rose-300'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        }`}
                        title="انقر لتغيير حالة الحضور"
                      >
                        {cand.attendanceStatus === 'absent' ? 'غائب' : 'حاضر'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-center no-print">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCandidate(cand);
                            setFormData({
                              registrationNumber: cand.registrationNumber,
                              fullName: cand.fullName,
                              corps: cand.corps || 'سلك موظفي الإدارة والتسيير',
                              rankName: cand.rankName || specialty?.titleAr || 'مدير مدرسة ابتدائية',
                              specialtyField: cand.specialtyField || 'إدارة وتسيير المؤسسات التربوية',
                              birthDate: cand.birthDate,
                              birthCommune: cand.birthCommune || cand.birthPlace,
                              birthWilaya: cand.birthWilaya || 'الأغواط (03)',
                              birthPlace: cand.birthPlace,
                              candidateWilaya: cand.candidateWilaya || cand.wilaya || 'الأغواط (03)',
                              gender: (cand.gender === 'أنثى' ? 'أنثى' : 'ذكر'),
                              groupNumber: cand.groupNumber,
                              roomNumber: cand.roomNumber
                            });
                            setIsAddModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-orange-600 rounded-lg hover:bg-orange-50 transition"
                          title="تعديل بيانات المتكون"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCandidate(cand.id, cand.fullName)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Candidate Modal with 9 official fields */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-4 flex items-center justify-between border-b border-slate-700">
              <div>
                <h3 className="font-bold text-base font-cairo">
                  {editingCandidate ? 'تعديل بيانات المتكون المعتمدة' : 'تسجيل متكون جديد (النموذج الرسمي المعتمد 9 أعمدة)'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  تتوافق كافة الحقول مع مصفوفة ملف إكسل الرسمي للهيكل الإداري والوظيفي
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCandidate} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Row 1: Corps, Rank, Specialty */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">السلك *</label>
                  <input
                    type="text"
                    required
                    placeholder="سلك موظفي الإدارة والتسيير"
                    value={formData.corps}
                    onChange={(e) => setFormData({ ...formData, corps: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">الرتبة *</label>
                  <input
                    type="text"
                    required
                    placeholder="مدير مدرسة ابتدائية"
                    value={formData.rankName}
                    onChange={(e) => setFormData({ ...formData, rankName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">التخصص</label>
                  <input
                    type="text"
                    placeholder="إدارة وتسيير المؤسسات التربوية"
                    value={formData.specialtyField}
                    onChange={(e) => setFormData({ ...formData, specialtyField: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                  />
                </div>
              </div>

              {/* Row 2: Full Name & Registration Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">إسم ولقب المتكون *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: بن عيسى مصطفى بن لخضر"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">رقم التسجيل الرسمي (8 أرقام) *</label>
                    <button
                      type="button"
                      onClick={() => {
                        const nextReg = getNextRegistrationNumber(
                          dbState.candidates,
                          currentSession?.specialtyId || 'dir_sec',
                          currentSession?.wilayaCode || DEFAULT_INSTITUTE_WILAYA_CODE
                        );
                        setFormData({ ...formData, registrationNumber: nextReg });
                      }}
                      className="text-[10px] text-orange-700 hover:text-orange-900 bg-orange-50 hover:bg-orange-100 border border-orange-300 px-2 py-0.5 rounded font-bold transition cursor-pointer"
                      title="توليد الرقم التالي آلياً"
                    >
                      توليد الرقم التالي
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="03010001"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.trim() })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 tracking-wider"
                  />
                  {/* Structure Breakdown Pill */}
                  {(() => {
                    const parsed = parseRegistrationNumber(formData.registrationNumber);
                    const isValid = formData.registrationNumber.length === 8 && /^\d+$/.test(formData.registrationNumber);
                    return (
                      <div className="mt-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] flex items-center justify-between">
                        <div className="flex items-center gap-1 font-mono">
                          <span className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold" title="رمز ولاية المعهد">
                            ولاية: {parsed?.wilayaCode || '03'}
                          </span>
                          <span className="text-slate-400">+</span>
                          <span className="bg-orange-100 text-orange-900 px-1.5 py-0.5 rounded font-bold" title="رمز الرتبة">
                            رتبة: {parsed?.rankCode || getRankNumericCode(currentSession?.specialtyId)}
                          </span>
                          <span className="text-slate-400">+</span>
                          <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-bold" title="الرقم التسلسلي">
                            تسلسل: {parsed?.sequenceString || '0001'}
                          </span>
                        </div>
                        <span className={`font-bold ${isValid ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {isValid ? 'صحيح ✓' : 'مطلوب 8 أرقام'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Row 3: Birth info, Wilaya, Gender */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تاريخ الميلاد *</label>
                  <input
                    type="date"
                    required
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">بلدية الميلاد</label>
                  <input
                    type="text"
                    placeholder="الأغواط"
                    value={formData.birthCommune}
                    onChange={(e) => setFormData({ ...formData, birthCommune: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ولاية الميلاد</label>
                  <input
                    type="text"
                    placeholder="الأغواط (03)"
                    value={formData.birthWilaya}
                    onChange={(e) => setFormData({ ...formData, birthWilaya: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ولاية المترشح</label>
                  <input
                    type="text"
                    placeholder="الأغواط (03)"
                    value={formData.candidateWilaya}
                    onChange={(e) => setFormData({ ...formData, candidateWilaya: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Row 4: Gender, Group, Room */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">الجنس</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'ذكر' | 'أنثى' })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">الفوج التكويني</label>
                  <input
                    type="text"
                    placeholder="الفوج 01"
                    value={formData.groupNumber}
                    onChange={(e) => setFormData({ ...formData, groupNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">قاعة الامتحان</label>
                  <input
                    type="text"
                    placeholder="مدرج الشيخ زاهية"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-bold border-b-4 border-b-orange-900 shadow-[0_4px_0_#9a3412] active:translate-y-0.5 active:border-b-2 transition-all cursor-pointer"
                >
                  حفظ المتكون في قاعدة البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
