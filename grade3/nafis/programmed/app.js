const STORAGE_KEY = "nafis_programmed_records_v1";
// ضع رابط Google Apps Script Web App هنا لتفعيل المزامنة السحابية مع Google Sheets
const CLOUD_SYNC_URL = "https://script.google.com/macros/s/AKfycbztG6fZwneuC9H5P8kqzsUkPcSdTtmjq2yoThVvstIR9MTMD0SR3er8wjrAIHPVjb0/exec";
const LETTERS = ["أ", "ب", "ج", "د"];

let state = {
  currentStudent: null,
  currentUnitId: null,
  phase: "diagnostic", // diagnostic | frames | mastery | summary
  diagIndex: 0,
  diagCorrect: 0,
  frameIndex: 0,
  inRemedial: false,
  masteryIndex: 0,
  masteryCorrect: 0
};

function loadAllRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAllRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function getStudentRecord(code) {
  const records = loadAllRecords();
  if (!records[code]) {
    records[code] = {
      units: {}
    };
  }
  return records[code];
}

function updateUnitRecord(code, unitId, updater) {
  const records = loadAllRecords();
  if (!records[code]) records[code] = { units: {} };
  if (!records[code].units[unitId]) {
    records[code].units[unitId] = {
      status: "جديد",
      progressPct: 0,
      points: 0,
      remedialCount: 0,
      weakSkills: [],
      masteryScorePct: null,
      performanceLevel: "غير محدد",
      completedFrames: []
    };
  }
  updater(records[code].units[unitId]);
  saveAllRecords(records);
  syncUnitToCloud(code, unitId, records[code].units[unitId]);
}

// المزامنة السحابية مع Google Sheets (تعمل تلقائياً عند تعبئة CLOUD_SYNC_URL)
let _cloudSyncTimer = null;
function syncUnitToCloud(code, unitId, unitData) {
  if (!CLOUD_SYNC_URL) return;
  const student = STUDENTS_ROSTER.find(s => s.code === code);
  const unitObj = CURRICULUM_UNITS.find(u => u.id === unitId);
  clearTimeout(_cloudSyncTimer);
  _cloudSyncTimer = setTimeout(() => {
    fetch(CLOUD_SYNC_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_progress",
        code,
        name: student ? student.name : code,
        unitId,
        unitTitle: unitObj ? unitObj.title : unitId,
        unitData
      })
    }).catch(() => {});
  }, 500);
}

