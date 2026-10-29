import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { parseTarget } from '@/lib/target';

export const dynamic = 'force-dynamic';

function parseId(params) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// PUT /api/target/:id -> ubah target
export async function PUT(request, { params }) {
  try {
    const id = parseId(await params);
    if (!id) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

    const { value, error } = parseTarget(await request.json());
    if (error) return NextResponse.json({ error }, { status: 400 });

    const result = await query(
      `UPDATE target_tabungan
       SET nama_target = ?, deskripsi = ?, target_nominal = ?, tanggal_mulai = ?, tanggal_selesai = ?
       WHERE id = ?`,
      [value.nama, value.deskripsi, value.nominal, value.mulai, value.selesai, id]
    );
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Target tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Gagal mengubah target' }, { status: 500 });
  }
}

// DELETE /api/target/:id -> hapus target (transaksi terkait ikut terhapus via ON DELETE CASCADE)
export async function DELETE(_request, { params }) {
  try {
    const id = parseId(await params);
    if (!id) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

    const result = await query('DELETE FROM target_tabungan WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Target tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Gagal menghapus target' }, { status: 500 });
  }
}
