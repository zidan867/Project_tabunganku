import mysql from 'mysql2/promise';

// Pool dibuat lazy dan disimpan di globalThis supaya tidak membuat koneksi
// baru setiap hot-reload (dev) atau setiap invocation (Vercel).
function createPool() {
  const ca = process.env.DB_CA_CERT
    ? Buffer.from(process.env.DB_CA_CERT, 'base64').toString('utf8')
    : undefined;

  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: ca ? { ca } : undefined,
    waitForConnections: true,
    connectionLimit: 5,
    // Kolom DATE dikembalikan sebagai string 'YYYY-MM-DD' (tanpa konversi zona waktu)
    dateStrings: true,
  });
}

export function getPool() {
  if (!globalThis._tabunganPool) {
    globalThis._tabunganPool = createPool();
  }
  return globalThis._tabunganPool;
}

export async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}
