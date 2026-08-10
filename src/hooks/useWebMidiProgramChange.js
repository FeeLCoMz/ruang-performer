import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const MIDI_OUTPUT_STORAGE_KEY = 'ruangperformer_midi_output_id';
const MIDI_ENABLE_STORAGE_KEY = 'ruangperformer_midi_enable_program_change';

const normalizeMidiProgram = (value) => {
  const numeric = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(numeric)) return null;
  if (numeric >= 0 && numeric <= 127) return numeric;
  if (numeric >= 1 && numeric <= 128) return numeric - 1;
  return null;
};

const normalizeMidiChannelZeroBased = (value) => {
  const numeric = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric >= 1 && numeric <= 16) return numeric - 1;
  if (numeric >= 0 && numeric <= 15) return numeric;
  return 0;
};

const normalizeMidiByte = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number.parseInt(String(value).trim(), 10);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < 0 || numeric > 127) return null;
  return numeric;
};

export default function useWebMidiProgramChange() {
  const midiAccessRef = useRef(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isAccessGranted, setIsAccessGranted] = useState(false);
  const [outputs, setOutputs] = useState([]);
  const [selectedOutputId, setSelectedOutputId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(MIDI_OUTPUT_STORAGE_KEY) || '';
  });
  const [isEnabled, setIsEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(MIDI_ENABLE_STORAGE_KEY) === 'true';
  });
  const [lastMessage, setLastMessage] = useState('MIDI belum terhubung.');

  const refreshOutputs = useCallback(() => {
    const access = midiAccessRef.current;
    if (!access) {
      setOutputs([]);
      return;
    }

    const nextOutputs = Array.from(access.outputs.values()).map((output) => ({
      id: output.id,
      name: output.name || 'MIDI Output',
      manufacturer: output.manufacturer || '',
      state: output.state,
      connection: output.connection,
    }));

    setOutputs(nextOutputs);
  }, []);

  useEffect(() => {
    setIsSupported(typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MIDI_OUTPUT_STORAGE_KEY, selectedOutputId || '');
  }, [selectedOutputId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MIDI_ENABLE_STORAGE_KEY, isEnabled ? 'true' : 'false');
  }, [isEnabled]);

  useEffect(() => {
    if (!outputs.length) return;
    const outputExists = outputs.some((output) => output.id === selectedOutputId);
    if (!outputExists) {
      setSelectedOutputId(outputs[0]?.id || '');
    }
  }, [outputs, selectedOutputId]);

  const requestAccess = useCallback(async () => {
    if (typeof navigator === 'undefined' || typeof navigator.requestMIDIAccess !== 'function') {
      setLastMessage('Browser ini tidak mendukung Web MIDI API.');
      return false;
    }

    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      midiAccessRef.current = access;
      setIsAccessGranted(true);
      refreshOutputs();

      access.onstatechange = () => {
        refreshOutputs();
      };

      setLastMessage('Akses MIDI aktif. Pilih output untuk Program Change.');
      return true;
    } catch (error) {
      setIsAccessGranted(false);
      setLastMessage(error?.message || 'Gagal mengakses perangkat MIDI.');
      return false;
    }
  }, [refreshOutputs]);

  const selectedOutput = useMemo(() => {
    const access = midiAccessRef.current;
    if (!access || !selectedOutputId) return null;
    return access.outputs.get(selectedOutputId) || null;
  }, [selectedOutputId, outputs]);

  const sendProgramChange = useCallback((midi = {}, contextLabel = '') => {
    if (!isSupported) {
      setLastMessage('Web MIDI tidak didukung di browser ini.');
      return false;
    }

    if (!isAccessGranted) {
      setLastMessage('Akses MIDI belum diberikan. Klik Connect MIDI dulu.');
      return false;
    }

    if (!isEnabled) {
      setLastMessage('Auto Program Change masih nonaktif.');
      return false;
    }

    if (!selectedOutput) {
      setLastMessage('Belum ada output MIDI yang dipilih.');
      return false;
    }

    const program = normalizeMidiProgram(midi?.program);
    if (program === null) {
      setLastMessage('Cue tidak punya nilai Program Change yang valid.');
      return false;
    }

    const channel = normalizeMidiChannelZeroBased(midi?.channel ?? 1);
    const bankMsb = normalizeMidiByte(midi?.bankMsb);
    const bankLsb = normalizeMidiByte(midi?.bankLsb);

    try {
      const now = performance.now();
      if (bankMsb !== null) {
        selectedOutput.send([0xB0 + channel, 0x00, bankMsb], now);
      }
      if (bankLsb !== null) {
        selectedOutput.send([0xB0 + channel, 0x20, bankLsb], now + 1);
      }
      selectedOutput.send([0xC0 + channel, program], now + 2);

      const displayProgram = program + 1;
      const displayChannel = channel + 1;
      const contextPrefix = contextLabel ? `${contextLabel} - ` : '';
      setLastMessage(`${contextPrefix}Program Change terkirim: PC ${displayProgram} CH ${displayChannel}.`);
      return true;
    } catch (error) {
      setLastMessage(error?.message || 'Gagal mengirim Program Change ke perangkat MIDI.');
      return false;
    }
  }, [isAccessGranted, isEnabled, isSupported, selectedOutput]);

  return {
    isSupported,
    isAccessGranted,
    outputs,
    selectedOutputId,
    setSelectedOutputId,
    isEnabled,
    setIsEnabled,
    lastMessage,
    requestAccess,
    sendProgramChange,
  };
}
