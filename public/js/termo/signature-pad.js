/**
 * Componente SignaturePad nativo para assinatura digital em Canvas.
 * Suporta touch (celulares/tablets) e mouse (desktop), com correção de DPI e traço suave.
 */

export function initSignaturePad(canvas, options = {}) {
  const win = options.window || (typeof window !== 'undefined' ? window : null);
  const strokeColor = options.strokeColor || '#0f172a';
  const lineWidth = options.lineWidth || 2.5;
  const ctx = canvas.getContext('2d');

  let isDrawing = false;
  let hasDrawn = false;
  let lastX = 0;
  let lastY = 0;

  if (ctx) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
  }

  function resizeCanvas() {
    if (!win || !ctx) return;
    const ratio = Math.max(win.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      ctx.scale(ratio, ratio);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
    }
  }

  function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  function startStroke(x, y) {
    if (!ctx) return;
    isDrawing = true;
    lastX = x;
    lastY = y;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function moveStroke(x, y) {
    if (!isDrawing || !ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x;
    lastY = y;
    hasDrawn = true;
  }

  function endStroke() {
    if (!isDrawing) return;
    isDrawing = false;
    if (ctx && typeof ctx.closePath === 'function') {
      ctx.closePath();
    }
  }

  // Handlers de mouse
  function onMouseDown(e) {
    e.preventDefault();
    const coords = getCoordinates(e);
    startStroke(coords.x, coords.y);
  }

  function onMouseMove(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    moveStroke(coords.x, coords.y);
  }

  function onMouseUp(e) {
    e.preventDefault();
    endStroke();
  }

  // Handlers de touch
  function onTouchStart(e) {
    e.preventDefault();
    const coords = getCoordinates(e);
    startStroke(coords.x, coords.y);
  }

  function onTouchMove(e) {
    e.preventDefault();
    const coords = getCoordinates(e);
    moveStroke(coords.x, coords.y);
  }

  function onTouchEnd(e) {
    e.preventDefault();
    endStroke();
  }

  // Registrar listeners se o ambiente for navegador
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseUp);

  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

  function clear() {
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: canvas.width, height: canvas.height };
    ctx.clearRect(0, 0, canvas.width || rect.width, canvas.height || rect.height);
    hasDrawn = false;
    isDrawing = false;
  }

  function isEmpty() {
    return !hasDrawn;
  }

  function toDataURL(type = 'image/png') {
    return canvas.toDataURL(type);
  }

  function destroy() {
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('mouseleave', onMouseUp);

    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
    canvas.removeEventListener('touchcancel', onTouchEnd);
  }

  return {
    startStroke,
    moveStroke,
    endStroke,
    clear,
    isEmpty,
    toDataURL,
    resizeCanvas,
    destroy,
  };
}
