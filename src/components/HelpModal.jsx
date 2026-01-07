import React from 'react';

const Section = ({ title, icon = '📌', children }) => (
  <div style={{
    marginBottom: '1.5rem',
    padding: '0.75rem 1rem',
    background: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    borderRadius: '10px',
    borderLeft: '4px solid #6366f1',
  }}>
    <h3 style={{
      margin: '0 0 0.75rem',
      fontSize: '1.05rem',
      fontWeight: '600',
      color: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    }}>
      {icon} {title}
    </h3>
    <div style={{
      fontSize: '0.95rem',
      lineHeight: 1.7,
      color: '#cbd5e1',
    }}>
      {children}
    </div>
  </div>
);

const CodeBlock = ({ children, lang = 'text' }) => (
  <pre style={{
    background: 'var(--bg-dark, #0f1419)',
    color: '#818cf8',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid rgba(99,102,241,0.3)',
    overflowX: 'auto',
    fontSize: '0.85rem',
    lineHeight: '1.5',
    margin: '0.75rem 0',
    fontFamily: '"Fira Code", "Courier New", monospace',
  }}>{children}</pre>
);

const ListItem = ({ children }) => (
  <li style={{
    marginBottom: '0.5rem',
    color: '#cbd5e1',
  }}>
    {children}
  </li>
);

