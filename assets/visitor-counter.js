(function () {
  if (window.__svlVisitorCounterLoaded) return;
  window.__svlVisitorCounterLoaded = true;

  var NS = 'abodahmaj-science-labs';
  var BASE = 'https://abacus.jasoncameron.dev';

  function getPageKey() {
    var path = (window.location.pathname || '/').replace(/^\/science-virtual-labs\/?/, '/');
    path = path.replace(/\/index\.html$/i, '/').replace(/\.html$/i, '');
    path = path.replace(/^\/+|\/+$/g, '') || 'home';
    return 'p-' + path.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 50);
  }

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
      '#svl-visitor-btn{display:inline-flex;align-items:center;gap:7px;padding:7px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(15,23,42,.88);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:#f8fafc;font-size:12.5px;font-weight:700;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.22);transition:transform .15s ease,background .15s ease}',
      '#svl-visitor-btn:hover{transform:translateY(-1px);background:rgba(15,23,42,.96)}',
      '#svl-visitor-dot{width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.25)}',
      '#svl-visitor-pop{position:absolute;left:0;bottom:44px;width:240px;padding:12px 14px;border-radius:14px;border:1px solid rgba(148,163,184,.25);background:rgba(15,23,42,.96);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#f8fafc;box-shadow:0 12px 30px rgba(0,0,0,.32);display:none;text-align:right}',
      '#svl-visitor-pop.open{display:block}',
      '.svl-vp-row{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;padding:5px 0;border-bottom:1px solid rgba(148,163,184,.14)}',
      '.svl-vp-row:last-of-type{border-bottom:none}',
      '.svl-vp-label{color:#cbd5e1}',
      '.svl-vp-val{font-weight:800;color:#34d399;font-variant-numeric:tabular-nums}',
      '.svl-vp-link{display:block;margin-top:9px;text-align:center;padding:6px 10px;border-radius:9px;background:#059669;color:#fff !important;text-decoration:none;font-size:12px;font-weight:700}',
      '.svl-vp-link:hover{background:#047857}',
      '@media print{#svl-visitor-wrap{display:none !important}}'
    ].join('');
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.id = 'svl-visitor-wrap';

    var pop = document.createElement('div');
    pop.id = 'svl-visitor-pop';
    pop.innerHTML =
      '<div class="svl-vp-row"><span class="svl-vp-label">👁️ زيارات هذه الصفحة</span><span class="svl-vp-val" id="svl-page-cnt">...</span></div>' +
      '<div class="svl-vp-row"><span class="svl-vp-label">🌐 إجمالي زيارات البوابة</span><span class="svl-vp-val" id="svl-total-cnt">...</span></div>' +
      '<a class="svl-vp-link" href="https://analytics.google.com/analytics/web/" target="_blank" rel="noopener">📊 تقارير Google Analytics</a>';

    var btn = document.createElement('button');
    btn.id = 'svl-visitor-btn';
    btn.type = 'button';
    btn.title = 'إحصائيات الزوار';
    btn.innerHTML = '<span id="svl-visitor-dot"></span><span>الزيارات:</span><span id="svl-btn-cnt">...</span>';

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      pop.classList.toggle('open');
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) pop.classList.remove('open');
    });

    wrap.appendChild(pop);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);

    var pageKey = getPageKey();
    var pageSessionKey = 'svl_hit_' + pageKey;
    var totalSessionKey = 'svl_hit_total';

    var shouldHitPage = false;
    var shouldHitTotal = false;
    try {
      if (!sessionStorage.getItem(pageSessionKey)) {
        sessionStorage.setItem(pageSessionKey, '1');
        shouldHitPage = true;
      }
      if (!sessionStorage.getItem(totalSessionKey)) {
        sessionStorage.setItem(totalSessionKey, '1');
        shouldHitTotal = true;
      }
    } catch (e) {
      shouldHitPage = true;
      shouldHitTotal = true;
    }

    Promise.all([
      fetchCounter(pageKey, shouldHitPage),
      fetchCounter('total-visits', shouldHitTotal)
    ]).then(function (res) {
      var pageVal = res[0];
      var totalVal = res[1];
      var btnEl = document.getElementById('svl-btn-cnt');
      var pageEl = document.getElementById('svl-page-cnt');
      var totalEl = document.getElementById('svl-total-cnt');
      if (btnEl) btnEl.textContent = formatNum(totalVal !== null ? totalVal : pageVal);
      if (pageEl) pageEl.textContent = formatNum(pageVal);
      if (totalEl) totalEl.textContent = formatNum(totalVal);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
