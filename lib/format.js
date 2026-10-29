const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function rupiah(n) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

function parts(str) {
  const [y, m, d] = str.split('-').map(Number);
  return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

export function formatDate(str) {
  const { y, m, d, dow } = parts(str);
  return `${HARI_PENDEK[dow]}, ${d} ${BULAN_PENDEK[m - 1]} ${y}`;
}

export function formatShort(str) {
  const { m, d } = parts(str);
  return `${d} ${BULAN_PENDEK[m - 1]}`;
}

export function formatWeek(startStr) {
  const s = parts(startStr);
  const end = new Date(Date.UTC(s.y, s.m - 1, s.d + 6));
  const e = { y: end.getUTCFullYear(), m: end.getUTCMonth() + 1, d: end.getUTCDate() };
  if (s.y === e.y && s.m === e.m) return `${s.d}–${e.d} ${BULAN_PENDEK[e.m - 1]} ${e.y}`;
  if (s.y === e.y) return `${s.d} ${BULAN_PENDEK[s.m - 1]} – ${e.d} ${BULAN_PENDEK[e.m - 1]} ${e.y}`;
  return `${s.d} ${BULAN_PENDEK[s.m - 1]} ${s.y} – ${e.d} ${BULAN_PENDEK[e.m - 1]} ${e.y}`;
}

export function formatMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${BULAN[m - 1]} ${y}`;
}

export function formatPeriod(period, value) {
  if (period === 'daily') return formatDate(value);
  if (period === 'weekly') return formatWeek(value);
  return formatMonth(value);
}

// Waktu lokal browser dalam format YYYY-MM-DD HH:MM:SS
export function nowLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${todayLocal()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Tanggal lokal browser dalam format YYYY-MM-DD
export function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
