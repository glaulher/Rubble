async function generateReport() {
  const btn = document.getElementById('generateReportBtn');
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = 'Gerando...';

  const savedBtnVisibility = btn.style.visibility;
  btn.style.visibility = 'hidden';

  const sidebar = document.getElementById('sidebar');
  const header = document.querySelector('header');
  const app = document.getElementById('app');
  const savedSidebarDisplay = sidebar ? sidebar.style.display : '';
  const savedHeaderDisplay = header ? header.style.display : '';
  const savedAppMargin = app ? app.style.marginLeft : '';
  const savedAppPadding = app ? app.style.paddingTop : '';
  const savedAppTransition = app ? app.style.transition : '';
  const savedAppWidth = app ? app.style.width : '';
  const savedBodyBg = document.body.style.backgroundColor;

  if (sidebar) sidebar.style.display = 'none';
  if (header) header.style.display = 'none';
  if (app) {
    app.style.transition = 'none';
    app.style.marginLeft = '0';
    app.style.width = '100%';
    const dashHeader = app.querySelector('header');
    app.style.paddingTop = dashHeader ? (dashHeader.offsetHeight + 12) + 'px' : '0';
  }
  document.body.style.backgroundColor = '#f9fafb';

  void document.body.offsetHeight;

  try {
    await embedImgDataUrls();
    await preloadImages();

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 6;
    const usableW = pageW - margin * 2;

    let slices = calcSlices(usableW, pageH);
    if (slices.length === 0) {
      slices = [{ y: 0, h: document.body.scrollHeight }];
    }

    const fullCanvas = await html2canvas(document.body, {
      scale: 2, useCORS: true, allowTaint: true,
      backgroundColor: '#f9fafb', logging: false,
      foreignObjectRendering: true,
    });

    const scale = 2;

    for (let i = 0; i < slices.length; i++) {
      const s = slices[i];
      const slicePxH = s.h * scale;
      if (slicePxH <= 0) continue;

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = fullCanvas.width;
      sliceCanvas.height = slicePxH;
      const ctx = sliceCanvas.getContext('2d');
      ctx.drawImage(fullCanvas, 0, s.y * scale, fullCanvas.width, slicePxH, 0, 0, fullCanvas.width, slicePxH);

      const imgData = sliceCanvas.toDataURL('image/png');
      const imgW = usableW;
      const imgH = (sliceCanvas.height * imgW) / sliceCanvas.width;

      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, margin, imgW, imgH);
    }

    pdf.save('dashboard-report-' + new Date().toISOString().split('T')[0] + '.pdf');
  } catch (err) {
    console.error(err);
    if (typeof showToast === 'function') {
      showToast('Erro ao gerar PDF', 'error');
    }
  } finally {
    if (sidebar) sidebar.style.display = savedSidebarDisplay;
    if (header) header.style.display = savedHeaderDisplay;
    if (app) {
      app.style.transition = savedAppTransition;
      app.style.marginLeft = savedAppMargin;
      app.style.paddingTop = savedAppPadding;
      app.style.width = savedAppWidth;
    }
    document.body.style.backgroundColor = savedBodyBg;
    btn.style.visibility = savedBtnVisibility;
    btn.disabled = false;
    btn.textContent = 'Gerar Relatório';
  }
}

function embedImgDataUrls() {
  const images = document.querySelectorAll('img');
  const promises = [];
  images.forEach(function(img) {
    const src = img.currentSrc || img.src;
    if (!src || src.match(/^(data|blob):/)) return;

    const p = fetch(src, { credentials: 'same-origin' })
      .then(function(r) { if (!r.ok) throw new Error('fetch fail'); return r.blob(); })
      .then(function(blob) {
        return new Promise(function(resolve) {
          const reader = new FileReader();
          reader.onload = function() {
            const url = reader.result;
            img.onload = resolve;
            img.onerror = resolve;
            img.src = url;
          };
          reader.onerror = resolve;
          reader.readAsDataURL(blob);
        });
      })
      .catch(function() {
        if (img.complete) return;
        return new Promise(function(resolve) {
          img.onload = resolve;
          img.onerror = resolve;
        });
      });
    promises.push(p);
  });
  return Promise.all(promises);
}

function preloadImages() {
  const images = document.querySelectorAll('img');
  const promises = [];
  images.forEach(function(img) {
    if (img.complete && img.naturalWidth > 0) return;
    const p = new Promise(function(resolve) {
      img.onload = resolve;
      img.onerror = resolve;
    });
    promises.push(p);
  });
  return Promise.all(promises);
}

function calcSlices(usableW, pageH) {
  const bodyTop = document.body.getBoundingClientRect().top;
  const bodyH = document.body.scrollHeight;
  const bodyW = document.body.scrollWidth;
  if (bodyH <= 0 || bodyW <= 0) return [];

  const pxPerPage = pageH * bodyW / usableW;
  if (pxPerPage <= 0) return [];

  const charts = [];
  const cards = document.querySelectorAll('.bg-white.rounded-2xl');
  cards.forEach(function(card) {
    if (!card.querySelector('canvas')) return;
    const rect = card.getBoundingClientRect();
    const topPx = rect.top - bodyTop;
    const bottomPx = topPx + rect.height;
    if (bottomPx <= 0) return;
    charts.push({ top: topPx, bottom: bottomPx });
  });

  if (charts.length === 0) {
    return bodyH <= pxPerPage
      ? [{ y: 0, h: bodyH }]
      : [{ y: 0, h: pxPerPage }, { y: pxPerPage, h: bodyH - pxPerPage }];
  }

  const slices = [];
  let cursor = 0;

  while (cursor < bodyH) {
    let sliceEnd = Math.min(cursor + pxPerPage, bodyH);

    for (let i = 0; i < charts.length; i++) {
      const c = charts[i];
      if (sliceEnd > c.top && sliceEnd < c.bottom && sliceEnd < bodyH) {
        sliceEnd = Math.max(c.top - 10, cursor + 10);
        break;
      }
    }

    slices.push({ y: cursor, h: sliceEnd - cursor });
    cursor = sliceEnd;
  }

  return slices;
}
