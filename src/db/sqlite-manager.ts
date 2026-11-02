/**
 * Offline SQLite Database Manager & Persistence Layer
 * Provides robust offline data handling, audit logging, export/import of SQLite DB,
 * and high-fidelity institutional seeding for INFPE Laghouat.
 */

import type { Candidate, ExamModule, AnonymatMapping, GradeRecord } from '../utils/crypto-anonymat';
import { OFFICIAL_RANKS } from '../data/promotionsData';
import { INSTITUTION } from '../constants/branding';

export interface Specialty {
  id: string;
  titleAr: string;
  titleFr: string;
  category: string;
  durationMonths: number;
}

export interface ExamSession {
  id: string;
  name: string; // e.g. دورة التخرج النهائية - جوان 2025
  academicYear: string; // 2026 / 2027
  specialtyId: string;
  startDate: string;
  endDate: string;
  trainingYearStartDate?: string; // تاريخ بداية التكوين
  examStartDate?: string;         // تاريخ بداية الامتحانات الكتابية
  examEndDate?: string;           // تاريخ نهاية الامتحانات الكتابية
  morningTimeSlot?: string;       // توقيت الفترة الصباحية (e.g. 08:30 - 11:30)
  afternoonTimeSlot?: string;     // توقيت الفترة المسائية (e.g. 14:00 - 17:00)
  wilayaCode?: string;            // رمز ولاية المعهد (مثال: '03' للأغواط)
  isAnonymatLocked: boolean; // Has anonymat been generated and locked?
  isDecoded: boolean; // Has anonymat been revealed for deliberation?
  encryptionKeyHash: string;
  decodingDate?: string;
  presidentName: string;
}

export interface ProctorTeacher {
  id: string;
  fullName: string;
  institution: string;
  phone: string;
  specialty: string;
}

export interface ExamRoom {
  id: string;
  name: string;
  capacity: number;
  building?: string;
}

export interface TimetableSlot {
  id: string;
  date: string;
  sessionTime: 'morning' | 'afternoon';
  timeRange: string;
  moduleId: string;
  roomAllocations: {
    roomId: string;
    proctorIds: string[];
  }[];
}

export interface ExamSubject {
  id: string;
  moduleId: string;
  specialtyId: string;
  title: string;
  sessionTitle: string;
  examDate: string;
  duration: string; // e.g. 03 ساعات
  coefficient: number;
  content: string; // Arabic exam subject text with parts (الجزء الأول، الجزء الثاني، الوضعية الإدماجية)
  gradingScale: string; // Detailed grading rubric
  instructions: string;
  status: 'draft' | 'approved' | 'final' | 'reserve';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  severity: 'info' | 'warning' | 'security';
}

const STORAGE_KEY = 'INFPE_LAGHOUAT_OFFLINE_DB_V1';

// Seed initial Specialties from official decrees
export const INITIAL_SPECIALTIES: Specialty[] = OFFICIAL_RANKS.map(r => ({
  id: r.id,
  titleAr: r.titleAr,
  titleFr: r.titleFr,
  category: r.category,
  durationMonths: r.trackId === 'specialized' ? 12 : 6
}));

// Seed initial Modules from official decrees
export const INITIAL_MODULES: ExamModule[] = OFFICIAL_RANKS.flatMap(r => r.modules);


