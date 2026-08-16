var _pollingState = {};

function clearTimer(view) {
  if (_pollingState[view] && _pollingState[view].timer !== null) {
    clearInterval(_pollingState[view].timer);
    _pollingState[view].timer = null;
  }
}

export var PollingManager = {
  start: function (view, callback, intervalMs) {
    intervalMs = intervalMs || 30000;
    this.stop(view);
    _pollingState[view] = { callback: callback, intervalMs: intervalMs, timer: null };
    callback();
    var jitter = intervalMs * (0.1 + Math.random() * 0.2);
    _pollingState[view].timer = setInterval(callback, intervalMs + jitter);
  },

  stop: function (view) {
    clearTimer(view);
    delete _pollingState[view];
  },

  stopAll: function () {
    for (var view in _pollingState) {
      this.stop(view);
    }
  },

  isRunning: function (view) {
    return !!_pollingState[view];
  }
};

document.addEventListener('visibilitychange', function () {
  if (document.hidden) {
    for (var view in _pollingState) {
      clearTimer(view);
    }
  } else {
    for (var view in _pollingState) {
      var s = _pollingState[view];
      s.callback();
      var jitter = s.intervalMs * (0.1 + Math.random() * 0.2);
      s.timer = setInterval(s.callback, s.intervalMs + jitter);
    }
  }
});
