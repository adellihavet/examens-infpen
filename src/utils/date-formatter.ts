/**
 * Algerian Public Service Educational Date & Academic Year Formatting Utilities
 * المعايير الرسمية لكتابة التواريخ والسنة التكوينية:
 * 1. نظام كتابة التواريخ: يوم/شهر/سنة (DD/MM/YYYY)
 * 2. نظام السنة التكوينية: السنة السابقة / السنة اللاحقة (مثال: 2026 / 2027)
 */

/**
 * Formats any date input (ISO string, Date object, or timestamp)
 * to strictly adhere to the Arabic day/month/year format: DD/MM/YYYY
 *
 * @param date - Date object, ISO string (YYYY-MM-DD), or date string
 * @returns Formatted date string "DD/MM/YYYY" or "—" if invalid/empty
 */
export function formatArabicDate(date?: string | number | Date | null): string {
  if (!date && date !== 0) return '—';

  // If already a Date object
  if (date instanceof Date) {
    if (isNaN(date.getTime())) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}/${month}/${day}`;
  }

  const str = String(date).trim();
  if (!str) return '—';

  // Check if it's already DD/MM/YYYY or D/M/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}/${month}/${day}`;
  }

  // Check if it's YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  // Try parsing with Date constructor
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${year}/${month}/${day}`;
  }

  // If unparseable, return original
  return str;
}

/**
 * Returns today's date formatted according to the Arabic official format: DD/MM/YYYY
 */
export function getCurrentArabicDate(): string {
  return formatArabicDate(new Date());
}

/**
 * Normalizes and formats the academic training year strictly as:
 * "السنة السابقة / السنة اللاحقة" (e.g., "2026 / 2027")
 *
 * @param input - e.g. "2026 / 2027", "2026-2027", "2026/2027", "2027/2026", "2026"
 * @returns Normalized string "السنة السابقة / السنة اللاحقة" (e.g. "2026 / 2027")
 */
export function formatAcademicYear(input?: string | null): string {
  if (!input) return '2026 / 2027';

  // Find all 4-digit years in the string
  const matches = input.match(/\b(19\d{2}|20\d{2})\b/g);

  if (matches && matches.length >= 2) {
    const y1 = parseInt(matches[0], 10);
    const y2 = parseInt(matches[1], 10);
    const prevYear = Math.min(y1, y2);
    const nextYear = Math.max(y1, y2);
    return `${prevYear} / ${nextYear}`;
  } else if (matches && matches.length === 1) {
    const y = parseInt(matches[0], 10);
    return `${y} / ${y + 1}`;
  }

  return '2026 / 2027';
}

/**
 * Bidi-safe academic year string that enforces LTR visual presentation
 * so that in RTL paragraphs, the previous year strictly appears before the following year.
 */
export function formatAcademicYearBidi(input?: string | null): string {
  const formatted = formatAcademicYear(input);
  // Using Left-to-Right Embedding (U+202A) and Pop Directional Formatting (U+202C)
  return `\u202A${formatted}\u202C`;
}
