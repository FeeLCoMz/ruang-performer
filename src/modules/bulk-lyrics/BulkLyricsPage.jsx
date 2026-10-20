/**
 * BulkLyricsPage.jsx
 *
 * Modul Bulk Add Lirik & Chord.
 *
 * Alur:
 *   1. Tempel banyak lagu sekaligus (pemisah "## Judul Lagu", "===", atau
 *      baris "Judul: ..."), lengkap dengan metadata singkat per lagu.
 *   2. Parser memecah blok & memvalidasi; preview memperlihatkan hasilnya.
 *   3. User bisa mengecilkan/mengeluarkan blok, mengaktifkan auto-format, dan
 *      memilih band tujuan.
 *   4. "Simpan N lagu" mengirim semuanya lewat satu permintaan
 *      (POST /api/songs/bulk) — tidak ada lagu setengah tersimpan.
 *
 * Modul mengikuti pola registry (src/modules/registry.js) dan bisa
 * dinonaktifkan dari halaman Modul.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addSongsBulk, fetchBands } from '../../apiClient.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { SONG_KEY_OPTIONS } from '../../utils/songOptions.js';
import {
  DEMO_BULK_SONGS,
  buildBulkSongRecords,
  recordsToSongPayloads,
  splitBulkSongBlocks,
  summarizeBulkRecords,
} from './bulkLyricsParser.js';
import { useBulkLyricsEnabled } from './useBulkLyricsEnabled.js';

const MAX_BLOCKS = 200;

/** Hitung jumlah baris & kata untuk statistik ringkas di preview. */
function describeLyrics(lyrics) {
  const text = String(lyrics || '');
  const lines = text.split('\n').filter((line) => line.trim()).length;
  const words = (text.match(/\S+/g) || []).length;
  return { lines, words };
}

/**
 * File .txt/.md yang diimpor: bila isinya sudah memakai pemisah blok, biarkan
 * parser yang memecahnya; kalau tidak, satu file = satu lagu (judul = nama file).
 */