async function fetchCloudProgress(code) {
  if (!CLOUD_SYNC_URL) return;
  try {
    const res = await fetch(`${CLOUD_SYNC_URL}?action=get_student&code=${encodeURIComponent(code)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.units) {
      const records = loadAllRecords();
      records[code] = { units: { ...(records[code]?.units || {}), ...data.units } };
      saveAllRecords(records);
      if (state.currentStudent && state.currentStudent.code === code) {
        renderUnitsView();
      }
    }
  } catch {
    // في حال عدم توفر الاتصال يستمر العمل بالنسخة المحلية
  }
}

// عناصر الواجهة
const viewLogin = document.getElementById("view-login");
const viewUnits = document.getElementById("view-units");
const viewLesson = document.getElementById("view-lesson");
const viewTeacher = document.getElementById("view-teacher");

const btnSwitchTeacher = document.getElementById("btn-switch-teacher");
const btnLogout = document.getElementById("btn-logout");

function showView(target) {
  [viewLogin, viewUnits, viewLesson, viewTeacher].forEach(v => v.classList.add("hidden"));
  target.classList.remove("hidden");
  btnLogout.classList.toggle("hidden", !state.currentStudent || target === viewLogin);
}

// تسجيل الدخول
document.getElementById("login-form").addEventListener("submit", e => {
  e.preventDefault();
  const raw = document.getElementById("student-code-input").value.trim().toUpperCase();
  loginWithCode(raw);
});

function loginWithCode(code) {
  const errEl = document.getElementById("login-error");
  const student = STUDENTS_ROSTER.find(s => s.code.toUpperCase() === code);
  if (!student) {
    errEl.textContent = "الكود غير مسجل في قائمة الصف الثالث المتوسط. تأكد من إدخال كودك الخاص.";
    errEl.classList.remove("hidden");
    return;
  }
  errEl.classList.add("hidden");
  state.currentStudent = student;
  renderUnitsView();
  showView(viewUnits);
}

btnLogout.addEventListener("click", () => {
  state.currentStudent = null;
  document.getElementById("student-code-input").value = "";
  showView(viewLogin);
});

btnSwitchTeacher.addEventListener("click", () => {
  renderTeacherDashboard();
  showView(viewTeacher);
});

document.getElementById("btn-back-from-teacher").addEventListener("click", () => {
  if (state.currentStudent) {
    renderUnitsView();
    showView(viewUnits);
  } else {
    showView(viewLogin);
  }
});

document.getElementById("btn-back-units").addEventListener("click", () => {
  renderUnitsView();
  showView(viewUnits);
});

// عرض خريطة الوحدات
function renderUnitsView() {
  const stu = state.currentStudent;
  const rec = getStudentRecord(stu.code);
  const u1 = rec.units["unit-earth"];

  document.getElementById("student-name-display").textContent = `الطالب: ${stu.name}`;
  const levelTxt = u1 ? u1.performanceLevel : "لم يبدأ بعد";
  document.getElementById("student-meta-display").textContent = `الكود: ${stu.code} | مستوى الأداء الحالي: ${levelTxt}`;

  const readyUnits = CURRICULUM_UNITS.filter(u => u.ready);
  const totalPct = readyUnits.reduce((acc, u) => acc + (rec.units[u.id]?.progressPct || 0), 0);
  const overallPct = Math.round(totalPct / CURRICULUM_UNITS.length);
  document.getElementById("overall-progress-pct").textContent = `${overallPct}%`;
  document.getElementById("overall-progress-fill").style.width = `${overallPct}%`;

  const grid = document.getElementById("units-grid");
  grid.innerHTML = "";

  CURRICULUM_UNITS.forEach(unit => {
    const uRec = rec.units[unit.id];
    const isCompleted = uRec && uRec.masteryScorePct !== null && uRec.masteryScorePct >= unit.masteryThreshold;
    const card = document.createElement("div");
    card.className = `unit-card ${unit.ready ? "" : "locked"}`;

    let badgeHtml = `<span class="pill pill-info">${unit.domain}</span>`;
    if (isCompleted) {
      badgeHtml = `<span class="pill pill-success">مُتقنة (${uRec.masteryScorePct}%)</span>`;
    } else if (!unit.ready) {
      badgeHtml = `<span class="pill pill-warning">قريباً — قيد الإعداد</span>`;
    }

    const prog = uRec ? uRec.progressPct : 0;
    const hasCheckpoint = Boolean(uRec && uRec.checkpoint);
    const cpLabel = hasCheckpoint
      ? (uRec.checkpoint.phase === "frames"
        ? `نقطة توقف: الإطار ${uRec.checkpoint.frameIndex + 1}`
        : uRec.checkpoint.phase === "mastery"
        ? "نقطة توقف: بوابة الإتقان"
        : "نقطة توقف: التشخيص")
      : "";

    card.innerHTML = `
      <div>
        ${badgeHtml}
        <h4>${unit.title}</h4>
        <p>${unit.description}</p>
        ${hasCheckpoint ? `<p style="margin-top:6px; font-size:0.82rem; color:var(--primary); font-weight:700;">🔖 ${cpLabel}</p>` : ""}
      </div>
      <div>
        <div class="unit-meta">
          <span>التقدم: <strong>${prog}%</strong></span>
          <span>${unit.ready ? `${unit.frames.length} إطارات + بوابة إتقان` : "مغلقة"}</span>
        </div>
        <div style="margin-top: 12px; display:flex; gap:8px; flex-wrap:wrap;">
          ${unit.ready
            ? `<button class="btn btn-primary" style="flex:1;" data-start-unit="${unit.id}">${hasCheckpoint ? "متابعة من نقطة التوقف" : (uRec && prog > 0 ? "مراجعة الوحدة" : "بدء الوحدة الآن")}</button>`
            : `<button class="btn btn-ghost" style="width:100%" disabled>قريباً — قيد الإعداد</button>`
          }
          ${unit.ready && hasCheckpoint ? `<button class="btn btn-ghost btn-sm" data-restart-unit="${unit.id}" title="البدء من جديد">إعادة</button>` : ""}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll("[data-start-unit]").forEach(btn => {
    btn.addEventListener("click", () => startUnit(btn.getAttribute("data-start-unit"), false));
  });
  grid.querySelectorAll("[data-restart-unit]").forEach(btn => {
    btn.addEventListener("click", () => startUnit(btn.getAttribute("data-restart-unit"), true));
  });
}

// حفظ نقطة التوقف تلقائياً
function saveCheckpoint() {
  if (!state.currentStudent || !state.currentUnitId) return;
  updateUnitRecord(state.currentStudent.code, state.currentUnitId, u => {
    if (state.phase === "summary") {
      u.checkpoint = null;
    } else {
      u.checkpoint = {
        phase: state.phase,
        diagIndex: state.diagIndex,
        diagCorrect: state.diagCorrect,
        frameIndex: state.frameIndex,
        masteryIndex: state.masteryIndex,
        masteryCorrect: state.masteryCorrect,
        savedAt: new Date().toISOString()
      };
    }
  });
}

// بدء الوحدة أو استئنافها من نقطة التوقف
function startUnit(unitId, forceRestart = false) {
  state.currentUnitId = unitId;
  state.inRemedial = false;

  const existing = getStudentRecord(state.currentStudent.code).units[unitId];
  if (!forceRestart && existing && existing.checkpoint) {
    const cp = existing.checkpoint;
    state.phase = cp.phase || "diagnostic";
    state.diagIndex = cp.diagIndex || 0;
    state.diagCorrect = cp.diagCorrect || 0;
    state.frameIndex = cp.frameIndex || 0;
    state.masteryIndex = cp.masteryIndex || 0;
    state.masteryCorrect = cp.masteryCorrect || 0;
  } else {
    state.phase = "diagnostic";
    state.diagIndex = 0;
    state.diagCorrect = 0;
    state.frameIndex = 0;
    state.masteryIndex = 0;
    state.masteryCorrect = 0;
    if (forceRestart) {
      updateUnitRecord(state.currentStudent.code, unitId, u => { u.checkpoint = null; });
    }
  }

  updateUnitRecord(state.currentStudent.code, unitId, u => {
    if (u.status === "جديد") u.status = "قيد التعلم";
  });

  renderLessonFrame();
  showView(viewLesson);
}

function getCurrentUnit() {
  return CURRICULUM_UNITS.find(u => u.id === state.currentUnitId);
}

function renderLessonFrame() {
  saveCheckpoint();
  const unit = getCurrentUnit();
  const container = document.getElementById("frame-container");
  const rec = getStudentRecord(state.currentStudent.code).units[unit.id] || { points: 0, progressPct: 0 };

  document.getElementById("lesson-unit-title").textContent = unit.domain;
  document.getElementById("frame-score-label").textContent = `النقاط: ${rec.points}`;

  if (state.phase === "diagnostic") {
    document.getElementById("lesson-level-badge").textContent = "التشخيص القبلي";
    document.getElementById("frame-step-label").textContent = `سؤال تشخيصي ${state.diagIndex + 1} من ${unit.diagnostic.length}`;
    document.getElementById("frame-progress-fill").style.width = `${Math.round(((state.diagIndex) / (unit.diagnostic.length + unit.frames.length + 1)) * 100)}%`;
    renderDiagnostic(unit, container);
  } else if (state.phase === "frames") {
    const frame = unit.frames[state.frameIndex];
    document.getElementById("lesson-level-badge").textContent = frame.level;
    document.getElementById("frame-step-label").textContent = `الإطار ${state.frameIndex + 1} من ${unit.frames.length}`;
    const pct = Math.round(((state.frameIndex + 1) / (unit.frames.length + 1)) * 100);
    document.getElementById("frame-progress-fill").style.width = `${pct}%`;
    renderProgrammedFrame(unit, frame, container);
  } else if (state.phase === "mastery") {
    document.getElementById("lesson-level-badge").textContent = "بوابة الإتقان";
    document.getElementById("frame-step-label").textContent = `اختبار الإتقان: سؤال ${state.masteryIndex + 1} من ${unit.masteryQuiz.length}`;
    document.getElementById("frame-progress-fill").style.width = `90%`;
    renderMasteryQuiz(unit, container);
  } else {
    document.getElementById("lesson-level-badge").textContent = "ملخص الإنجاز";
    document.getElementById("frame-step-label").textContent = "مكتمل";
    document.getElementById("frame-progress-fill").style.width = `100%`;
    renderSummary(unit, container);
  }
}

function renderDiagnostic(unit, container) {
  const q = unit.diagnostic[state.diagIndex];
  container.innerHTML = `
    <span class="pill pill-info">الخطوة 1: فحص قبلي لتحديد نقطة الانطلاق</span>
    <h3 style="margin: 10px 0 6px;">${q.skill}</h3>
    <div class="question-box">
      <h4>${q.question}</h4>
      <div class="options-list">
        ${q.options.map((opt, idx) => `
          <button type="button" class="option-btn" data-diag-opt="${idx}">
            <span class="opt-letter">${LETTERS[idx]}</span>
            <span>${opt}</span>
          </button>
        `).join("")}
      </div>
    </div>
    <div id="diag-feedback"></div>
  `;

  container.querySelectorAll("[data-diag-opt]").forEach(btn => {
    btn.addEventListener("click", () => {
      const chosen = Number(btn.getAttribute("data-diag-opt"));
      const isCorrect = chosen === q.correctIndex;
      container.querySelectorAll("[data-diag-opt]").forEach((b, i) => {
        b.disabled = true;
        if (i === q.correctIndex) b.classList.add("correct");
        else if (i === chosen && !isCorrect) b.classList.add("wrong");
      });

      if (isCorrect) {
        state.diagCorrect++;
        updateUnitRecord(state.currentStudent.code, unit.id, u => { u.points += 5; });
      } else {
        updateUnitRecord(state.currentStudent.code, unit.id, u => {
          if (!u.weakSkills.includes(q.skill)) u.weakSkills.push(q.skill);
        });
      }

      const fb = document.getElementById("diag-feedback");
      fb.innerHTML = `
        <div class="feedback-box ${isCorrect ? "success" : "remedial"}">
          <strong>${isCorrect ? "إجابة موفقة!" : "معلومة للتأسيس:"}</strong>
          ${isCorrect ? "تم رصد +5 نقاط تشخيصية." : `الإجابة الصحيحة هي: (${LETTERS[q.correctIndex]}) ${q.options[q.correctIndex]}. سنعززها في المسار المبرمج.`}
          <div style="margin-top:12px;">
            <button id="btn-next-diag" class="btn btn-primary btn-sm" type="button">التالي ←</button>
          </div>
        </div>
      `;
      document.getElementById("btn-next-diag").addEventListener("click", () => {
        if (state.diagIndex + 1 < unit.diagnostic.length) {
          state.diagIndex++;
        } else {
          state.phase = "frames";
          // تفريع ذكي حسب نتيجة التشخيص القبلي
          if (state.diagCorrect === unit.diagnostic.length && unit.frames.length > 2) {
            state.frameIndex = 2;
          } else if (state.diagCorrect === unit.diagnostic.length - 1 && unit.frames.length > 1) {
            state.frameIndex = 1;
          } else {
            state.frameIndex = 0;
          }
        }
        renderLessonFrame();
      });
    });
  });
}

function renderProgrammedFrame(unit, frame, container) {
  const isFileProtocol = window.location.protocol === "file:";
  const indicatorHtml = frame.indicatorCode ? `
    <div class="indicator-banner">
      <span class="indicator-code">${frame.indicatorCode}</span>
      <p><strong>مؤشر المهارة:</strong> ${frame.indicatorText}</p>
      ${frame.initiativeInsight ? `<p class="initiative-note">💡 <strong>إرشاد وتوجيه:</strong> ${frame.initiativeInsight}</p>` : ""}
    </div>
  ` : "";

  const frameImages = Array.isArray(frame.images)
    ? frame.images
    : (frame.image ? [{ src: frame.image, caption: frame.imageCaption || "" }] : []);

  const mediaHtml = `
    <div class="media-grid">
      ${frameImages.map(img => `
        <figure class="textbook-figure">
          <img src="${img.src}" alt="${img.caption || frame.title}" loading="lazy" />
          <figcaption>${img.caption || ""}</figcaption>
        </figure>
      `).join("")}
      <div class="svg-diagram" style="margin:0;">${frame.svg}</div>
    </div>
  `;

  const buildVideoEmbedHtml = (vidId, vidTitle) => `
    <div class="video-iframe-ratio">
      <iframe
        src="https://www.youtube.com/embed/${vidId}?rel=0&modestbranding=1"
        title="${vidTitle}"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen>
      </iframe>
    </div>
    <div class="video-fallback-row">
      <span>مقطع: <strong>${vidTitle}</strong></span>
      <a href="https://www.youtube.com/watch?v=${vidId}" target="_blank" rel="noopener noreferrer" class="btn btn-soft btn-sm">فتح في يوتيوب ↗</a>
    </div>
  `;

  const videosHtml = frame.videos && frame.videos.length ? `
    <div class="video-box">
      <div class="video-box-head">
        <strong>🎬 شرح مرئي مساند للمهارة:</strong>
        <span class="hint">اختر المقطع للتبديل بين الشروحات</span>
      </div>
      ${isFileProtocol ? `
        <div class="file-protocol-warn">
          تنبيه: تم فتح الصفحة عبر <code>file://</code>. لتشغيل مشغل يوتيوب المدمج دون قيود المتصفح، شغّل ملف <code>تشغيل_المنصة.bat</code> (أو استخدم زر «فتح في يوتيوب ↗»).
        </div>
      ` : ""}
      <div class="video-chips">
        ${frame.videos.map((v, i) => `
          <button type="button" class="video-chip ${i === 0 ? "active" : ""}" data-vid-id="${v.id}" data-vid-title="${v.title}">
            ▶ ${v.title} (${v.duration})
          </button>
        `).join("")}
      </div>
      <div id="video-player-wrap" class="video-player-wrap">
        ${buildVideoEmbedHtml(frame.videos[0].id, frame.videos[0].title)}
      </div>
    </div>
  ` : "";

  container.innerHTML = `
    <div class="frame-teach-box">
      <span class="pill pill-level">${frame.level}</span>
      <h3>${frame.title}</h3>
      ${indicatorHtml}
      <div>${frame.content}</div>
      ${mediaHtml}
      ${videosHtml}
    </div>

    <div class="question-box">
      <h4>تحقق فوري: ${frame.question.prompt}</h4>
      <div class="options-list">
        ${frame.question.options.map((opt, idx) => `
          <button type="button" class="option-btn" data-frame-opt="${idx}">
            <span class="opt-letter">${LETTERS[idx]}</span>
            <span>${opt}</span>
          </button>
        `).join("")}
      </div>
    </div>

    <div id="frame-feedback-area"></div>
  `;

  container.querySelectorAll("[data-vid-id]").forEach(vBtn => {
    vBtn.addEventListener("click", () => {
      const vidId = vBtn.getAttribute("data-vid-id");
      const vidTitle = vBtn.getAttribute("data-vid-title");
      const wrap = document.getElementById("video-player-wrap");
      container.querySelectorAll("[data-vid-id]").forEach(b => b.classList.remove("active"));
      vBtn.classList.add("active");
      wrap.innerHTML = buildVideoEmbedHtml(vidId, vidTitle);
    });
  });

  container.querySelectorAll("[data-frame-opt]").forEach(btn => {
    btn.addEventListener("click", () => {
      const chosen = Number(btn.getAttribute("data-frame-opt"));
      const isCorrect = chosen === frame.question.correctIndex;
      container.querySelectorAll("[data-frame-opt]").forEach((b, i) => {
        b.disabled = true;
        if (i === frame.question.correctIndex) b.classList.add("correct");
        else if (i === chosen && !isCorrect) b.classList.add("wrong");
      });

      const area = document.getElementById("frame-feedback-area");
      if (isCorrect) {
        updateUnitRecord(state.currentStudent.code, unit.id, u => {
          u.points += 15;
          if (!u.completedFrames.includes(frame.id)) u.completedFrames.push(frame.id);
          u.progressPct = Math.round(((state.frameIndex + 1) / (unit.frames.length + 1)) * 100);
        });
        area.innerHTML = `
          <div class="feedback-box success">
            <strong>إتقان مباشر (+15 نقطة):</strong> ${frame.question.successFeedback}
            <div style="margin-top:12px;">
              <button id="btn-advance-frame" class="btn btn-primary" type="button">
                ${state.frameIndex + 1 < unit.frames.length ? "الانتقال للإطار التالي ←" : "دخول بوابة الإتقان ←"}
              </button>
            </div>
          </div>
        `;
        document.getElementById("btn-advance-frame").addEventListener("click", advanceFromFrame);
      } else {
        // تفعيل المسار العلاجي المتفرع
        updateUnitRecord(state.currentStudent.code, unit.id, u => {
          u.remedialCount += 1;
          if (!u.weakSkills.includes(frame.skillName)) u.weakSkills.push(frame.skillName);
        });
        area.innerHTML = `
          <div class="remedial-card">
            <h4>🔄 ${frame.remedial.title}</h4>
            <p>${frame.remedial.explanation}</p>
            <h4 style="margin-top:14px; color:var(--text);">سؤال تحقق علاجي: ${frame.remedial.question}</h4>
            <div class="options-list" style="margin-top:10px;">
              ${frame.remedial.options.map((opt, idx) => `
                <button type="button" class="option-btn" data-rem-opt="${idx}">
                  <span class="opt-letter">${LETTERS[idx]}</span>
                  <span>${opt}</span>
                </button>
              `).join("")}
            </div>
            <div id="remedial-feedback"></div>
          </div>
        `;
        area.querySelectorAll("[data-rem-opt]").forEach(rBtn => {
          rBtn.addEventListener("click", () => {
            const rChosen = Number(rBtn.getAttribute("data-rem-opt"));
            const rCorrect = rChosen === frame.remedial.correctIndex;
            const rFb = document.getElementById("remedial-feedback");
            if (rCorrect) {
              area.querySelectorAll("[data-rem-opt]").forEach((b, i) => {
                b.disabled = true;
                if (i === frame.remedial.correctIndex) b.classList.add("correct");
              });
              updateUnitRecord(state.currentStudent.code, unit.id, u => {
                u.points += 10;
                if (!u.completedFrames.includes(frame.id)) u.completedFrames.push(frame.id);
                u.progressPct = Math.round(((state.frameIndex + 1) / (unit.frames.length + 1)) * 100);
              });
              rFb.innerHTML = `
                <div class="feedback-box success">
                  <strong>أحسنت! تم تجاوز الإطار العلاجي (+10 نقاط).</strong>
                  <div style="margin-top:10px;">
                    <button id="btn-advance-remedial" class="btn btn-primary btn-sm" type="button">متابعة المسار ←</button>
                  </div>
                </div>
              `;
              document.getElementById("btn-advance-remedial").addEventListener("click", advanceFromFrame);
            } else {
              rBtn.classList.add("wrong");
              rBtn.disabled = true;
              rFb.innerHTML = `<p class="error-text">حاول مرة أخرى بعد قراءة المربع الأصفر أعلاه بعناية.</p>`;
            }
          });
        });
      }
    });
  });
}

function advanceFromFrame() {
  const unit = getCurrentUnit();
  if (state.frameIndex + 1 < unit.frames.length) {
    state.frameIndex++;
  } else {
    state.phase = "mastery";
    state.masteryIndex = 0;
    state.masteryCorrect = 0;
  }
  renderLessonFrame();
}

function renderMasteryQuiz(unit, container) {
  const q = unit.masteryQuiz[state.masteryIndex];
  container.innerHTML = `
    <span class="pill pill-level">بوابة الإتقان الختامية للوحدة (شرط الاجتياز: ${unit.masteryThreshold}%)</span>
    <div class="question-box" style="margin-top:14px;">
      <h4>${q.question}</h4>
      <div class="options-list">
        ${q.options.map((opt, idx) => `
          <button type="button" class="option-btn" data-mast-opt="${idx}">
            <span class="opt-letter">${LETTERS[idx]}</span>
            <span>${opt}</span>
          </button>
        `).join("")}
      </div>
    </div>
    <div id="mast-feedback"></div>
  `;

  container.querySelectorAll("[data-mast-opt]").forEach(btn => {
    btn.addEventListener("click", () => {
      const chosen = Number(btn.getAttribute("data-mast-opt"));
      const isCorrect = chosen === q.correctIndex;
      container.querySelectorAll("[data-mast-opt]").forEach((b, i) => {
        b.disabled = true;
        if (i === q.correctIndex) b.classList.add("correct");
        else if (i === chosen && !isCorrect) b.classList.add("wrong");
      });

      if (isCorrect) state.masteryCorrect++;

      const fb = document.getElementById("mast-feedback");
      fb.innerHTML = `
        <div class="feedback-box ${isCorrect ? "success" : "remedial"}">
          <strong>${isCorrect ? "إجابة صحيحة!" : "إجابة غير صحيحة."}</strong>
          <div style="margin-top:10px;">
            <button id="btn-next-mast" class="btn btn-primary btn-sm" type="button">
              ${state.masteryIndex + 1 < unit.masteryQuiz.length ? "السؤال التالي ←" : "عرض النتيجة النهائية ←"}
            </button>
          </div>
        </div>
      `;
      document.getElementById("btn-next-mast").addEventListener("click", () => {
        if (state.masteryIndex + 1 < unit.masteryQuiz.length) {
          state.masteryIndex++;
        } else {
          finalizeUnit(unit);
          state.phase = "summary";
        }
        renderLessonFrame();
      });
    });
  });
}

function classifyPerformance(scorePct) {
  if (scorePct >= 90) return "مرتفع";
  if (scorePct >= 75) return "متوسط";
  if (scorePct >= 50) return "منخفض";
  return "منخفض جداً";
}

function finalizeUnit(unit) {
  const scorePct = Math.round((state.masteryCorrect / unit.masteryQuiz.length) * 100);
  const perf = classifyPerformance(scorePct);
  const passed = scorePct >= unit.masteryThreshold;

  updateUnitRecord(state.currentStudent.code, unit.id, u => {
    u.masteryScorePct = scorePct;
    u.performanceLevel = perf;
    u.progressPct = 100;
    u.status = passed ? "مُتقنة" : "تحتاج تعزيزاً";
    if (passed) u.points += 25;
  });
}

function renderSummary(unit, container) {
  const uRec = getStudentRecord(state.currentStudent.code).units[unit.id];
  const passed = uRec.masteryScorePct >= unit.masteryThreshold;

  container.innerHTML = `
    <div style="text-align:center; padding: 10px 0;">
      <span class="pill ${passed ? "pill-success" : "pill-warning"}" style="font-size:0.95rem;">
        ${passed ? "🏆 تم اجتياز بوابة الإتقان بنجاح" : "⚠️ لم تتحقق نسبة الإتقان المطلوبة (75%)"}
      </span>
      <h2 style="margin:14px 0 6px;">نتيجتك في ${unit.title}: ${uRec.masteryScorePct}%</h2>
      <p style="color:var(--muted); margin:0 0 18px;">
        مستوى الأداء المحقق: <strong>${uRec.performanceLevel}</strong> |
        مجموع النقاط: <strong>${uRec.points}</strong> |
        الإطارات العلاجية المستخدمة: <strong>${uRec.remedialCount}</strong>
      </p>
      <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
        <button id="btn-retry-unit" class="btn btn-outline" type="button">إعادة دراسة الوحدة</button>
        <button id="btn-summary-units" class="btn btn-primary" type="button">العودة لخريطة الوحدات</button>
      </div>
    </div>
  `;

  document.getElementById("btn-retry-unit").addEventListener("click", () => startUnit(unit.id, true));
  document.getElementById("btn-summary-units").addEventListener("click", () => {
    renderUnitsView();
    showView(viewUnits);
  });
}

// لوحة المعلم والرصد
const teacherUnitSelect = document.getElementById("teacher-unit-select");
function initTeacherUnitSelect() {
  if (!teacherUnitSelect || teacherUnitSelect.options.length > 0) return;
  CURRICULUM_UNITS.filter(u => u.ready).forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = u.title;
    teacherUnitSelect.appendChild(opt);
  });
  teacherUnitSelect.addEventListener("change", renderTeacherDashboard);
}

