import { describe, it, expect, beforeEach } from "bun:test";

function showModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  el.classList.add('flex');
}

function hideModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('hidden');
  el.classList.remove('flex');
}

describe("showModal", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="myModal" class="hidden"></div>';
  });

  it("shows a hidden modal by removing 'hidden' and adding 'flex'", () => {
    const el = document.getElementById("myModal");
    expect(el.classList.contains("hidden")).toBe(true);
    expect(el.classList.contains("flex")).toBe(false);

    showModal("myModal");

    expect(el.classList.contains("hidden")).toBe(false);
    expect(el.classList.contains("flex")).toBe(true);
  });

  it("does nothing when element does not exist", () => {
    showModal("nonexistent");
    expect(document.getElementById("nonexistent")).toBeNull();
  });
});

describe("hideModal", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="myModal" class="flex"></div>';
  });

  it("hides a visible modal by removing 'flex' and adding 'hidden'", () => {
    const el = document.getElementById("myModal");
    expect(el.classList.contains("hidden")).toBe(false);
    expect(el.classList.contains("flex")).toBe(true);

    hideModal("myModal");

    expect(el.classList.contains("hidden")).toBe(true);
    expect(el.classList.contains("flex")).toBe(false);
  });

  it("does nothing when element does not exist", () => {
    hideModal("nonexistent");
    expect(document.getElementById("nonexistent")).toBeNull();
  });
});