export default function HelpModal({ onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(920px, 94vw)',
          maxHeight: '85vh',
          overflow: 'auto',
          background: 'linear-gradient(135deg, #161b26 0%, #1a1f2e 100%)',
          color: '#f8fafc',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          borderRadius: '16px',
          padding: '2rem',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.5rem',
          paddingBottom: '1.5rem',
          borderBottom: '2px solid rgba(99, 102, 241, 0.2)',
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#f8fafc',
            }}>
              ❓ Pusat Bantuan
            </h1>
            <p style={{
              margin: '0.5rem 0 0',
              color: '#94a3b8',
              fontSize: '0.95rem',
            }}>
              Panduan lengkap menggunakan RoNz Chord Pro
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(99, 102, 241, 0.1)',
              color: '#cbd5e1',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(99, 102, 241, 0.2)';
              e.target.style.color = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(99, 102, 241, 0.1)';
              e.target.style.color = '#cbd5e1';
            }}
            title="Tutup"
          >
            ✕
          </button>
        </div>

        <Section title="Ringkas" icon="🚀">
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <ListItem><strong>Transpose:</strong> gunakan tombol ♭/♯ untuk geser nada.</ListItem>
            <ListItem><strong>Auto Scroll:</strong> klik ▶ untuk scroll otomatis; atur kecepatannya.</ListItem>
            <ListItem><strong>YouTube:</strong> tampilkan/sembunyikan player untuk referensi.</ListItem>
            <ListItem><strong>Setlist:</strong> kelola daftar lagu untuk tampil.</ListItem>
            <ListItem><strong>Melodi:</strong> not angka tampil inline di bawah lirik per birama.</ListItem>
          </ul>
        </Section>

        <Section title="Format Chord" icon="🎸">
          <p>Dukungan dua format utama:</p>
          <strong style={{ color: '#818cf8' }}>1) ChordPro (bracket format)</strong>
          <CodeBlock>{`{title: Contoh}
{artist: Penyanyi}
{key: C}

{start_of_verse}
[C]Ku tak sangka [Em]berjumpa denganmu
{end_of_verse}`}</CodeBlock>
          <strong style={{ color: '#818cf8' }}>2) Standard (chord di atas lirik)</strong>
          <CodeBlock>{`C              Em
Ku tak sangka bila berjumpa denganmu
Am             F         G
Hatiku berbunga mekar seribu`}</CodeBlock>
          <p style={{ color: '#94a3b8' }}>💡 Copy-paste dari situs chord (ultimate-guitar, dll), aplikasi akan mendeteksi dan merender dengan benar. Transpose dan fitur lain tetap bekerja.</p>
        </Section>

        <Section title="Format Not Angka (Lengkap)" icon="🎵">
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <ListItem><strong>Angka 1–7:</strong> do–si. Pisahkan dengan spasi.</ListItem>
            <ListItem><strong>Oktaf:</strong> titik (.) ke bawah, apostrof (') ke atas. Contoh: <code style={{ background: '#0f1419', color: '#818cf8', padding: '0.2em 0.4em', borderRadius: '4px' }}>1.</code>, <code style={{ background: '#0f1419', color: '#818cf8', padding: '0.2em 0.4em', borderRadius: '4px' }}>1'</code>.</ListItem>
            <ListItem><strong>Durasi:</strong> tambah "-" untuk perpanjang. Contoh: <code style={{ background: '#0f1419', color: '#818cf8', padding: '0.2em 0.4em', borderRadius: '4px' }}>1-</code>, <code style={{ background: '#0f1419', color: '#818cf8', padding: '0.2em 0.4em', borderRadius: '4px' }}>1--</code>, <code style={{ background: '#0f1419', color: '#818cf8', padding: '0.2em 0.4em', borderRadius: '4px' }}>1---</code></ListItem>
            <ListItem><strong>Aksidental:</strong> "#" (kres), "b" (mol): <code style={{ background: '#0f1419', color: '#818cf8', padding: '0.2em 0.4em', borderRadius: '4px' }}>3#</code>, <code style={{ background: '#0f1419', color: '#818cf8', padding: '0.2em 0.4em', borderRadius: '4px' }}>4b</code>.</ListItem>
            <ListItem><strong>Istirahat:</strong> "-" atau "_" sebagai rest.</ListItem>
            <ListItem><strong>Birama:</strong> pisahkan dengan "|". Contoh bar:</ListItem>
          </ul>
          <CodeBlock>{`1 2 3 4 | 5 5 6 5 | 4 3 2 1 |`}</CodeBlock>
        </Section>

        <Section title="Integrasi Not Angka ke Lirik" icon="📝">
          <p>Not angka ditampilkan <strong>inline</strong> di bawah baris lirik dan dipetakan per birama berdasarkan jumlah grup "|" di lirik.</p>
          <CodeBlock>{`Melodi:
1 2 3 4 | 5 5 6 5 | 4 3 2 1 |

Lirik:
[C]Ku tak sangka | [Em]berjumpa de-[Am]nganmu |
Hatiku ber-[F]bunga mekar | seribu [G]|

Output:
Ku tak sangka | berjumpa de- nganmu |
1 2 3 4 | 5 5 6 5 |

Hatiku ber- bunga mekar | seribu |
4 3 2 1 |`}</CodeBlock>
          <p style={{ color: '#94a3b8' }}>✅ Pastikan jumlah birama di lirik konsisten dengan melodi. Transpose menggeser not angka secara diatonis.</p>
        </Section>

        <Section title="Kontrol & Fitur" icon="⚙️">
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <ListItem><strong>Transpose:</strong> geser nada ±1 semiton, reset kembali ke asli.</ListItem>
            <ListItem><strong>Auto Scroll:</strong> aktifkan lalu atur kecepatan (0.5x–5x).</ListItem>
            <ListItem><strong>YouTube Viewer:</strong> tampilkan player jika lagu punya YouTube ID.</ListItem>
            <ListItem><strong>Setlist:</strong> buat/hapus, tambah/kurangi lagu, pilih setlist aktif.</ListItem>
            <ListItem><strong>Export/Import:</strong> ekspor seluruh database ke JSON; impor untuk memulihkan.</ListItem>
            <ListItem><strong>Sync ke DB:</strong> kirim data ke backend (Turso) untuk backup cloud.</ListItem>
          </ul>
        </Section>

        <Section title="Tips Audio Piano" icon="🎹">
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <ListItem>Klik sekali pada halaman agar audio diizinkan oleh browser (autoplay policy).</ListItem>
            <ListItem>Pastikan tab/browser tidak mute dan volume sistem cukup.</ListItem>
            <ListItem>Piano virtual memakai oscillator Web Audio (timbre sederhana) untuk saat ini.</ListItem>
            <ListItem>Klik tuts untuk memutar nada; melodi popup menampilkan diagram piano chord.</ListItem>
          </ul>
        </Section>

        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(99, 102, 241, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <p style={{
            margin: 0,
            fontSize: '0.85rem',
            color: '#94a3b8',
          }}>
            RoNz Chord Pro v{import.meta.env.VITE_APP_VERSION || '2.0.3'}
          </p>
          <button
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
              color: '#fff',
              border: 'none',
              padding: '0.6rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '500',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
            }}
            onMouseEnter={(e) => {
              e.target.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.6)';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
