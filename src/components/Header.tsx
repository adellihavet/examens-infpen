import React from 'react';
import { 
  ShieldCheck, 
  Database, 
  Download, 
  Upload, 
  Printer, 
  HelpCircle,
  FileCheck2,
  HardDrive
} from 'lucide-react';
import type { AppDatabaseState } from '../db/sqlite-manager';
import { INSTITUTION } from '../constants/branding';

interface HeaderProps {
  dbState: AppDatabaseState;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenBackupModal: () => void;
  onQuickPrint: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  dbState,
  activeTab,
  setActiveTab,
  onOpenBackupModal,
  onQuickPrint
}) => {
  const currentSession = dbState.sessions.find(s => s.id === dbState.currentSessionId) || dbState.sessions[0];
  const currentSpecialty = dbState.specialties.find(sp => sp.id === currentSession?.specialtyId) || dbState.specialties[0];

  const navItems = [
    { id: 'dashboard', label: 'لوحة القيادة' },
    { id: 'conduct', label: 'قسم الإجراء' },
    { id: 'exam_maker', label: 'مواضيع الامتحان' },
    { id: 'pedagogical_grades', label: 'المراقبة المستمرة والمذكرات' },
    { id: 'anonymat', label: 'التشفير وحجز النقاط المغفلة' },
    { id: 'deliberation', label: 'المداولات ومحاضر التخرج' }
  ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-0 z-30 no-print">
      {/* Top Ministerial & Institutional Strip */}
      <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <img 
            src={INSTITUTION.logoGold} 
            alt="INFPE" 
            className="w-4 h-4 object-contain filter drop-shadow-[0_1px_2px_rgba(245,158,11,0.4)]"
          />
          <span className="font-semibold text-slate-200">{INSTITUTION.republic} — {INSTITUTION.ministry}</span>
          <span className="hidden md:inline text-slate-500">|</span>
          <span className="hidden md:inline text-amber-300 font-medium">{INSTITUTION.name}</span>
        </div>

        <div className="flex items-center gap-3 mt-1 sm:mt-0">
          <button
            onClick={onOpenBackupModal}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg transition text-xs font-bold cursor-pointer"
            title="إدارة قاعدة البيانات والنسخ الاحتياطي"
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span>قاعدة البيانات</span>
          </button>
        </div>
      </div>

      {/* Main Bar with Institutional Logo & Info */}
      <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 via-amber-950/50 to-slate-950 flex items-center justify-center shadow-xl border border-amber-500/40 p-1 group">
            <img 
              src={INSTITUTION.logoGold} 
              alt="شعار المعهد الوطني" 
              className="w-full h-full object-contain filter drop-shadow-[0_2px_6px_rgba(245,158,11,0.35)] group-hover:scale-105 transition duration-300"
            />
            <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" title="النظام متصل ونشط" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold tracking-tight text-white font-cairo">
              {INSTITUTION.service}
            </h1>
            <p className="text-xs text-slate-400">
              <span className="text-amber-300/90 font-medium">{INSTITUTION.deputyDirectorate}</span> • 
              الدورة: <span className="text-slate-200 font-medium">{currentSession?.name}</span> • 
              الرتبة: <span className="text-orange-400 font-bold">{currentSpecialty?.titleAr}</span>
            </p>
          </div>
        </div>

        {/* 3D Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onQuickPrint}
            className="relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 border-t border-white/20 shadow-[0_3px_0_#0f172a,0_4px_6px_rgba(0,0,0,0.2)] hover:text-white active:translate-y-0.5 active:shadow-[0_1px_0_#0f172a] transition-all cursor-pointer select-none"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            <span>طباعة الصفحة</span>
          </button>

          <button
            onClick={onOpenBackupModal}
            className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-b from-orange-500 via-orange-600 to-orange-700 border-t border-white/30 shadow-[0_3px_0_#9a3412,0_4px_6px_rgba(0,0,0,0.2)] hover:brightness-105 active:translate-y-0.5 active:shadow-[0_1px_0_#9a3412] transition-all cursor-pointer select-none"
          >
            <Download className="w-3.5 h-3.5" />
            <span>نسخ احتياطي للقاعدة</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1 px-4 overflow-x-auto bg-slate-900/90 border-t border-slate-800">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'border-orange-500 text-orange-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <span>{item.label}</span>
              {item.id === 'anonymat' && dbState.anonymatMappings.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-orange-400"></span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
