/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { SchedulerView } from './components/SchedulerView';
import { CandidatesView } from './components/CandidatesView';
import { AnonymatView } from './components/AnonymatView';
import { AnonymatGrading } from './components/AnonymatGrading';
import { DeliberationView } from './components/DeliberationView';
import { ExamBankView } from './components/ExamBankView';
import { PedagogicalGradingView } from './components/PedagogicalGradingView';
import { ExamProceedingsView } from './components/ExamProceedingsView';
import { ExamConductView } from './components/ExamConductView';
import { OfficialExamTemplateMaker } from './components/OfficialExamTemplateMaker';
import { DatabaseBackupModal } from './components/DatabaseBackupModal';
import { 
  OfflineStorageManager, 
  type AppDatabaseState,
  type ExamSubject,
  type ExamSession,
  type ProctorTeacher,
  type ExamRoom,
  type TimetableSlot,
  type InstitutionSettings
} from './db/sqlite-manager';
import type { Candidate, AnonymatMapping, GradeRecord } from './utils/crypto-anonymat';
import { generateAnonymatCodes } from './utils/crypto-anonymat';
import { INSTITUTION } from './constants/branding';

export default function App() {
  const [dbState, setDbState] = useState<AppDatabaseState>(() => OfflineStorageManager.load());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);

  // Sync state changes with local storage
  const updateStateAndSave = (updater: (prev: AppDatabaseState) => AppDatabaseState) => {
    setDbState(prev => {
      const updated = updater(prev);
      OfflineStorageManager.save(updated);
      return updated;
    });
  };

  const addAuditLog = (action: string, details: string, severity: 'info' | 'warning' | 'security' = 'info') => {
    OfflineStorageManager.addAuditLog(action, details, severity);
    setDbState(OfflineStorageManager.load());
  };

  const handleUpdateCandidates = (newCandidates: Candidate[]) => {
    updateStateAndSave(prev => ({
      ...prev,
      candidates: newCandidates
    }));
  };

  const handleUpdateAnonymat = (newMappings: AnonymatMapping[]) => {
    updateStateAndSave(prev => ({
      ...prev,
      anonymatMappings: newMappings,
      sessions: prev.sessions.map(s => 
        s.id === prev.currentSessionId ? { ...s, isAnonymatLocked: true } : s
      )
    }));
  };

  const handleUpdateGrades = (newGrades: GradeRecord[]) => {
    updateStateAndSave(prev => ({
      ...prev,
      grades: newGrades
    }));
  };

  const handleUpdateSubjects = (newSubjects: ExamSubject[]) => {
    updateStateAndSave(prev => ({
      ...prev,
      examSubjects: newSubjects
    }));
  };

  const handleUpdateSessionDecoding = (isDecoded: boolean) => {
    updateStateAndSave(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => 
        s.id === prev.currentSessionId 
          ? { ...s, isDecoded, decodingDate: isDecoded ? new Date().toISOString() : undefined }
          : s
      )
    }));
  };

  // One-click quick generation of anonymat from dashboard if empty
  const handleQuickGenerateAnonymat = () => {
    const currentSession = dbState.sessions.find(s => s.id === dbState.currentSessionId) || dbState.sessions[0];
    const sessionCandidates = dbState.candidates.filter(c => c.specialtyId === currentSession?.specialtyId);
    const sessionModules = dbState.modules.filter(m => m.specialtyId === currentSession?.specialtyId);

    if (sessionCandidates.length === 0 || sessionModules.length === 0) {
      addAuditLog('تنبيه', 'محاولة توليد تشفير بدون تسجيل مترشحين أو مقاييس كافية.', 'warning');
      setActiveTab('candidates');
      return;
    }

    const allMappings: AnonymatMapping[] = [];
    sessionModules.forEach(mod => {
      const modMappings = generateAnonymatCodes(sessionCandidates, mod.id, currentSession?.id, dbState.secretKey);
      allMappings.push(...modMappings);
    });

    handleUpdateAnonymat(allMappings);
    addAuditLog('توليد التشفير السريع', `تم تشفير ${allMappings.length} ورقة إجابة بكود غير خطي فريد.`, 'security');
    setActiveTab('anonymat');
  };

  const handleSwitchSpecialty = (specialtyId: string) => {
    const newState = OfflineStorageManager.switchOrCreateSessionForSpecialty(specialtyId);
    setDbState(newState);
    const spec = newState.specialties.find(s => s.id === specialtyId);
    addAuditLog('تبديل الرتبة / الفوج', `تم الانتقال إلى دراسة ومتابعة رتبة: ${spec?.titleAr || specialtyId}`, 'info');
  };

  const handleAddCandidates = (newCandidates: Candidate[]) => {
    updateStateAndSave(prev => ({
      ...prev,
      candidates: [...prev.candidates, ...newCandidates]
    }));
    addAuditLog('استيراد متكونين', `تم استيراد وتثبيت ${newCandidates.length} متكون بنجاح في قاعدة البيانات المحلية.`, 'info');
  };

  const handleUpdateSession = (updatedSession: ExamSession) => {
    updateStateAndSave(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => s.id === updatedSession.id ? updatedSession : s)
    }));
    addAuditLog('تحديث إعدادات الدورة', `تم تحديث بيانات السنة التكوينية والرزنامة (${updatedSession.name})`, 'info');
  };

  const handleUpdateProctors = (newProctors: ProctorTeacher[]) => {
    updateStateAndSave(prev => ({
      ...prev,
      proctors: newProctors
    }));
  };

  const handleUpdateRooms = (newRooms: ExamRoom[]) => {
    updateStateAndSave(prev => ({
      ...prev,
      rooms: newRooms
    }));
  };

  const handleUpdateTimetable = (newSlots: TimetableSlot[]) => {
    updateStateAndSave(prev => ({
      ...prev,
      timetable: newSlots
    }));
  };

  const handleUpdateInstitutionSettings = (settings: InstitutionSettings) => {
    updateStateAndSave(prev => ({
      ...prev,
      institutionSettings: settings,
      sessions: prev.sessions.map(s => 
        s.id === prev.currentSessionId 
          ? { ...s, presidentName: `${settings.directorName} (${settings.directorTitle})` }
          : s
      )
    }));
    addAuditLog('تحديث تأطير المركز', `تم تحديث اسم مدير المعهد (${settings.directorName}) وأعضاء أمانة المركز`, 'info');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans" dir="rtl">
      {/* Top Application Header */}
      <Header
        dbState={dbState}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onQuickPrint={() => window.print()}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
        {activeTab === 'dashboard' && (
          <Dashboard
            dbState={dbState}
            onNavigate={(tab) => setActiveTab(tab)}
            onGenerateAnonymat={handleQuickGenerateAnonymat}
            onSwitchSpecialty={handleSwitchSpecialty}
            onAddCandidates={handleAddCandidates}
            onUpdateSession={handleUpdateSession}
            onUpdateInstitutionSettings={handleUpdateInstitutionSettings}
          />
        )}

        {(activeTab === 'conduct' || activeTab === 'candidates' || activeTab === 'proceedings' || activeTab === 'scheduler') && (
          <ExamConductView
            dbState={dbState}
            initialSubTab={activeTab === 'scheduler' ? 'scheduler_proctors' : undefined}
            onUpdateCandidates={handleUpdateCandidates}
            onUpdateRooms={handleUpdateRooms}
            onUpdateSession={handleUpdateSession}
            onUpdateProctors={handleUpdateProctors}
            onUpdateTimetable={handleUpdateTimetable}
            onUpdateInstitutionSettings={handleUpdateInstitutionSettings}
            onAddAuditLog={addAuditLog}
            onSwitchSpecialty={handleSwitchSpecialty}
          />
        )}

        {(activeTab === 'exam_maker' || activeTab === 'bank') && (
          <OfficialExamTemplateMaker
            dbState={dbState}
            initialTab={activeTab === 'bank' ? 'bank' : 'editor'}
            onUpdateSubjects={handleUpdateSubjects}
            onAddAuditLog={addAuditLog}
          />
        )}

        {activeTab === 'pedagogical_grades' && (
          <PedagogicalGradingView
            dbState={dbState}
            onUpdateCandidates={handleUpdateCandidates}
            onAddAuditLog={addAuditLog}
            onSwitchSpecialty={handleSwitchSpecialty}
          />
        )}

        {(activeTab === 'anonymat' || activeTab === 'grades') && (
          <AnonymatView
            dbState={dbState}
            initialSubTab={activeTab === 'grades' ? 'grading_entry' : undefined}
            onUpdateAnonymat={handleUpdateAnonymat}
            onUpdateGrades={handleUpdateGrades}
            onAddAuditLog={addAuditLog}
          />
        )}

        {activeTab === 'deliberation' && (
          <DeliberationView
            dbState={dbState}
            onUpdateSession={handleUpdateSessionDecoding}
            onAddAuditLog={addAuditLog}
            onUpdateCandidates={handleUpdateCandidates}
          />
        )}
      </main>

      {/* Footer (Hidden on print) */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-4 px-6 border-t border-slate-800 text-center no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            {INSTITUTION.name} • {INSTITUTION.service} © {new Date().getFullYear()}
          </p>
          <p className="font-mono-code text-[11px] text-slate-500">
            نظام الامتحانات والمسابقات المهنية المستقل • بروتوكول ONEC • إصدار سطح المكتب (Offline SQLite)
          </p>
        </div>
      </footer>

      {/* Database Backup Modal */}
      <DatabaseBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        dbState={dbState}
        onReloadState={(newState) => setDbState(newState)}
      />
    </div>
  );
}
