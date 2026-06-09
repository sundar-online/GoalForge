/* GoalForge — Debug Error Overlay (deferred, non-render-blocking) */
(function () {
  function getOrCreateOverlay() {
    var el = document.getElementById('debug-error-console');
    if (!el) {
      el = document.createElement('div');
      el.id = 'debug-error-console';
      el.setAttribute('role', 'alert');
      el.setAttribute('aria-live', 'assertive');
      Object.assign(el.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: '#0b0b14', color: '#f87171', padding: '24px',
        zIndex: '999999', fontFamily: 'monospace', overflow: 'auto', boxSizing: 'border-box'
      });
      document.body.appendChild(el);
    }
    return el;
  }

  window.addEventListener('error', function (event) {
    var el = getOrCreateOverlay();
    el.innerHTML += '<h3 style="color:#ef4444;margin-top:0;">Uncaught Error:</h3>' +
      '<pre style="white-space:pre-wrap;word-break:break-all;">' +
      event.message + '\n at ' + event.filename + ':' + event.lineno + ':' + event.colno +
      '\n' + (event.error ? event.error.stack : '') + '</pre><hr style="border-color:#374151;"/>';
  });

  window.addEventListener('unhandledrejection', function (event) {
    var el = getOrCreateOverlay();
    el.innerHTML += '<h3 style="color:#ef4444;margin-top:0;">Unhandled Promise Rejection:</h3>' +
      '<pre style="white-space:pre-wrap;word-break:break-all;">' +
      (event.reason ? (event.reason.stack || event.reason) : 'No reason provided') +
      '</pre><hr style="border-color:#374151;"/>';
  });
})();
