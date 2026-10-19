/**
 * ChordTranscriberPage.jsx
 *
 * Modul AI Chord & Sheet Music Transcriber.
 *
 * Alur:
 *   1. Rekam suara (mikrofon) atau unggah file audio / MIDI.
 *   2. Opsional: isi judul, nada dasar preferensi, transpose target, & referensi lirik.
 *   3. AI menghasilkan draf: key, tempo, kapan kord masuk, lirik, dan melodi not angka.
 *   4. Hasil bisa diedit (preview format lagu), disalin, diunduh, atau dikirim ke
 *      "Tambah Lagu" untuk dijadikan lagu baru.
 *
 * Modul mengikuti pola registry (src/modules/registry.js) & bisa
 * dinonaktifkan dari halaman Modul.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { transcribeChordAudio } from '../../apiClient.js';
import { SONG_KEY_OPTIONS } from '../../utils/songOptions.js';
import { useTranscriberEnabled } from './useTranscriberEnabled.js';
import useAudioRecorder from './useAudioRecorder.js';
import { isMidiFile, parseMidiFile, summarizeMidi } from './midiFileParser.js';
import { buildTranscribePrompt, transcriptionToSongText } from './transcribePrompt.js';

const AUDIO_ACCEPT = 'audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac';
const MIDI_ACCEPT = '.mid,.midi,audio/midi,audio/x-midi';
const MAX_AUDIO_BYTES = 18 * 1024 * 1024;

const formatSeconds = (total) => {
  const safe = Math.max(0, Math.floor(Number(total) || 0));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
};

const formatBytes = (bytes) => {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

function downloadText(fileName, text, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const slugify = (value) => String(value || 'transkripsi')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60) || 'transkripsi';

export default function ChordTranscriberPage() {
  const navigate = useNavigate();
  const [enabled] = useTranscriberEnabled();
  // Callback onStop-nya baru dipakai setelah handleStopRecording dideklarasikan
  // (lihat `recorder.onStopRef`), jadi hook dipanggil tanpa argumen.
  const recorder = useAudioRecorder();
  const { resultId: recordingResultId } = recorder;
  const audioInputRef = useRef(null);
  const midiInputRef = useRef(null);
  const lyricHintRef = useRef(null);

  const [title, setTitle] = useState('');
  const [keyHint, setKeyHint] = useState('');
  const [transposeTarget, setTransposeTarget] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [midiFile, setMidiFile] = useState(null);
  const [midiSummary, setMidiSummary] = useState('');
  const [midiError, setMidiError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  // Info model: peringatan bila model utama sedang sibuk / sudah usang.
  const [modelNotice, setModelNotice] = useState('');
  const [attemptLog, setAttemptLog] = useState([]);
  const [error, setError] = useState('');
  const [songText, setSongText] = useState('');
  const [copied, setCopied] = useState('');
  const [savedDraft, setSavedDraft] = useState(false);
  // Rekaman terlalu besar tidak boleh langsung dikirim ke AI.
  const [recordingTooLarge, setRecordingTooLarge] = useState(false);

  // Blob dari perekaman dipakai sebagai audio bila user tidak memilih file.
  const recordedBlob = recorder.blob;
  const effectiveAudio = audioFile || recordedBlob;
  const audioName = useMemo(() => {
    if (audioFile?.name) return audioFile.name;
    if (recordedBlob) {
      const ext = (recordedBlob.type || '').includes('mp4') ? 'm4a' : 'webm';
      return `rekaman-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${ext}`;
    }
    return '';
  }, [audioFile, recordedBlob]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(''), 2200);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleAudioPick = (file) => {
    setUploadError('');
    setRecordingTooLarge(false);
    if (!file) return;
    if (file.size > MAX_AUDIO_BYTES) {
      setUploadError(`File terlalu besar (${formatBytes(file.size)}). Maksimal ${formatBytes(MAX_AUDIO_BYTES)} — potong rekaman atau unggah per bagian.`);
      return;
    }
    setAudioFile(file);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));
  };

  const handleMidiPick = async (file) => {
    setMidiError('');
    if (!file) return;
    if (!isMidiFile(file.name, file.type)) {
      setMidiError('File MIDI harus berakhiran .mid atau .midi.');
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseMidiFile(buffer);
      const summary = summarizeMidi(parsed);
      setMidiFile(file);
      setMidiSummary(summary);
      if (!title) setTitle(file.name.replace(/\.(mid|midi)$/i, ''));
    } catch (err) {
      setMidiFile(null);
      setMidiSummary('');
      setMidiError(err?.message || 'Gagal membaca file MIDI.');
    }
  };

  // Rekaman selesai -> validasi ukuran (maks 18 MB per transkripsi).
  // `recordingResultId` ikut berubah saat rekaman direset/direkam ulang, jadi
  // pesan ukuran selalu mengikuti hasil rekaman terakhir.
  useEffect(() => {
    if (!recordedBlob) {
      setRecordingTooLarge(false);
      return;
    }
    const tooLarge = recordedBlob.size > MAX_AUDIO_BYTES;
    setRecordingTooLarge(tooLarge);
    setUploadError(
      tooLarge
        ? `Rekaman terlalu panjang (${formatBytes(recordedBlob.size)}). Maksimal ${formatBytes(MAX_AUDIO_BYTES)} — potong menjadi beberapa bagian.`
        : '',
    );
  }, [recordedBlob, recordingResultId]);


  const canSubmit = Boolean(
    (midiSummary || (effectiveAudio && !recordingTooLarge)) && !isLoading && enabled,
  );

  const handleTranscribe = async () => {
    setError('');
    setResult(null);
    setSavedDraft(false);
    if (!midiSummary && (!effectiveAudio || recordingTooLarge)) {
      setError('Rekam, unggah file audio, atau unggah file MIDI terlebih dahulu.');
      return;
    }
    setIsLoading(true);
    setModelNotice('');
    setAttemptLog([]);
    try {
      const prompt = buildTranscribePrompt({
        sourceType: midiSummary ? (audioFile ? 'audio+midi' : 'midi') : 'audio',
        sourceName: audioName || midiFile?.name || title,
        keyHint,
        transposeTarget,
        lyricsHint: lyricHintRef.current?.value || '',
        midiSummary,
      });
      const upload = audioFile || (recordedBlob
        ? new File([recordedBlob], audioName, { type: recordedBlob.type || 'audio/webm' })
        : null);
      const response = await transcribeChordAudio({
        audio: upload,
        prompt,
        sourceType: midiSummary ? 'midi' : 'audio',
        sourceName: audioName || midiFile?.name || title,
        keyHint,
        midiSummary,
      });
      const normalised = {
        key: response?.key || null,
        tempo: response?.tempo ?? null,
        timeSignature: response?.timeSignature || null,
        capo: response?.capo ?? null,
        sections: Array.isArray(response?.sections) ? response.sections : [],
        melody: response?.melody || '',
        notes: response?.notes || '',
        modelUsed: response?.modelUsed || null,
      };
      const attempts = Array.isArray(response?.attemptedModels) ? response.attemptedModels : [];
      setAttemptLog(attempts);
      if (attempts.some((attempt) => /high demand|overloaded|unavailable/i.test(attempt.message || ''))) {
        setModelNotice('Model utama sedang sibuk, jadi hasil ini dibuat oleh model cadangan. Kualitas tetap baik — coba lagi nanti bila ingin model terbaru.');
      } else if (attempts.some((attempt) => attempt.status === 404)) {
        setModelNotice('Model lama sudah tidak tersedia untuk API key ini, jadi otomatis dipakai model yang masih aktif.');
      }
      if (normalised.sections.length === 0 && !normalised.melody) {
        throw new Error('AI tidak mengembalikan chord/not yang bisa dibaca. Coba rekaman yang lebih jelas atau file MIDI.');
      }
      setResult(normalised);
      setSongText(transcriptionToSongText(normalised));
    } catch (err) {
      setError(err?.message || 'Gagal mentranskripsi. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
    } catch {
      setCopied('Gagal menyalin');
    }
  };

  const handleOpenInSongEditor = () => {
    if (!songText.trim()) return;
    navigate('/songs/add', {
      state: {
        from: '/chord-transcriber',
        prefill: {
          title: title.trim(),
          key: result?.key || keyHint || '',
          tempo: result?.tempo || '',
          timeSignature: result?.timeSignature || '',
          lyrics: songText,
        },
      },
    });
  };

  const handleSaveDraft = () => {
    if (!songText.trim()) return;
    try {
      const drafts = JSON.parse(localStorage.getItem('ruang-performer:transcriber:drafts') || '[]');
      const next = [
        {
          id: Date.now(),
          title: title.trim() || 'Transkripsi tanpa judul',
          key: result?.key || keyHint || '',
          tempo: result?.tempo || null,
          createdAt: new Date().toISOString(),
          text: songText,
        },
        ...(Array.isArray(drafts) ? drafts : []),
      ].slice(0, 20);
      localStorage.setItem('ruang-performer:transcriber:drafts', JSON.stringify(next));
      setSavedDraft(true);
    } catch {
      setError('Gagal menyimpan draf di perangkat ini (storage penuh / mode privat).');
    }
  };

  const notEnabled = !enabled;

  return (
    <div className="page-container ct-page">
      <div className="page-header">
        <div>
          <h1>🤖 AI Chord &amp; Sheet Music Transcriber</h1>
          <p>Ubah rekaman latihan, permainan instrumen, file .mp3, atau .mid menjadi draf lirik + chord &amp; Not Angka.</p>
        </div>
      </div>

      {notEnabled && (
        <div className="ct-banner ct-banner-warn" role="status">
          Modul ini sedang dinonaktifkan.{' '}
          <button type="button" className="btn btn-secondary ct-link-btn" onClick={() => navigate('/modules')}>
            Aktifkan di halaman Modul
          </button>
        </div>
      )}

      <div className={`ct-layout${notEnabled ? ' is-disabled' : ''}`}>
        {/* ---------- Panel sumber audio ---------- */}
        <section className="card ct-card" aria-labelledby="ct-source-title">
          <h2 id="ct-source-title">1. Sumber Audio</h2>

          <div className="ct-recorder">
            <div className={`ct-rec-dot${recorder.status === 'recording' ? ' is-live' : ''}`} aria-hidden="true" />
            <div className="ct-rec-time" aria-live="polite">{formatSeconds(recorder.elapsed)}</div>
            <div className="ct-rec-actions">
              {recorder.status === 'idle' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setAudioFile(null);
                    setRecordingTooLarge(false);
                    setUploadError('');
                    recorder.start();
                  }}
                  disabled={!recorder.isSupported || isLoading}
                >
                  🎙️ Mulai Rekam
                </button>
              )}
              {recorder.status === 'requesting' && (
                <button type="button" className="btn btn-secondary" disabled>Meminta izin mikrofon…</button>
              )}
              {recorder.status === 'recording' && (
                <>
                  <button type="button" className="btn btn-secondary" onClick={recorder.pause}>⏸️ Jeda</button>
                  <button type="button" className="btn btn-red" onClick={recorder.stop}>⏹️ Selesai</button>
                </>
              )}
              {recorder.status === 'paused' && (
                <>
                  <button type="button" className="btn btn-primary" onClick={recorder.resume}>▶️ Lanjut</button>
                  <button type="button" className="btn btn-red" onClick={recorder.stop}>⏹️ Selesai</button>
                </>
              )}
            </div>
          </div>
          {recorder.error && <p className="ct-hint ct-hint-error">{recorder.error}</p>}
          {!recorder.isSupported && (
            <p className="ct-hint">Browser ini tidak mendukung perekaman langsung — gunakan unggahan file di bawah.</p>
          )}

          <div className="ct-field">
            <label className="ct-dropzone" htmlFor="ct-audio-input">
              <span className="ct-dropzone-icon" aria-hidden="true">📁</span>
              <span className="ct-dropzone-title">Unggah file audio</span>
              <span className="ct-dropzone-sub">MP3, WAV, M4A, OGG, WEBM — maksimal {formatBytes(MAX_AUDIO_BYTES)}</span>
              <span className="ct-dropzone-sub ct-dropzone-note">Butuh lagu dari YouTube? Unduh audionya lebih dulu (sesuai izin hak cipta), lalu unggah di sini.</span>
            </label>
            <input
              id="ct-audio-input"
              ref={audioInputRef}
              type="file"
              accept={AUDIO_ACCEPT}
              className="ct-file-input"
              onChange={(event) => handleAudioPick(event.target.files?.[0])}
            />
            {effectiveAudio && (
              <div className="ct-file-pill">
                <span className="ct-file-pill-name" title={audioName}>🎵 {audioName}</span>
                <span className="ct-file-pill-size">{formatBytes(effectiveAudio.size)}</span>
                <button
                  type="button"
                  className="btn btn-secondary ct-mini-btn"
                  onClick={() => {
                    setAudioFile(null);
                    setRecordingTooLarge(false);
                    setUploadError('');
                    recorder.reset();
                    if (audioInputRef.current) audioInputRef.current.value = '';
                  }}
                >
                  Hapus
                </button>
              </div>
            )}
            {uploadError && <p className="ct-hint ct-hint-error">{uploadError}</p>}
          </div>

          <div className="ct-field">
            <label className="ct-label" htmlFor="ct-midi-input">atau unggah file MIDI (.mid/.midi) — hasil paling akurat untuk nada</label>
            <input
              id="ct-midi-input"
              ref={midiInputRef}
              type="file"
              accept={MIDI_ACCEPT}
              className="ct-file-input-visible"
              onChange={(event) => handleMidiPick(event.target.files?.[0])}
            />
            {midiFile && (
              <div className="ct-file-pill">
                <span className="ct-file-pill-name" title={midiFile.name}>🎹 {midiFile.name}</span>
                <button
                  type="button"
                  className="btn btn-secondary ct-mini-btn"
                  onClick={() => {
                    setMidiFile(null);
                    setMidiSummary('');
                    if (midiInputRef.current) midiInputRef.current.value = '';
                  }}
                >
                  Hapus
                </button>
              </div>
            )}
            {midiError && <p className="ct-hint ct-hint-error">{midiError}</p>}
          </div>

          <details className="ct-details">
            <summary>Referensi lirik (opsional)</summary>
            <p className="ct-hint">
              Tempel lirik yang sudah kamu ketik — AI memakai ini untuk menyelaraskan baris dan hanya melengkapi bagian
              yang terdengar.
            </p>
            <textarea
              ref={lyricHintRef}
              className="ct-textarea"
              rows={5}
              placeholder={'Verse 1:\nKetika malam tiba…'}
            />
          </details>
        </section>

        {/* ---------- Panel pengaturan ---------- */}
        <section className="card ct-card" aria-labelledby="ct-settings-title">
          <h2 id="ct-settings-title">2. Pengaturan Transkripsi</h2>

          <div className="ct-field">
            <label className="ct-label" htmlFor="ct-title">Judul lagu (opsional)</label>
            <input
              id="ct-title"
              className="ct-input"
              type="text"
              value={title}
              placeholder="Mis. Latihan akustik 12 Okt"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="ct-grid-2">
            <div className="ct-field">
              <label className="ct-label" htmlFor="ct-key">Nada dasar preferensi</label>
              <select id="ct-key" className="ct-input" value={keyHint} onChange={(event) => setKeyHint(event.target.value)}>
                <option value="">Deteksi otomatis</option>
                {SONG_KEY_OPTIONS.map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>
            <div className="ct-field">
              <label className="ct-label" htmlFor="ct-transpose">Transpose hasil ke</label>
              <select id="ct-transpose" className="ct-input" value={transposeTarget} onChange={(event) => setTransposeTarget(event.target.value)}>
                <option value="">Sesuai nada asli</option>
                {SONG_KEY_OPTIONS.map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary ct-submit"
            onClick={handleTranscribe}
            disabled={!canSubmit}
          >
            {isLoading ? '⏳ Menganalisis audio…' : '✨ Transkripsi Sekarang'}
          </button>
          {isLoading && (
            <p className="ct-hint">
              AI sedang mendengarkan audio. Rekaman 3 menit biasanya butuh 20–60 detik. Jangan tutup halaman ini.
            </p>
          )}
          {error && (
            <div className="ct-hint ct-hint-error" role="alert">
              <p>{error}</p>
              {attemptLog.length > 0 && (
                <ul className="ct-attempts">
                  {attemptLog.map((attempt) => (
                    <li key={attempt.model}>
                      <strong>{attempt.model}</strong>: HTTP {attempt.status}
                      {attempt.ms ? ` · ${(attempt.ms / 1000).toFixed(1)}s` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <ul className="ct-tips">
            <li>Rekam satu instrumen akustik untuk kord yang lebih bersih.</li>
            <li>File MIDI memberi hasil nada paling presisi (tanpa menebak).</li>
            <li>Selalu cek ulang hasil — AI menulis draf, bukan partitur final.</li>
          </ul>
        </section>
      </div>

      {/* ---------- Hasil ---------- */}
      {result && (
        <section className="card ct-card ct-result" aria-labelledby="ct-result-title">
          <div className="ct-result-header">
            <h2 id="ct-result-title">3. Draf Hasil Transkripsi</h2>
            <div className="ct-result-meta">
              {result.key && <span className="ct-badge">Key: {result.key}</span>}
              {result.tempo && <span className="ct-badge">{result.tempo} BPM</span>}
              {result.timeSignature && <span className="ct-badge">{result.timeSignature}</span>}
              {result.capo && <span className="ct-badge">Capo {result.capo}</span>}
              {result.modelUsed && <span className="ct-badge ct-badge-muted">{result.modelUsed}</span>}
            </div>
          </div>

          {modelNotice && <p className="ct-hint ct-model-notice">ℹ️ {modelNotice}</p>}

          <div className="ct-sections">
            {result.sections.map((section, index) => (
              <article key={`${section.label}-${index}`} className="ct-section">
                <h3>{section.label}</h3>
                {section.chords && <pre className="ct-chords">{section.chords}</pre>}
                {section.lyrics && <pre className="ct-lyrics">{section.lyrics}</pre>}
              </article>
            ))}
          </div>

          {result.melody && (
            <div className="ct-melody">
              <h3>🎼 Melodi utama (Not Angka)</h3>
              <pre className="ct-chords">{result.melody}</pre>
            </div>
          )}

          {result.notes && (
            <p className="ct-hint ct-note-ai">Catatan AI: {result.notes}</p>
          )}

          <div className="ct-editor-block">
            <div className="ct-editor-head">
              <h3>Format lagu (bisa diedit)</h3>
              <div className="ct-editor-actions">
                <button type="button" className="btn btn-secondary ct-mini-btn" onClick={() => setSongText(transcriptionToSongText(result))}>
                  Reset
                </button>
                <button type="button" className="btn btn-secondary ct-mini-btn" onClick={() => copyToClipboard(songText, 'Kode lagu')}>
                  {copied === 'Kode lagu' ? '✓ Tersalin' : 'Salin'}
                </button>
                <button type="button" className="btn btn-secondary ct-mini-btn" onClick={() => copyToClipboard(`[${title || 'Transkripsi'}]\n\n${songText}`, 'Draf lengkap')}>
                  {copied === 'Draf lengkap' ? '✓ Tersalin' : 'Salin draf'}
                </button>
              </div>
            </div>
            <textarea
              className="ct-textarea ct-preview"
              value={songText}
              rows={Math.min(28, Math.max(10, songText.split('\n').length + 2))}
              onChange={(event) => setSongText(event.target.value)}
              spellCheck={false}
            />
            <div className="ct-result-actions">
              <button type="button" className="btn btn-primary" onClick={handleOpenInSongEditor}>
                ➕ Buat Lagu dari Draf
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleSaveDraft}>
                {savedDraft ? '✓ Draf tersimpan' : '💾 Simpan Draf'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => downloadText(`${slugify(title || result.key || 'transkripsi')}.txt`, songText)}
              >
                ⬇️ Unduh .txt
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
