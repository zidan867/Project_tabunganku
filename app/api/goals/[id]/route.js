import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isValidDate } from '@/lib/dates';

export const dynamic = 'force-dynamic';

function parseGoal(body) {
  const name = String(body?.name ?? '').trim();
  const target = Number(body?.target_amount);
  const deadline = body?.deadline ? String(body.deadline) : null;

  if (!name || name.length > 120) return { error: 'Nama tujuan wajib diisi (maks 120 karakter)' };
  if (!Number.isInteger(target) || target <= 0 || target > 1e13) {
    return { error: 'Target harus berupa angka bulat lebih dari 0' };
  }
  if (deadline && !isValidDate(deadline)) return { error: 'Format tanggal target tidak valid' };
  return { value: { name, target, deadline } };
}

function parseId(params) {
  const id = Number(params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// PUT /api/goals/:id -> ubah tujuan
export async function PUT(request, { params }) {
  try {
    const id = parseId(await params);
    if (!id) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

    const { value, error } = parseGoal(await request.json());
    if (error) return NextResponse.json({ error }, { status: 400 });

    const result = await query(
      'UPDATE goals SET name = ?, target_amount = ?, deadline = ? WHERE id = ?',
      [value.name, value.target, value.deadline, id]
    );
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Tujuan tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Gagal mengubah tujuan' }, { status: 500 });
  }
}

// DELETE /api/goals/:id -> hapus tujuan (setoran terkait ikut terhapus)
export async function DELETE(_request, { params }) {
  try {
    const id = parseId(await params);
    if (!id) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });

    const result = await query('DELETE FROM goals WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Tujuan tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Gagal menghapus tujuan' }, { status: 500 });
  }
}
