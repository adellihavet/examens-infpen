import React, { useState } from 'react';
import { Printer, Tag, ShieldCheck, Scissors, Sparkles, Filter, CheckCircle2, AlertTriangle } from 'lucide-react';
import { generateBarcodeSvg } from '../utils/barcode';
import type { Candidate, ExamModule, AnonymatMapping } from '../utils/crypto-anonymat';
import { INSTITUTION } from '../constants/branding';
import { triggerPrintWithDynamicTitle } from '../utils/print-utils';

interface PrintAnonymatStickersProps {
  module: ExamModule;
  sessionTitle: string;
  specialtyTitle: string;
  mappings: AnonymatMapping[];
  candidates: Candidate[];
  onClose?: () => void;
}

export const PrintAnonymatStickers: React.FC<PrintAnonymatStickersProps> = ({
  module,
  sessionTitle,
  specialtyTitle,
  mappings,
  candidates,
  onClose
}) => {
  const [stickersPerPage, setStickersPerPage] = useState<number>(6); // 6 pairs per A4 page
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterRoom, setFilterRoom] = useState<string>('all');

  // Pair mapping with candidate info
  const pairs = mappings.map(mapping => {
    const candidate = candidates.find(c => c.id === mapping.candidateId);
    return {
      mapping,
      candidate
    };
  }).filter(item => {
    if (filterGroup !== 'all' && item.candidate?.groupNumber !== filterGroup) return false;
    if (filterRoom !== 'all' && item.candidate?.roomNumber !== filterRoom) return false;
    return true;
  });

  // Unique groups & rooms for filtering
  const groups = Array.from(new Set(candidates.map(c => c.groupNumber).filter(Boolean)));
  const rooms = Array.from(new Set(candidates.map(c => c.roomNumber).filter(Boolean)));

  return (
    <div className="bg-slate-100 min-h-screen p-4 md:p-8 print:p-0 print:bg-white text-slate-900" dir="rtl">
      {/* Top Controller Toolbar (Hidden on Print) */}
      <div className="max-w-5xl mx-auto mb-6 bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-lg no-print">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold font-cairo text-white">
              طباعة لواصق الإغفال المزدوجة بالباركود (Planches de Stickers d'Anonymat Jumeaux)
            </h2>
            <span className="bg-amber-500 text-slate-950 text-[10px] px-2 py-0.5 rounded font-black uppercase">
              سري للغاية
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {INSTITUTION.name} • {INSTITUTION.service}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Room Filter (Par Salle / Par Paquet) */}
          {rooms.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-lg text-xs">
              <span className="text-slate-400">القاعة / الظرف:</span>
              <select
                value={filterRoom}
                onChange={(e) => setFilterRoom(e.target.value)}
                className="bg-slate-900 text-white text-xs rounded border border-slate-700 px-2 py-1 focus:outline-none"
              >
                <option value="all">كل القاعات ({mappings.length})</option>
                {rooms.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          )}

          {/* Group Filter */}
          {groups.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-lg text-xs">
              <span className="text-slate-400">الفوج:</span>
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="bg-slate-900 text-white text-xs rounded border border-slate-700 px-2 py-1 focus:outline-none"
              >
                <option value="all">كل الأفواج</option>
                {groups.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => {
              const roomTag = filterRoom !== 'all' ? `_القاعة_${filterRoom.replace(/\s+/g, '_')}` : '_جميع_القاعات';
              const docTitle = `لواصق_الإغفال_المزدوجة_مقياس_${module.titleAr.replace(/\s+/g, '_')}${roomTag}`;
              triggerPrintWithDynamicTitle(docTitle);
            }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة اللواصق الآن</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              إغلاق
            </button>
          )}
        </div>
      </div>

      {/* Security Protocol Instructions Banner (Hidden on Print) */}
      <div className="max-w-5xl mx-auto mb-6 bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-950 no-print flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-amber-900">بروتوكول الأمانة لتثبيت اللواصق وفصل الألسنة:</h4>
          <ol className="list-decimal list-inside space-y-0.5 text-amber-800">
            <li>تُطبع هذه اللواصق على ورق لاصق ذاتي (Papier Autocollant A4).</li>
            <li>تُلصق <strong>القسيمة (أ)</strong> في المكان المخصص على لسان الهوية العلوي لورقة الإجابة.</li>
            <li>تُلصق <strong>القسيمة (ب)</strong> المطابقة في المكان المخصص على جسم ورقة الإجابة الموجه للمصحح.</li>
            <li>يقوم عون الأمانة بقص لسان الهوية عبر خط القص المنقط، وتُودع الألسنة فوراً في الخزنة الفولاذية لرئيس المركز.</li>
          </ol>
        </div>
      </div>

      {/* Printable Stickers Sheet Container with Simplified Arabic Typography */}
      <div className="print-document max-w-5xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg print:shadow-none print:p-0 border border-slate-300 print:border-none">
        {/* Printable Official 5-Line Header with Black Logo */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-2 mb-4 leading-snug">
          <div className="flex items-center justify-between">
            <div className="text-right flex-1">
              <p className="text-[10px] font-bold text-slate-700">{INSTITUTION.republic} — {INSTITUTION.ministry}</p>
              <p className="text-xs font-bold text-slate-950 print-bold">
                {INSTITUTION.name}
              </p>
              <p className="text-[10px] font-semibold text-slate-700">
                {INSTITUTION.deputyDirectorate} • {INSTITUTION.service}
              </p>
            </div>
            <div className="shrink-0 pl-3">
              <img 
                src={INSTITUTION.logoBlack} 
                alt="شعار المعهد" 
                className="h-12 w-auto object-contain filter contrast-125"
              />
            </div>
          </div>
          <p className="text-[11px] font-bold text-slate-900 mt-1 print-bold text-center border-t border-slate-300 pt-1">
            بطاقة لواصق الإغفال المزدوجة (Stickers d'Anonymat Jumeaux) • المقياس: {module.titleAr} ({module.code}) {filterRoom !== 'all' ? `• القاعة: ${filterRoom}` : ''}
          </p>
        </div>

        {/* Sticker Pairs Grid (2 Columns: Sticker A | Sticker B) */}
        <div className="space-y-4">
          {pairs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              لا توجد أرقام إغفال مولدة لهذا المقياس حتى الآن
            </div>
          ) : (
            pairs.map((item, index) => {
              const barcodeA = generateBarcodeSvg(item.mapping.anonymatCode, {
                height: 38,
                barWidth: 1.5,
                showText: false
              });

              const barcodeB = generateBarcodeSvg(item.mapping.anonymatCode, {
                height: 38,
                barWidth: 1.5,
                showText: false
              });

              return (
                <div 
                  key={item.mapping.anonymatCode}
                  className="border-2 border-dashed border-slate-400 rounded-xl p-3 bg-slate-50/60 print:bg-white flex flex-col md:flex-row items-center justify-between gap-3 page-break-inside-avoid"
                >
                  {/* Left Label: STICKER A (FOR IDENTITY FLAP) */}
                  <div className="flex-1 w-full border-2 border-slate-900 rounded-lg p-2.5 bg-white shadow-2xs relative">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-1.5">
                      <span className="text-[9px] font-black bg-slate-900 text-white px-2 py-0.5 rounded">
                        قسيمة (أ) — تُثبّت على لسان الهوية
                      </span>
                      <span className="text-[9px] font-mono-code font-bold text-slate-600">
                        #{index + 1} • {module.code}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      {/* Barcode SVG */}
                      <div 
                        className="p-1 bg-white border border-slate-200 rounded shrink-0"
                        dangerouslySetInnerHTML={{ __html: barcodeA }} 
                      />

                      {/* Secret Code & Verification */}
                      <div className="text-left space-y-0.5 font-mono-code">
                        <div className="text-base font-black text-slate-950 tracking-wider">
                          {item.mapping.anonymatCode}
                        </div>
                        <div className="text-[9px] text-slate-500">
                          SIG: <strong className="text-slate-800">{item.mapping.checksum}</strong>
                        </div>
                        <div className="text-[9px] text-emerald-800 font-bold truncate max-w-[130px]" title={item.candidate?.fullName}>
                          {item.candidate?.fullName}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cut icon between twin stickers */}
                  <div className="flex flex-col items-center justify-center text-slate-400 shrink-0 select-none">
                    <Scissors className="w-4 h-4 text-slate-500" />
                    <span className="text-[9px] font-mono-code font-bold">تطابق</span>
                  </div>

                  {/* Right Label: STICKER B (FOR ANSWER SHEET BODY) */}
                  <div className="flex-1 w-full border-2 border-slate-900 rounded-lg p-2.5 bg-white shadow-2xs relative">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-1.5">
                      <span className="text-[9px] font-black bg-emerald-800 text-white px-2 py-0.5 rounded">
                        قسيمة (ب) — تُثبّت على ورقة الإجابة
                      </span>
                      <span className="text-[9px] font-mono-code font-bold text-slate-600">
                        INFPE LAGHOUAT • {module.code}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      {/* Barcode SVG */}
                      <div 
                        className="p-1 bg-white border border-slate-200 rounded shrink-0"
                        dangerouslySetInnerHTML={{ __html: barcodeB }} 
                      />

                      {/* Secret Code & Verification (STRICTLY NO CANDIDATE NAME) */}
                      <div className="text-left space-y-0.5 font-mono-code">
                        <div className="text-base font-black text-slate-950 tracking-wider">
                          {item.mapping.anonymatCode}
                        </div>
                        <div className="text-[9px] text-slate-500">
                          SIG: <strong className="text-slate-800">{item.mapping.checksum}</strong>
                        </div>
                        <div className="text-[9px] text-slate-600 font-bold">
                          المقياس: {module.titleAr.split(' ')[0]}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Printable Footer */}
        <div className="mt-8 pt-4 border-t border-slate-300 hidden print:flex items-center justify-between text-[10px] text-slate-500 font-mono-code">
          <span>المعهد الوطني لتكوين موظفي قطاع التربية بالأغواط • لواصق مشفرة بخوارزمية غير خطية</span>
          <span>توقيع وختم رئيس مركز الامتحانات والتشفير: ............................................</span>
        </div>
      </div>
    </div>
  );
};
