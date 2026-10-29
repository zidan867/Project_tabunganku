import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { parseTarget } from '@/lib/target';

export const dynamic = 'force-dynamic';

// GET /api/target -> daftar target beserta saldo terkumpul (setoran - penarikan)
export async function GET() {
  try {
    const rows = await query(
      `SELECT t.id, t.nama_target, t.deskripsi, t.target_nominal,
              t.tanggal_mulai, t.tanggal_selesai, t.created_at,
              COALESCE(SUM(CASE WHEN x.jenis = 'setoran' THEN x.jumlah
                                WHEN x.jenis = 'penarikan' THEN -x.jumlah END), 0) AS saldo,
              COUNT(x.id) AS jumlah_transaksi
       FROM target_tabungan t
       LEFT JOIN transaksi x ON x.target_id = t.id
       GROUP BY t.id, t.nama_target, t.deskripsi, t.target_nominal,
                t.tanggal_mulai, t.tanggal_selesai, t.created_at
       ORDER BY t.created_at DESC, t.id DESC`
    );
    return NextResponse.json(
      rows.map((r) => ({
        ...r,
        target_nominal: Number(r.target_nominal),
        saldo: Number(r.saldo),
        jumlah_transaksi: Number(r.jumlah_transaksi),
      }))
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Gagal mengambil data target' }, { status: 500 });
  }
}

// POST /api/target -> buat target baru
export async function POST(request) {
  try {
    const { value, error } = parseTarget(await request.json());
    if (error) return NextResponse.json({ error }, { status: 400 });

    const result = await query(
      `INSERT INTO target_tabungan (nama_target, deskripsi, target_nominal, tanggal_mulai, tanggal_selesai)
       VALUES (?, ?, ?, ?, ?)`,
      [value.nama, value.deskripsi, value.nominal, value.mulai, value.selesai]
    );
    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Gagal menyimpan target' }, { status: 500 });
  }
}
