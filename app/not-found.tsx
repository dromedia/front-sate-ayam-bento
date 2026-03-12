import Link from "next/link";

export default function NotFound() {
  return (
    <main className="loading-shell">
      <section className="section-card form-card">
        <div className="section-header">
          <h3>Halaman tidak ditemukan</h3>
          <p>Tujuan yang kamu cari tidak tersedia. Kembali ke dashboard untuk melanjutkan kerja.</p>
        </div>
        <div className="form-actions">
          <Link className="primary-btn" href="/dashboard">
            Ke Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
