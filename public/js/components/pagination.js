function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function createInfiniteScroll(sentinelId, loadFn) {
  const sentinel = document.getElementById(sentinelId);
  if (!sentinel) return null;

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadFn();
      }
    },
    { root: null, rootMargin: '300px', threshold: 0 }
  );

  observer.observe(sentinel);
  return observer;
}