// Seed realistic candidates for INFPE Laghouat
export const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: 'cand-001',
    registrationNumber: '03010001',
    fullName: 'بن عيسى مصطفى بن لخضر',
    birthDate: '1982-04-12',
    birthPlace: 'الأغواط',
    specialtyId: 'dir_sec',
    promotionYear: '2024-2025',
    groupNumber: 'الفوج 01',
    roomNumber: 'مدرج الشيخ زاهية',
    attendanceStatus: 'present'
  },
  {
    id: 'cand-002',
    registrationNumber: '03010002',
    fullName: 'حيدوسي فاطمة الزهراء',
    birthDate: '1987-10-25',
    birthPlace: 'آفلو',
    specialtyId: 'dir_sec',
    promotionYear: '2024-2025',
    groupNumber: 'الفوج 01',
    roomNumber: 'مدرج الشيخ زاهية',
    attendanceStatus: 'present'
  },
  {
    id: 'cand-003',
    registrationNumber: '03010003',
    fullName: 'دليحة كمال بن عبد القادر',
    birthDate: '1980-08-14',
    birthPlace: 'قصر الحيران',
    specialtyId: 'dir_sec',
    promotionYear: '2024-2025',
    groupNumber: 'الفوج 01',
    roomNumber: 'مدرج الشيخ زاهية',
    attendanceStatus: 'present'
  },
  {
    id: 'cand-004',
    registrationNumber: '03010004',
    fullName: 'طاوسي عبد الحميد بن عمار',
    birthDate: '1984-01-19',
    birthPlace: 'حاسي الرمل',
    specialtyId: 'dir_sec',
    promotionYear: '2024-2025',
    groupNumber: 'الفوج 01',
    roomNumber: 'مدرج الشيخ زاهية',
    attendanceStatus: 'present'
  },
  {
    id: 'cand-005',
    registrationNumber: '03010005',
    fullName: 'بوزيان سليمة بنت محمد',
    birthDate: '1989-06-03',
    birthPlace: 'عين ماضي',
    specialtyId: 'dir_sec',
    promotionYear: '2024-2025',
    groupNumber: 'الفوج 01',
    roomNumber: 'مدرج الشيخ زاهية',
    attendanceStatus: 'present'
  },
  {
    id: 'cand-006',
    registrationNumber: '03010006',
    fullName: 'قاسم محمد الهادي بن مسعود',
    birthDate: '1983-11-29',
    birthPlace: 'الأغواط',
    specialtyId: 'dir_sec',
    promotionYear: '2024-2025',
    groupNumber: 'الفوج 01',
    roomNumber: 'قاعة ابن خلدون',
    attendanceStatus: 'present'
  },
  {
    id: 'cand-007',
    registrationNumber: '03010007',
    fullName: 'مباركي سميرة بنت البشير',
    birthDate: '1986-03-08',
    birthPlace: 'سيدي مخلوف',
    specialtyId: 'dir_sec',
    promotionYear: '2024-2025',
    groupNumber: 'الفوج 02',
    roomNumber: 'قاعة ابن خلدون',
    attendanceStatus: 'present'
  },
  {
    id: 'cand-008',
    registrationNumber: '03010008',
    fullName: 'يحياوي عز الدين بن أحمد',
    birthDate: '1981-07-16',
    birthPlace: 'البرمة',
    specialtyId: 'dir_sec',
    promotionYear: '2024-2025',
    groupNumber: 'الفوج 02',
    roomNumber: 'قاعة ابن خلدون',
    attendanceStatus: 'present'
  },
  {
    id: 'cand-009',
    registrationNumber: '03010009',
    fullName: 'شريفي نادية بنت صالح',
    birthDate: '1990-12-05',
    birthPlace: 'الأغواط',
    specialtyId: 'dir_sec',
    promotionYear: '2024-2025',
    groupNumber: 'الفوج 02',
    roomNumber: 'قاعة ابن خلدون',
    attendanceStatus: 'present'
  },
  {
    id: 'cand-010',
    registrationNumber: '03010010',
    fullName: 'بلعربي رضوان بن عبد السلام',
    birthDate: '1985-09-21',
    birthPlace: 'الأغواط',
    specialtyId: 'dir_sec',
    promotionYear: '2024-2025',
    groupNumber: 'الفوج 02',
    roomNumber: 'قاعة ابن خلدون',
    attendanceStatus: 'present'
  }
];

