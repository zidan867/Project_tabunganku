-- Skema database Web Tabungan (MySQL 8)
-- Di Aiven, database sudah tersedia (default: defaultdb), jadi dua baris di bawah
-- ini tidak perlu dijalankan. Untuk MySQL lokal, hilangkan tanda komentarnya.
-- CREATE DATABASE db_tabungan;
-- USE db_tabungan;

-- TB 1: Target Tabungan
CREATE TABLE target_tabungan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_target VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    target_nominal DECIMAL(15,2) NOT NULL,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TB 2: Transaksi
CREATE TABLE transaksi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    target_id INT NOT NULL,
    jenis ENUM('setoran', 'penarikan') NOT NULL,
    jumlah DECIMAL(15,2) NOT NULL,
    keterangan VARCHAR(255),
    tanggal_transaksi DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_transaksi_target FOREIGN KEY (target_id) REFERENCES target_tabungan(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);
