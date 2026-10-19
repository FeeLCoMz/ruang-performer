/**
 * useAudioRecorder.js
 *
 * Hook perekam audio sederhana berbasis MediaRecorder untuk modul
 * Chord & Sheet Music Transcriber.
 *
 * Catatan kompatibilitas:
 * - iOS Safari baru mendukung MediaRecorder sejak 14.3, jadi UI tetap
 *   menyediakan jalur upload file bila perekaman tidak tersedia.
 * - `status`: 'idle' | 'requesting' | 'recording' | 'paused'.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

export function useAudioRecorder({ onStop } = {}) {
  const [status, setStatus] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [blob, setBlob] = useState(null);
  // Counter terpisah: Blob yang sama (mis. setelah rekam ulang) tetap memicu
  // efek validasi ukuran di pemanggil.
  const [resultId, setResultId] = useState(0);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef(null);
  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;

  const isSupported = typeof navigator !== 'undefined'
    && typeof navigator.mediaDevices?.getUserMedia === 'function'
    && typeof MediaRecorder !== 'undefined';

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    clearTimer();
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } catch {
      // ignore
    }
    releaseStream();
  }, [releaseStream]);

  const start = useCallback(async () => {
    setError('');
    if (!isSupported) {
      setError('Perekaman audio tidak didukung browser ini. Unggah file audio/MIDI saja.');
      return;
    }
    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        clearTimer();
        releaseStream();
        const type = recorder.mimeType || mimeType || 'audio/webm';
        const nextBlob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        setBlob(nextBlob);
        setResultId((prev) => prev + 1);
        setStatus('idle');
        if (typeof onStopRef.current === 'function') onStopRef.current(nextBlob);
      };
      recorder.onerror = () => {
        setError('Terjadi kesalahan saat merekam audio.');
        setStatus('idle');
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 500);
      setStatus('recording');
    } catch (err) {
      setStatus('idle');
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError('Izin mikrofon ditolak. Aktifkan izin mikrofon atau unggah file audio.');
      } else if (name === 'NotFoundError') {
        setError('Tidak ada mikrofon yang terdeteksi.');
      } else {
        setError(err?.message || 'Gagal memulai perekaman.');
      }
    }
  }, [isSupported, releaseStream]);

  const stop = useCallback(() => {
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } catch {
      setStatus('idle');
      releaseStream();
    }
  }, [releaseStream]);

  const pause = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.pause();
      clearTimer();
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      setStatus('paused');
    }
  }, []);

  // elapsedRef menyimpan detik berjalan saat jeda, jadi resume tidak perlu
  // bergantung pada state `elapsed` (yang bisa basi saat callback lama).
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;
  const resume = useCallback(() => {
    if (recorderRef.current?.state === 'paused') {
      recorderRef.current.resume();
      startedAtRef.current = Date.now() - elapsedRef.current * 1000;
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 500);
      setStatus('recording');
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    releaseStream();
    setBlob(null);
    setResultId((prev) => prev + 1);
    setElapsed(0);
    setStatus('idle');
    setError('');
  }, [releaseStream]);

  return {
    isSupported,
    status,
    elapsed,
    error,
    blob,
    resultId,
    start,
    stop,
    pause,
    resume,
    reset,
    setError,
  };
}

export default useAudioRecorder;
