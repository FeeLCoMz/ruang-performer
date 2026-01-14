import React from 'react';

const Section = ({ title, icon = '📌', children }) => (
  <div style={{
    marginBottom: '1.5rem',
    padding: '0.75rem 1rem',
    background: 'rgba(var(--primary-rgb, 99, 102, 241), 0.08)',
    border: '1px solid rgba(var(--primary-rgb, 99, 102, 241), 0.2)',
    borderRadius: '10px',
    borderLeft: '4px solid var(--primary)',
  }}>
    <h3 style={{
      margin: '0 0 0.75rem',
      fontSize: '1.05rem',
      fontWeight: '600',
      color: 'var(--text)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    }}>
      {icon} {title}
    </h3>
    <div style={{
      fontSize: '0.95rem',
      lineHeight: 1.7,
      color: 'var(--text-secondary)',
    }}>
      {children}
    </div>
  </div>
);

const CodeBlock = ({ children, lang = 'text' }) => (
  <pre style={{
    background: 'var(--bg-dark)',
    color: 'var(--primary-light)',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid rgba(var(--primary-rgb, 99, 102, 241), 0.3)',
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
    color: 'var(--text-secondary)',
  }}>
    {children}
  </li>
);

export default function HelpModal({ onClose, onExport, onImport, onSync, syncingToDb }) {
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
          background: 'linear-gradient(135deg, var(--card) 0%, var(--bg-elevated) 100%)',
          color: 'var(--text)',
          border: '1px solid rgba(var(--primary-rgb, 99, 102, 241), 0.3)',
          boxShadow: 'var(--shadow-xl)',
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
          borderBottom: '2px solid rgba(var(--primary-rgb, 99, 102, 241), 0.2)',
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '1.75rem',
              fontWeight: '700',
              color: 'var(--text)',
            }}>
              ❓ Pusat Bantuan
            </h1>
            <p style={{
              margin: '0.5rem 0 0',
              color: 'var(--text-muted)',
              fontSize: '0.95rem',
            }}>
              Panduan lengkap menggunakan RoNz Chord Pro
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(var(--primary-rgb, 99, 102, 241), 0.1)',
              color: 'var(--text-secondary)',
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
              e.target.style.background = 'rgba(var(--primary-rgb, 99, 102, 241), 0.2)';
              e.target.style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(var(--primary-rgb, 99, 102, 241), 0.1)';
              e.target.style.color = 'var(--text-secondary)';
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
          <strong style={{ color: 'var(--primary-light)' }}>1) ChordPro (bracket format)</strong>
          <CodeBlock>{`{title: Contoh}
{artist: Penyanyi}
{key: C}

{start_of_verse}
[C]Ku tak sangka [Em]berjumpa denganmu
{end_of_verse}`}</CodeBlock>
          <strong style={{ color: 'var(--primary-light)' }}>2) Standard (chord di atas lirik)</strong>
          <CodeBlock>{`C              Em
Ku tak sangka bila berjumpa denganmu
Am             F         G
Hatiku berbunga mekar seribu`}</CodeBlock>
          <p style={{ color: 'var(--text-muted)' }}>💡 Copy-paste dari situs chord (ultimate-guitar, dll), aplikasi akan mendeteksi dan merender dengan benar. Transpose dan fitur lain tetap bekerja.</p>
        </Section>

        <Section title="Tombol Bantu Format Chord" icon="✨">
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <ListItem><strong>Convert ke ChordPro:</strong> Konversi format standard (chord di atas lirik) ke format ChordPro bracket. Deteksi otomatis untuk chord lines.</ListItem>
            <ListItem><strong>ChordPro Template:</strong> Masukkan template ChordPro standar dengan metadata dan struktur dasar.</ListItem>
            <ListItem><strong>Standard Template:</strong> Masukkan template format standard (chord di atas lirik) dengan struktur dasar.</ListItem>
            <ListItem><strong>Transkripsi:</strong> Upload file audio untuk mentranskrip melodi dan lirik.</ListItem>
          </ul>
        </Section>

        <Section title="Format Not Angka (Lengkap)" icon="🎵">
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <ListItem><strong>Angka 1–7:</strong> do–si. Pisahkan dengan spasi.</ListItem>
            <ListItem><strong>Oktaf:</strong> titik (.) ke bawah, apostrof (') ke atas. Contoh: <code style={{ background: 'var(--bg-dark)', color: 'var(--primary-light)', padding: '0.2em 0.4em', borderRadius: '4px' }}>1.</code>, <code style={{ background: 'var(--bg-dark)', color: 'var(--primary-light)', padding: '0.2em 0.4em', borderRadius: '4px' }}>1'</code>.</ListItem>
            <ListItem><strong>Durasi:</strong> tambah "-" untuk perpanjang. Contoh: <code style={{ background: 'var(--bg-dark)', color: 'var(--primary-light)', padding: '0.2em 0.4em', borderRadius: '4px' }}>1-</code>, <code style={{ background: 'var(--bg-dark)', color: 'var(--primary-light)', padding: '0.2em 0.4em', borderRadius: '4px' }}>1--</code>, <code style={{ background: 'var(--bg-dark)', color: 'var(--primary-light)', padding: '0.2em 0.4em', borderRadius: '4px' }}>1---</code></ListItem>
            <ListItem><strong>Aksidental:</strong> "#" (kres), "b" (mol): <code style={{ background: 'var(--bg-dark)', color: 'var(--primary-light)', padding: '0.2em 0.4em', borderRadius: '4px' }}>3#</code>, <code style={{ background: 'var(--bg-dark)', color: 'var(--primary-light)', padding: '0.2em 0.4em', borderRadius: '4px' }}>4b</code>.</ListItem>
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
          <p style={{ color: 'var(--text-muted)' }}>✅ Pastikan jumlah birama di lirik konsisten dengan melodi. Transpose menggeser not angka secara diatonis.</p>
        </Section>

        <Section title="Kontrol & Fitur" icon="⚙️">
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <ListItem><strong>Transpose:</strong> geser nada ±1 semiton, reset kembali ke asli.</ListItem>
            <ListItem><strong>Auto Scroll:</strong> aktifkan lalu atur kecepatan (0.5x–5x).</ListItem>
            <ListItem><strong>YouTube Viewer:</strong> tampilkan player jika lagu punya YouTube ID.</ListItem>
            <ListItem><strong>Setlist:</strong> buat/hapus, tambah/kurangi lagu, pilih setlist aktif.</ListItem>
            <ListItem><strong>Export/Import:</strong> ekspor/impor seluruh database ke JSON untuk backup lokal.</ListItem>
            <ListItem><strong>Cloud Sync:</strong> data otomatis disinkronkan ke cloud saat ada perubahan (jika online).</ListItem>
          </ul>
        </Section>

        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(var(--primary-rgb, 99, 102, 241), 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <p style={{
            margin: 0,
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
          }}>
            RoNz Chord Pro v{import.meta.env.VITE_APP_VERSION || '2.0.3'}
          </p>
          <button
            onClick={onClose}
            style={{
              background: `linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)`,
              color: '#fff',
              border: 'none',
              padding: '0.6rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '500',
              transition: 'all 0.2s',
              boxShadow: `0 4px 12px rgba(var(--primary-rgb, 99, 102, 241), 0.4)`,
            }}
            onMouseEnter={(e) => {
              e.target.style.boxShadow = `0 6px 16px rgba(var(--primary-rgb, 99, 102, 241), 0.6)`;
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = `0 4px 12px rgba(var(--primary-rgb, 99, 102, 241), 0.4)`;
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
