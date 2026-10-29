import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Window } from 'happy-dom';
import { initSignaturePad } from '../public/js/termo/signature-pad.js';

describe('SignaturePad Component', () => {
  let window;
  let document;
  let canvas;
  let ctxMock;

  beforeEach(() => {
    window = new Window();
    document = window.document;
    canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;

    ctxMock = {
      beginPath: mock(() => {}),
      moveTo: mock(() => {}),
      lineTo: mock(() => {}),
      stroke: mock(() => {}),
      clearRect: mock(() => {}),
      fillRect: mock(() => {}),
      closePath: mock(() => {}),
      scale: mock(() => {}),
      lineCap: 'round',
      lineJoin: 'round',
      lineWidth: 2,
      strokeStyle: '#000000',
    };

    canvas.getContext = mock((type) => (type === '2d' ? ctxMock : null));
    canvas.toDataURL = mock(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    canvas.getBoundingClientRect = mock(() => ({
      left: 10,
      top: 10,
      width: 400,
      height: 200,
    }));
  });

  it('initializes in empty state', () => {
    const pad = initSignaturePad(canvas, { window });
    expect(pad.isEmpty()).toBe(true);
  });

  it('marks as not empty after drawing gesture', () => {
    const pad = initSignaturePad(canvas, { window });
    expect(pad.isEmpty()).toBe(true);

    pad.startStroke(50, 50);
    pad.moveStroke(60, 60);
    pad.endStroke();

    expect(pad.isEmpty()).toBe(false);
    expect(ctxMock.beginPath).toHaveBeenCalled();
    expect(ctxMock.lineTo).toHaveBeenCalled();
    expect(ctxMock.stroke).toHaveBeenCalled();
  });

  it('resets to empty when clear() is called', () => {
    const pad = initSignaturePad(canvas, { window });
    pad.startStroke(50, 50);
    pad.moveStroke(60, 60);
    pad.endStroke();
    expect(pad.isEmpty()).toBe(false);

    pad.clear();
    expect(pad.isEmpty()).toBe(true);
    expect(ctxMock.clearRect).toHaveBeenCalled();
  });

  it('returns data URL when toDataURL is called', () => {
    const pad = initSignaturePad(canvas, { window });
    const dataUrl = pad.toDataURL();
    expect(dataUrl).toContain('data:image/png;base64,');
  });
});
