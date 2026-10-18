import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePageMeta } from '../utils/metaTagsUtil.js';

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    updatePageMeta({
      title: 'Ruang Performer - Aplikasi Manajemen Band, Chord & Setlist Konser',
      description:
        'Kelola lagu, aransemen chord, setlist panggung, dan jadwal gigs band Anda secara profesional dalam satu platform gratis.',
      url: window.location.origin,
    });
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const stats = [
    { value: '100%', label: 'Gratis Selamanya' },
    { value: 'PWA', label: 'Bisa Dipakai Offline' },
    { value: '< 1s', label: 'Transpose Chord Instan' },
    { value: '24/7', label: 'Sinkron Antar Personel' },
  ];

  const previewSetlist = [
    { song: 'Perfect — Key C, 63 BPM', tag: 'Pop', active: false },
    { song: 'Kangen Band — Key G, 72 BPM', tag: 'LIVE', active: true },
    { song: 'Melukis Senja — Key A, 80 BPM', tag: 'Pop', active: false },
    { song: 'Runtuh — Key F, 68 BPM', tag: 'Balada', active: false },
  ];

  const benefitMetrics = [
    { label: 'Lagu tersimpan', value: '128' },
    { label: 'Setlist aktif', value: '6' },
    { label: 'Gig mendatang', value: '3' },
  ];

  const audiences = [
    {
      icon: '🎸',
      title: 'Band Panggung & Wedding',
      desc: 'Atur urutan lagu per sesi, tampilkan lirik besar di panggung, dan tetap tenang saat set berjalan.',
    },
    {
      icon: '🎤',
      title: 'Solo & Duo Performer',
      desc: 'Simpan aransemen versi Anda sendiri, transpose sesuai kenyamanan vokal, dan bawa request lagu dengan cepat.',
    },
    {
      icon: '🎹',
      title: 'Musisi Sesi & Worship',
      desc: 'Ikut tim dengan cepat lewat setlist terbagi, lengkap dengan nada dasar, BPM, dan catatan aransemen.',
    },
  ];

  const benefits = [
    'Semua lagu, chord, dan setlist dalam satu tempat yang rapi.',
    'Mode panggung dengan font besar dan autoscroll yang halus.',
    'Ekspor setlist ke PDF atau gambar siap cetak dan bagikan.',
    'Jadwal gigs terpantau agar tidak ada tanggal yang terlewat.',
  ];

  const features = [
    {
      icon: '🎸',
      title: 'Koleksi Lagu & Smart Chords',
      description:
        'Simpan lirik dan chord chart dengan fitur transpose otomatis, visualisasi bar beat, audio autoscroll, serta integrasi keyboard piano virtual.',
    },
    {
      icon: '📋',
      title: 'Penyusun Setlist Konser',
      description:
        'Susun urutan lagu untuk konser atau latihan band dengan mudah via drag & drop, ekspor ke PDF setlist panggung, dan bagikan ke personil band.',
    },
    {
      icon: '👥',
      title: 'Kolaborasi Band & Personel',
      description:
        'Kelola keanggotaan band dan peran instrumen. Semua personel memiliki akses sinkron ke lagu dan aransemen yang sama.',
    },
    {
      icon: '🎤',
      title: 'Manajemen Jadwal Gigs',
      description:
        'Pantau jadwal latihan, gladi resik, dan jadwal panggung konser mendatang. Dapatkan ringkasan kalender acara yang rapi.',
    },
    {
      icon: '⚡',
      title: 'Metronom & Audio Player',
      description:
        'Dilengkapi metronom tempo akurat, pendeteksi ketukan (tap tempo), dan pemutar YouTube terapung untuk referensi audio langsung.',
    },
    {
      icon: '📱',
      title: 'Akses PWA Offline & Mobile',
      description:
        'Dapat dipasang di Android, iOS, maupun desktop seperti aplikasi native. Tetap berfungsi lancar di ruang latihan minim sinyal.',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Daftar Akun Gratis',
      desc: 'Buat akun Anda dalam hitungan detik tanpa biaya berlangganan.',
    },
    {
      step: '02',
      title: 'Input / Import Lagu',
      desc: 'Tulis atau paste lagu beserta chord, tentukan nada dasar (key), BPM, dan tanda birama.',
    },
    {
      step: '03',
      title: 'Rancang Setlist & Tampil',
      desc: 'Gabungkan lagu menjadi setlist konser, gunakan mode autoscroll panggung, dan tampil maksimal.',
    },
  ];

  const faqs = [
    {
      q: 'Apakah Ruang Performer gratis digunakan?',
      a: 'Ya, Ruang Performer dapat digunakan secara gratis oleh musisi, vokalis, band independen, hingga event performer.',
    },
    {
      q: 'Bisakah aplikasi digunakan saat manggung tanpa internet stabil?',
      a: 'Tentu! Aplikasi ini dibangun dengan standar PWA (Progressive Web App) dengan offline cache, sehingga setlist dan lirik Anda tetap terbuka.',
    },
    {
      q: 'Apakah nada dasar lagu bisa diubah (transpose) otomatis?',
      a: 'Ya, Anda dapat menaikkan atau menurunkan chord (transpose key) secara instan sesuai kenyamanan vokal dengan 1 klik.',
    },
    {
      q: 'Apakah saya bisa membagikan setlist ke personil lain?',
      a: 'Bisa. Anda dapat mengundang personil ke band Anda, membagikan tautan, atau mengekspor setlist ke format gambar/PDF siap cetak.',
    },
    {
      q: 'Apakah data lagu dan setlist saya aman?',
      a: 'Akun Anda terproteksi dengan enkripsi password dan data tersimpan terpisah per band. Anda memegang kendali penuh atas siapa yang bisa mengakses aransemen Anda.',
    },
    {
      q: 'Perangkat apa saja yang didukung?',
      a: 'Ruang Performer berjalan langsung di browser HP, tablet, dan laptop. Tidak perlu instalasi khusus, cukup tambahkan ke layar utama untuk pengalaman seperti aplikasi native.',
    },
  ];

  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <img
              src="/icon-192x192.png"
              alt="Logo Ruang Performer"
              width="36"
              height="36"
              className="landing-brand-logo"
            />
            <span className="landing-brand-name">Ruang Performer</span>
          </div>
          <div className="landing-nav-actions">
            <button
              type="button"
              className="landing-btn landing-btn-secondary"
              onClick={() => navigate('/login')}
            >
              Masuk
            </button>
            <button
              type="button"
              className="landing-btn landing-btn-primary"
              onClick={() => navigate('/login?mode=register')}
            >
              Daftar Gratis
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-badge">
            🚀 Platform Manajemen Musik All-in-One
          </div>
          <h1 className="landing-title">
            Fokus Bermusik, Biarkan Kami Kelola{' '}
            <span className="landing-highlight">Setlist & Jadwal Anda</span>
          </h1>
          <p className="landing-subtitle">
            Ruang Performer membantu musisi, band panggung, dan pengisi acara
            mengorganisir chord chart, menyusun setlist konser, dan mengatur jadwal
            gigs dengan mudah, cepat, dan profesional.
          </p>
          <div className="landing-hero-cta">
            <button
              type="button"
              className="landing-btn landing-btn-primary landing-btn-large"
              onClick={() => navigate('/login?mode=register')}
            >
              Mulai Sekarang — Gratis
            </button>
            <button
              type="button"
              className="landing-btn landing-btn-outline landing-btn-large"
              onClick={() => scrollToSection('fitur')}
            >
              Lihat Fitur Lengkap ↓
            </button>
          </div>
          <p className="landing-hero-note">
            ✓ Tanpa kartu kredit &bull; ✓ Akses dari HP, Tablet, & Laptop &bull; ✓ Siap Dipakai di Panggung
          </p>
        </div>

        <div className="landing-hero-preview">
          <div className="landing-preview-window">
            <div className="landing-preview-bar">
              <span className="landing-preview-dot" />
              <span className="landing-preview-dot" />
              <span className="landing-preview-dot" />
              <span className="landing-preview-title">Setlist — Panggung Utama</span>
            </div>
            <div className="landing-preview-body">
              {previewSetlist.map((item, idx) => (
                <div
                  key={item.song}
                  className={`landing-preview-row${item.active ? ' landing-preview-row-active' : ''}`}
                >
                  <span className="landing-preview-index">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="landing-preview-song">{item.song}</span>
                  {item.tag && (
                    <span
                      className={`landing-preview-tag${item.active ? ' landing-preview-tag-live' : ''}`}
                    >
                      {item.tag}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="landing-stats">
          {stats.map((stat) => (
            <div key={stat.label} className="landing-stat">
              <span className="landing-stat-value">{stat.value}</span>
              <span className="landing-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="fitur" className="landing-section">
        <div className="landing-section-header">
          <span className="landing-section-tag">Fitur Utama</span>
          <h2 className="landing-section-title">
            Segala Hal yang Dibutuhkan Musisi di Panggung
          </h2>
          <p className="landing-section-subtitle">
            Dibuat oleh musisi untuk musisi, dirancang khusus agar mudah dibaca di pencahayaan panggung yang redup.
          </p>
        </div>

        <div className="landing-grid">
          {features.map((feature, idx) => (
            <div key={idx} className="landing-card">
              <div className="landing-card-icon">{feature.icon}</div>
              <h3 className="landing-card-title">{feature.title}</h3>
              <p className="landing-card-text">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="landing-section landing-benefits">
        <div className="landing-benefits-inner">
          <div className="landing-benefits-text">
            <span className="landing-section-tag">Kenapa Ruang Performer</span>
            <h2 className="landing-section-title">
              Performa Rapi, Tanpa Ribet Persiapannya
            </h2>
            <p className="landing-section-subtitle">
              Tinggalkan catatan berserakan dan file chord yang berantakan. Semua kebutuhan panggung Anda tersusun rapi dan siap diakses kapan saja.
            </p>
            <ul className="landing-benefits-list">
              {benefits.map((item) => (
                <li key={item} className="landing-benefits-item">
                  <span className="landing-benefits-check">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="landing-btn landing-btn-primary landing-btn-large"
              onClick={() => navigate('/login?mode=register')}
            >
              Coba Sekarang — Gratis
            </button>
          </div>
          <div className="landing-benefits-card">
            <div className="landing-benefits-card-head">Ringkasan Hari Ini</div>
            {benefitMetrics.map((metric) => (
              <div key={metric.label} className="landing-benefits-metric">
                <span className="landing-benefits-metric-label">{metric.label}</span>
                <span className="landing-benefits-metric-value">{metric.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audience Section */}
      <section className="landing-section landing-section-dark">
        <div className="landing-section-header">
          <span className="landing-section-tag">Untuk Siapa</span>
          <h2 className="landing-section-title">Cocok untuk Semua Jenis Performer</h2>
          <p className="landing-section-subtitle">
            Dari band wedding hingga musisi worship, Ruang Performer menyesuaikan cara Anda tampil.
          </p>
        </div>
        <div className="landing-grid">
          {audiences.map((audience, idx) => (
            <div key={idx} className="landing-card">
              <div className="landing-card-icon">{audience.icon}</div>
              <h3 className="landing-card-title">{audience.title}</h3>
              <p className="landing-card-text">{audience.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works Section */}
      <section className="landing-section landing-section-dark">
        <div className="landing-section-header">
          <span className="landing-section-tag">Cara Kerja</span>
          <h2 className="landing-section-title">3 Langkah Mudah Menuju Performa Maksimal</h2>
          <p className="landing-section-subtitle">
            Mulai dari persiapan lagu hingga saat Anda berdiri di atas panggung.
          </p>
        </div>

        <div className="landing-steps">
          {steps.map((st, i) => (
            <div key={i} className="landing-step-item">
              <div className="landing-step-number">{st.step}</div>
              <h3 className="landing-step-title">{st.title}</h3>
              <p className="landing-step-desc">{st.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="landing-section">
        <div className="landing-section-header">
          <span className="landing-section-tag">Pertanyaan Umum</span>
          <h2 className="landing-section-title">Frequently Asked Questions</h2>
        </div>

        <div className="landing-faq-list">
          {faqs.map((faq, i) => (
            <div key={i} className="landing-faq-card">
              <h3 className="landing-faq-q">❓ {faq.q}</h3>
              <p className="landing-faq-a">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="landing-cta-banner">
        <div className="landing-cta-banner-inner">
          <h2>Siap Tampil Lebih Rapi & Percaya Diri?</h2>
          <p>
            Gabung bersama musisi lain yang telah mengorganisir pertunjukan mereka dengan Ruang Performer.
          </p>
          <button
            type="button"
            className="landing-btn landing-btn-primary landing-btn-large"
            onClick={() => navigate('/login?mode=register')}
          >
            Buat Akun Sekarang — Gratis
          </button>
          <p className="landing-cta-banner-note">
            Sudah punya akun?{' '}
            <button
              type="button"
              className="landing-cta-banner-link"
              onClick={() => navigate('/login')}
            >
              Masuk di sini
            </button>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-left">
            <div className="landing-brand">
              <img
                src="/icon-192x192.png"
                alt="Logo"
                width="24"
                height="24"
              />
              <span className="landing-brand-name">Ruang Performer</span>
            </div>
            <p className="landing-footer-copy">
              &copy; {new Date().getFullYear()} Ruang Performer. All rights reserved. Platform manajemen musik dan setlist band.
            </p>
          </div>
          <div className="landing-footer-links">
            <button
              type="button"
              className="landing-footer-link"
              onClick={() => navigate('/login')}
            >
              Login
            </button>
            <button
              type="button"
              className="landing-footer-link"
              onClick={() => navigate('/login?mode=register')}
            >
              Register
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