export const INITIAL_ROOMS: ExamRoom[] = [
  { id: 'room-01', name: 'مدرج الشيخ زاهية حسين', capacity: 60, building: 'الجناح البيداغوجي أ' },
  { id: 'room-02', name: 'قاعة العلامة ابن خلدون', capacity: 35, building: 'الجناح البيداغوجي ب' },
  { id: 'room-03', name: 'قاعة المفكر مالك بن نبي', capacity: 35, building: 'الجناح البيداغوجي ب' },
  { id: 'room-04', name: 'قاعة الشاعر مفدي زكريا', capacity: 30, building: 'الجناح البيداغوجي ج' }
];

export const INITIAL_PROCTORS: ProctorTeacher[] = [
  { id: 'proc-01', fullName: 'أ.د. بلقاسم بن عيسى', institution: 'المعهد الوطني بالأغواط', phone: '0661223344', specialty: 'التشريع المدرسي والتنظيم الإداري' },
  { id: 'proc-02', fullName: 'أ. سميرة بن براهيم', institution: 'مفتشية التربية الوطنية', phone: '0662334455', specialty: 'علوم التربية وهندسة التكوين' },
  { id: 'proc-03', fullName: 'أ. عبد القادر دليحة', institution: 'المعهد الوطني بالأغواط', phone: '0663445566', specialty: 'التسيير المالي والمادي' },
  { id: 'proc-04', fullName: 'أ. فاطمة الزهراء حيدوسي', institution: 'المعهد الوطني بالأغواط', phone: '0664556677', specialty: 'التسيير البيداغوجي والقيادة' },
  { id: 'proc-05', fullName: 'أ. كمال بن سالم', institution: 'مفتشية إدارة التغذية المدرسية', phone: '0665667788', specialty: 'المحاسبة العمومية والصفقات' },
  { id: 'proc-06', fullName: 'أ. نادية شريفي', institution: 'ثانوية المقراني', phone: '0666778899', specialty: 'اللغة العربية والاتصال الإداري' },
  { id: 'proc-07', fullName: 'أ. رضوان بلعربي', institution: 'مفتشية التعليم الابتدائي', phone: '0667889900', specialty: 'التقويم والمتابعة التربوية' },
  { id: 'proc-08', fullName: 'أ. مريم سعودي', institution: 'المعهد الوطني بالأغواط', phone: '0668990011', specialty: 'علم النفس التربوي والاجتماعي' }
];

export const INITIAL_SESSION: ExamSession = {
  id: 'ses_2025_lagh_01',
  name: 'امتحان التخرج النهائي - دورة جوان 2027',
  academicYear: '2026 / 2027',
  specialtyId: 'dir_sec',
  startDate: '2027-06-13',
  endDate: '2027-06-17',
  trainingYearStartDate: '2026-10-15',
  examStartDate: '2027-06-13',
  examEndDate: '2027-06-17',
  morningTimeSlot: '08:30 - 11:30',
  afternoonTimeSlot: '14:00 - 17:00',
  wilayaCode: '03',
  isAnonymatLocked: false,
  isDecoded: false,
  encryptionKeyHash: 'INFPE-ALG-2027-VAULT',
  presidentName: `${INSTITUTION.director} (${INSTITUTION.directorTitle})`
};

