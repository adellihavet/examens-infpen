import React, { useRef } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  ShieldCheck, 
  HardDrive, 
  AlertCircle, 
  CheckCircle2,
  FileCode,
  Layers
} from 'lucide-react';
import type { AppDatabaseState } from '../db/sqlite-manager';
import { OfflineStorageManager } from '../db/sqlite-manager';

interface DatabaseBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbState: AppDatabaseState;
  onReloadState: (newState: AppDatabaseState) => void;
}

export const DatabaseBackupModal: React.FC<DatabaseBackupModalProps> = ({
  isOpen,
  onClose,
  dbState,
  onReloadState
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = React.useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Export
  const handleExport = () => {
    const { filename, blob } = OfflineStorageManager.exportSqliteOrJsonDump();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    OfflineStorageManager.addAuditLog('تصدير قاعدة بيانات كاملة', `تم تصدير ملف النسخة الاحتياطية ${filename}`, 'security');
  };

  // Handle Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = OfflineStorageManager.importDump(content);
      if (success) {
        const loaded = OfflineStorageManager.load();
        onReloadState(loaded);
        setMsg('تمت استعادة قاعدة البيانات بنجاح وتحديث كافة السجلات!');
      } else {
        setMsg('فشل استيراد الملف. تأكد من سلامة ملف النسخة الاحتياطية.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Reset to Seed
  const handleResetToSeed = () => {
    OfflineStorageManager.resetToSeed();
    const loaded = OfflineStorageManager.load();
    onReloadState(loaded);
    setMsg('تمت استعادة التهيئة المبدئية وبيانات المعهد النموذجية بنجاح.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-600/30 text-emerald-400 border border-emerald-500/40">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base font-cairo">
                إدارة قاعدة بيانات SQLite المحلية والنسخ الاحتياطي
              </h3>
              <p className="text-[11px] text-slate-400">
                المستودع المحلي المستقل لمصلحة الامتحانات • INFPE Laghouat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs">
          {msg && (
            <div className="p-3 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg font-bold flex items-center justify-between">
              <span>{msg}</span>
              <button onClick={() => setMsg(null)} className="text-slate-600 hover:text-slate-900">✕</button>
            </div>
          )}

          {/* Storage stats */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="font-bold text-slate-800 text-xs mb-3 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-700" />
              <span>إحصائيات جداول وسجلات النظام المحلي (SQLite Storage):</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">المترشحون</span>
                <span className="text-base font-extrabold text-slate-900 font-mono-code">{dbState.candidates.length}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">أوراق التشفير</span>
                <span className="text-base font-extrabold text-emerald-800 font-mono-code">{dbState.anonymatMappings.length}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">سجلات النقاط</span>
                <span className="text-base font-extrabold text-blue-800 font-mono-code">{dbState.grades.length}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">سجلات التدقيق</span>
                <span className="text-base font-extrabold text-slate-900 font-mono-code">{dbState.auditLogs.length}</span>
              </div>
            </div>
          </div>

          {/* Backup Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Export */}
            <button
              onClick={handleExport}
              className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100/80 transition text-right group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs">
                  <Download className="w-4 h-4" />
                </div>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded">
                  تصدير آمن
                </span>
              </div>
              <h5 className="font-bold text-slate-900 text-xs">تصدير قاعدة البيانات كاملة</h5>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                حفظ ملف النسخة الاحتياطية (.sqlite.json) محلياً على جهاز الكمبيوتر أو مفتاح USB.
              </p>
            </button>

            {/* Import */}
            <label className="p-4 rounded-xl border border-blue-300 bg-blue-50/60 hover:bg-blue-100/80 transition text-right cursor-pointer group block">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-blue-600 text-white shadow-xs">
                  <Upload className="w-4 h-4" />
                </div>
                <span className="text-[10px] bg-blue-200 text-blue-900 font-bold px-2 py-0.5 rounded">
                  استعادة فورية
                </span>
              </div>
              <h5 className="font-bold text-slate-900 text-xs">استيراد نسخة احتياطية</h5>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                تحميل ملف قاعدة بيانات محفوظ سابقاً واسترجاع كافة التشفيرات والنقاط.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json, .sqlite"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Reset button */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={handleResetToSeed}
              className="text-rose-700 hover:text-rose-900 text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة ضبط المصنع وشحن بيانات المعهد النموذجية</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
