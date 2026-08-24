import React from 'react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import VirtualPiano from '../components/VirtualPiano.jsx';

describe('VirtualPiano MIDI input', () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    class MockAudioContext {
      constructor() {
        this.state = 'running';
        this.currentTime = 0;
        this.destination = {};
      }

      resume() {
        this.state = 'running';
        return Promise.resolve();
      }

      createOscillator() {
        return {
          type: 'sine',
          frequency: { setValueAtTime: vi.fn() },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
      }

      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        };
      }
    }

    window.AudioContext = MockAudioContext;
    window.webkitAudioContext = MockAudioContext;

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  test('connects a MIDI input device and triggers the piano callback on note on events', async () => {
    const onKeySelect = vi.fn();
    const input = { id: 'input-1', name: 'USB Keyboard', onmidimessage: null };
    const access = {
      inputs: new Map([['input-1', input]]),
      outputs: new Map(),
      onstatechange: null,
    };

    navigator.requestMIDIAccess = vi.fn().mockResolvedValue(access);

    await act(async () => {
      root.render(
        <VirtualPiano
          isOpen={true}
          onClose={() => {}}
          onKeySelect={onKeySelect}
          helperText="MIDI keyboard test"
        />
      );
      await Promise.resolve();
    });

    expect(navigator.requestMIDIAccess).toHaveBeenCalled();

    act(() => {
      input.onmidimessage({ data: [0x90, 60, 100] });
    });

    expect(onKeySelect).toHaveBeenCalledWith('C');
  });

  test('allows dragging the piano popup by moving the header', async () => {
    await act(async () => {
      root.render(
        <VirtualPiano
          isOpen={true}
          onClose={() => {}}
          helperText="Drag test"
        />
      );
    });

    const header = container.querySelector('.piano-popup-header');
    const popup = container.querySelector('.piano-popup');
    expect(header).not.toBeNull();
    expect(popup).not.toBeNull();

    act(() => {
      header.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 200, bubbles: true }));
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 180, clientY: 260, bubbles: true }));
      window.dispatchEvent(new MouseEvent('mouseup', { clientX: 180, clientY: 260, bubbles: true }));
    });

    expect(popup.style.left).not.toBe('');
    expect(popup.style.top).not.toBe('');
    expect(Number.parseFloat(popup.style.left)).toBeGreaterThan(20);
    expect(Number.parseFloat(popup.style.top)).toBeGreaterThan(20);
  });
});
