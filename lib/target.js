import { isValidDate } from '@/lib/dates';

export function parseTarget(body) {
  const nama = String(body?.nama_target ?? '').trim();
  const deskripsi = String(body?.deskripsi ?? '').trim() || null;
  const nominal = Number(body?.target_nominal);
  const mulai = String(body?.tanggal_mulai ?? '');
  const selesai = body?.tanggal_selesai ? String(body.tanggal_selesai) : null;

  if (!nama || nama.length > 100) return { error: 'Nama target wajib diisi (maks 100 karakter)' };
  if (deskripsi && deskripsi.length > 5000) return { error: 'Deskripsi terlalu panjang' };
  if (!Number.isInteger(nominal) || nominal <= 0 || nominal > 1e13) {
    return { error: 'Target nominal harus berupa angka bulat lebih dari 0' };
  }
  if (!isValidDate(mulai)) return { error: 'Tanggal mulai tidak valid' };
  if (selesai && !isValidDate(selesai)) return { error: 'Tanggal selesai tidak valid' };
  if (selesai && selesai < mulai) return { error: 'Tanggal selesai tidak boleh sebelum tanggal mulai' };

  return { value: { nama, deskripsi, nominal, mulai, selesai } };
}
