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

// GET /api/goals -> daftar tujuan beserta total yang sudah terkumpul
export async function GET() {
  try {
    const rows = await query(
      `SELECT g.id, g.name, g.target_amount, g.deadline, g.created_at,
              COALESCE(SUM(s.amount), 0) AS saved,
              COUNT(s.id) AS deposit_count
       FROM goals g
       LEFT JOIN savings s ON s.goal_id = g.id
       GROUP BY g.id, g.name, g.target_amount, g.deadline, g.created_at
       ORDER BY g.created_at DESC, g.id DESC`
    );
    return NextResponse.json(
      rows.map((r) => ({
        ...r,
        target_amount: Number(r.target_amount),
        saved: Number(r.saved),
        deposit_count: Number(r.deposit_count),
      }))
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Gagal mengambil data tujuan' }, { status: 500 });
  }
}

// POST /api/goals -> buat tujuan baru
export async function POST(request) {
  try {
    const { value, error } = parseGoal(await request.json());
    if (error) return NextResponse.json({ error }, { status: 400 });

    const result = await query(
      'INSERT INTO goals (name, target_amount, deadline) VALUES (?, ?, ?)',
      [value.name, value.target, value.deadline]
    );
    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Gagal menyimpan tujuan' }, { status: 500 });
  }
}