function getSelectedTeacherUnit() {
  initTeacherUnitSelect();
  const id = teacherUnitSelect ? teacherUnitSelect.value : "unit-earth";
  return CURRICULUM_UNITS.find(u => u.id === id) || CURRICULUM_UNITS[0];
}

function renderTeacherDashboard() {
  const unitObj = getSelectedTeacherUnit();
  const records = loadAllRecords();
  const tbody = document.getElementById("teacher-table-body");
  tbody.innerHTML = "";

  let activeCount = 0;
  let masteredCount = 0;
  let scoreSum = 0;
  let scoreCount = 0;
  let totalRemedials = 0;

  STUDENTS_ROSTER.forEach(stu => {
    const u = records[stu.code]?.units[unitObj.id];
    if (u) {
      activeCount++;
      totalRemedials += u.remedialCount || 0;
      if (u.masteryScorePct !== null) {
        scoreSum += u.masteryScorePct;
        scoreCount++;
        if (u.masteryScorePct >= 75) masteredCount++;
      }
    }

    const status = u ? u.status : "لم يبدأ";
    const prog = u ? `${u.progressPct}%` : "0%";
    const score = u && u.masteryScorePct !== null ? `${u.masteryScorePct}%` : "—";
    const rem = u ? u.remedialCount : 0;
    const level = u ? u.performanceLevel : "—";
    const weak = u && u.weakSkills.length ? u.weakSkills.join("، ") : "لا يوجد";

    let levelPill = `<span class="pill pill-info">${level}</span>`;
    if (level === "مرتفع") levelPill = `<span class="pill pill-success">${level}</span>`;
    else if (level === "متوسط") levelPill = `<span class="pill pill-level">${level}</span>`;
    else if (level === "منخفض") levelPill = `<span class="pill pill-warning">${level}</span>`;
    else if (level === "منخفض جداً") levelPill = `<span class="pill pill-danger">${level}</span>`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><code>${stu.code}</code></td>
      <td><strong>${stu.name}</strong></td>
      <td>${status}</td>
      <td>${prog}</td>
      <td><strong>${score}</strong></td>
      <td>${rem}</td>
      <td>${level === "—" ? "—" : levelPill}</td>
      <td style="white-space:normal; min-width:180px;">${weak}</td>
    `;
    tbody.appendChild(tr);
  });

  const avg = scoreCount ? `${Math.round(scoreSum / scoreCount)}%` : "—";
  document.getElementById("teacher-stats-grid").innerHTML = `
    <div class="stat-box"><div class="stat-label">الطلاب النشطون</div><div class="stat-value">${activeCount} / ${STUDENTS_ROSTER.length}</div></div>
    <div class="stat-box"><div class="stat-label">متوسط إتقان الوحدة</div><div class="stat-value">${avg}</div></div>
    <div class="stat-box"><div class="stat-label">مجتازو بوابة الإتقان</div><div class="stat-value">${masteredCount}</div></div>
    <div class="stat-box"><div class="stat-label">التدخلات العلاجية المنفذة</div><div class="stat-value">${totalRemedials}</div></div>
  `;
}

// تصدير CSV متوافق مع Google Sheets و Excel
document.getElementById("btn-export-csv").addEventListener("click", () => {
  const unitObj = getSelectedTeacherUnit();
  const records = loadAllRecords();
  const headers = ["كود_الطالب", "اسم_الطالب", "الوحدة", "الحالة", "التقدم_٪", "الدرجة_٪", "عدد_الإطارات_العلاجية", "مستوى_الأداء", "مهارات_تحتاج_دعماً"];
  const rows = [headers];

  STUDENTS_ROSTER.forEach(stu => {
    const u = records[stu.code]?.units[unitObj.id];
    rows.push([
      stu.code,
      stu.name,
      unitObj.title,
      u ? u.status : "لم يبدأ",
      u ? u.progressPct : 0,
      u && u.masteryScorePct !== null ? u.masteryScorePct : "",
      u ? u.remedialCount : 0,
      u ? u.performanceLevel : "غير محدد",
      u && u.weakSkills.length ? u.weakSkills.join(" | ") : ""
    ]);
  });

  const csvContent = "\uFEFF" + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `رصد_نافس_المبرمج_${unitObj.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("btn-reset-all").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  renderTeacherDashboard();
});

// التهيئة الأولية + دعم الدخول التلقائي من بوابة نافس عبر ?code= أو ?student=
(function initApp() {
  const params = new URLSearchParams(window.location.search);
  const returnUrl = params.get("returnUrl");
  if (returnUrl || window.location.pathname.includes("/programmed")) {
    const actionsEl = document.querySelector(".header-actions");
    if (actionsEl) {
      const backLink = document.createElement("a");
      backLink.href = returnUrl || "../index.html";
      backLink.className = "btn btn-soft btn-sm";
      backLink.textContent = "← بوابة نافس";
      actionsEl.prepend(backLink);
    }
  }

  const urlCode = (params.get("code") || params.get("student") || "").trim().toUpperCase();
  if (urlCode) {
    loginWithCode(urlCode);
    fetchCloudProgress(urlCode);
  } else {
    showView(viewLogin);
  }
})();
