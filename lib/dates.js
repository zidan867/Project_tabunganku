// Helper tanggal berbasis string 'YYYY-MM-DD' (hindari masalah zona waktu).

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(str) {
  if (typeof str !== 'string' || !DATE_RE.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function toUTC(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTC(dt) {
  return dt.toISOString().slice(0, 10);
}

export function addDays(str, n) {
  const dt = toUTC(str);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromUTC(dt);
}

// Senin sebagai awal minggu
export function weekStart(str) {
  const dt = toUTC(str);
  const dow = (dt.getUTCDay() + 6) % 7; // Senin = 0
  return addDays(str, -dow);
}

export function monthStart(str) {
  return str.slice(0, 7) + '-01';
}

// Selisih hari (inklusif) antara dua tanggal: sama hari => 1
export function daysInclusive(from, to) {
  const diff = Math.round((toUTC(to) - toUTC(from)) / 86400000);
  return Math.max(diff, 0) + 1;
}
