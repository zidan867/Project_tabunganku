import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isValidDate, weekStart, monthStart, daysInclusive } from '@/lib/dates';

export const dynamic = 'force-dynamic';

// GET /api/summary?today=YYYY-MM-DD&target_id=
// "today" dikirim dari browser supaya sesuai zona waktu pengguna.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const today = searchParams.get('today');
    if (!isValidDate(today)) {
      return NextResponse.json({ error: 'Parameter today (YYYY-MM-DD) wajib diisi' }, { status: 400 });
    }
    const targetId = Number(searchParams.get('target_id'));
    const filter = Number.isInteger(targetId) && targetId > 0;

    const wk = weekStart(today);
    const mo = monthStart(today);

    const [row] = await query(
      `SELECT COALESCE(SUM(CASE WHEN jenis = 'setoran' THEN jumlah ELSE -jumlah END), 0) AS saldo,
              COALESCE(SUM(CASE WHEN jenis = 'setoran' THEN jumlah ELSE 0 END), 0) AS total_setoran,
              COALESCE(SUM(CASE WHEN jenis = 'penarikan' THEN jumlah ELSE 0 END), 0) AS total_penarikan,
              MIN(CASE WHEN jenis = 'setoran' THEN DATE(tanggal_transaksi) END) AS first_date,
              COUNT(DISTINCT CASE WHEN jenis = 'setoran' THEN DATE(tanggal_transaksi) END) AS hari_menabung,
              COALESCE(SUM(CASE WHEN jenis = 'setoran' AND DATE(tanggal_transaksi) = ? THEN jumlah ELSE 0 END), 0) AS setoran_hari_ini,
              COALESCE(SUM(CASE WHEN jenis = 'setoran' AND DATE(tanggal_transaksi) BETWEEN ? AND ? THEN jumlah ELSE 0 END), 0) AS setoran_minggu_ini,
              COALESCE(SUM(CASE WHEN jenis = 'setoran' AND DATE(tanggal_transaksi) BETWEEN ? AND ? THEN jumlah ELSE 0 END), 0) AS setoran_bulan_ini
       FROM transaksi
       ${filter ? 'WHERE target_id = ?' : ''}`,
      [today, wk, today, mo, today, ...(filter ? [targetId] : [])]
    );

    const totalSetoran = Number(row.total_setoran);
    const hariMenabung = Number(row.hari_menabung);
    // Rata-rata per hari = total setoran / jumlah hari sejak setoran pertama sampai hari ini
    const spanDays = row.first_date ? daysInclusive(row.first_date, today) : 0;

    return NextResponse.json({
      saldo: Number(row.saldo),
      total_setoran: totalSetoran,
      total_penarikan: Number(row.total_penarikan),
      first_date: row.first_date,
      hari_menabung: hariMenabung,
      setoran_hari_ini: Number(row.setoran_hari_ini),
      setoran_minggu_ini: Number(row.setoran_minggu_ini),
      setoran_bulan_ini: Number(row.setoran_bulan_ini),
      rata_per_hari: spanDays > 0 ? Math.round(totalSetoran / spanDays) : 0,
      rata_per_hari_menabung: hariMenabung > 0 ? Math.round(totalSetoran / hariMenabung) : 0,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Gagal mengambil ringkasan' }, { status: 500 });
  }
}
