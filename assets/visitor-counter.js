(function () {
  if (window.__svlVisitorCounterLoaded) return;
  window.__svlVisitorCounterLoaded = true;

  function createWidget() {
    var style = document.createElement('style');
    style.textContent = [
      '#svl-visitor-wrap{position:fixed;left:14px;bottom:14px;z-index:9999;direction:ltr}',
      '#svl-visitor-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 11px 4px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:#0f172a;box-shadow:0 6px 20px rgba(0,0,0,.22);user-select:none}',
      '#svl-visitor-dot{width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.25);flex-shrink:0}',
      '#svl-visitor-img{height:20px;display:block;border-radius:4px}',
      '@media print{#svl-visitor-wrap{display:none !important}}'
    ].join('');
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.id = 'svl-visitor-wrap';

    var badge = document.createElement('div');
    badge.id = 'svl-visitor-badge';

    var dot = document.createElement('span');
    dot.id = 'svl-visitor-dot';

    var img = document.createElement('img');
    img.id = 'svl-visitor-img';
    img.alt = '';
    img.src = 'https://hits.sh/abodahmaj.github.io/science-virtual-labs.svg?style=for-the-badge&label=%20&color=0f172a&labelColor=0f172a';

    badge.appendChild(dot);
    badge.appendChild(img);
    wrap.appendChild(badge);
    document.body.appendChild(wrap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