export const INITIAL_EXAM_SUBJECTS: ExamSubject[] = [
  {
    id: 'subj_leg_01',
    moduleId: 'mod_leg_dir_sec',
    specialtyId: 'dir_sec',
    title: 'امتحان نهاية التكوين في مقياس التشريع المدرسي والتنظيم الإداري',
    sessionTitle: 'دورة جوان 2025',
    examDate: '2025-06-15',
    duration: '03 ساعات',
    coefficient: 3,
    instructions: 'يمنع منعاً باتاً تدوين أي إشارة أو اسم على ورقة الإجابة خارج اللسان المخصص للقص. الإجابة باللغة العربية حصراً.',
    content: `${INSTITUTION.republic}
${INSTITUTION.ministry}
${INSTITUTION.name}
${INSTITUTION.deputyDirectorate}
${INSTITUTION.service}

الموضوع الأول (إلزامي):
بصفتك مديراً لثانوية حديثة النشأة، واجهت في مستهل الدخول المدرسي جملة من الإشكالات الإدارية والقانونية:
1. امتنع بعض الأساتذة عن حضور الجلسات التنسيقية والمجالس البيداغوجية بحجة عدم وجود نص تشريعي صريح يلزمهم بذلك خارج ساعات التدريس.
2. تلقيت طلباً من جمعية أولياء التلاميذ لعقد جمعية عامة واستغلال مرافق المؤسسة أثناء عطلة نهاية الأسبوع.
3. وقوع حادث مدرسي لتلميذ داخل المخبر أثناء حصة العلوم الفيزيائية نتيجة خطأ تجريبي.

المطلوب:
أ) انطلاقاً من القانون التوجيهي للتربية الوطنية 08-04 والمرسوم التنفيذي 08-315 والقرارات الوزارية المحددة لمهام موظفي التعليم:
   - بين الأساس القانوني الذي يستند إليه مدير الثانوية لإلزام الأساتذة بالمشاركة في مجالس التعليم ومجالس الأقسام.
   - وضح الإجراءات الإدارية والتربوية الواجب اتخاذها في حق الممتنعين.
ب) حدد الإطار القانوني المحدد للعلاقة بين المؤسسة التعليمية وجمعية أولياء التلاميذ، مع تفصيل شروط الترخيص باستغلال المرافق المدرسية.
ج) حرر تقريراً إدارياً شاملاً موجهاً لمدير التربية للولاية حول الحادث المدرسي متضمناً التحقيق الإداري والمسؤوليات والإجراءات الوقائية.`,
    gradingScale: `سلم التنقيط المفصل (20/20):
1. الأساس القانوني لمهام الأستاذ ومجالس التعليم (04 نقاط)
2. الإجراءات الإدارية والتدرج التأديبي (03 نقاط)
3. الإطار القانوني للعلاقة مع جمعية أولياء التلاميذ وضوابط استغلال المرافق (04 نقاط)
4. منهجية تحرير التقرير الإداري ومحاوره القانونية الثلاثة (06 نقاط)
5. سلامة اللغة والمصطلحات القانونية ودقة الاستشهاد بالنصوص (03 نقاط)`,
    status: 'approved'
  },
  {
    id: 'subj_ped_02',
    moduleId: 'mod_ped_dir_sec',
    specialtyId: 'dir_sec',
    title: 'امتحان نهاية التكوين في مقياس علوم التربية وهندسة التكوين',
    sessionTitle: 'دورة جوان 2025',
    examDate: '2025-06-16',
    duration: '03 ساعات',
    coefficient: 3,
    instructions: 'يرجى احترام التسلسل المنطقي وتحليل الوضعيات بأبعادها البيداغوجية والقيادية.',
    content: `الوضعية الإشكالية:
أظهرت قراءة النتائج الإحصائية للفصل الأول في مؤسستك تدنياً ملحوظاً في التحصيل الدراسي لتلاميذ السنة الأولى ثانوي في مادة الرياضيات، مصحوباً بارتفاع نسبة الغيابات وحالات التسرب المدرسي.
بصفتك قائداً بيداغوجياً ورئيساً لمجلس التوجيه والتسيير:
1. صمم خطة تدخّل بيداغوجية تشاركية (Projet d'Établissement) لمعالجة الضعف التحصيلي، مبيناً المراحل والمعايير والمؤشرات.
2. كيف توظف أدوات التقويم التكويني والدعم البيداغوجي وفق المقاربة بالكفاءات؟
3. اقترح مخططاً لتكوين الأساتذة داخلياً يرتكز على هندسة التكوين التشاركي وتفعيل الفريق التربوي.`,
    gradingScale: `سلم التنقيط:
- تشخيص الوضعية وبناء المؤشرات الدالة: 04 نقاط
- هيكلة مشروع المؤسسة ومراحله الإجرائية: 06 نقاط
- التقويم التكويني والدعم البيداغوجي: 05 نقاط
- مخطط هندسة التكوين الداخلي وتنشيط الفريق: 05 نقاط`,
    status: 'approved'
  }
];

