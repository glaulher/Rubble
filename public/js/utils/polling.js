(function () {
  'use strict';

  var state = {};

  function clearTimer(view) {
    if (state[view] && state[view].timer !== null) {
      clearInterval(state[view].timer);
      state[view].timer = null;
    }
  }

  var PollingManager = {
    start: function (view, callback, intervalMs) {
      intervalMs = intervalMs || 30000;
      this.stop(view);
      state[view] = { callback: callback, intervalMs: intervalMs, timer: null };
      callback();
      var jitter = intervalMs * (0.1 + Math.random() * 0.2);
      state[view].timer = setInterval(callback, intervalMs + jitter);
    },

    stop: function (view) {
      clearTimer(view);
      delete state[view];
    },

    stopAll: function () {
      for (var view in state) {
        this.stop(view);
      }
    },

    isRunning: function (view) {
      return !!state[view];
    }
  };

  globalThis.PollingManager = PollingManager;

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      for (var view in state) {
        clearTimer(view);
      }
    } else {
      for (var view in state) {
        var s = state[view];
        s.callback();
        s.timer = setInterval(s.callback, s.intervalMs);
      }
    }
  });
})();
