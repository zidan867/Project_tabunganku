import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isValidDate } from '@/lib/dates';

export const dynamic = 'force-dynamic';

const DATETIME_RE = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;

// Terima 'YYYY-MM-DD' atau 'YYYY-MM-DD HH:MM[:SS]'; kembalikan 'YYYY-MM-DD HH:MM:SS' atau null
function normalizeDateTime(input) {
  const s = String(input ?? '').trim();
  if (isValidDate(s)) return `${s} 00:00:00`;
  const m = DATETIME_RE.exec(s);
  if (!m || !isValidDate(m[1])) return null;
  const [, d, hh, mm, ss = '00'] = m;
  if (Number(hh) > 23 || Number(mm) > 59 || Number(ss) > 59) return null;
  return `${d} ${hh}:${mm}:${ss}`;
}

// GET /api/transaksi?target_id=&limit= -> riwayat transaksi terbaru
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetId = Number(searchParams.get('target_id'));
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 500);

    const where = Number.isInteger(targetId) && targetId > 0 ? 'WHERE x.target_id = ?' : '';
    const params = where ? [targetId, limit] : [limit];

    const rows = await query(
      `SELECT x.id, x.target_id, t.nama_target, x.jenis, x.jumlah, x.keterangan, x.tanggal_transaksi
       FROM transaksi x
       JOIN target_tabungan t ON t.id = x.target_id
       ${where}
       ORDER BY x.tanggal_transaksi DESC, x.id DESC
       LIMIT ?`,
      params
    );
    return NextResponse.json(rows.map((r) => ({ ...r, jumlah: Number(r.jumlah) })));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Gagal mengambil riwayat transaksi' }, { status: 500 });
  }
}

// POST /api/transaksi -> catat setoran atau penarikan
export async function POST(request) {
  try {
    const body = await request.json();
    const targetId = Number(body?.target_id);
    const jenis = String(body?.jenis ?? '');
    const jumlah = Number(body?.jumlah);
    const waktu = normalizeDateTime(body?.tanggal_transaksi);
    const keterangan = String(body?.keterangan ?? '').trim().slice(0, 255) || null;

    if (!Number.isInteger(targetId) || targetId <= 0) {
      return NextResponse.json({ error: 'Pilih target tabungan' }, { status: 400 });
    }
    if (jenis !== 'setoran' && jenis !== 'penarikan') {
      return NextResponse.json({ error: 'Jenis harus setoran atau penarikan' }, { status: 400 });
    }
    if (!Number.isInteger(jumlah) || jumlah <= 0 || jumlah > 1e12) {
      return NextResponse.json({ error: 'Jumlah harus berupa angka bulat lebih dari 0' }, { status: 400 });
    }
    if (!waktu) {
      return NextResponse.json({ error: 'Format tanggal tidak valid' }, { status: 400 });
    }

    const [target] = await query('SELECT id FROM target_tabungan WHERE id = ?', [targetId]);
    if (!target) {
      return NextResponse.json({ error: 'Target tidak ditemukan' }, { status: 404 });
    }

    if (jenis === 'penarikan') {
      const [row] = await query(
        `SELECT COALESCE(SUM(CASE WHEN jenis = 'setoran' THEN jumlah ELSE -jumlah END), 0) AS saldo
         FROM transaksi WHERE target_id = ?`,
        [targetId]
      );
      const saldo = Number(row.saldo);
      if (jumlah > saldo) {
        return NextResponse.json(
          { error: `Saldo tidak cukup. Saldo target ini ${new Intl.NumberFormat('id-ID').format(saldo)}` },
          { status: 400 }
        );
      }
    }

    const result = await query(
      'INSERT INTO transaksi (target_id, jenis, jumlah, keterangan, tanggal_transaksi) VALUES (?, ?, ?, ?, ?)',
      [targetId, jenis, jumlah, keterangan, waktu]
    );
    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Gagal menyimpan transaksi' }, { status: 500 });
  }
}
