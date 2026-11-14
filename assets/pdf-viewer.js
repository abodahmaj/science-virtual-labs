/**
 * Shared Touch-Friendly PDF.js Viewer for iPad, Mobile & Desktop
 * Renders PDF pages onto HiDPI HTML5 Canvas with page navigation, zoom, swipe, and live thumbnails.
 */
(function () {
    const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    const WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (window.pdfjsLib) return resolve(window.pdfjsLib);
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => resolve(window.pdfjsLib);
            s.onerror = () => reject(new Error('تعذر تحميل مكتبة عرض PDF'));
            document.head.appendChild(s);
        });
    }

    function initPdfViewer(container) {
        const pdfUrl = container.dataset.pdf || 'summary.pdf';
        const accent = container.dataset.accent === 'amber' ? 'amber' : 'emerald';
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
                            جاري التحميل...
                        </div>
                        <button type="button" data-action="next" class="min-h-[44px] min-w-[44px] px-3 rounded-xl font-bold text-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 transition flex items-center justify-center gap-1">
                            <span class="hidden sm:inline">التالي</span><span>▶</span>
                        </button>
                    </div>

                    <div class="flex items-center gap-1.5">
                        <button type="button" data-action="zoom-out" title="تصغير" class="min-h-[44px] min-w-[44px] px-2.5 rounded-xl font-extrabold text-base border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition">－</button>
                        <button type="button" data-action="zoom-fit" title="ملاءمة العرض" class="min-h-[44px] px-3 rounded-xl font-bold text-xs sm:text-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition" data-role="zoom-label">ملاءمة</button>
                        <button type="button" data-action="zoom-in" title="تكبير" class="min-h-[44px] min-w-[44px] px-2.5 rounded-xl font-extrabold text-base border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition">＋</button>
                        <a href="${pdfUrl}" target="_blank" rel="noopener" class="min-h-[44px] px-3 rounded-xl font-bold text-xs sm:text-sm ${btnAccent} transition flex items-center justify-center gap-1.5">
                            <span>↗️</span><span class="hidden sm:inline">فتح مستقل</span>
                        </a>
                    </div>
                </div>

                <!-- Main Canvas Viewport -->
                <div data-role="viewport" class="relative w-full h-[64vh] sm:h-[70vh] overflow-auto p-3 sm:p-5 flex justify-center items-start" style="-webkit-overflow-scrolling: touch;">
                    <div data-role="loading" class="m-auto text-center space-y-2 py-12">
                        <div class="inline-block w-8 h-8 border-4 border-slate-300 border-t-emerald-600 rounded-full animate-spin"></div>
                        <p class="text-sm font-bold text-slate-600 dark:text-slate-400">جاري تجهيز صفحات الملخص...</p>
                    </div>
                    <canvas data-role="main-canvas" class="hidden shadow-lg rounded-lg bg-white max-w-none"></canvas>
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
        const loadingEl = container.querySelector('[data-role="loading"]');
        const canvas = container.querySelector('[data-role="main-canvas"]');
        const thumbsEl = container.querySelector('[data-role="thumbs"]');

        let pdfDoc = null;
        let currentPage = 1;
        let zoomFactor = 1.0; // relative to fit-width
        let renderTask = null;
        const thumbButtons = [];

        function updateControls() {
            if (!pdfDoc) return;
            pageInfo.textContent = `صفحة ${currentPage} من ${pdfDoc.numPages}`;
            prevBtn.disabled = currentPage <= 1;
            nextBtn.disabled = currentPage >= pdfDoc.numPages;
            zoomLabel.textContent = Math.round(zoomFactor * 100) + '%';

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

        async function renderPage(num) {
            if (!pdfDoc) return;
            currentPage = Math.max(1, Math.min(num, pdfDoc.numPages));
            updateControls();

            if (renderTask) {
                try { renderTask.cancel(); } catch (_) {}
            }

            const page = await pdfDoc.getPage(currentPage);
            const unscaled = page.getViewport({ scale: 1 });
            const availWidth = Math.max(280, viewport.clientWidth - 32);
            const baseScale = availWidth / unscaled.width;
            const scale = baseScale * zoomFactor;
            const outputScale = Math.min(window.devicePixelRatio || 1, 2.5);

            const vp = page.getViewport({ scale });
            canvas.width = Math.floor(vp.width * outputScale);
            canvas.height = Math.floor(vp.height * outputScale);
            canvas.style.width = Math.floor(vp.width) + 'px';
            canvas.style.height = Math.floor(vp.height) + 'px';

            const ctx = canvas.getContext('2d');
            ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);

            loadingEl.classList.add('hidden');
            canvas.classList.remove('hidden');

            renderTask = page.render({ canvasContext: ctx, viewport: vp });
            try {
                await renderTask.promise;
            } catch (e) {
                if (e && e.name !== 'RenderingCancelledException') {
                    console.error(e);
                }
            }
        }

        async function buildThumbnails() {
            thumbsEl.innerHTML = '';
            thumbButtons.length = 0;

            for (let i = 1; i <= pdfDoc.numPages; i++) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.innerHTML = `
                    <canvas class="rounded border border-slate-200 dark:border-slate-700 bg-white block"></canvas>
                    <span class="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">${i}</span>
                `;
                btn.onclick = () => {
                    viewport.scrollTop = 0;
                    renderPage(i);
                };
                thumbsEl.appendChild(btn);
                thumbButtons.push(btn);
            }
            updateControls();

            // Render thumbnail canvases progressively
            for (let i = 1; i <= pdfDoc.numPages; i++) {
                try {
                    const page = await pdfDoc.getPage(i);
                    const vp0 = page.getViewport({ scale: 1 });
                    const thumbW = 68;
                    const scale = thumbW / vp0.width;
                    const vp = page.getViewport({ scale });
                    const c = thumbButtons[i - 1].querySelector('canvas');
                    const dpr = Math.min(window.devicePixelRatio || 1, 2);
                    c.width = Math.floor(vp.width * dpr);
                    c.height = Math.floor(vp.height * dpr);
                    c.style.width = Math.floor(vp.width) + 'px';
                    c.style.height = Math.floor(vp.height) + 'px';
                    const ctx = c.getContext('2d');
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    await page.render({ canvasContext: ctx, viewport: vp }).promise;
                } catch (e) {
                    console.error('Thumb error page', i, e);
                }
            }
        }

        prevBtn.onclick = () => { if (currentPage > 1) { viewport.scrollTop = 0; renderPage(currentPage - 1); } };
        nextBtn.onclick = () => { if (pdfDoc && currentPage < pdfDoc.numPages) { viewport.scrollTop = 0; renderPage(currentPage + 1); } };
        zoomInBtn.onclick = () => { zoomFactor = Math.min(2.5, +(zoomFactor + 0.25).toFixed(2)); renderPage(currentPage); };
        zoomOutBtn.onclick = () => { zoomFactor = Math.max(0.6, +(zoomFactor - 0.25).toFixed(2)); renderPage(currentPage); };
        zoomFitBtn.onclick = () => { zoomFactor = 1.0; renderPage(currentPage); };

        // Touch swipe navigation on canvas (when not horizontally scrolled)
        let touchStartX = 0, touchStartY = 0;
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });
        canvas.addEventListener('touchend', (e) => {
            if (e.changedTouches.length !== 1 || zoomFactor > 1.05) return;
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                // RTL: swipe right -> previous or next depending on natural gesture
                if (dx > 0 && currentPage < pdfDoc.numPages) {
                    viewport.scrollTop = 0;
                    renderPage(currentPage + 1);
                } else if (dx < 0 && currentPage > 1) {
                    viewport.scrollTop = 0;
                    renderPage(currentPage - 1);
                }
            }
        }, { passive: true });

        let resizeTimer = null;
        window.addEventListener('resize', () => {
            if (!pdfDoc) return;
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => renderPage(currentPage), 180);
        });

        loadScript(PDFJS_CDN)
            .then((pdfjsLib) => {
                pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_CDN;
                return pdfjsLib.getDocument(pdfUrl).promise;
            })
            .then((doc) => {
                pdfDoc = doc;
                renderPage(1);
                buildThumbnails();
            })
            .catch((err) => {
                loadingEl.innerHTML = `
                    <div class="p-4 text-center space-y-2">
                        <p class="text-sm font-bold text-rose-600 dark:text-rose-400">تعذر عرض الملخص داخل الصفحة.</p>
                        <a href="${pdfUrl}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${btnAccent}">فتح الملخص في نافذة جديدة ↗️</a>
                    </div>
                `;
                console.error(err);
            });
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-pdf-viewer]').forEach(initPdfViewer);
    });
})();