export interface SecretariatMember {
  id: string;
  fullName: string;
  role: string;
  phone?: string;
}

export interface InstitutionSettings {
  directorName: string;
  directorTitle: string;
  secretariatMembers: SecretariatMember[];
}

export const INITIAL_INSTITUTION_SETTINGS: InstitutionSettings = {
  directorName: 'د. بلخيري محمد',
  directorTitle: 'مدير المعهد ورئيس مركز الامتحان',
  secretariatMembers: [
    { id: 'sec_01', fullName: 'أ. لزهاري أحمد', role: 'مسؤول أمانة المركز والرقابة الإدارية', phone: '' },
    { id: 'sec_02', fullName: 'أ. قادري فاطمة', role: 'عضو أمانة المركز ومتابعة الأظرفة', phone: '' },
    { id: 'sec_03', fullName: 'أ. بلعيدي صالح', role: 'عضو أمانة المركز وتدقيق محاضر الحضور', phone: '' }
  ]
};

export interface AppDatabaseState {
  specialties: Specialty[];
  modules: ExamModule[];
  candidates: Candidate[];
  sessions: ExamSession[];
  currentSessionId: string;
  anonymatMappings: AnonymatMapping[];
  grades: GradeRecord[];
  examSubjects: ExamSubject[];
  auditLogs: AuditLog[];
  secretKey: string;
  isLocked: boolean;
  proctors: ProctorTeacher[];
  rooms: ExamRoom[];
  timetable?: TimetableSlot[];
  institutionSettings?: InstitutionSettings;
}

export class OfflineStorageManager {
  private static state: AppDatabaseState | null = null;

  static load(): AppDatabaseState {
    if (this.state) return this.state;

    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (serialized) {
        const parsed: AppDatabaseState = JSON.parse(serialized);

        // Ensure all official ranks are synced in specialties
        const existingSpecIds = new Set(parsed.specialties.map(s => s.id));
        INITIAL_SPECIALTIES.forEach(spec => {
          if (!existingSpecIds.has(spec.id)) {
            parsed.specialties.push(spec);
          }
        });

        // Ensure all official modules are synced
        const existingModIds = new Set(parsed.modules.map(m => m.id));
        INITIAL_MODULES.forEach(mod => {
          if (!existingModIds.has(mod.id)) {
            parsed.modules.push(mod);
          }
        });

        // Normalize candidate registration numbers to official 8-digit format if older format was stored
        if (parsed.candidates && parsed.candidates.length > 0) {
          parsed.candidates = parsed.candidates.map((c, idx) => {
            if (c.registrationNumber && (c.registrationNumber.includes('INFPE') || c.registrationNumber.includes('/'))) {
              const seq = (idx + 1).toString().padStart(4, '0');
              return { ...c, registrationNumber: `0301${seq}` };
            }
            return c;
          });
        }

        // Ensure proctors & rooms are initialized if missing
        if (!parsed.proctors || parsed.proctors.length === 0) {
          parsed.proctors = INITIAL_PROCTORS;
        }
        if (!parsed.rooms || parsed.rooms.length === 0) {
          parsed.rooms = INITIAL_ROOMS;
        }

        // Ensure current session has calendar fields
        const curr = parsed.sessions.find(s => s.id === parsed.currentSessionId) || parsed.sessions[0];
        if (curr) {
          if (!curr.morningTimeSlot) curr.morningTimeSlot = '08:30 - 11:30';
          if (!curr.afternoonTimeSlot) curr.afternoonTimeSlot = '14:00 - 17:00';
          if (!curr.trainingYearStartDate) curr.trainingYearStartDate = '2026-10-15';
          if (!curr.examStartDate) curr.examStartDate = '2027-06-13';
          if (!curr.examEndDate) curr.examEndDate = '2027-06-17';
        }

        // Ensure institutionSettings are initialized if missing
        if (!parsed.institutionSettings) {
          parsed.institutionSettings = INITIAL_INSTITUTION_SETTINGS;
        }

        this.state = parsed;
        return parsed;
      }
    } catch (e) {
      console.warn('Could not read existing local DB, fallback to seed', e);
    }

