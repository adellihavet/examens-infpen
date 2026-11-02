import React, { useState, useRef, useEffect } from 'react';
import { 
  FileEdit, 
  Printer, 
  Save, 
  FileText, 
  Clock, 
  Scale, 
  Calendar, 
  AlertCircle,
  Eye,
  RotateCcw,
  RotateCw,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignRight,
  AlignCenter,
  AlignLeft,
  AlignJustify,
  List,
  ListOrdered,
  Image as ImageIcon,
  Table as TableIcon,
  Minus,
  Download,
  BookOpen,
  Plus,
  CheckCircle2,
  FileCheck2,
  Search,
  Sliders,
  Type
} from 'lucide-react';
import type { AppDatabaseState, ExamSubject } from '../db/sqlite-manager';
import { INSTITUTION } from '../constants/branding';
import { getRankById, OFFICIAL_RANKS } from '../data/promotionsData';
import { getRankNumericCode } from '../utils/registration-number';
import { formatArabicDate, formatAcademicYear } from '../utils/date-formatter';
import { triggerPrintWithDynamicTitle } from '../utils/print-utils';

interface OfficialExamTemplateMakerProps {
  dbState: AppDatabaseState;
  initialTab?: 'editor' | 'rubric' | 'bank';
  onUpdateSubjects?: (subjects: ExamSubject[]) => void;
  onAddAuditLog: (action: string, details: string, severity?: 'info' | 'warning' | 'security') => void;
}

const DEFAULT_EXAM_INITIAL_HTML = `
  <div style="font-family: 'Simplified Arabic', sans-serif; font-size: 14pt; line-height: 1.8; text-align: justify;">
    <p><strong><u>الجزء الأول: الوضعية الإشكالية المهنية (12 نقطة)</u></strong></p>
    <p>في إطار ممارسة المهام الإدارية والبيداغوجية، واستناداً إلى أحكام التشريع المدرسي والتنظيم الإداري المعمول به في قطاع التربية الوطنية:</p>
    <p>لوحظ في إحدى المؤسسات التعليمية حدوث تباين في تفسير الصلاحيات المخولة لأعضاء الفريق الإداري والتربوي، مما أدى إلى تعثر في التنسيق الداخلي وسير العمل اليومي بالمؤسسة.</p>
    <br/>
    <p><strong>المطلوب:</strong></p>
    <ol style="margin-right: 20px;">
      <li>حدد بدقة السند القانوني والمرجعي المنظم لمهام وصلاحيات الفريق الإداري والتربوي. <em>(04 نقاط)</em></li>
      <li>بين الآليات التنظيمية والبيداغوجية الكفيلة بتفعيل التنسيق والتشاور المستمر داخل المؤسسة. <em>(04 نقاط)</em></li>
      <li>اقترح خطة عمل إجرائية عملية لمعالجة هذا الخلل وضمان السير الحسن للمرفق العام المدرسي. <em>(04 نقاط)</em></li>
    </ol>
    <br/>
    <hr style="border: none; border-top: 1px dashed #666; margin: 15px 0;" />
    <br/>
    <p><strong><u>الجزء الثاني: الوضعية الإدماجية المركبة (08 نقاط)</u></strong></p>
    <p><strong>السند:</strong></p>
    <blockquote style="margin: 10px 20px; padding: 10px; background-color: #f8fafc; border-right: 4px solid #0f172a; font-style: italic;">
      « يعد التقويم والمتابعة المستمرة ركيزة أساسية لتحسين المردود المدرسي والارتقاء بالأداء البيداغوجي والإداري. »
    </blockquote>
    <p><strong>التعليمة:</strong></p>
    <p>انطلاقاً من السند ومكتسباتك القبلية خلال فترة التكوين بالمعهد الوطني لتكوين موظفي قطاع التربية الوطنية:</p>
    <p>حرر تقريراً تحليلياً مفصلاً تُبرز فيه خطوات تنفيذ عملية تقويمية شاملة بالمؤسسة، مبرزاً المعايير والمؤشرات المعتمدة، وكيفية توظيف مخرجات التقويم في معالجة النقائص وتطوير الأداء الجماعي.</p>
  </div>
`;

