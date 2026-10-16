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
              onClick={() => {
                const el = document.getElementById('fitur');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Lihat Fitur Lengkap ↓
            </button>
          </div>
          <p className="landing-hero-note">
            ✓ Tanpa kartu kredit &bull; ✓ Akses dari HP, Tablet, & Laptop &bull; ✓ Siap Dipakai di Panggung
          </p>
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
