function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

var _infiniteObservers = {};

function createInfiniteScroll(sentinelId, loadFn) {
  if (_infiniteObservers[sentinelId]) {
    _infiniteObservers[sentinelId].disconnect();
  }
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
  _infiniteObservers[sentinelId] = observer;
  return observer;
}
