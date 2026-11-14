/**
 * Shared Touch-Friendly Summary Page Viewer for iPad, Mobile & Desktop
 * Uses pre-rendered high-DPI WebP page images so Arabic typography, tables, and diagrams
 * render 100% identically to the original PDF without font/glyph scrambling.
 */
(function () {
    function initPdfViewer(container) {
        const pdfUrl = container.dataset.pdf || 'summary.pdf';
        const totalPages = parseInt(container.dataset.pages || '0', 10);
        const pagesBase = container.dataset.pagesBase || 'pages/page-';
        const pageExt = container.dataset.pageExt || '.webp';
        const accent = container.dataset.accent === 'amber' ? 'amber' : 'emerald';

        if (!totalPages || totalPages < 1) return;

        const activeRing = accent === 'amber'
            ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50 dark:bg-amber-950/40'
            : 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40';
        const btnAccent = accent === 'amber'
            ? 'bg-amber-600 hover:bg-amber-700 text-white'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white';

        container.innerHTML = `
            <div class="flex flex-col bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-md">
                <!-- Toolbar -->
                <div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <div class="flex items-center gap-1.5">
                        <button type="button" data-action="prev" class="min-h-[44px] min-w-[44px] px-3 rounded-xl font-bold text-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition flex items-center justify-center gap-1">
                            <span>◀</span><span class="hidden sm:inline">السابق</span>
                        </button>
                        <div class="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 min-w-[96px] text-center" data-role="page-info">
                            صفحة 1 من ${totalPages}
                        </div>
                        <button type="button" data-action="next" class="min-h-[44px] min-w-[44px] px-3 rounded-xl font-bold text-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition flex items-center justify-center gap-1">
                            <span class="hidden sm:inline">التالي</span><span>▶</span>
                        </button>
                    </div>

                    <div class="flex items-center gap-1.5">
                        <button type="button" data-action="zoom-out" title="تصغير" class="min-h-[44px] min-w-[44px] px-2.5 rounded-xl font-extrabold text-base border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition">－</button>
                        <button type="button" data-action="zoom-fit" title="ملاءمة العرض" class="min-h-[44px] px-3 rounded-xl font-bold text-xs sm:text-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition" data-role="zoom-label">100%</button>
                        <button type="button" data-action="zoom-in" title="تكبير" class="min-h-[44px] min-w-[44px] px-2.5 rounded-xl font-extrabold text-base border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition">＋</button>
                        <a href="${pdfUrl}" target="_blank" rel="noopener" class="min-h-[44px] px-3 rounded-xl font-bold text-xs sm:text-sm ${btnAccent} transition flex items-center justify-center gap-1.5">
                            <span>↗️</span><span class="hidden sm:inline">فتح PDF</span>
                        </a>
                    </div>
                </div>

                <!-- Main Image Viewport -->
                <div data-role="viewport" class="relative w-full h-[64vh] sm:h-[72vh] overflow-auto p-3 sm:p-5 flex justify-center items-start" style="-webkit-overflow-scrolling: touch;">
                    <img data-role="main-img" alt="صفحة الملخص" class="shadow-lg rounded-lg bg-white max-w-none transition-all duration-150" style="width: 100%; height: auto;" />
                </div>

                <!-- Thumbnails Strip -->
                <div class="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-3 py-2.5">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-extrabold text-slate-600 dark:text-slate-400">📑 مصغرات الصفحات (اضغط للانتقال)</span>
                        <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">اسحب يميناً أو يساراً للتنقل</span>
                    </div>
                    <div data-role="thumbs" class="flex items-center gap-2.5 overflow-x-auto pb-1" style="-webkit-overflow-scrolling: touch;"></div>
                </div>
            </div>
        `;

        const prevBtn = container.querySelector('[data-action="prev"]');
        const nextBtn = container.querySelector('[data-action="next"]');
        const zoomOutBtn = container.querySelector('[data-action="zoom-out"]');
        const zoomFitBtn = container.querySelector('[data-action="zoom-fit"]');
        const zoomInBtn = container.querySelector('[data-action="zoom-in"]');
        const pageInfo = container.querySelector('[data-role="page-info"]');
        const zoomLabel = container.querySelector('[data-role="zoom-label"]');
        const viewport = container.querySelector('[data-role="viewport"]');
        const mainImg = container.querySelector('[data-role="main-img"]');
        const thumbsEl = container.querySelector('[data-role="thumbs"]');

        let currentPage = 1;
        let zoomFactor = 1.0;
        const thumbButtons = [];

        function pageSrc(num) {
            return `${pagesBase}${num}${pageExt}`;
        }

        function updateZoom() {
            const avail = Math.max(280, viewport.clientWidth - 40);
            const targetW = Math.min(avail, 860) * zoomFactor;
            mainImg.style.width = Math.round(targetW) + 'px';
            zoomLabel.textContent = Math.round(zoomFactor * 100) + '%';
        }

        function showPage(num) {
            currentPage = Math.max(1, Math.min(num, totalPages));
            mainImg.src = pageSrc(currentPage);
            mainImg.alt = `صفحة ${currentPage} من ${totalPages}`;
            pageInfo.textContent = `صفحة ${currentPage} من ${totalPages}`;
            prevBtn.disabled = currentPage <= 1;
            nextBtn.disabled = currentPage >= totalPages;
            viewport.scrollTop = 0;
            updateZoom();

            thumbButtons.forEach((btn, idx) => {
                const isActive = (idx + 1) === currentPage;
                btn.className = `shrink-0 flex flex-col items-center gap-1 p-1.5 rounded-xl border transition cursor-pointer ${
                    isActive
                        ? activeRing
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`;
                if (isActive) {
                    btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            });
        }

        // Build thumbnails
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.innerHTML = `
                <img src="${pageSrc(i)}" loading="lazy" alt="صفحة ${i}" class="w-[66px] h-auto rounded border border-slate-200 dark:border-slate-700 bg-white block" />
                <span class="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">${i}</span>
            `;
            btn.onclick = () => showPage(i);
            thumbsEl.appendChild(btn);
            thumbButtons.push(btn);
        }

        prevBtn.onclick = () => { if (currentPage > 1) showPage(currentPage - 1); };
        nextBtn.onclick = () => { if (currentPage < totalPages) showPage(currentPage + 1); };
        zoomInBtn.onclick = () => { zoomFactor = Math.min(2.5, +(zoomFactor + 0.25).toFixed(2)); updateZoom(); };
        zoomOutBtn.onclick = () => { zoomFactor = Math.max(0.6, +(zoomFactor - 0.25).toFixed(2)); updateZoom(); };
        zoomFitBtn.onclick = () => { zoomFactor = 1.0; updateZoom(); };

        // Touch swipe navigation on image when at fit width
        let touchStartX = 0, touchStartY = 0;
        mainImg.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });
        mainImg.addEventListener('touchend', (e) => {
            if (e.changedTouches.length !== 1 || zoomFactor > 1.05) return;
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                if (dx > 0 && currentPage < totalPages) showPage(currentPage + 1);
                else if (dx < 0 && currentPage > 1) showPage(currentPage - 1);
            }
        }, { passive: true });

        window.addEventListener('resize', updateZoom);
        showPage(1);
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-pdf-viewer]').forEach(initPdfViewer);
    });
})();
