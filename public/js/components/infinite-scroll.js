/**
 * createInfiniteScroll — Factory for infinite scroll with polling support.
 *
 * @param {Object} config
 * @param {string} config.sentinelId  - ID of the sentinel element for IntersectionObserver
 * @param {number} [config.limit=20]  - Items per page
 * @param {number} [config.timeout=15000] - AbortController timeout (ms)
 * @param {number} [config.pollingInterval=0] - Polling interval (ms, 0 = disabled)
 * @param {(params: {page: number, offset: number, limit: number, data: Array}, opts: {signal: AbortSignal}) => Promise<{data: Array, total: number}>} config.fetchFn
 * @param {(items: Array) => void} [config.renderFn] - Called for each scroll batch
 * @param {(items: Array, total: number) => void} [config.renderFullFn] - Called on polling (replaces renderFn if set)
 * @param {(state: {page: number, total: number, data: Array, allLoaded: boolean, isPolling: boolean}) => void} [config.afterLoadFn]
 * @param {() => string} [config.getFilterHash] - Returns hash for polling skip detection
 * @param {(err: Error) => void} [config.onError]
 * @returns {{init: Function, load: Function, reset: Function, destroy: Function, getState: Function}|null}
 */
export function createInfiniteScroll(config, loadFn) {
  if (typeof config === 'string') {
    var sentinel = document.getElementById(config);
    if (!sentinel) return null;
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && typeof loadFn === 'function') {
        loadFn();
      }
    }, { rootMargin: '300px' });
    observer.observe(sentinel);
    return observer;
  }

  var sentinel = document.getElementById(config.sentinelId);
  if (!sentinel) return null;

  var _page = 0;
  var _loading = false;
  var _allLoaded = false;
  var _data = [];
  var _total = 0;
  var _lastHash = '';
  var _stuckCount = 0;
  var _pollTimer = null;
  var _observer = null;
  var _loadTimeoutId = null;
  var _abortController = null;

  var cfg = {
    limit: config.limit || 20,
    timeout: config.timeout || 15000,
    pollingInterval: config.pollingInterval || 0,
    sentinelId: config.sentinelId,
    fetchFn: config.fetchFn,
    renderFn: config.renderFn || function () {},
    renderFullFn: config.renderFullFn || null,
    afterLoadFn: config.afterLoadFn || null,
    getFilterHash: config.getFilterHash || function () { return ''; },
    onError: config.onError || function () {},
  };

  function computeParams(isPolling) {
    var offset = isPolling ? 0 : _page * cfg.limit;
    return { page: _page, offset: offset, limit: cfg.limit, data: _data };
  }

  function fireIntersection() {
    var el = document.getElementById(cfg.sentinelId);
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    return rect.top <= (window.innerHeight || 600) + 300;
  }

  async function load(isPolling) {
    if (_loading) {
      _stuckCount++;
      return;
    }

    if (!isPolling && _allLoaded) return;

    _loading = true;
    _stuckCount = 0;

    _abortController = new AbortController();
    var timeoutId = setTimeout(function () {
      _abortController.abort();
      _loading = false;
    }, cfg.timeout);

    var opts = { signal: _abortController.signal };

    try {
      var params = computeParams(isPolling);
      var result = await cfg.fetchFn(params, opts);
      clearTimeout(timeoutId);

      if (!result || !result.data) {
        _loading = false;
        return;
      }

      var newItems = result.data;
      _total = result.total || newItems.length;

      if (isPolling) {
        var newHash = cfg.getFilterHash() + '|' + JSON.stringify(newItems);
        if (newHash === _lastHash) {
          _loading = false;
          return;
        }
        _lastHash = newHash;
        _data = newItems;
        _allLoaded = newItems.length < cfg.limit;
        _page = 1;
        if (cfg.renderFullFn) {
          cfg.renderFullFn(newItems, _total);
        } else {
          cfg.renderFn(newItems);
        }
      } else {
        if (newItems.length < cfg.limit) {
          _allLoaded = true;
        }
        _data = _data.concat(newItems);
        _page++;
        cfg.renderFn(newItems);
      }

      if (cfg.afterLoadFn) {
        cfg.afterLoadFn({ page: _page, total: _total, data: _data, allLoaded: _allLoaded, isPolling: isPolling });
      }

      if (!isPolling && !_allLoaded && !_loading) {
        scheduleNextLoad();
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') { _loading = false; return; }
      _loading = false;
      cfg.onError(err);
      return;
    }

    _loading = false;
  }

  function scheduleNextLoad() {
    clearTimeout(_loadTimeoutId);
    _loadTimeoutId = setTimeout(function () {
      if (_allLoaded || _loading) return;
      if (fireIntersection()) {
        load(false);
      }
    }, 100);
  }

  function startPolling() {
    if (cfg.pollingInterval <= 0) return;
    _pollTimer = setInterval(function () {
      if (_loading) {
        _stuckCount++;
        if (_stuckCount >= 3) {
          _loading = false;
          _stuckCount = 0;
          load(true);
        }
        return;
      }
      load(true);
    }, cfg.pollingInterval);
  }

  function stopPolling() {
    if (_pollTimer) {
      clearInterval(_pollTimer);
      _pollTimer = null;
    }
  }

  var instance = null;
  instance = {
    init: function () {
      if (_observer) {
        _observer.disconnect();
      }
      _observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !_allLoaded && !_loading) {
            load(false);
          }
        });
      }, { rootMargin: '300px' });
      _observer.observe(sentinel);
      startPolling();
      load(false);
      return instance;
    },

    load: function (isPolling) {
      load(isPolling);
      return instance;
    },

    reset: function () {
      stopPolling();
      if (_observer) {
        _observer.disconnect();
        _observer = null;
      }
      _page = 0;
      _loading = false;
      _allLoaded = false;
      _data = [];
      _total = 0;
      _lastHash = '';
      _stuckCount = 0;
      if (_abortController) {
        _abortController.abort();
        _abortController = null;
      }
      clearTimeout(_loadTimeoutId);
      _loadTimeoutId = null;
      return instance;
    },

    destroy: function () {
      stopPolling();
      if (_observer) {
        _observer.disconnect();
        _observer = null;
      }
      if (_abortController) {
        _abortController.abort();
        _abortController = null;
      }
      clearTimeout(_loadTimeoutId);
      _loadTimeoutId = null;
      _page = 0;
      _loading = false;
      _allLoaded = false;
      _data = [];
      _total = 0;
      _lastHash = '';
      _stuckCount = 0;
      return instance;
    },

    getState: function () {
      return { page: _page, loading: _loading, allLoaded: _allLoaded, data: _data, total: _total, stuckCount: _stuckCount };
    },
  };

  return instance;
}

/**
 * debounce — Returns a debounced version of the given function.
 *
 * @param {Function} fn
 * @param {number} delay - Delay in milliseconds
 * @returns {Function}
 */
export function debounce(fn, delay) {
  var timer = null;
  return function () {
    var args = arguments;
    var ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
  };
}
