'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { rupiah, formatDate, formatShort, formatPeriod, todayLocal, nowLocal } from '@/lib/format';

const PERIOD_TABS = [
  { key: 'daily', label: 'Harian' },
  { key: 'weekly', label: 'Mingguan' },
  { key: 'monthly', label: 'Bulanan' },
];
const QUICK = [10000, 20000, 50000, 100000];

async function api(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
  return data;
}

const digitsOnly = (v) => String(v).replace(/\D/g, '');
const withDots = (v) => (v ? new Intl.NumberFormat('id-ID').format(Number(v)) : '');

export default function Home() {
  const [today, setToday] = useState(null);
  const [targets, setTargets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [transaksi, setTransaksi] = useState([]);
  const [report, setReport] = useState([]);
  const [period, setPeriod] = useState('daily');
  const [filterTarget, setFilterTarget] = useState('');
  const [notice, setNotice] = useState(null); // { type: 'ok' | 'error', text }
  const [loading, setLoading] = useState(true);

  // form transaksi
  const [xTarget, setXTarget] = useState('');
  const [xJenis, setXJenis] = useState('setoran');
  const [xJumlah, setXJumlah] = useState('');
  const [xDate, setXDate] = useState('');
  const [xKet, setXKet] = useState('');
  const [saving, setSaving] = useState(false);

  // form target
  const [editingId, setEditingId] = useState(null);
  const [tNama, setTNama] = useState('');
  const [tDeskripsi, setTDeskripsi] = useState('');
  const [tNominal, setTNominal] = useState('');
  const [tMulai, setTMulai] = useState('');
  const [tSelesai, setTSelesai] = useState('');

  useEffect(() => {
    const t = todayLocal();
    setToday(t);
    setXDate(t);
    setTMulai(t);
  }, []);

  const flash = (type, text) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const tq = filterTarget ? `&target_id=${filterTarget}` : '';

  const loadAll = useCallback(async () => {
    if (!today) return;
    try {
      const [t, s, h, r] = await Promise.all([
        api('/api/target'),
        api(`/api/summary?today=${today}${tq}`),
        api(`/api/transaksi?limit=30${tq}`),
        api(`/api/reports?period=${period}${tq}`),
      ]);
      setTargets(t);
      setSummary(s);
      setTransaksi(h);
      setReport(r.rows);
      setXTarget((cur) => (cur && t.some((x) => String(x.id) === String(cur)) ? cur : t[0] ? String(t[0].id) : ''));
    } catch (err) {
      flash('error', err.message);
    } finally {
      setLoading(false);
    }
  }, [today, tq, period]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function submitTransaksi(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // tanggal yang dipilih + jam lokal saat ini
      const waktu = `${xDate} ${nowLocal().slice(11)}`;
      await api('/api/transaksi', {
        method: 'POST',
        body: JSON.stringify({
          target_id: Number(xTarget),
          jenis: xJenis,
          jumlah: Number(xJumlah),
          tanggal_transaksi: waktu,
          keterangan: xKet,
        }),
      });
      setXJumlah('');
      setXKet('');
      flash('ok', xJenis === 'setoran' ? 'Tabungan berhasil dicatat 🎉' : 'Penarikan berhasil dicatat');
      await loadAll();
    } catch (err) {
      flash('error', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteTransaksi(id) {
    if (!confirm('Hapus transaksi ini?')) return;
    try {
      await api(`/api/transaksi/${id}`, { method: 'DELETE' });
      await loadAll();
    } catch (err) {
      flash('error', err.message);
    }
  }

  function resetTargetForm() {
    setEditingId(null);
    setTNama('');
    setTDeskripsi('');
    setTNominal('');
    setTMulai(today || '');
    setTSelesai('');
  }

  async function submitTarget(e) {
    e.preventDefault();
    try {
      const body = JSON.stringify({
        nama_target: tNama,
        deskripsi: tDeskripsi,
        target_nominal: Number(tNominal),
        tanggal_mulai: tMulai,
        tanggal_selesai: tSelesai || null,
      });
      if (editingId) await api(`/api/target/${editingId}`, { method: 'PUT', body });
      else await api('/api/target', { method: 'POST', body });
      flash('ok', editingId ? 'Target diperbarui' : 'Target baru ditambahkan');
      resetTargetForm();
      await loadAll();
    } catch (err) {
      flash('error', err.message);
    }
  }

  function startEdit(t) {
    setEditingId(t.id);
    setTNama(t.nama_target);
    setTDeskripsi(t.deskripsi || '');
    setTNominal(String(t.target_nominal));
    setTMulai(t.tanggal_mulai);
    setTSelesai(t.tanggal_selesai || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteTarget(t) {
    if (!confirm(`Hapus target "${t.nama_target}" beserta ${t.jumlah_transaksi} transaksinya?`)) return;
    try {
      await api(`/api/target/${t.id}`, { method: 'DELETE' });
      if (String(filterTarget) === String(t.id)) setFilterTarget('');
      if (editingId === t.id) resetTargetForm();
      await loadAll();
    } catch (err) {
      flash('error', err.message);
    }
  }

  function exportCsv() {
    const label = PERIOD_TABS.find((t) => t.key === period).label;
    const lines = [['Periode', 'Jumlah Transaksi', 'Setoran (Rp)', 'Penarikan (Rp)', 'Bersih (Rp)']];
    [...report].reverse().forEach((r) =>
      lines.push([formatPeriod(period, r.period), r.jumlah_transaksi, r.setoran, r.penarikan, r.bersih])
    );
    const csv = lines.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-${label.toLowerCase()}-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const maxSetoran = useMemo(() => Math.max(1, ...report.map((r) => r.setoran)), [report]);
  const sum = (key) => report.reduce((a, r) => a + r[key], 0);
  const unitLabel = { daily: 'hari', weekly: 'minggu', monthly: 'bulan' }[period];
  const activeTarget = targets.find((t) => String(t.id) === String(filterTarget));

  return (
    <main className="container">
      <header className="top">
        <div>
          <h1>💰 Tabunganku</h1>
          <p>Catat setoran, kejar target, dan pantau progresmu.</p>
        </div>
        {today && <p>{formatDate(today)}</p>}
      </header>

      {notice && <div className={`msg ${notice.type}`}>{notice.text}</div>}

      {/* Ringkasan */}
      <section className="grid stats">
        <div className="card stat primary">
          <div className="label">Saldo{activeTarget ? ` · ${activeTarget.nama_target}` : ' tabungan'}</div>
          <div className="value">{rupiah(summary?.saldo)}</div>
        </div>
        <div className="card stat">
          <div className="label">Setoran hari ini</div>
          <div className="value">{rupiah(summary?.setoran_hari_ini)}</div>
        </div>
        <div className="card stat">
          <div className="label">Setoran minggu ini</div>
          <div className="value">{rupiah(summary?.setoran_minggu_ini)}</div>
        </div>
        <div className="card stat">
          <div className="label">Setoran bulan ini</div>
          <div className="value">{rupiah(summary?.setoran_bulan_ini)}</div>
        </div>
        <div className="card stat">
          <div className="label">Rata-rata / hari</div>
          <div className="value">{rupiah(summary?.rata_per_hari)}</div>
        </div>
      </section>

      <section className="grid cols">
        {/* Form transaksi */}
        <div className="card">
          <h2>Catat transaksi</h2>
          {targets.length === 0 && !loading ? (
            <div className="empty">Buat target tabungan dulu di sebelah ya 👉</div>
          ) : (
            <form onSubmit={submitTransaksi}>
              <div className="tabs" style={{ marginBottom: 0 }}>
                <button type="button" className={xJenis === 'setoran' ? 'active' : ''} onClick={() => setXJenis('setoran')}>
                  Setoran
                </button>
                <button type="button" className={xJenis === 'penarikan' ? 'active' : ''} onClick={() => setXJenis('penarikan')}>
                  Penarikan
                </button>
              </div>
              <label>
                Target tabungan
                <select value={xTarget} onChange={(e) => setXTarget(e.target.value)} required>
                  {targets.map((t) => (
                    <option key={t.id} value={t.id}>{t.nama_target}</option>
                  ))}
                </select>
              </label>
              <div className="row">
                <label>
                  Jumlah (Rp)
                  <input
                    inputMode="numeric"
                    placeholder="50.000"
                    value={withDots(xJumlah)}
                    onChange={(e) => setXJumlah(digitsOnly(e.target.value))}
                    required
                  />
                </label>
                <label>
                  Tanggal
                  <input type="date" value={xDate} max={today || undefined} onChange={(e) => setXDate(e.target.value)} required />
                </label>
              </div>
              <div className="quick">
                {QUICK.map((q) => (
                  <button type="button" key={q} onClick={() => setXJumlah(String((Number(xJumlah) || 0) + q))}>
                    +{new Intl.NumberFormat('id-ID').format(q / 1000)}rb
                  </button>
                ))}
                <button type="button" className="ghost" onClick={() => setXJumlah('')}>Reset</button>
              </div>
              <label>
                Keterangan (opsional)
                <input value={xKet} maxLength={255} placeholder="mis. sisa uang jajan" onChange={(e) => setXKet(e.target.value)} />
              </label>
              <button type="submit" disabled={saving || !xJumlah || !xTarget}>
                {saving ? 'Menyimpan…' : xJenis === 'setoran' ? 'Simpan setoran' : 'Simpan penarikan'}
              </button>
            </form>
          )}
        </div>

        {/* Form target */}
        <div className="card">
          <h2>{editingId ? 'Ubah target' : 'Target baru'}</h2>
          <form onSubmit={submitTarget}>
            <label>
              Nama target
              <input value={tNama} maxLength={100} placeholder="mis. Beli laptop" onChange={(e) => setTNama(e.target.value)} required />
            </label>
            <label>
              Deskripsi (opsional)
              <textarea rows={2} value={tDeskripsi} placeholder="mis. laptop untuk kuliah" onChange={(e) => setTDeskripsi(e.target.value)} />
            </label>
            <label>
              Target nominal (Rp)
              <input
                inputMode="numeric"
                placeholder="8.000.000"
                value={withDots(tNominal)}
                onChange={(e) => setTNominal(digitsOnly(e.target.value))}
                required
              />
            </label>
            <div className="row">
              <label>
                Tanggal mulai
                <input type="date" value={tMulai} onChange={(e) => setTMulai(e.target.value)} required />
              </label>
              <label>
                Tanggal selesai (opsional)
                <input type="date" value={tSelesai} min={tMulai || undefined} onChange={(e) => setTSelesai(e.target.value)} />
              </label>
            </div>
            <div className="actions">
              <button type="submit" style={{ flex: 1 }}>{editingId ? 'Simpan perubahan' : 'Tambah target'}</button>
              {editingId && <button type="button" className="ghost" onClick={resetTargetForm}>Batal</button>}
            </div>
          </form>
        </div>
      </section>

      {/* Daftar target */}
      <section className="card" style={{ marginBottom: 14 }}>
        <h2>Target tabungan</h2>
        {targets.length === 0 ? (
          <div className="empty">{loading ? 'Memuat…' : 'Belum ada target.'}</div>
        ) : (
          targets.map((t) => {
            const pct = Math.max(0, Math.min(100, (t.saldo / t.target_nominal) * 100));
            const done = t.saldo >= t.target_nominal;
            const remaining = Math.max(0, t.target_nominal - t.saldo);
            const daysLeft = t.tanggal_selesai && today && !done
              ? Math.round((new Date(t.tanggal_selesai) - new Date(today)) / 86400000)
              : null;
            const perDayNeeded = daysLeft && daysLeft > 0 ? Math.ceil(remaining / daysLeft) : null;
            const selected = String(filterTarget) === String(t.id);
            return (
              <div key={t.id} className={`goal ${selected ? 'selected' : ''}`}>
                <div className="goal-head">
                  <div>
                    <div className="goal-name">{t.nama_target} {done && <span className="pill">Tercapai 🎉</span>}</div>
                    {t.deskripsi && <div className="goal-meta">{t.deskripsi}</div>}
                    <div className="goal-meta">
                      {t.jumlah_transaksi} transaksi · mulai {formatShort(t.tanggal_mulai)} {t.tanggal_mulai.slice(0, 4)}
                      {t.tanggal_selesai && ` · selesai ${formatShort(t.tanggal_selesai)} ${t.tanggal_selesai.slice(0, 4)}`}
                      {daysLeft !== null && (daysLeft >= 0 ? ` (${daysLeft} hari lagi)` : ' (lewat tenggat)')}
                    </div>
                  </div>
                  <div className="actions">
                    <button className="ghost small" onClick={() => setFilterTarget(selected ? '' : String(t.id))}>
                      {selected ? 'Lihat semua' : 'Fokus'}
                    </button>
                    <button className="ghost small" onClick={() => startEdit(t)}>Ubah</button>
                    <button className="danger" onClick={() => deleteTarget(t)}>Hapus</button>
                  </div>
                </div>
                <div className={`progress ${done ? 'done' : ''}`}><span style={{ width: `${pct}%` }} /></div>
                <div className="goal-foot">
                  <span><strong>{rupiah(t.saldo)}</strong> / {rupiah(t.target_nominal)} ({pct.toFixed(0)}%)</span>
                  <span>
                    {done ? 'Target terpenuhi' : `Kurang ${rupiah(remaining)}`}
                    {perDayNeeded ? ` · ≈ ${rupiah(perDayNeeded)}/hari` : ''}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Laporan */}
      <section className="card" style={{ marginBottom: 14 }}>
        <h2>Laporan tabungan</h2>
        <div className="tabs">
          {PERIOD_TABS.map((t) => (
            <button key={t.key} className={period === t.key ? 'active' : ''} onClick={() => setPeriod(t.key)}>
              {t.label}
            </button>
          ))}
          <span className="spacer" />
          <select value={filterTarget} onChange={(e) => setFilterTarget(e.target.value)} aria-label="Filter target">
            <option value="">Semua target</option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>{t.nama_target}</option>
            ))}
          </select>
          <button className="ghost" onClick={exportCsv} disabled={report.length === 0}>Unduh CSV</button>
        </div>

        {report.length === 0 ? (
          <div className="empty">Belum ada data untuk ditampilkan.</div>
        ) : (
          <>
            <div className="bars">
              {report.map((r) => (
                <div className="bar-row" key={r.period}>
                  <span>{formatPeriod(period, r.period)}</span>
                  <div className="bar-track"><span style={{ width: `${(r.setoran / maxSetoran) * 100}%` }} /></div>
                  <span className="amt">{rupiah(r.setoran)}</span>
                </div>
              ))}
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Periode</th>
                    <th className="num">Transaksi</th>
                    <th className="num">Setoran</th>
                    <th className="num">Penarikan</th>
                    <th className="num">Bersih</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map((r) => (
                    <tr key={r.period}>
                      <td>{formatPeriod(period, r.period)}</td>
                      <td className="num">{r.jumlah_transaksi}x</td>
                      <td className="num">{rupiah(r.setoran)}</td>
                      <td className="num">{r.penarikan ? `−${rupiah(r.penarikan)}` : '—'}</td>
                      <td className="num">{rupiah(r.bersih)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Total {report.length} {unitLabel} terakhir</th>
                    <th className="num">{sum('jumlah_transaksi')}x</th>
                    <th className="num">{rupiah(sum('setoran'))}</th>
                    <th className="num">{sum('penarikan') ? `−${rupiah(sum('penarikan'))}` : '—'}</th>
                    <th className="num">{rupiah(sum('bersih'))}</th>
                  </tr>
                  <tr>
                    <th>Rata-rata per {unitLabel}</th>
                    <th />
                    <th className="num">{rupiah(Math.round(sum('setoran') / report.length))}</th>
                    <th />
                    <th className="num">{rupiah(Math.round(sum('bersih') / report.length))}</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Riwayat */}
      <section className="card">
        <h2>Riwayat terbaru{activeTarget ? ` · ${activeTarget.nama_target}` : ''}</h2>
        {transaksi.length === 0 ? (
          <div className="empty">{loading ? 'Memuat…' : 'Belum ada transaksi.'}</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Waktu</th><th>Target</th><th>Keterangan</th><th className="num">Jumlah</th><th /></tr>
              </thead>
              <tbody>
                {transaksi.map((x) => (
                  <tr key={x.id}>
                    <td>{formatDate(x.tanggal_transaksi.slice(0, 10))} · {x.tanggal_transaksi.slice(11, 16)}</td>
                    <td>{x.nama_target}</td>
                    <td>{x.keterangan || '—'}</td>
                    <td className="num" style={{ color: x.jenis === 'penarikan' ? 'var(--danger)' : undefined }}>
                      {x.jenis === 'penarikan' ? '−' : '+'}{rupiah(x.jumlah)}
                    </td>
                    <td className="num"><button className="danger" onClick={() => deleteTransaksi(x.id)}>Hapus</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