function blocksFromImportedFile(fileName, content) {
  if (/^\s*(#{1,6}|={3,}|-{3,})\s*/m.test(content) || /^\s*Judul\s*:/im.test(content)) {
    return splitBulkSongBlocks(content);
  }
  return [
    {
      title: fileName.replace(/\.(txt|md|text)$/i, '').replace(/[_-]+/g, ' ').trim(),
      lyrics: content,
    },
  ];
}

export default function BulkLyricsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enabled] = useBulkLyricsEnabled();

  const [rawText, setRawText] = useState('');
  const [autoFormat, setAutoFormat] = useState(true);
  const [defaultKey, setDefaultKey] = useState('');
  const [defaultTempo, setDefaultTempo] = useState('');
  const [excludedIndexes, setExcludedIndexes] = useState(() => new Set());
  const [bands, setBands] = useState([]);
  const [bandsLoading, setBandsLoading] = useState(false);
  const [targetBandId, setTargetBandId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  // Blok dari file impor disimpan di state (bukan ref) agar preview otomatis
  // diperbarui dan ikut dikosongkan setelah simpan.
  const [importedBlocks, setImportedBlocks] = useState([]);

  // Import file .txt / .md: satu file = satu blok lagu.
  const fileInputRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    setBandsLoading(true);
    fetchBands()
      .then((list) => {
        if (!mounted) return;
        const normalized = (Array.isArray(list) ? list : []).map((band) => ({
          id: String(band.bandId || band.id),
          name: band.name || band.bandName || 'Band',
        }));
        setBands(normalized);
        // Default: band pertama tempat user aktif (kalau ada).
        if (normalized.length > 0) setTargetBandId((prev) => prev || normalized[0].id);
      })
      .catch(() => {
        if (mounted) setBands([]);
      })
      .finally(() => {
        if (mounted) setBandsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const blocks = useMemo(() => splitBulkSongBlocks(rawText), [rawText]);

  const records = useMemo(() => {
    const parsed = buildBulkSongRecords(blocks, {
      autoFormat,
      defaultKey,
      defaultTempo,
      guessTitle: true,
    });
    const imported = importedBlocks.length
      ? buildBulkSongRecords(importedBlocks, { autoFormat, defaultKey, defaultTempo, guessTitle: true })
      : [];
    // Nomor blok mengikuti urutan final, bukan index internal parser, sehingga
    // dua sumber (textarea + file impor) bisa berbagi penanda exclude yang sama.
    return [...parsed, ...imported].map((record, position) => ({
      ...record,
      index: position,
      blockNumber: position + 1,
      excluded: excludedIndexes.has(position),
    }));
  }, [blocks, importedBlocks, autoFormat, defaultKey, defaultTempo, excludedIndexes]);

  const summary = useMemo(() => summarizeBulkRecords(records), [records]);
  const selectableRecords = records.filter((record) => !record.excluded);
  const selectedReady = selectableRecords.filter((record) => record.errors.length === 0);
  const selectedInvalid = selectableRecords.filter((record) => record.errors.length > 0);

  const hasInput = rawText.trim().length > 0 || importedBlocks.length > 0;

  const toggleExcluded = useCallback((index) => {
    setExcludedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const handleInsertDemo = () => {
    setRawText(DEMO_BULK_SONGS);
    setExcludedIndexes(new Set());
    setResult(null);
    setError('');
  };

  const handleClear = () => {
    if (hasInput && !window.confirm('Hapus seluruh isi input?')) return;
    setRawText('');
    setImportedBlocks([]);
    setExcludedIndexes(new Set());
    setResult(null);
    setError('');
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setError('Clipboard kosong.');
        return;
      }
      setRawText((prev) => (prev ? `${prev}\n\n${text}` : text));
      setError('');
    } catch {
      setError('Browser menolak akses clipboard — tempel manual dengan Ctrl+V.');
    }
  };

  const handleCopySample = async () => {
    try {
      await navigator.clipboard.writeText(DEMO_BULK_SONGS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Gagal menyalin format contoh.');
    }
  };

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const accepted = files.filter((file) => /\.(txt|md|text)$/i.test(file.name));
    if (accepted.length !== files.length) {
      setError('Hanya file .txt atau .md yang bisa diimpor. File lain diabaikan.');
    } else {
      setError('');
    }

    let nextBlocks = [...importedBlocks];
    for (const file of accepted) {
      // eslint-disable-next-line no-await-in-loop
      const content = await file.text();
      nextBlocks = [...nextBlocks, ...blocksFromImportedFile(file.name, content)];
    }
    setImportedBlocks(nextBlocks);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    setError('');
    setResult(null);

    if (rawText.trim() && records.length > MAX_BLOCKS) {
      setError(`Terlalu banyak lagu dalam satu proses (${records.length}). Maksimal ${MAX_BLOCKS} per simpan.`);
      return;
    }
    if (selectableRecords.length === 0) {
      setError('Belum ada lagu yang bisa disimpan.');
      return;
    }
    if (selectedInvalid.length > 0) {
      setError(
        `${selectedInvalid.length} lagu masih bermasalah. Perbaiki atau keluarkan dari proses simpan terlebih dahulu.`,
      );
      return;
    }

    const payloads = recordsToSongPayloads(selectedReady, { bandId: targetBandId });
    if (payloads.length === 0) {
      setError('Belum ada lagu yang siap disimpan.');
      return;
    }

    setSaving(true);
    try {
      const response = await addSongsBulk(payloads);
      setResult({
        created: response?.created ?? payloads.length,
        ids: Array.isArray(response?.ids) ? response.ids : [],
        titles: selectedReady.map((record) => record.title),
      });
      setRawText('');
      setImportedBlocks([]);
      setExcludedIndexes(new Set());
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan lagu secara massal.');
    } finally {
      setSaving(false);
    }
  };

  const notEnabled = !enabled;
  const canSave = !saving && selectedInvalid.length === 0 && selectedReady.length > 0;

  return (
    <div className="page-container bl-page">
      <div className="page-header">
        <div>
          <h1>📚 Bulk Add Lirik &amp; Chord</h1>
          <p>Tempel banyak lagu sekaligus — masing-masing dengan judul, artis, key, tempo, dan lirik + chord-nya.</p>
        </div>
        <div className="page-header-actions bl-header-actions">
          <button type="button" className="btn btn-secondary" onClick={handleInsertDemo}>
            ✨ Isi contoh
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/songs')}>
            ← Daftar Lagu
          </button>
        </div>
      </div>

      <div className="bl-banner bl-banner-info">
        <span>
          Tips: setelah disimpan, buka lagu lewat daftar Lagu untuk membetulkan detail aransemen
          (partitur, keyboard patch, time marker) satu per satu.
        </span>
      </div>

      {notEnabled && (
        <div className="ct-banner ct-banner-warn" role="status">
          Modul ini sedang dinonaktifkan.{' '}
          <button type="button" className="btn btn-secondary ct-link-btn" onClick={() => navigate('/modules')}>
            Aktifkan di halaman Modul
          </button>
        </div>
      )}

      {!user && (
        <div className="bl-banner bl-banner-error" role="alert">
          Masuk ke akun terlebih dahulu untuk menyimpan lagu.
        </div>
      )}

      {error && (
        <div className="bl-banner bl-banner-error" role="alert">
          {error}
        </div>
      )}

      {result && (
        <div className="bl-banner bl-banner-success" role="status">
          <div>
            <strong>{result.created} lagu berhasil disimpan.</strong>{' '}
            {result.titles.slice(0, 3).join(', ')}
            {result.titles.length > 3 ? `, +${result.titles.length - 3} lainnya` : ''}
          </div>
          <div className="bl-banner-actions">
            <button type="button" className="btn btn-secondary bl-mini-btn" onClick={() => navigate('/songs')}>
              Lihat daftar lagu
            </button>
            <button type="button" className="btn btn-secondary bl-mini-btn" onClick={() => setResult(null)}>
              Tutup
            </button>
          </div>
        </div>
      )}

      <div className={`bl-layout${notEnabled ? ' is-disabled' : ''}`}>
        {/* ---------- Input ---------- */}
        <section className="bl-card" aria-labelledby="bl-input-title">
          <div className="bl-card-head">
            <h2 id="bl-input-title">1. Tempel lagu-lagu</h2>
            <span className="bl-counter">
              {records.length} lagu terdeteksi
            </span>
          </div>

          <div className="bl-input-actions">
            <button type="button" className="btn btn-secondary bl-mini-btn" onClick={handlePaste}>
              📋 Tempel dari clipboard
            </button>
            <label className="btn btn-secondary bl-mini-btn bl-file-btn">
              📁 Impor file .txt/.md
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.md,text/plain"
                className="bl-file-input"
                onChange={handleFiles}
              />
            </label>
            <button type="button" className="btn btn-secondary bl-mini-btn" onClick={handleCopySample}>
              {copied ? '✓ Tersalin' : '📄 Salin format contoh'}
            </button>
            <button
              type="button"
              className="btn btn-secondary bl-mini-btn bl-clear-btn"
              onClick={handleClear}
              disabled={!hasInput}
            >
              🗑️ Bersihkan
            </button>
          </div>

          <textarea
            className="bl-textarea"
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder={'## Judul Lagu\nArtis: Nama Artis\nKey: C\nTempo: 120\n\n[Intro] C G Am F\nKu menunggu…'}
            spellCheck={false}
            aria-label="Input bulk lagu"
          />

          <div className="bl-format-help">
            <p className="bl-help-title">Cara menulis:</p>
            <ul>
              <li>
                Pemisah antar lagu: <code>## Judul Lagu</code>, <code># Judul</code>, <code>===</code>, atau baris{' '}
                <code>Judul: ...</code>. Baris <code>---</code> juga memisahkan lagu.
              </li>
              <li>
                Metadata di bawah judul: <code>Artis:</code>, <code>Key:</code>, <code>Tempo:</code>{' '}
                <code>Genre:</code>, <code>Time Signature:</code>, <code>YouTube:</code>,{' '}
                <code>Keyboard Patch:</code>.
              </li>
              <li>Semua baris lain setelah metadata diperlakukan sebagai lirik &amp; chord.</li>
            </ul>
          </div>

          <div className="bl-options">
            <label className="bl-toggle">
              <input
                type="checkbox"
                checked={autoFormat}
                onChange={(event) => setAutoFormat(event.target.checked)}
              />
              <span>Rapikan otomatis (tag bagian, seragamkan chord, spasi)</span>
            </label>

            <div className="bl-defaults">
              <label className="bl-field">
                <span>Key default</span>
                <select value={defaultKey} onChange={(event) => setDefaultKey(event.target.value)}>
                  <option value="">— tidak ada —</option>
                  {SONG_KEY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="bl-field">
                <span>Tempo default (BPM)</span>
                <input
                  type="number"
                  min="40"
                  max="240"
                  value={defaultTempo}
                  onChange={(event) => setDefaultTempo(event.target.value)}
                  placeholder="120"
                />
              </label>
              <label className="bl-field">
                <span>Simpan ke band</span>
                <select
                  value={targetBandId}
                  onChange={(event) => setTargetBandId(event.target.value)}
                  disabled={bandsLoading}
                >
                  <option value="">Lagu pribadi</option>
                  {bands.map((band) => (
                    <option key={band.id} value={band.id}>
                      {band.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </section>

        {/* ---------- Preview ---------- */}
        <section className="bl-card" aria-labelledby="bl-preview-title">
          <div className="bl-card-head">
            <h2 id="bl-preview-title">2. Preview &amp; validasi</h2>
            <span className="bl-counter">
              {summary.readyCount}/{summary.total} siap
            </span>
          </div>

          {records.length === 0 ? (
            <div className="bl-empty">
              <p>Belum ada lagu terdeteksi.</p>
              <p className="bl-empty-hint">
                Tempel lirik-chord di sebelah kiri, atau klik <strong>Isi contoh</strong> untuk melihat format.
              </p>
            </div>
          ) : (
            <ul className="bl-preview-list">
              {records.map((record) => {
                const stats = describeLyrics(record.lyrics);
                const blocking = record.errors.filter((message) => !message.startsWith('Judul belum'));
                const status = record.errors.length === 0 ? 'ok' : blocking.length ? 'error' : 'warn';
                return (
                  <li
                    key={`${record.index}-${record.title}`}
                    className={`bl-preview-item bl-status-${status}${record.excluded ? ' is-excluded' : ''}`}
                  >
                    <div className="bl-preview-head">
                      <span className="bl-preview-index">{record.blockNumber}</span>
                      <span className="bl-preview-title">{record.title || 'Tanpa judul'}</span>
                      <span className="bl-preview-badge">
                        {status === 'ok' ? '✓ Siap' : status === 'warn' ? '⚠️ Periksa judul' : '⛔ Error'}
                      </span>
                    </div>

                    <div className="bl-preview-meta">
                      {record.artist && <span>👤 {record.artist}</span>}
                      {record.key && <span>🎹 {record.key}</span>}
                      {record.tempo && <span>⏱️ {record.tempo} BPM</span>}
                      {record.timeSignature && <span>🥁 {record.timeSignature}</span>}
                      {record.genre && <span>🎸 {record.genre}</span>}
                      {record.titleGuessed && <span>🤔 judul ditebak</span>}
                      <span>📝 {stats.lines} baris</span>
                    </div>

                    {record.errors.length > 0 && (
                      <ul className="bl-preview-errors">
                        {record.errors.map((message) => (
                          <li key={message}>{message}</li>
                        ))}
                      </ul>
                    )}

                    <details className="bl-preview-details">
                      <summary>Lihat lirik &amp; chord</summary>
                      <pre className="bl-preview-lyrics">{record.lyrics}</pre>
                    </details>

                    <div className="bl-preview-actions">
                      <button
                        type="button"
                        className="btn btn-secondary bl-mini-btn"
                        onClick={() => toggleExcluded(record.index)}
                      >
                        {record.excluded ? '↩️ Ikutkan lagi' : '✖️ Keluarkan dari proses simpan'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="bl-save-bar">
            <div className="bl-save-summary">
              <strong>{selectedReady.length}</strong> lagu siap disimpan
              {selectableRecords.length !== records.length && (
                <span className="bl-muted"> ({records.length - selectableRecords.length} dikeluarkan)</span>
              )}
              {selectedInvalid.length > 0 && (
                <span className="bl-error-text"> · {selectedInvalid.length} masih error</span>
              )}
            </div>
            <button
              type="button"
              className="btn btn-primary bl-save-btn"
              onClick={handleSave}
              disabled={!canSave || !user}
              title={canSave ? 'Simpan semua lagu sekaligus' : 'Perbaiki lagu yang error terlebih dahulu'}
            >
              {saving ? 'Menyimpan…' : `💾 Simpan ${selectedReady.length} lagu`}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
