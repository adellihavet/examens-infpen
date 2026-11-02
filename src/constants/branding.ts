/**
 * Official Administrative Identity & Branding Constants
 * المعهد الوطني لتكوين موظفي قطاع التربية الوطنية الشيخ زاهية حسين الأغواط
 * نيابة مديرية التكوين والمسابقات والإمتحانات المهنية
 * مصلحة تنظيم سير المسابقات والإمتحانات المهنية
 */

export const INSTITUTION = {
  republic: 'الجمهورية الجزائرية الديمقراطية الشعبية',
  ministry: 'وزارة التربية الوطنية',
  name: 'المعهد الوطني لتكوين موظفي قطاع التربية الوطنية الشيخ زاهية حسين الأغواط',
  shortName: 'INFPE الأغواط',
  deputyDirectorate: 'نيابة مديرية التكوين والمسابقات والإمتحانات المهنية',
  service: 'مصلحة تنظيم سير المسابقات والإمتحانات المهنية',
  wilaya: 'الأغواط',
  director: 'أ.د. مسعودي عبد الرزاق',
  directorTitle: 'مدير المعهد',
  serviceHeadTitle: 'رئيس مصلحة تنظيم سير المسابقات والإمتحانات المهنية'
} as const;

/**
 * 5-Line Official Administrative Header for all official forms, exam sheets, and PVs
 */
export const OFFICIAL_ADMIN_HEADER_LINES: string[] = [
  INSTITUTION.republic,
  INSTITUTION.ministry,
  INSTITUTION.name,
  INSTITUTION.deputyDirectorate,
  INSTITUTION.service
];

/**
 * Reusable React component or markup generator for the official header
 */
export const OFFICIAL_HEADER_TEXT = OFFICIAL_ADMIN_HEADER_LINES.join('\n');

/**
 * Re-export official date and academic year formatting utilities
 */
export {
  formatArabicDate,
  getCurrentArabicDate,
  formatAcademicYear,
  formatAcademicYearBidi
} from '../utils/date-formatter';

/**
 * Re-export official candidate registration number utilities
 */
export {
  DEFAULT_INSTITUTE_WILAYA_CODE,
  RANK_NUMERIC_CODES,
  getRankNumericCode,
  generateRegistrationNumber,
  parseRegistrationNumber,
  validateRegistrationNumber,
  getNextRegistrationNumber
} from '../utils/registration-number';


