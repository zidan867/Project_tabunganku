import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Ekspresi pengelompokan periode. Nilai period berasal dari whitelist, bukan input mentah.
const D = 'DATE(x.tanggal_transaksi)';
const PERIODS = {
  daily: { expr: D, limit: 31 },
  // Senin sebagai awal minggu
  weekly: { expr: `DATE_SUB(${D}, INTERVAL WEEKDAY(${D}) DAY)`, limit: 12 },
  monthly: { expr: `DATE_FORMAT(x.tanggal_transaksi, '%Y-%m')`, limit: 12 },
};

// GET /api/reports?period=daily|weekly|monthly&target_id=
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'daily';
    const cfg = PERIODS[period];
    if (!cfg) {
      return NextResponse.json({ error: 'period harus daily, weekly, atau monthly' }, { status: 400 });
    }
    const targetId = Number(searchParams.get('target_id'));
    const filter = Number.isInteger(targetId) && targetId > 0;

    const rows = await query(
      `SELECT ${cfg.expr} AS period,
              SUM(CASE WHEN x.jenis = 'setoran' THEN x.jumlah ELSE 0 END) AS setoran,
              SUM(CASE WHEN x.jenis = 'penarikan' THEN x.jumlah ELSE 0 END) AS penarikan,
              COUNT(*) AS jumlah_transaksi
       FROM transaksi x
       ${filter ? 'WHERE x.target_id = ?' : ''}
       GROUP BY period
       ORDER BY period DESC
       LIMIT ${cfg.limit}`,
      filter ? [targetId] : []
    );

    return NextResponse.json({
      period,
      rows: rows.map((r) => {
        const setoran = Number(r.setoran);
        const penarikan = Number(r.penarikan);
        return {
          period: String(r.period),
          setoran,
          penarikan,
          bersih: setoran - penarikan,
          jumlah_transaksi: Number(r.jumlah_transaksi),
        };
      }),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Gagal mengambil laporan' }, { status: 500 });
  }
}
