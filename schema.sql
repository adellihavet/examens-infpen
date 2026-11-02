-- ============================================================================
-- مخطط قاعدة بيانات مصلحة الامتحانات والتشفير - INFPE الأغواط
-- المعهد الوطني لتكوين موظفي قطاع التربية (معهد الشيخ حسين زاهية بالأغواط)
-- النظام الرقمي المستقل (Offline SQLite Database Schema)
-- ============================================================================

PRAGMA foreign_keys = ON;
PRAGMA encoding = 'UTF-8';

-- ----------------------------------------------------------------------------
-- 1. جدول الرتب والشعب التكوينية (Specialties / Promotions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS specialties (
    id VARCHAR(32) PRIMARY KEY,
    title_ar VARCHAR(120) NOT NULL,            -- e.g. مدير ثانوية، مفتش التعليم الابتدائي
    title_fr VARCHAR(120) NOT NULL,            -- e.g. Directeur de Lycée
    category VARCHAR(80) NOT NULL,             -- سلك الإدارة، سلك التفتيش، المصالح الاقتصادية
    duration_months INTEGER DEFAULT 12,        -- مدة التكوين بالأشهر
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. جدول الدورات الامتحانية (Exam Sessions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_sessions (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,                -- e.g. دورة التخرج النهائي - جوان 2025
    academic_year VARCHAR(20) NOT NULL,        -- 2024-2025
    specialty_id VARCHAR(32) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    president_name VARCHAR(100) NOT NULL,      -- مدير المعهد رئيس اللجنة
    is_anonymat_locked BOOLEAN DEFAULT 0,      -- هل تم قفل وتوليد التشفير؟
    is_decoded BOOLEAN DEFAULT 0,              -- هل تم رفع الإغفال والمصادقة على المداولات؟
    decoding_date TIMESTAMP NULL,              -- تاريخ وتوقيت فتح الخزينة ورفع الإغفال
    encryption_key_hash VARCHAR(128) NOT NULL, -- تجزئة مفتاح التشفير السري
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- 3. جدول المقاييس التكوينية والامتحانية (Modules)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_modules (
    id VARCHAR(32) PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,          -- e.g. LEG-01, PED-02, FIN-03
    title_ar VARCHAR(150) NOT NULL,            -- التشريع المدرسي، علوم التربية
    specialty_id VARCHAR(32) NOT NULL,
    coefficient REAL NOT NULL DEFAULT 1.0,     -- المعامل
    eliminatory_grade REAL NOT NULL DEFAULT 5.0, -- النقطة الإقصائية (عادة 05.00/20)
    disparity_threshold REAL NOT NULL DEFAULT 3.5, -- عتبة الفارق للتصحيح الثالث (|ت1-ت2| > 3.5)
    max_grade REAL NOT NULL DEFAULT 20.0,      -- العلامة القصوى 20
    duration_minutes INTEGER NOT NULL DEFAULT 180, -- مدة الاختبار بالدقائق
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- 4. جدول المترشحين للدورة (Candidates)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS candidates (
    id VARCHAR(36) PRIMARY KEY,
    registration_number VARCHAR(30) NOT NULL UNIQUE, -- رقم التسجيل الرسمي الوزاري (2025/INFPE/001)
    full_name VARCHAR(120) NOT NULL,                -- اللقب والاسم الكامل
    birth_date DATE NOT NULL,                       -- تاريخ الميلاد
    birth_place VARCHAR(80) NOT NULL,               -- مكان الميلاد
    specialty_id VARCHAR(32) NOT NULL,
    session_id VARCHAR(32) NOT NULL,
    group_number VARCHAR(30) NOT NULL,              -- الفوج التكويني (الفوج 01)
    room_number VARCHAR(40) NOT NULL,               -- قاعة الامتحان (مدرج الشيخ زاهية)
    attendance_status VARCHAR(20) DEFAULT 'present' -- present, absent, justified_absent
        CHECK (attendance_status IN ('present', 'absent', 'justified_absent')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 5. جدول التشفير والإغفال السري (Anonymat Vault)
-- يُحفظ هذا الجدول مشفراً في الخزينة الفولاذية ولا يتاح إلا للجنة التشفير
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS anonymat_vault (
    id VARCHAR(36) PRIMARY KEY,
    candidate_id VARCHAR(36) NOT NULL,
    module_id VARCHAR(32) NOT NULL,
    session_id VARCHAR(32) NOT NULL,
    anonymat_code VARCHAR(30) NOT NULL,        -- رقم الإغفال السري (e.g. A-12840/73)
    barcode_payload VARCHAR(80) NOT NULL,      -- حمولة الباركود المشفر *INFPE-A-12840/73*
    qr_payload TEXT NOT NULL,                  -- بيانات مصفوفة QR الأمنية
    checksum VARCHAR(10) NOT NULL,             -- بصمة التحقق الرياضية (Modulo 97)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES exam_modules(id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE,
    -- قيد صارم: رقم الإغفال يجب أن يكون فريداً 100% داخل المقياس والدورة
    CONSTRAINT uq_session_module_anonymat UNIQUE (session_id, module_id, anonymat_code),
    -- قيد صارم: المترشح له رقم إغفال واحد فقط لكل مقياس
    CONSTRAINT uq_candidate_session_module UNIQUE (candidate_id, session_id, module_id)
);

-- ----------------------------------------------------------------------------
-- 6. جدول رصد النقاط والتصحيحات الثلاثة (Grades & Corrections)
-- يتم حجز النقاط حصراً بواسطة anonymat_code دون أي إشارة لبيانات المترشح
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_grades (
    id VARCHAR(36) PRIMARY KEY,
    anonymat_code VARCHAR(30) NOT NULL,
    module_id VARCHAR(32) NOT NULL,
    session_id VARCHAR(32) NOT NULL,
    first_corrector_grade REAL NULL,           -- نقطة المصحح الأول (/20)
    second_corrector_grade REAL NULL,          -- نقطة المصحح الثاني (/20)
    disparity REAL NULL,                       -- الفارق المحسوب (|ت1 - ت2|)
    needs_third_correction BOOLEAN DEFAULT 0,  -- هل تجاوز الفارق عتبة المقياس؟
    third_corrector_grade REAL NULL,           -- نقطة المصحح الثالث التحكيمي (/20)
    final_grade REAL NULL,                     -- النقطة النهائية المعتمدة بعد التحكيم
    is_absent BOOLEAN DEFAULT 0,               -- هل الورقة لغائب؟
    correction_notes TEXT NULL,                -- ملاحظات لجنة التصحيح
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES exam_modules(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT uq_grade_anonymat UNIQUE (session_id, module_id, anonymat_code)
);

-- ----------------------------------------------------------------------------
-- 7. جدول بنك مواضيع الامتحانات الوزارية (Exam Subject Bank)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_subjects (
    id VARCHAR(36) PRIMARY KEY,
    module_id VARCHAR(32) NOT NULL,
    specialty_id VARCHAR(32) NOT NULL,
    title VARCHAR(200) NOT NULL,
    session_title VARCHAR(100) NOT NULL,
    exam_date DATE NOT NULL,
    duration VARCHAR(30) NOT NULL,             -- 03 ساعات
    coefficient REAL NOT NULL DEFAULT 1.0,
    instructions TEXT NOT NULL,                -- توجيهات المترشح
    content TEXT NOT NULL,                     -- نص الأسئلة والوضعيات
    grading_scale TEXT NULL,                   -- سلم التنقيط التحليلي
    status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('draft', 'approved', 'final')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES exam_modules(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- 8. جدول محاضر المداولات الرسمية والنتائج (Deliberation Records)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deliberation_results (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(32) NOT NULL,
    candidate_id VARCHAR(36) NOT NULL,
    total_weighted_score REAL NOT NULL,        -- مجموع النقاط الموزونة (Σ Note * Coeff)
    total_coefficients REAL NOT NULL,          -- مجموع المعاملات
    final_average REAL NULL,                   -- المعدل العام (/20)
    rank INTEGER NULL,                         -- الترتيب التنازلي للناجحين
    decision VARCHAR(30) NOT NULL              -- 'ناجح' | 'مؤجل' | 'راسب' | 'مقصى' | 'غائب'
        CHECK (decision IN ('ناجح', 'مؤجل', 'راسب', 'مقصى', 'غائب')),
    mention VARCHAR(30) NOT NULL,              -- امتياز، جيد جداً، جيد، مقبول
    is_ratified BOOLEAN DEFAULT 0,             -- هل تمت مصادقة مدير المعهد واللجنة؟
    ratified_at TIMESTAMP NULL,
    FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT uq_deliberation_candidate UNIQUE (session_id, candidate_id)
);

-- ----------------------------------------------------------------------------
-- 9. جدول سجل التدقيق الأمني لمركز التشفير (Audit Logs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_name VARCHAR(80) NOT NULL,
    action_type VARCHAR(100) NOT NULL,         -- توليد التشفير، رفع الإغفال، حجز النقاط
    details TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'security')),
    ip_signature VARCHAR(50) DEFAULT '127.0.0.1 (Desktop Local)'
);

-- ----------------------------------------------------------------------------
-- الفهارس السريعة لتحسين الأداء الفوري (Performance & Integrity Indexes)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_candidates_session ON candidates(session_id);
CREATE INDEX IF NOT EXISTS idx_candidates_specialty ON candidates(specialty_id);
CREATE INDEX IF NOT EXISTS idx_candidates_reg_num ON candidates(registration_number);

CREATE INDEX IF NOT EXISTS idx_vault_anonymat ON anonymat_vault(anonymat_code);
CREATE INDEX IF NOT EXISTS idx_vault_candidate ON anonymat_vault(candidate_id);
CREATE INDEX IF NOT EXISTS idx_vault_module ON anonymat_vault(module_id);
CREATE INDEX IF NOT EXISTS idx_vault_session ON anonymat_vault(session_id);

CREATE INDEX IF NOT EXISTS idx_grades_anonymat ON exam_grades(anonymat_code);
CREATE INDEX IF NOT EXISTS idx_grades_module ON exam_grades(module_id);
CREATE INDEX IF NOT EXISTS idx_grades_needs_third ON exam_grades(needs_third_correction);

CREATE INDEX IF NOT EXISTS idx_deliberation_average ON deliberation_results(final_average DESC);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON security_audit_logs(timestamp DESC);