export const OfficialExamTemplateMaker: React.FC<OfficialExamTemplateMakerProps> = ({
  dbState,
  initialTab = 'editor',
  onUpdateSubjects,
  onAddAuditLog
}) => {
  const currentSession = dbState.sessions.find(s => s.id === dbState.currentSessionId) || dbState.sessions[0];
  const currentSpecialtyId = currentSession?.specialtyId || 'dir_sec';
  const currentRank = getRankById(currentSpecialtyId) || OFFICIAL_RANKS[0];
  const rankNumericCode = getRankNumericCode(currentSpecialtyId);
  const sessionModules = dbState.modules.filter(m => m.specialtyId === currentSpecialtyId);

  // Sub-tabs navigation (Strictly 3 tabs: editor, rubric, bank)
  const [activeSubTab, setActiveSubTab] = useState<'editor' | 'rubric' | 'bank'>(
    initialTab === 'bank' ? 'bank' : initialTab === 'rubric' ? 'rubric' : 'editor'
  );

  // Dedicated Print Target State ('editor' or 'rubric')
  const [printTargetDoc, setPrintTargetDoc] = useState<'editor' | 'rubric'>('editor');

  // Exam Identification & Form states
  const [selectedModuleId, setSelectedModuleId] = useState<string>(sessionModules[0]?.id || '');
  const [sessionTitle, setSessionTitle] = useState<string>(currentSession?.name || 'امتحان التخرج النهائي - دورة جوان 2027');
  const [academicYear, setAcademicYear] = useState<string>(currentSession?.academicYear || '2026 / 2027');
  const [duration, setDuration] = useState<string>('03 ساعات');
  const [coefficient, setCoefficient] = useState<number>(sessionModules[0]?.coefficient || 3);
  const [examDate, setExamDate] = useState<string>(currentSession?.examStartDate || '2027-06-13');
  const [authorName, setAuthorName] = useState<string>('لجنة صياغة ومطابقة مواضيع الامتحانات بالمعهد');
  const [instructions, setInstructions] = useState<string>(
    'يُمنع منعاً باتاً تدوين أي إشارة دالة على الهوية خارج اللسان المخصص للقص. الإجابة باللغة العربية حصراً وبخط واضح ومقروء.'
  );

  // Exam mode: single topic vs dual choice
  const [isDualChoice, setIsDualChoice] = useState<boolean>(false);
  const [subjectStatus, setSubjectStatus] = useState<'approved' | 'reserve' | 'draft'>('approved');

  // Page Format: A4 Single vs A3 Booklet
  const [paperFormat, setPaperFormat] = useState<'A4' | 'A3'>('A4');

  // Word Editor States
  const [fontFamily, setFontFamily] = useState<string>('Simplified Arabic');
  const [fontSize, setFontSize] = useState<string>('14pt');
  const [textColor, setTextColor] = useState<string>('#000000');
  const [highlightColor, setHighlightColor] = useState<string>('transparent');

  // HTML content of the Word canvas
  const [editorContent, setEditorContent] = useState<string>(DEFAULT_EXAM_INITIAL_HTML);

  // Toast notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'warning' | 'info'; message: string } | null>(null);

  // Question Bank search & filter
  const [bankSearchTerm, setBankSearchTerm] = useState<string>('');

  // Corrigé-type & Rubric state
  const [corrigéContent, setCorrigéContent] = useState<string>(`عناصر الإجابة وسلم التنقيط النموذجي المفصل (المجموع: 20/20):

أولاً: الجزء الأول: الوضعية الإشكالية (12 نقطة)
1. تحديد السند القانوني والمرجعي: (04 نقاط)
   - استحضار أحكام القانون التوجيهي للتربية الوطنية. (02 ن)
   - تحديد القرارات والمراسيم المنظمة لمهام الفريق التربوي والإداري بدقة. (02 ن)
2. الآليات التنظيمية والبيداغوجية للتنسيق: (04 نقاط)
   - تفعيل مجالس التعليم ومجالس الأقسام والتنسيق الإداري الأسبوعي. (02 ن)
   - ضبط رزنامة واضحة وموثقة للتشاور الداخلي وتوزيع المهام. (02 ن)
3. خطة العمل الإجرائية لمعالجة الخلل: (04 نقاط)
   - تشخيص مواطن التعثر وعقد جلسة تنسيقية استثنائية. (02 ن)
   - وضع مصفوفة المسؤوليات والمتابعة الميدانية الدورية. (02 ن)

ثانياً: الجزء الثاني: الوضعية الإدماجية المركبة (08 نقاط)
- معيار الوجاهة (الملائمة مع الموضوع): (02 نقاط)
- معيار الاستعمال السليم لأدوات المادة والمصطلحات: (02 نقاط)
- معيار الانسجام والتسلسل المنطقي للتقرير: (02 نقاط)
- معيار التمايز والإتقان ونظافة التحرير: (02 نقاط)`);

  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const selectedModule = sessionModules.find(m => m.id === selectedModuleId) || sessionModules[0];

  // Auto dismiss toast
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Keep printTargetDoc aligned with subtabs
  useEffect(() => {
    if (activeSubTab === 'editor' || activeSubTab === 'rubric') {
      setPrintTargetDoc(activeSubTab);
    }
  }, [activeSubTab]);

  // Initial Content for the Canvas
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML.trim()) {
      editorRef.current.innerHTML = editorContent;
    }
  }, []);

  // When module changes, sync coefficient
  const handleModuleChange = (modId: string) => {
    setSelectedModuleId(modId);
    const m = sessionModules.find(x => x.id === modId);
    if (m) {
      setCoefficient(m.coefficient);
    }
  };

  // Execute standard formatting commands on contentEditable canvas
  const formatDoc = (cmd: string, val: string | undefined = undefined) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      editorRef.current.focus();
      setEditorContent(editorRef.current.innerHTML);
    }
  };

  // Change font size
  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const span = document.createElement('span');
        span.style.fontSize = size;
        const range = selection.getRangeAt(0);
        span.appendChild(range.extractContents());
        range.insertNode(span);
        setEditorContent(editorRef.current.innerHTML);
      }
    }
  };

  // Change font family
  const handleFontFamilyChange = (font: string) => {
    setFontFamily(font);
    formatDoc('fontName', font);
  };

  // Insert Image from local disk (converts to base64)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl && editorRef.current) {
        editorRef.current.focus();
        const imgHtml = `
          <div style="text-align: center; margin: 15px 0;">
            <img src="${dataUrl}" alt="سند مصور" style="max-width: 90%; max-height: 350px; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: inline-block;" />
            <div style="font-size: 11pt; color: #475569; margin-top: 4px;">شكل توضيحي / سند مصور للاختبار</div>
          </div>
        `;
        document.execCommand('insertHTML', false, imgHtml);
        setEditorContent(editorRef.current.innerHTML);
        setNotification({ type: 'success', message: 'تم إدراج الصورة بنجاح داخل ورقة الموضوع!' });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Insert Table: STRICTLY 3x3 ONLY (arbitrary creation prevented as required)
  const handleInsertTable = () => {
    const fixedRows = 3;
    const fixedCols = 3;
    if (!editorRef.current) return;
    editorRef.current.focus();

    let tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13pt; text-align: right;" border="1"><thead><tr style="background-color: #f1f5f9;">`;
    for (let c = 0; c < fixedCols; c++) {
      tableHtml += `<th style="border: 1px solid #000; padding: 6px 10px;">عنوان العمود ${c + 1}</th>`;
    }
    tableHtml += `</tr></thead><tbody>`;
    for (let r = 0; r < fixedRows; r++) {
      tableHtml += `<tr>`;
      for (let c = 0; c < fixedCols; c++) {
        tableHtml += `<td style="border: 1px solid #000; padding: 6px 10px;">خلية ${r + 1}-${c + 1}</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p><br/></p>`;

    document.execCommand('insertHTML', false, tableHtml);
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML);
    }
    setNotification({ type: 'success', message: 'تم إدراج جدول رسمي ثابت (3×3) بنجاح!' });
  };

  // Insert Quick Snippets
  const handleInsertSnippet = (type: 'case_study' | 'dual_topic' | 'instructions') => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    let snippetHtml = '';
    if (type === 'case_study') {
      snippetHtml = `
        <div style="margin: 15px 0; border: 1px solid #0f172a; padding: 12px; background-color: #f8fafc; border-radius: 6px;">
          <p><strong>دراسة حالة تشريعية وتنظيمية:</strong></p>
          <p>بصفتك رئيساً للمؤسسة، عُرضت عليك القضية التالية المتعلقة بـ [...]</p>
          <p><strong>المهام المطلوبة:</strong></p>
          <ol style="margin-right: 20px;">
            <li>تحديد التكييف القانوني السليم للوضعية.</li>
            <li>بيان الإجراءات التنسيقية والتأديبية الواجب اتخاذها قانوناً.</li>
          </ol>
        </div>
      `;
    } else if (type === 'dual_topic') {
      setIsDualChoice(true);
      snippetHtml = `
        <div style="text-align: center; margin: 20px 0; padding: 8px; background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 14pt; border-radius: 4px;">
          الموضوع الثاني (على الخيار)
        </div>
        <p><strong>نص الوضعية للموضوع الثاني:</strong></p>
        <p>[... قم بلصق أو كتابة نص الموضوع الثاني هنا ...]</p>
      `;
    } else if (type === 'instructions') {
      snippetHtml = `
        <div style="border-right: 4px solid #b45309; background-color: #fffbeb; padding: 10px; margin: 15px 0; font-size: 12pt;">
          <strong>تنبيه خاص بالمقياس:</strong> يُسمح باستعمال السندات التشريعية والمناشير الوزارية الرسمية غير المشروحة فقط.
        </div>
      `;
    }

    document.execCommand('insertHTML', false, snippetHtml);
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML);
    }
    setNotification({ type: 'info', message: 'تم إدراج القالب النموذجي في موقع المؤشر.' });
  };

  // Clean Paste Handler: handles text/html pasted directly from Word
  const handlePasteFromWord = () => {
    setTimeout(() => {
      if (editorRef.current) {
        setEditorContent(editorRef.current.innerHTML);
      }
    }, 50);
    setNotification({ type: 'info', message: 'تم لصق المحتوى مع الاحتفاظ بتنسيقات Word الأصلية.' });
  };

  // Export Native Word Document (.doc / .docx compatible)
  const handleExportWord = () => {
    const contentHtml = editorRef.current?.innerHTML || editorContent;
    const headerHtml = `
      <div style="text-align: center; font-family: 'Simplified Arabic', Arial; margin-bottom: 20px;">
        <p style="font-size: 13pt; margin: 0; font-weight: bold;">${INSTITUTION.republic}</p>
        <p style="font-size: 12pt; margin: 2px 0;">${INSTITUTION.ministry}</p>
        <p style="font-size: 14pt; margin: 4px 0; font-weight: bold;">${INSTITUTION.name}</p>
        <p style="font-size: 11pt; margin: 2px 0;">${INSTITUTION.deputyDirectorate} • ${INSTITUTION.service}</p>
        <hr style="border: 1px solid #000; margin: 10px 0;" />
        <div style="border: 2px solid #000; padding: 10px; margin-bottom: 15px; background-color: #f8fafc;">
          <table style="width: 100%; font-size: 12pt; text-align: right;" border="0">
            <tr>
              <td><strong>الدورة:</strong> ${sessionTitle}</td>
              <td><strong>السنة التكوينية:</strong> ${academicYear}</td>
            </tr>
            <tr>
              <td><strong>الرتبة:</strong> ${currentRank.titleAr}</td>
              <td><strong>المقياس:</strong> ${selectedModule?.titleAr}</td>
            </tr>
            <tr>
              <td><strong>المدة:</strong> ${duration} | <strong>المعامل:</strong> ${coefficient}</td>
              <td><strong>التاريخ:</strong> ${formatArabicDate(examDate)}</td>
            </tr>
          </table>
        </div>
        ${instructions ? `<div style="text-align: right; font-size: 11pt; border-right: 4px solid #000; padding: 6px; background-color: #f1f5f9; margin-bottom: 15px;"><strong>توجيهات هامة للمترشح:</strong> ${instructions}</div>` : ''}
        ${isDualChoice ? `<div style="text-align: center; font-size: 13pt; font-weight: bold; background-color: #000; color: #fff; padding: 4px; margin-bottom: 15px;">على المترشح أن يعالج أحد الموضوعين على الخيار</div>` : ''}
      </div>
    `;

    const fullDocHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>${selectedModule?.titleAr || 'موضوع امتحان'}</title>
          <style>
            @page {
              size: 210mm 297mm;
              margin: 20mm 20mm 20mm 20mm;
              mso-page-orientation: portrait;
            }
            body {
              font-family: 'Simplified Arabic', 'Traditional Arabic', 'Arial', sans-serif;
              font-size: 14pt;
              line-height: 1.8;
              direction: rtl;
              text-align: justify;
            }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            th, td {
              border: 1px solid #000;
              padding: 6px;
            }
          </style>
        </head>
        <body lang="AR-DZ">
          ${headerHtml}
          <div>
            ${contentHtml}
          </div>
          <br/>
          <div style="text-align: center; font-weight: bold; margin-top: 30px; border-top: 1px solid #000; padding-top: 10px;">
            — انتهى موضوع الاختبار • بالتوفيق للجميع —
          </div>
        </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + fullDocHtml], {
      type: 'application/msword;charset=utf-8'
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `موضوع_امتحان_${selectedModule?.titleAr.replace(/\s+/g, '_')}_${currentRank.titleAr.replace(/\s+/g, '_')}_${formatArabicDate(new Date())}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddAuditLog('تصدير موضوع Word', `تم تصدير ورقة موضوع الامتحان بصيغة Word لمقياس: ${selectedModule?.titleAr}`);
    setNotification({ type: 'success', message: '✓ تم تصدير ملف Microsoft Word الأصلي بنجاح!' });
  };

  // Direct Print with Dynamic Document Title (Guarantees visible output via #printable-official-document)
  const handlePrint = (target?: 'editor' | 'rubric') => {
    const docType = target || (activeSubTab === 'rubric' ? 'rubric' : 'editor');
    setPrintTargetDoc(docType);
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML);
    }
    const docTitle = docType === 'rubric'
      ? `عناصر_الإجابة_والتنقيط_مقياس_${selectedModule?.titleAr.replace(/\s+/g, '_')}_${formatArabicDate(new Date())}`
      : `موضوع_امتحان_${selectedModule?.titleAr.replace(/\s+/g, '_')}_${currentRank.titleAr.replace(/\s+/g, '_')}_${formatArabicDate(new Date())}`;

    // Small delay ensures react finishes syncing DOM to the dedicated print container
    setTimeout(() => {
      triggerPrintWithDynamicTitle(docTitle);
    }, 60);
  };

  // Save Subject to Question Bank
  const handleSaveToBank = () => {
    const content = editorRef.current?.innerHTML || editorContent;
    if (!content.trim()) {
      setNotification({ type: 'warning', message: 'يرجى كتابة أو لصق محتوى الموضوع أولاً!' });
      return;
    }

    const newSubject: ExamSubject = {
      id: `subj_${Date.now()}`,
      moduleId: selectedModule?.id || 'mod-default',
      specialtyId: currentSpecialtyId,
      title: `موضوع اختبار: ${selectedModule?.titleAr || 'مقياس معتمد'} (${isDualChoice ? 'موضوعان على الخيار' : 'موضوع واحد'})`,
      sessionTitle,
      examDate,
      duration,
      coefficient,
      instructions,
      content,
      gradingScale: corrigéContent,
      status: subjectStatus
    };

    if (onUpdateSubjects) {
      onUpdateSubjects([...dbState.examSubjects, newSubject]);
    }

    onAddAuditLog(
      'حفظ موضوع في بنك الامتحانات',
      `تم تثبيت موضوع امتحان لمقياس ${selectedModule?.titleAr} (${subjectStatus === 'approved' ? 'رسمي معتمد' : subjectStatus === 'reserve' ? 'احتياطي' : 'مسودة'}).`,
      'info'
    );

    setNotification({
      type: 'success',
      message: `✓ تم حفظ الموضوع وتثبيته في بنك مواضيع المعهد بنجاح (الحالة: ${subjectStatus === 'approved' ? 'رسمي معتمد' : subjectStatus === 'reserve' ? 'احتياطي' : 'مسودة'})!`
    });
  };

  // Load subject from Question Bank into Editor
  const handleLoadSubjectFromBank = (subj: ExamSubject) => {
    setSelectedModuleId(subj.moduleId);
    setSessionTitle(subj.sessionTitle);
    setExamDate(subj.examDate);
    setDuration(subj.duration);
    setCoefficient(subj.coefficient);
    setInstructions(subj.instructions || '');
    if (subj.gradingScale) {
      setCorrigéContent(subj.gradingScale);
    }
    setEditorContent(subj.content);
    if (editorRef.current) {
      editorRef.current.innerHTML = subj.content;
    }
    setActiveSubTab('editor');
    setPrintTargetDoc('editor');
    setNotification({ type: 'info', message: `تم استدعاء وتحميل: ${subj.title} داخل مساحة العمل.` });
  };

  // Filtered Question Bank
  const filteredBankSubjects = dbState.examSubjects.filter(s => {
    if (bankSearchTerm) {
      const term = bankSearchTerm.toLowerCase();
      return (
        s.title.toLowerCase().includes(term) ||
        s.sessionTitle.toLowerCase().includes(term) ||
        s.instructions?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Dynamic Toast (Screen only) */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between shadow-xs no-print ${
          notification.type === 'success'
            ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
            : notification.type === 'warning'
            ? 'bg-amber-100 text-amber-950 border-amber-300'
            : 'bg-blue-100 text-blue-950 border-blue-300'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-700" />}
            {notification.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-700" />}
            {notification.type === 'info' && <Eye className="w-4 h-4 text-blue-700" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-600 hover:text-slate-900 px-2 font-black cursor-pointer">✕</button>
        </div>
      )}

      {/* Top Banner (Screen only) */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden no-print">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-orange-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1.5">
                <FileEdit className="w-3.5 h-3.5" />
                <span>محرر مواضيع الامتحانات الوزارية (Word Canvas & Question Bank)</span>
              </span>
              <span className="bg-slate-800 text-slate-300 text-[11px] px-2.5 py-0.5 rounded-full font-mono border border-slate-700">
                ترويسة وزارية موحدة • خالية من أي لوغو • طباعة رسمية مطابقة (A4)
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold font-cairo text-white">
              صياغة ونمذجة مواضيع الامتحانات وبنك الأسئلة
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-3xl leading-relaxed">
              مساحة عمل كأنها صفحة Microsoft Word حقيقية: لصق الموضوع المستلم من الأستاذ، تنسيق الخطوط والمقاييس، إدراج الصور والرسوم البيانية وجدول 3×3 المعتمد، مع التصدير المباشر لملف Word والطباعة الرسمية الصافية دون أي صفحات بيضاء.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleExportWord}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-600 shadow-md transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تصدير ملف Word (.doc)</span>
            </button>

            <button
              onClick={() => handlePrint('editor')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 shadow-md transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة ورقة الموضوع الرسمية</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Bar: EXACTLY 3 TABS (Screen only - 'pv_tirage' has been removed) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex flex-wrap gap-2 no-print">
        <button
          onClick={() => setActiveSubTab('editor')}
          className={`flex-1 min-w-[180px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'editor'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <FileEdit className="w-4 h-4 text-orange-400" />
          <span>1. مساحة عمل وورد لموضوع الامتحان</span>
        </button>

        <button
          onClick={() => setActiveSubTab('rubric')}
          className={`flex-1 min-w-[180px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'rubric'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <FileCheck2 className="w-4 h-4 text-emerald-400" />
          <span>2. عناصر الإجابة وسلم التنقيط (Corrigé-type)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('bank')}
          className={`flex-1 min-w-[180px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'bank'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4 text-blue-400" />
          <span>3. بنك مواضيع الامتحانات ({dbState.examSubjects.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: WORD-LIKE WORKSPACE CANVAS (مساحة عمل وورد لموضوع الامتحان)      */}
      {/* ========================================================================= */}
      {activeSubTab === 'editor' && (
        <div className="space-y-4 no-print">
          {/* Exam Identification Setup Strip */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <span className="font-bold text-xs text-slate-800 flex items-center gap-2 font-cairo">
                <Sliders className="w-4 h-4 text-orange-600" />
                <span>إعدادات وبطاقة تعريف موضوع الامتحان:</span>
              </span>

              {/* Exam Options: Dual Choice & Paper Format & Save to Bank */}
              <div className="flex items-center gap-2">
                {/* Single / Dual Choice Toggle */}
                <button
                  type="button"
                  onClick={() => setIsDualChoice(!isDualChoice)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                    isDualChoice
                      ? 'bg-orange-100 text-orange-900 border-orange-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {isDualChoice ? '✓ وضع الموضوع الاختياري مفعل (الموضوع 1 / الموضوع 2)' : '+ تفعيل الموضوع الاختياري المزدوج'}
                </button>

                {/* Paper format selector */}
                <select
                  value={paperFormat}
                  onChange={(e) => setPaperFormat(e.target.value as 'A4' | 'A3')}
                  className="bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="A4">ورقة A4 قياسية</option>
                  <option value="A3">كتيب A3 مطوي (4 صفحات)</option>
                </select>

                {/* Subject status in Bank */}
                <select
                  value={subjectStatus}
                  onChange={(e) => setSubjectStatus(e.target.value as 'approved' | 'reserve' | 'draft')}
                  className="bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="approved">موضوع رسمي معتمد</option>
                  <option value="reserve">موضوع احتياطي للطوارئ</option>
                  <option value="draft">مسودة قيد المراجعة</option>
                </select>

                <button
                  type="button"
                  onClick={handleSaveToBank}
                  className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-amber-300" />
                  <span>حفظ بالبنك</span>
                </button>
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">الرتبة التكوينية:</label>
                <input
                  type="text"
                  readOnly
                  value={`${currentRank.titleAr} (${currentRank.trackId === 'specialized' ? 'تكوين متخصص' : 'تكوين قبل الترقية'})`}
                  className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">مقياس الاختبار:</label>
                <select
                  value={selectedModuleId}
                  onChange={(e) => handleModuleChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                >
                  {sessionModules.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.titleAr} (معامل {m.coefficient})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المدة المحددة للاختبار:</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="03 ساعات"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المعامل القانوني:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={coefficient}
                  onChange={(e) => setCoefficient(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تاريخ الاختبار:</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الدورة التكوينية:</label>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">السنة التكوينية:</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اللجنة / الأستاذ واضع الموضوع:</label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Candidate Instructions */}
            <div className="pt-2 border-t border-slate-100 text-xs">
              <label className="block font-bold text-slate-700 mb-1">توجيهات وتعليمات تنظيمية هامة للمترشحين (تظهر أعلى الأسئلة):</label>
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* THE MICROSOFT WORD RIBBON TOOLBAR (شريط أدوات وورد الاحترافي)               */}
          {/* ========================================================================= */}
          <div className="bg-slate-900 text-white rounded-2xl p-3 border border-slate-800 shadow-lg sticky top-16 z-20">
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-xs">
              {/* Font Family */}
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
                <Type className="w-3.5 h-3.5 text-amber-400 mr-1" />
                <select
                  value={fontFamily}
                  onChange={(e) => handleFontFamilyChange(e.target.value)}
                  className="bg-slate-900 text-white rounded px-2 py-1 text-xs font-bold border border-slate-700 focus:outline-none"
                >
                  <option value="Simplified Arabic">Simplified Arabic</option>
                  <option value="Traditional Arabic">Traditional Arabic</option>
                  <option value="Amiri">Amiri</option>
                  <option value="Cairo">Cairo</option>
                  <option value="Arial">Arial</option>
                  <option value="Tahoma">Tahoma</option>
                </select>
              </div>

              {/* Font Size */}
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
                <select
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(e.target.value)}
                  className="bg-slate-900 text-white rounded px-2 py-1 text-xs font-bold border border-slate-700 focus:outline-none font-mono"
                >
                  <option value="11pt">11 pt</option>
                  <option value="12pt">12 pt</option>
                  <option value="13pt">13 pt</option>
                  <option value="14pt">14 pt</option>
                  <option value="16pt">16 pt</option>
                  <option value="18pt">18 pt</option>
                  <option value="20pt">20 pt</option>
                  <option value="24pt">24 pt</option>
                </select>
              </div>

              <div className="h-5 w-px bg-slate-700 mx-0.5"></div>

              {/* Basic Styles: Bold, Italic, Underline, Strike */}
              <div className="flex items-center gap-0.5 bg-slate-800 p-1 rounded-lg">
                <button
                  type="button"
                  title="عريض (Ctrl+B)"
                  onClick={() => formatDoc('bold')}
                  className="p-1.5 hover:bg-slate-700 rounded transition text-white font-bold cursor-pointer"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="مائل (Ctrl+I)"
                  onClick={() => formatDoc('italic')}
                  className="p-1.5 hover:bg-slate-700 rounded transition text-white cursor-pointer"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="تسطير (Ctrl+U)"
                  onClick={() => formatDoc('underline')}
                  className="p-1.5 hover:bg-slate-700 rounded transition text-white cursor-pointer"
                >
                  <Underline className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="يتوسطه خط"
                  onClick={() => formatDoc('strikeThrough')}
                  className="p-1.5 hover:bg-slate-700 rounded transition text-white cursor-pointer"
                >
                  <Strikethrough className="w-4 h-4" />
                </button>
              </div>

              {/* Text Color & Highlight */}
              <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg">
                <label className="flex items-center gap-1 cursor-pointer p-1 hover:bg-slate-700 rounded" title="لون الخط">
                  <span className="font-bold underline text-amber-300">A</span>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => {
                      setTextColor(e.target.value);
                      formatDoc('foreColor', e.target.value);
                    }}
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                  />
                </label>

                <label className="flex items-center gap-1 cursor-pointer p-1 hover:bg-slate-700 rounded" title="لون تمييز النص">
                  <span className="bg-amber-400 text-slate-950 px-1 rounded text-[10px] font-bold">ab</span>
                  <input
                    type="color"
                    value={highlightColor === 'transparent' ? '#ffffff' : highlightColor}
                    onChange={(e) => {
                      setHighlightColor(e.target.value);
                      formatDoc('hiliteColor', e.target.value);
                    }}
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                  />
                </label>
              </div>

              <div className="h-5 w-px bg-slate-700 mx-0.5"></div>

              {/* Alignments: Right, Center, Left, Justify */}
              <div className="flex items-center gap-0.5 bg-slate-800 p-1 rounded-lg">
                <button
                  type="button"
                  title="محاذاة لليمين"
                  onClick={() => formatDoc('justifyRight')}
                  className="p-1.5 hover:bg-slate-700 rounded transition text-white cursor-pointer"
                >
                  <AlignRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="توسيط"
                  onClick={() => formatDoc('justifyCenter')}
                  className="p-1.5 hover:bg-slate-700 rounded transition text-white cursor-pointer"
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="محاذاة لليسار"
                  onClick={() => formatDoc('justifyLeft')}
                  className="p-1.5 hover:bg-slate-700 rounded transition text-white cursor-pointer"
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="ضبط كامل (Justify)"
                  onClick={() => formatDoc('justifyFull')}
                  className="p-1.5 hover:bg-slate-700 rounded transition text-white cursor-pointer"
                >
                  <AlignJustify className="w-4 h-4" />
                </button>
              </div>

              {/* Lists */}
              <div className="flex items-center gap-0.5 bg-slate-800 p-1 rounded-lg">
                <button
                  type="button"
                  title="قائمة نقطية"
                  onClick={() => formatDoc('insertUnorderedList')}
                  className="p-1.5 hover:bg-slate-700 rounded transition text-white cursor-pointer"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="قائمة رقمية"
                  onClick={() => formatDoc('insertOrderedList')}
                  className="p-1.5 hover:bg-slate-700 rounded transition text-white cursor-pointer"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
              </div>

              <div className="h-5 w-px bg-slate-700 mx-0.5"></div>

              {/* Insertions: Image, Table (STRICTLY 3x3 ONLY), Horizontal Line */}
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
                {/* Upload Image Button */}
                <button
                  type="button"
                  title="إدراج صورة من الجهاز أو رسم بياني"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center gap-1 px-2 py-1 bg-emerald-700 hover:bg-emerald-600 rounded text-white text-[11px] font-bold transition cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>إدراج صورة</span>
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {/* STRICT 3x3 Table Insertion Only (No custom table creation) */}
                <button
                  type="button"
                  title="إدراج جدول رسمي ثابت (3×3) فقط"
                  onClick={handleInsertTable}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-700 hover:bg-blue-600 rounded text-white text-[11px] font-bold transition cursor-pointer"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>جدول (3×3)</span>
                </button>

                {/* Insert Line */}
                <button
                  type="button"
                  title="إدراج خط فاصل"
                  onClick={() => formatDoc('insertHorizontalRule')}
                  className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>

              {/* Snippets Dropdown */}
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('case_study')}
                  className="text-[11px] px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded font-bold cursor-pointer"
                >
                  + دراسة حالة
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('dual_topic')}
                  className="text-[11px] px-2 py-1 bg-orange-700 hover:bg-orange-600 rounded font-bold cursor-pointer"
                >
                  + الموضوع 2
                </button>
              </div>

              {/* Undo / Redo */}
              <div className="mr-auto flex items-center gap-0.5">
                <button
                  type="button"
                  title="تراجع (Ctrl+Z)"
                  onClick={() => formatDoc('undo')}
                  className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="إعادة (Ctrl+Y)"
                  onClick={() => formatDoc('redo')}
                  className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* THE REALISTIC A4 WORD PAGE CANVAS (Screen View)                           */}
          {/* Strict Rule: NO BLACK LOGO ON EXAM QUESTION PAPER! Pure Ministerial Text   */}
          {/* ========================================================================= */}
          <div className="py-6 flex justify-center bg-slate-200/70 rounded-2xl border border-slate-300 overflow-x-auto">
            <div 
              className={`bg-white text-black shadow-2xl border border-slate-300 font-simplified-arabic p-10 md:p-12 relative flex flex-col justify-between ${
                paperFormat === 'A3' ? 'w-[297mm] min-h-[420mm]' : 'w-[210mm] min-h-[297mm]'
              }`}
              dir="rtl"
            >
              <div>
                {/* 1. Official 5-Line Ministerial Header (STRICTLY TEXT ONLY - NO LOGO) */}
                <div className="text-center border-b-2 border-black pb-3 mb-4 leading-snug">
                  <h2 className="font-bold text-xs md:text-sm text-black leading-tight">
                    {INSTITUTION.republic}
                  </h2>
                  <h3 className="font-bold text-[11px] md:text-xs text-slate-800 leading-tight mt-0.5">
                    {INSTITUTION.ministry}
                  </h3>
                  <h3 className="font-black text-xs md:text-sm text-black mt-1 leading-tight">
                    {INSTITUTION.name}
                  </h3>
                  <p className="text-[10px] md:text-[11px] text-slate-700 font-semibold mt-0.5">
                    {INSTITUTION.deputyDirectorate}
                  </p>
                  <p className="text-[11px] md:text-xs text-black font-black mt-0.5">
                    {INSTITUTION.service}
                  </p>
                </div>

                {/* 2. Official Examination Identification Box */}
                <div className="border-2 border-black rounded-lg p-3 bg-slate-50/70 mb-3 text-xs leading-relaxed">
                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                    <div>
                      <span className="text-slate-600 font-bold text-[11px]">الدورة التكوينية:</span>{' '}
                      <strong className="text-black font-black">{sessionTitle}</strong>
                    </div>
                    <div>
                      <span className="text-slate-600 font-bold text-[11px]">السنة التكوينية:</span>{' '}
                      <strong className="text-black font-mono font-bold">{formatAcademicYear(academicYear)}</strong>
                    </div>

                    <div className="col-span-2 pt-1 border-t border-slate-300">
                      <span className="text-slate-600 font-bold text-[11px]">الرتبة التكوينية:</span>{' '}
                      <strong className="text-black text-sm font-black">{currentRank.titleAr}</strong>{' '}
                      <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-mono font-bold mr-2">
                        كود الرتبة: {rankNumericCode}
                      </span>
                    </div>

                    <div className="col-span-2 pt-1 border-t border-slate-300">
                      <span className="text-slate-600 font-bold text-[11px]">موضوع الاختبار في مقياس:</span>{' '}
                      <strong className="text-black text-sm font-black">{selectedModule?.titleAr}</strong>
                    </div>

                    <div className="col-span-2 pt-1.5 border-t border-slate-300 flex items-center justify-between text-xs font-mono font-bold text-black">
                      <span>المدة المحددة: <strong>{duration}</strong></span>
                      <span>المعامل: <strong>{coefficient}</strong></span>
                      <span>تاريخ الإجراء: <strong>{formatArabicDate(examDate)}</strong></span>
                      <span className="text-[10px] text-slate-600 font-normal">كود: COD-{selectedModule?.code}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Important Candidate Instructions Strip */}
                {instructions && (
                  <div className="border-r-4 border-black bg-slate-100 p-2.5 rounded-l mb-4 text-xs text-black leading-relaxed font-bold">
                    <span className="block mb-0.5 text-black">توجيهات وتعليمات هامة للمترشح:</span>
                    <p className="font-normal text-slate-800 text-[11px]">{instructions}</p>
                  </div>
                )}

                {/* 4. Optional Dual-Choice Banner */}
                {isDualChoice && (
                  <div className="text-center bg-black text-white py-1 px-4 rounded font-bold text-xs md:text-sm my-3 tracking-wide">
                    على المترشح أن يعالج أحد الموضوعين على الخيار
                  </div>
                )}

                {/* 5. The Live Word WYSIWYG Editable Document Body */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => setEditorContent(e.currentTarget.innerHTML)}
                  onPaste={handlePasteFromWord}
                  className="min-h-[480px] p-2 focus:outline-none focus:ring-1 focus:ring-orange-300 rounded text-justify text-xs md:text-sm text-black leading-loose"
                  style={{
                    fontFamily: `${fontFamily}, sans-serif`,
                    fontSize: fontSize,
                    lineHeight: '1.9'
                  }}
                />
              </div>

              {/* 6. Official Bottom Sheet Footer */}
              <div className="border-t-2 border-black pt-3 mt-8 flex items-center justify-between text-xs font-bold text-black">
                <span className="text-[11px] text-slate-700">المعهد الوطني بالأغواط • مصلحة تنظيم سير المسابقات والامتحانات</span>
                <span className="text-xs font-black text-black">
                  — انتهى موضوع الاختبار • بالتوفيق للجميع —
                </span>
                <span className="font-mono text-[11px]">صفحة 1 / 1</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: CORRIGE-TYPE ET BAREME (عناصر الإجابة وسلم التنقيط النموذجي)     */}
      {/* ========================================================================= */}
      {activeSubTab === 'rubric' && (
        <div className="space-y-6 no-print">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-cairo">
                  عناصر الإجابة النموذجية وشبكة التقويم المفصلة (Corrigé-type et Barème)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  خاصة بلجنة التصحيح والأستاذ مصحح المقياس، تتضمن توزيع الـ 20 نقطة بدقة على المعايير والمؤشرات.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrint('rubric')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة دليل المصحح وسلم التنقيط</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveToBank}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4 text-amber-300" />
                  <span>حفظ في بنك المواضيع</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs flex items-center justify-between font-semibold">
              <span>المقياس المعني: <strong className="text-slate-900">{selectedModule?.titleAr}</strong></span>
              <span>الرتبة: <strong className="text-slate-900">{currentRank.titleAr}</strong></span>
              <span>المعامل: <strong className="font-mono text-orange-600">{coefficient}</strong></span>
              <span>العلامة القصوى: <strong className="font-mono text-emerald-700">20 / 20</strong></span>
            </div>

            <textarea
              rows={18}
              value={corrigéContent}
              onChange={(e) => setCorrigéContent(e.target.value)}
              placeholder="اكتب أو الصق عناصر الإجابة النموذجية وسلم التنقيط..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-xs font-mono leading-relaxed text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none transition resize-y"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: QUESTION BANK (بنك مواضيع الامتحانات)                           */}
      {/* ========================================================================= */}
      {activeSubTab === 'bank' && (
        <div className="space-y-6 no-print">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-cairo">
                  بنك مواضيع الامتحانات المعتمدة والاحتياطية (Banque de Sujets)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  أرشيف كامل للمواضيع المسجلة والمصنفة حسب الرتبة والمقياس والدورة وحالة الاعتماد.
                </p>
              </div>

              <div className="w-72 relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="بحث في بنك المواضيع..."
                  value={bankSearchTerm}
                  onChange={(e) => setBankSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            {filteredBankSubjects.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-3">
                <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm">لا توجد مواضيع محفوظة في البنك مطابقة للبحث حتى الآن.</p>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('editor')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إنشاء وصياغة موضوع جديد الآن</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBankSubjects.map((subj) => (
                  <div 
                    key={subj.id}
                    className="border border-slate-200 rounded-2xl p-5 hover:border-orange-300 hover:shadow-md transition bg-white flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          subj.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : subj.status === 'reserve'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {subj.status === 'approved' ? 'موضوع رسمي معتمد' : subj.status === 'reserve' ? 'موضوع احتياطي للطوارئ' : 'مسودة قيد التدقيق'}
                        </span>

                        <span className="text-[11px] text-slate-500 font-mono">
                          {formatArabicDate(subj.examDate)}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 font-cairo">
                        {subj.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        الدورة: {subj.sessionTitle} • المعامل: {subj.coefficient} • المدة: {subj.duration}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => handleLoadSubjectFromBank(subj)}
                        className="text-orange-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        <span>تحميل وتعديل في محرر Word</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleLoadSubjectFromBank(subj);
                          setTimeout(() => handlePrint('editor'), 250);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>طباعة</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DEDICATED OFFICIAL PRINT CONTAINER (#printable-official-document)          */}
      {/* ISOLATED & VISIBLE ONLY DURING PHYSICAL PRINTING (@media print)            */}
      {/* This guarantees 100% visible, crisp output with ZERO blank pages           */}
      {/* ========================================================================= */}
      <div 
        id="printable-official-document" 
        className="hidden print:block font-simplified-arabic text-black bg-white p-6 print-document"
      >
        {printTargetDoc === 'rubric' ? (
          /* Official Rubric Document (عناصر الإجابة وسلم التنقيط النموذجي المفصل) */
          <div className="space-y-4">
            {/* Ministerial Text Header (Strictly pure text - NO LOGO) */}
            <div className="text-center border-b-2 border-black pb-3 mb-4 leading-snug">
              <h2 className="font-bold text-xs md:text-sm text-black leading-tight">
                {INSTITUTION.republic}
              </h2>
              <h3 className="font-bold text-[11px] md:text-xs text-slate-800 leading-tight mt-0.5">
                {INSTITUTION.ministry}
              </h3>
              <h3 className="font-black text-xs md:text-sm text-black mt-1 leading-tight">
                {INSTITUTION.name}
              </h3>
              <p className="text-[10px] md:text-[11px] text-slate-700 font-semibold mt-0.5">
                {INSTITUTION.deputyDirectorate} • {INSTITUTION.service}
              </p>
            </div>

            {/* Title Banner */}
            <div className="text-center my-3">
              <h1 className="text-base font-black border-2 border-black inline-block px-6 py-1.5 rounded bg-slate-50">
                عناصر الإجابة وسلم التنقيط النموذجي المفصل (Corrigé-type et Barème)
              </h1>
              <p className="text-xs text-slate-700 mt-1 font-semibold">
                خاص بلجنة التصحيح والأساتذة مصححي المقياس • العلامة القصوى: 20 / 20
              </p>
            </div>

            {/* Identification Box */}
            <div className="border-2 border-black rounded-lg p-3 bg-slate-50/70 mb-3 text-xs leading-relaxed">
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                <div>
                  <span className="font-bold">الدورة التكوينية:</span>{' '}
                  <strong>{sessionTitle}</strong>
                </div>
                <div>
                  <span className="font-bold">السنة التكوينية:</span>{' '}
                  <strong className="font-mono">{formatAcademicYear(academicYear)}</strong>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-300">
                  <span className="font-bold">الرتبة التكوينية:</span>{' '}
                  <strong className="text-sm">{currentRank.titleAr}</strong>
                  <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-mono font-bold mr-2">
                    كود الرتبة: {rankNumericCode}
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-300">
                  <span className="font-bold">مقياس الاختبار:</span>{' '}
                  <strong className="text-sm">{selectedModule?.titleAr}</strong>
                </div>
                <div className="col-span-2 pt-1.5 border-t border-slate-300 flex items-center justify-between text-xs font-mono font-bold">
                  <span>المدة: <strong>{duration}</strong></span>
                  <span>المعامل: <strong>{coefficient}</strong></span>
                  <span>تاريخ الإجراء: <strong>{formatArabicDate(examDate)}</strong></span>
                  <span>العلامة القصوى: <strong className="text-emerald-800">20 / 20</strong></span>
                </div>
              </div>
            </div>

            {/* Rubric Content */}
            <div className="border border-black rounded-lg p-4 text-xs font-simplified-arabic leading-relaxed whitespace-pre-wrap bg-white">
              {corrigéContent}
            </div>

            {/* Signatures */}
            <div className="border border-black p-3 rounded text-xs mt-6">
              <div className="grid grid-cols-2 gap-6 text-center">
                <div>
                  <span className="font-bold block mb-1">الأستاذ واضع الموضوع وسلّم التنقيط:</span>
                  <div className="text-[11px] text-slate-700 mt-6">(الاسم واللقب، الصفة، والتوقيع)</div>
                </div>
                <div>
                  <span className="font-bold block mb-1">رئيس لجنة التصحيح وتداول العلامات:</span>
                  <div className="text-[11px] text-slate-700 mt-6">(التأشيرة، الختم الرسمي، والتاريخ)</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Official Exam Question Paper (ورقة موضوع الامتحان الرسمية) */
          <div className="space-y-4">
            {/* 1. Official 5-Line Ministerial Header (STRICTLY TEXT ONLY - NO LOGO) */}
            <div className="text-center border-b-2 border-black pb-3 mb-4 leading-snug">
              <h2 className="font-bold text-xs md:text-sm text-black leading-tight">
                {INSTITUTION.republic}
              </h2>
              <h3 className="font-bold text-[11px] md:text-xs text-slate-800 leading-tight mt-0.5">
                {INSTITUTION.ministry}
              </h3>
              <h3 className="font-black text-xs md:text-sm text-black mt-1 leading-tight">
                {INSTITUTION.name}
              </h3>
              <p className="text-[10px] md:text-[11px] text-slate-700 font-semibold mt-0.5">
                {INSTITUTION.deputyDirectorate}
              </p>
              <p className="text-[11px] md:text-xs text-black font-black mt-0.5">
                {INSTITUTION.service}
              </p>
            </div>

            {/* 2. Official Examination Identification Box */}
            <div className="border-2 border-black rounded-lg p-3 bg-slate-50/70 mb-3 text-xs leading-relaxed">
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                <div>
                  <span className="text-slate-600 font-bold text-[11px]">الدورة التكوينية:</span>{' '}
                  <strong className="text-black font-black">{sessionTitle}</strong>
                </div>
                <div>
                  <span className="text-slate-600 font-bold text-[11px]">السنة التكوينية:</span>{' '}
                  <strong className="text-black font-mono font-bold">{formatAcademicYear(academicYear)}</strong>
                </div>

                <div className="col-span-2 pt-1 border-t border-slate-300">
                  <span className="text-slate-600 font-bold text-[11px]">الرتبة التكوينية:</span>{' '}
                  <strong className="text-black text-sm font-black">{currentRank.titleAr}</strong>{' '}
                  <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-mono font-bold mr-2">
                    كود الرتبة: {rankNumericCode}
                  </span>
                </div>

                <div className="col-span-2 pt-1 border-t border-slate-300">
                  <span className="text-slate-600 font-bold text-[11px]">موضوع الاختبار في مقياس:</span>{' '}
                  <strong className="text-black text-sm font-black">{selectedModule?.titleAr}</strong>
                </div>

                <div className="col-span-2 pt-1.5 border-t border-slate-300 flex items-center justify-between text-xs font-mono font-bold text-black">
                  <span>المدة المحددة: <strong>{duration}</strong></span>
                  <span>المعامل: <strong>{coefficient}</strong></span>
                  <span>تاريخ الإجراء: <strong>{formatArabicDate(examDate)}</strong></span>
                  <span className="text-[10px] text-slate-600 font-normal">كود: COD-{selectedModule?.code}</span>
                </div>
              </div>
            </div>

            {/* 3. Important Candidate Instructions Strip */}
            {instructions && (
              <div className="border-r-4 border-black bg-slate-100 p-2.5 rounded-l mb-4 text-xs text-black leading-relaxed font-bold">
                <span className="block mb-0.5 text-black">توجيهات وتعليمات هامة للمترشح:</span>
                <p className="font-normal text-slate-800 text-[11px]">{instructions}</p>
              </div>
            )}

            {/* 4. Optional Dual-Choice Banner */}
            {isDualChoice && (
              <div className="text-center bg-black text-white py-1 px-4 rounded font-bold text-xs md:text-sm my-3 tracking-wide">
                على المترشح أن يعالج أحد الموضوعين على الخيار
              </div>
            )}

            {/* 5. Exam Subject Questions Body */}
            <div 
              className="min-h-[400px] p-2 text-justify text-xs md:text-sm text-black leading-loose font-simplified-arabic"
              dangerouslySetInnerHTML={{ __html: editorRef.current?.innerHTML || editorContent }}
            />

            {/* 6. Official Bottom Sheet Footer */}
            <div className="border-t-2 border-black pt-3 mt-8 flex items-center justify-between text-xs font-bold text-black">
              <span className="text-[11px] text-slate-700">المعهد الوطني بالأغواط • مصلحة تنظيم سير المسابقات والامتحانات</span>
              <span className="text-xs font-black text-black">
                — انتهى موضوع الاختبار • بالتوفيق للجميع —
              </span>
              <span className="font-mono text-[11px]">صفحة 1 / 1</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