    // Default Seed State
    const defaultState: AppDatabaseState = {
      specialties: INITIAL_SPECIALTIES,
      modules: INITIAL_MODULES,
      candidates: INITIAL_CANDIDATES,
      sessions: [INITIAL_SESSION],
      currentSessionId: INITIAL_SESSION.id,
      anonymatMappings: [],
      grades: [],
      examSubjects: INITIAL_EXAM_SUBJECTS,
      auditLogs: [
        {
          id: 'log-init',
          timestamp: new Date().toISOString(),
          user: INSTITUTION.serviceHeadTitle,
          action: 'تهيئة النظام المحلي',
          details: 'تم تفعيل النظام المكتبي المستقل وتخزين البيانات في المستودع المحلي الآمن.',
          severity: 'info'
        }
      ],
      secretKey: 'INFPE_LAGHOUAT_SEC_KEY_2025',
      isLocked: false,
      proctors: INITIAL_PROCTORS,
      rooms: INITIAL_ROOMS,
      timetable: [],
      institutionSettings: INITIAL_INSTITUTION_SETTINGS
    };

    this.state = defaultState;
    this.save(defaultState);
    return defaultState;
  }

  static switchOrCreateSessionForSpecialty(specialtyId: string, customName?: string): AppDatabaseState {
    const state = this.load();
    const existing = state.sessions.find(s => s.specialtyId === specialtyId);
    if (existing) {
      state.currentSessionId = existing.id;
    } else {
      const spec = state.specialties.find(sp => sp.id === specialtyId);
      const title = spec ? spec.titleAr : specialtyId;
      const newSession: ExamSession = {
        id: `ses_${specialtyId}_${Date.now()}`,
        name: customName || `دورة التخرج الرسمية - ${title} (2027)`,
        academicYear: '2026 / 2027',
        specialtyId,
        startDate: '2027-06-13',
        endDate: '2027-06-17',
        trainingYearStartDate: '2026-10-15',
        examStartDate: '2027-06-13',
        examEndDate: '2027-06-17',
        morningTimeSlot: '08:30 - 11:30',
        afternoonTimeSlot: '14:00 - 17:00',
        isAnonymatLocked: false,
        isDecoded: false,
        encryptionKeyHash: `INFPE-VAULT-${specialtyId.toUpperCase()}`,
        presidentName: `${INSTITUTION.director} (${INSTITUTION.directorTitle})`
      };
      state.sessions.push(newSession);
      state.currentSessionId = newSession.id;
    }
    this.save(state);
    return state;
  }

  static save(state: AppDatabaseState): void {
    this.state = state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to persist to localStorage', e);
    }
  }

  static addAuditLog(action: string, details: string, severity: 'info' | 'warning' | 'security' = 'info'): void {
    const s = this.load();
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      user: 'رئيس مصلحة الامتحانات',
      action,
      details,
      severity
    };
    s.auditLogs.unshift(newLog);
    if (s.auditLogs.length > 200) s.auditLogs = s.auditLogs.slice(0, 200);
    this.save(s);
  }

  static exportSqliteOrJsonDump(): { filename: string; blob: Blob } {
    const s = this.load();
    const jsonStr = JSON.stringify(s, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const filename = `INFPE_Laghouat_ExamDB_${new Date().toISOString().slice(0, 10)}.sqlite.json`;
    return { filename, blob };
  }

  static importDump(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.candidates && parsed.modules && parsed.sessions) {
        this.save(parsed);
        this.addAuditLog('استعادة قاعدة البيانات', 'تم استيراد نسخة احتياطية بنجاح إلى المستودع المحلي', 'security');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  static resetToSeed(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.state = null;
    this.load();
  }
}
