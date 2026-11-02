import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatArabicDate, getCurrentArabicDate, formatAcademicYear, formatAcademicYearBidi } from './date-formatter.js';

test('formatArabicDate formats ISO dates YYYY-MM-DD to YYYY/MM/DD', () => {
  assert.equal(formatArabicDate('1985-05-12'), '1985/05/12');
  assert.equal(formatArabicDate('2027-06-13'), '2027/06/13');
  assert.equal(formatArabicDate('1982-4-2'), '1982/04/02');
});

test('formatArabicDate handles Date objects', () => {
  const d = new Date(2026, 9, 31); // 31 Oct 2026
  assert.equal(formatArabicDate(d), '2026/10/31');
});

test('formatArabicDate formats to YYYY/MM/DD padded', () => {
  assert.equal(formatArabicDate('1/5/1988'), '1988/05/01');
  assert.equal(formatArabicDate('14/08/1980'), '1980/08/14');
});

test('formatArabicDate handles empty or null', () => {
  assert.equal(formatArabicDate(null), '—');
  assert.equal(formatArabicDate(undefined), '—');
  assert.equal(formatArabicDate(''), '—');
});

test('getCurrentArabicDate returns current date in YYYY/MM/DD format', () => {
  const todayStr = getCurrentArabicDate();
  assert.match(todayStr, /^\d{4}\/\d{2}\/\d{2}$/);
});

test('formatAcademicYear orders Previous Year / Following Year', () => {
  assert.equal(formatAcademicYear('2026 / 2027'), '2026 / 2027');
  assert.equal(formatAcademicYear('2026-2027'), '2026 / 2027');
  assert.equal(formatAcademicYear('2026/2027'), '2026 / 2027');
  // Even if inverted in input, it forces Previous Year / Following Year
  assert.equal(formatAcademicYear('2027 / 2026'), '2026 / 2027');
  assert.equal(formatAcademicYear('2024 - 2025'), '2024 / 2025');
  // If single year given
  assert.equal(formatAcademicYear('2026'), '2026 / 2027');
});

test('formatAcademicYearBidi wraps with directional isolation', () => {
  const bidi = formatAcademicYearBidi('2026/2027');
  assert.equal(bidi, '\u202A2026 / 2027\u202C');
});
