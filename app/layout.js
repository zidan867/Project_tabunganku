import './globals.css';

export const metadata = {
  title: 'Tabunganku',
  description: 'Catat tabungan harian, atur tujuan menabung, dan pantau laporan mingguan & bulanan.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
