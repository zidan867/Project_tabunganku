import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// DELETE /api/transaksi/:id -> hapus satu transaksi
export async function DELETE(_request, { params }) {
  try {
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
    }
    const result = await query('DELETE FROM transaksi WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Gagal menghapus data' }, { status: 500 });
  }
}
