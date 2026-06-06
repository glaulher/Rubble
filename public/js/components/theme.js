(function() {
  var toggle = document.getElementById('themeToggle');
  var sunIcon = document.getElementById('themeIconSun');
  var moonIcon = document.getElementById('themeIconMoon');

  function updateIcons() {
    var isDark = document.documentElement.classList.contains('dark');
    if (sunIcon) sunIcon.classList.toggle('hidden', !isDark);
    if (moonIcon) moonIcon.classList.toggle('hidden', isDark);
  }

  updateIcons();

  if (toggle) {
    toggle.addEventListener('click', function() {
      if (window.location.hash === '#/login') return;
      document.documentElement.classList.toggle('dark');
      var isDark = document.documentElement.classList.contains('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      updateIcons();
    });
  }
})();
