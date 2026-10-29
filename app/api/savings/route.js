import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isValidDate } from '@/lib/dates';

export const dynamic = 'force-dynamic';

// GET /api/savings?goal_id=&limit= -> riwayat setoran terbaru
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const goalId = Number(searchParams.get('goal_id'));
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 500);

    const where = Number.isInteger(goalId) && goalId > 0 ? 'WHERE s.goal_id = ?' : '';
    const params = where ? [goalId, limit] : [limit];

    const rows = await query(
      `SELECT s.id, s.goal_id, g.name AS goal_name, s.amount, s.note, s.saved_at
       FROM savings s
       JOIN goals g ON g.id = s.goal_id
       ${where}
       ORDER BY s.saved_at DESC, s.id DESC
       LIMIT ?`,
      params
    );
    return NextResponse.json(rows.map((r) => ({ ...r, amount: Number(r.amount) })));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Gagal mengambil riwayat tabungan' }, { status: 500 });
  }
}

// POST /api/savings -> catat setoran baru
export async function POST(request) {
  try {
    const body = await request.json();
    const goalId = Number(body?.goal_id);
    const amount = Number(body?.amount);
    const savedAt = String(body?.saved_at ?? '');
    const note = String(body?.note ?? '').trim().slice(0, 255) || null;

    if (!Number.isInteger(goalId) || goalId <= 0) {
      return NextResponse.json({ error: 'Pilih tujuan menabung' }, { status: 400 });
    }
    if (!Number.isInteger(amount) || amount <= 0 || amount > 1e12) {
      return NextResponse.json({ error: 'Nominal harus berupa angka bulat lebih dari 0' }, { status: 400 });
    }
    if (!isValidDate(savedAt)) {
      return NextResponse.json({ error: 'Format tanggal tidak valid' }, { status: 400 });
    }

    const goal = await query('SELECT id FROM goals WHERE id = ?', [goalId]);
    if (goal.length === 0) {
      return NextResponse.json({ error: 'Tujuan tidak ditemukan' }, { status: 404 });
    }

    const result = await query(
      'INSERT INTO savings (goal_id, amount, note, saved_at) VALUES (?, ?, ?, ?)',
      [goalId, amount, note, savedAt]
    );
    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Gagal menyimpan tabungan' }, { status: 500 });
  }
}
