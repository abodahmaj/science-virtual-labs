(function () {
  if (window.__svlVisitorCounterLoaded) return;
  window.__svlVisitorCounterLoaded = true;

  var NS = 'abodahmaj-science-labs';
  var BASE = 'https://abacus.jasoncameron.dev';

  function fetchCounter(key, isHit) {
    var op = isHit ? 'hit' : 'get';
    return fetch(BASE + '/' + op + '/' + NS + '/' + encodeURIComponent(key))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { return d && typeof d.value === 'number' && d.value >= 0 ? d.value : 0; })
      .catch(function () { return null; });
  }

  function formatNum(n) {
    if (n === null || n === undefined) return '—';
    try { return Number(n).toLocaleString('en-US'); } catch (e) { return String(n); }
  }

  function createWidget() {
    var style = document.createElement('style');
    style.textContent = [
      '#svl-visitor-wrap{position:fixed;left:14px;bottom:14px;z-index:9999;font-family:"Cairo",system-ui,-apple-system,sans-serif;direction:rtl}',
      '#svl-visitor-badge{display:inline-flex;align-items:center;gap:7px;padding:7px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(15,23,42,.88);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:#f8fafc;font-size:12.5px;font-weight:700;box-shadow:0 6px 20px rgba(0,0,0,.22);user-select:none}',
      '#svl-visitor-dot{width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.25)}',
      '#svl-btn-cnt{color:#34d399;font-weight:800;font-variant-numeric:tabular-nums}',
      '@media print{#svl-visitor-wrap{display:none !important}}'
    ].join('');
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.id = 'svl-visitor-wrap';

    var badge = document.createElement('div');
    badge.id = 'svl-visitor-badge';
    badge.innerHTML = '<span id="svl-visitor-dot"></span><span>إجمالي الزيارات:</span><span id="svl-btn-cnt">...</span>';

    wrap.appendChild(badge);
    document.body.appendChild(wrap);

    var shouldHitTotal = false;
    try {
      if (!sessionStorage.getItem('svl_hit_total')) {
        sessionStorage.setItem('svl_hit_total', '1');
        shouldHitTotal = true;
      }
    } catch (e) {
      shouldHitTotal = true;
    }

    fetchCounter('total-visits', shouldHitTotal).then(function (totalVal) {
      var btnEl = document.getElementById('svl-btn-cnt');
      if (btnEl) btnEl.textContent = formatNum(totalVal);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
