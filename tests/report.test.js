import { describe, it, expect, beforeEach } from "bun:test";

// ─── calcSlices ────────────────────────────────────────────────────
function calcSlices(usableW, pageH) {
  var bodyTop = document.body.getBoundingClientRect().top;
  var bodyH = document.body.scrollHeight;
  var bodyW = document.body.scrollWidth;
  if (bodyH <= 0 || bodyW <= 0) return [];

  var pxPerPage = pageH * bodyW / usableW;
  if (pxPerPage <= 0) return [];

  var charts = [];
  var cards = document.querySelectorAll('.bg-white.rounded-2xl');
  cards.forEach(function(card) {
    if (!card.querySelector('canvas')) return;
    var rect = card.getBoundingClientRect();
    var topPx = rect.top - bodyTop;
    var bottomPx = topPx + rect.height;
    if (bottomPx <= 0) return;
    charts.push({ top: topPx, bottom: bottomPx });
  });

  if (charts.length === 0) {
    return bodyH <= pxPerPage
      ? [{ y: 0, h: bodyH }]
      : [{ y: 0, h: pxPerPage }, { y: pxPerPage, h: bodyH - pxPerPage }];
  }

  var slices = [];
  var cursor = 0;

  while (cursor < bodyH) {
    var sliceEnd = Math.min(cursor + pxPerPage, bodyH);

    for (var i = 0; i < charts.length; i++) {
      var c = charts[i];
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

// ─── preloadImages ─────────────────────────────────────────────────
function preloadImages() {
  var images = document.querySelectorAll("img");
  var promises = [];
  images.forEach(function (img) {
    if (img.complete && img.naturalWidth > 0) return;
    var p = new Promise(function (resolve) {
      img.onload = resolve;
      img.onerror = resolve;
    });
    promises.push(p);
  });
  return Promise.all(promises);
}

// ─── Helpers ───────────────────────────────────────────────────────

function setBodySize(w, h) {
  Object.defineProperty(document.body, "scrollHeight", {
    value: h, configurable: true, writable: true,
  });
  Object.defineProperty(document.body, "scrollWidth", {
    value: w, configurable: true, writable: true,
  });
  document.body.getBoundingClientRect = () => ({ top: 0, bottom: h, height: h, left: 0, right: w, width: w });
}

function addChartCard(opts) {
  var card = document.createElement("div");
  card.className = "bg-white rounded-2xl";
  card.style.position = "absolute";
  card.style.top = (opts.top || 0) + "px";
  card.style.height = (opts.height || 100) + "px";
  card.style.left = "0";
  card.style.width = "100%";
  card.getBoundingClientRect = () => ({
    top: opts.top || 0,
    bottom: (opts.top || 0) + (opts.height || 100),
    height: opts.height || 100,
    left: 0, right: 100, width: 100,
  });

  var canvas = document.createElement("canvas");
  card.appendChild(canvas);
  document.body.appendChild(card);
  return card;
}

function removeCharts() {
  document.querySelectorAll(".bg-white.rounded-2xl").forEach(function (el) {
    el.remove();
  });
}

// ─── calcSlices Tests ──────────────────────────────────────────────

describe("calcSlices", () => {
  var pxPerPage;
  const pageH = 297;
  const usableW = 198;

  beforeEach(() => {
    document.body.innerHTML = "";
    removeCharts();
    pxPerPage = pageH * 1200 / usableW; // ~1800
    setBodySize(1200, 2500);
  });

  it("returns empty array when body has no height", () => {
    setBodySize(1200, 0);
    expect(calcSlices(usableW, pageH)).toEqual([]);
  });

  it("returns empty array when body has no width", () => {
    setBodySize(0, 2500);
    expect(calcSlices(usableW, pageH)).toEqual([]);
  });

  it("returns single slice when content fits one page (no charts)", () => {
    setBodySize(1200, 1500);
    var slices = calcSlices(usableW, pageH);
    expect(slices).toHaveLength(1);
    expect(slices[0]).toEqual({ y: 0, h: 1500 });
  });

  it("returns two slices when content spans 2 pages (no charts)", () => {
    setBodySize(1200, Math.round(pxPerPage * 1.7));
    var slices = calcSlices(usableW, pageH);
    expect(slices).toHaveLength(2);
    expect(slices[0].y).toBe(0);
    expect(slices[0].h).toBe(pxPerPage);
    expect(slices[1].y).toBe(pxPerPage);
  });

  it("returns exactly 2 slices even for 3+ pages without charts", () => {
    setBodySize(1200, Math.round(pxPerPage * 2.3));
    var slices = calcSlices(usableW, pageH);
    expect(slices).toHaveLength(2);
    expect(slices[0].h).toBe(pxPerPage);
    expect(slices[1].h).toBeGreaterThan(pxPerPage);
  });

  it("adjusts break to before chart when ideal falls within chart", () => {
    setBodySize(1200, pxPerPage * 2);
    var chartTop = pxPerPage - 50;
    addChartCard({ top: chartTop, height: 100 });

    var slices = calcSlices(usableW, pageH);
    expect(slices).toHaveLength(3);
    expect(slices[0].y).toBe(0);
    expect(slices[0].h).toBe(chartTop - 10);
    expect(slices[1].y).toBe(chartTop - 10);
  });

  it("does not adjust break when chart starts after the ideal point", () => {
    setBodySize(1200, pxPerPage * 2);
    addChartCard({ top: pxPerPage + 50, height: 100 });

    var slices = calcSlices(usableW, pageH);
    expect(slices).toHaveLength(2);
    expect(slices[0].h).toBe(pxPerPage);
    expect(slices[1].y).toBe(pxPerPage);
  });

  it("adjusts multiple breaks for multiple charts at boundaries", () => {
    setBodySize(1200, Math.round(pxPerPage * 3.5));
    addChartCard({ top: pxPerPage - 60, height: 120 });
    addChartCard({ top: pxPerPage * 2 - 40, height: 100 });

    var slices = calcSlices(usableW, pageH);
    expect(slices.length).toBeGreaterThanOrEqual(3);
    expect(slices[0].h).toBeLessThan(pxPerPage);
  });

  it("enforces minimum slice height of cursor + 10", () => {
    setBodySize(1200, pxPerPage * 2);
    var chartTop = 5;
    addChartCard({ top: chartTop, height: pxPerPage + 100 });

    var slices = calcSlices(usableW, pageH);
    expect(slices[0].h).toBeGreaterThanOrEqual(10);
  });

  it("handles multiple charts in the same page", () => {
    setBodySize(1200, 800);
    addChartCard({ top: 100, height: 150 });
    addChartCard({ top: 300, height: 150 });
    addChartCard({ top: 500, height: 150 });

    var slices = calcSlices(usableW, pageH);
    expect(slices).toHaveLength(1);
    expect(slices[0].h).toBe(800);
  });

  it("returns single slice when usableW is zero (Infinity pxPerPage)", () => {
    setBodySize(1200, 2500);
    var slices = calcSlices(0, 100);
    expect(slices).toHaveLength(1);
    expect(slices[0].h).toBe(2500);
  });
});

// ─── preloadImages Tests ───────────────────────────────────────────

describe("preloadImages", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("resolves immediately when no images exist", async () => {
    var result = await preloadImages();
    expect(result).toEqual([]);
  });

  it("resolves when an image fires onload and removes event listeners", async () => {
    var img = document.createElement("img");
    document.body.appendChild(img);

    var promise = preloadImages();
    img.dispatchEvent(new Event("load"));

    var result = await promise;
    expect(result).toHaveLength(1);
  });

  it("resolves when an image fires onerror", async () => {
    var img = document.createElement("img");
    document.body.appendChild(img);

    var promise = preloadImages();
    img.dispatchEvent(new Event("error"));

    var result = await promise;
    expect(result).toHaveLength(1);
  });

  it("resolves when multiple incomplete images all load", async () => {
    var img1 = document.createElement("img");
    document.body.appendChild(img1);
    var img2 = document.createElement("img");
    document.body.appendChild(img2);

    var promise = preloadImages();
    img1.dispatchEvent(new Event("load"));
    img2.dispatchEvent(new Event("load"));

    var result = await promise;
    expect(result).toHaveLength(2);
  });
});
