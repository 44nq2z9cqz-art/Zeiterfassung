// App Controller v1.1
const App = {
  currentTab: 'today',
  selectedDay: null,

  init() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'start') {
      setTimeout(() => Timer.arbeitsStart(), 500);
    }
    this.selectedDay = DB.todayStr();
    Timer.init();
    Calendar.init();
    this.switchTab('today');
    Notifications.init();
    this.renderTagesansicht(this.selectedDay);
  },

  // ─── Tab Navigation ───────────────────────────────────────────────────────
  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${tab}`)?.classList.add('active');
    if (tab === 'calendar') Calendar.render();
    if (tab === 'settings') Settings.render();
    if (tab === 'today') {
      Timer.renderTimerUI();
      this.renderTagesansicht(DB.todayStr());
    }
  },

  // ─── Tagesansicht ─────────────────────────────────────────────────────────
  selectDay(dateStr) {
    this.selectedDay = dateStr;
    this.openDayDetail(dateStr);
  },

  openDayDetail(dateStr) {
    const modal = document.getElementById('day-detail-modal');
    if (!modal) return;

    const date = new Date(dateStr + 'T12:00:00');
    const wochentage = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
    const settings = DB.getSettings();
    const eintrag = DB.getEintrag(dateStr) || {};
    const soll = DB.getSollMinuten(dateStr, settings);
    const ist = DB.calcArbeitszeit(eintrag);
    const diff = ist !== null ? ist - soll : null;
    const feiertag = window.Feiertage.isFeiertag(dateStr, date.getFullYear());
    const isUrlaub = DB.isUrlaub(dateStr);

    document.getElementById('modal-day-title').textContent =
      `${wochentage[date.getDay()]}, ${date.toLocaleDateString('de-DE', {day:'2-digit',month:'long',year:'numeric'})}`;

    const body = document.getElementById('modal-day-body');
    body.innerHTML = `
      ${feiertag ? `<div class="day-badge holiday">🎉 ${feiertag}</div>` : ''}
      ${isUrlaub ? `<div class="day-badge vacation">🏖 Urlaubstag</div>` : ''}

      <div class="day-zeit-grid">
        <div class="day-zeit-item">
          <span class="dz-label">Arbeitsbeginn</span>
          <span class="dz-wert">${eintrag.start || '–'}</span>
        </div>
        <div class="day-zeit-item">
          <span class="dz-label">Arbeitsende</span>
          <span class="dz-wert">${eintrag.end || '–'}</span>
        </div>
        <div class="day-zeit-item">
          <span class="dz-label">Soll-Arbeitszeit</span>
          <span class="dz-wert">${DB.formatDuration(soll)}</span>
        </div>
        <div class="day-zeit-item">
          <span class="dz-label">Ist-Arbeitszeit</span>
          <span class="dz-wert ${ist !== null ? '' : 'missing'}">${ist !== null ? DB.formatDuration(ist) : '–'}</span>
        </div>
        ${diff !== null ? `
        <div class="day-zeit-item span-2">
          <span class="dz-label">Differenz</span>
          <span class="dz-wert ${diff >= 0 ? 'pos' : 'neg'}">${DB.formatDuration(diff, true)}</span>
        </div>` : ''}
      </div>

      <div class="pausen-section">
        <div class="section-header-row">
          <h4>Pausen</h4>
          <button class="btn-icon" onclick="App.openAddPauseModal('${dateStr}')">+ Hinzufügen</button>
        </div>
        <div id="modal-pausen-list">
          ${this.buildPausenList(dateStr, eintrag)}
        </div>
      </div>

      ${eintrag.kommentar ? `
      <div class="kommentar-box">
        <span class="kommentar-icon">💬</span>
        <p>${eintrag.kommentar}</p>
      </div>` : ''}

      <div class="day-actions">
        <button class="btn-secondary btn-full" onclick="App.openEditModal('${dateStr}')">
          ✏️ Eintrag bearbeiten
        </button>
        ${!isUrlaub ? `
        <button class="btn-outline btn-full" onclick="App.toggleUrlaub('${dateStr}')">
          🏖 Als Urlaubstag markieren
        </button>` : `
        <button class="btn-outline btn-full" onclick="App.toggleUrlaub('${dateStr}')">
          Urlaubstag entfernen
        </button>`}
      </div>
    `;

    modal.classList.add('open');
  },

  buildPausenList(dateStr, eintrag) {
    const pausen = eintrag?.pausen || [];
    if (pausen.length === 0) return '<p class="no-data">Keine Pausen erfasst</p>';

    return pausen.map(p => {
      // Korrekturhinweise
      let korrHint = '';
      if (p.korrekturStart || p.korrekturEnde) {
        const parts = [];
        if (p.korrekturStart) parts.push(`Start ${p.korrekturStart > 0 ? '+' : ''}${p.korrekturStart}s`);
        if (p.korrekturEnde)  parts.push(`Ende ${p.korrekturEnde > 0 ? '+' : ''}${p.korrekturEnde}s`);
        korrHint = `<span class="pause-korrektur">⚙ ${parts.join(', ')}</span>`;
      }
      return `
        <div class="pause-item">
          <div class="pause-info">
            <span class="pause-time">${p.start} – ${p.end}</span>
            ${korrHint}
          </div>
          <span class="pause-dauer">${p.dauer} Min</span>
          <div class="pause-actions">
            <button class="icon-btn" onclick="App.openEditPauseModal('${dateStr}', ${p.id})">✏️</button>
            <button class="icon-btn danger" onclick="App.deletePause('${dateStr}', ${p.id})">🗑</button>
          </div>
        </div>`;
    }).join('');
  },

  renderTagesansicht(dateStr) {
    const el = document.getElementById('tages-pausen');
    if (!el) return;
    const eintrag = DB.getEintrag(dateStr) || {};
    el.innerHTML = this.buildPausenList(dateStr, eintrag);
  },

  renderPausenListe(dateStr) {
    const el = document.getElementById('modal-pausen-list');
    if (el) {
      const eintrag = DB.getEintrag(dateStr) || {};
      el.innerHTML = this.buildPausenList(dateStr, eintrag);
    }
    this.renderTagesansicht(dateStr);
  },

  // ─── Modals ───────────────────────────────────────────────────────────────
  openModal(id) { document.getElementById(id)?.classList.add('open'); },
  closeModal(id) { document.getElementById(id)?.classList.remove('open'); },
  closeAllModals() { document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open')); },

  openEditModal(dateStr) {
    const eintrag = DB.getEintrag(dateStr) || {};
    const modal = document.getElementById('edit-modal');
    const settings = DB.getSettings();
    const soll = DB.getSollMinuten(dateStr, settings);
    const ist = DB.calcArbeitszeit(eintrag);

    document.getElementById('edit-modal-title').textContent =
      `Bearbeiten: ${new Date(dateStr + 'T12:00:00').toLocaleDateString('de-DE')}`;
    document.getElementById('edit-date').value = dateStr;
    document.getElementById('edit-start').value = eintrag.start || '';
    document.getElementById('edit-end').value = eintrag.end || '';

    // Anpassung
    const anp = eintrag.anpassungMinuten || 0;
    document.getElementById('edit-anpassung').value = anp;
    document.getElementById('edit-anpassung-display').textContent =
      (anp >= 0 ? '+' : '') + anp + ' Min';

    // Sollzeit-Überschreibung
    const sollOverride = typeof eintrag.sollOverrideMinuten === 'number'
      ? eintrag.sollOverrideMinuten : null;
    document.getElementById('edit-soll-override-check').checked = sollOverride !== null;
    document.getElementById('edit-soll-override-val').value =
      sollOverride !== null ? sollOverride : soll;
    document.getElementById('edit-soll-override-section').style.display =
      sollOverride !== null ? 'flex' : 'none';

    // Kommentar
    document.getElementById('edit-kommentar').value = eintrag.kommentar || '';

    // Schnellkommentare
    document.querySelectorAll('.quick-tag').forEach(b => {
      b.classList.toggle('active', b.dataset.tag === eintrag.kommentar);
    });

    document.getElementById('edit-soll').textContent = DB.formatDuration(soll);
    document.getElementById('edit-ist').textContent = ist !== null ? DB.formatDuration(ist) : '–';
    this.updateEditDiff();

    modal.classList.add('open');
  },

  updateEditDiff() {
    const start = document.getElementById('edit-start')?.value;
    const end = document.getElementById('edit-end')?.value;
    const anp = parseInt(document.getElementById('edit-anpassung')?.value || 0);
    const dateStr = document.getElementById('edit-date')?.value;
    const settings = DB.getSettings();

    // Soll: Überschreibung oder normal
    let soll;
    const overrideCheck = document.getElementById('edit-soll-override-check');
    if (overrideCheck?.checked) {
      soll = parseInt(document.getElementById('edit-soll-override-val')?.value || 0);
    } else {
      soll = DB.getSollMinuten(dateStr, settings);
    }

    const sollEl = document.getElementById('edit-soll');
    if (sollEl) sollEl.textContent = DB.formatDuration(soll);

    if (start && end) {
      const startM = DB.timeToMinutes(start);
      const endM = DB.timeToMinutes(end);
      if (endM <= startM) return;
      const eintrag = DB.getEintrag(dateStr) || {};
      const pausen = (eintrag.pausen || []).reduce((s,p) => s+(p.dauer||0), 0);
      const ist = endM - startM - pausen + anp;
      const diff = ist - soll;
      const el = document.getElementById('edit-diff');
      if (el) {
        el.textContent = DB.formatDuration(diff, true);
        el.className = 'edit-diff ' + (diff >= 0 ? 'pos' : 'neg');
      }
      const istEl = document.getElementById('edit-ist');
      if (istEl) istEl.textContent = DB.formatDuration(ist);
    }
  },

  // Anpassungs-Regler: einzelne Minuten-Schritte per Button
  adjustAnpassung(delta) {
    const input = document.getElementById('edit-anpassung');
    if (!input) return;
    const val = parseInt(input.value || 0) + delta;
    input.value = val;
    const disp = document.getElementById('edit-anpassung-display');
    if (disp) disp.textContent = (val >= 0 ? '+' : '') + val + ' Min';
    this.updateEditDiff();
  },

  setAnpassungFromInput(val) {
    const v = parseInt(val) || 0;
    const disp = document.getElementById('edit-anpassung-display');
    if (disp) disp.textContent = (v >= 0 ? '+' : '') + v + ' Min';
    this.updateEditDiff();
  },

  toggleSollOverride(checked) {
    const section = document.getElementById('edit-soll-override-section');
    if (section) section.style.display = checked ? 'flex' : 'none';
    this.updateEditDiff();
  },

  setQuickKommentar(tag, btn) {
    const input = document.getElementById('edit-kommentar');
    if (!input) return;
    document.querySelectorAll('.quick-tag').forEach(b => b.classList.remove('active'));
    if (input.value === tag) {
      input.value = '';
    } else {
      input.value = tag;
      btn.classList.add('active');
    }
  },

  saveEdit() {
    const dateStr = document.getElementById('edit-date')?.value;
    const start = document.getElementById('edit-start')?.value;
    const end = document.getElementById('edit-end')?.value;
    const anpassung = parseInt(document.getElementById('edit-anpassung')?.value || 0);
    const kommentar = document.getElementById('edit-kommentar')?.value?.trim() || '';

    // Soll-Override
    const overrideCheck = document.getElementById('edit-soll-override-check');
    let sollOverrideMinuten = undefined;
    if (overrideCheck?.checked) {
      sollOverrideMinuten = parseInt(document.getElementById('edit-soll-override-val')?.value || 0);
    }

    if (!dateStr) return;

    const update = { start, end, anpassungMinuten: anpassung, kommentar };
    if (typeof sollOverrideMinuten === 'number') {
      update.sollOverrideMinuten = sollOverrideMinuten;
    } else {
      // Override entfernen wenn Checkbox abgehakt
      const existing = DB.getEintrag(dateStr) || {};
      if ('sollOverrideMinuten' in existing) {
        update.sollOverrideMinuten = null; // wird beim Merge ignoriert
        // Direkt löschen
        const eintraege = DB.getEintraege();
        if (eintraege[dateStr]) delete eintraege[dateStr].sollOverrideMinuten;
        localStorage.setItem(DB.KEYS.EINTRAEGE, JSON.stringify(eintraege));
      }
    }

    DB.saveEintrag(dateStr, update);
    this.closeModal('edit-modal');
    this.showToast('Eintrag gespeichert ✓', 'success');

    if (dateStr === DB.todayStr()) Timer.renderTimerUI();
    Calendar.render();
    if (document.getElementById('day-detail-modal')?.classList.contains('open')) {
      this.openDayDetail(dateStr);
    }
  },

  openAddPauseModal(dateStr) {
    document.getElementById('pause-date').value = dateStr;
    document.getElementById('pause-start').value = '';
    document.getElementById('pause-end').value = '';
    document.getElementById('pause-id').value = '';
    document.getElementById('pause-modal-title').textContent = 'Pause hinzufügen';
    this.openModal('pause-modal');
  },

  openEditPauseModal(dateStr, pauseId) {
    const eintrag = DB.getEintrag(dateStr) || {};
    const pause = (eintrag.pausen || []).find(p => p.id === pauseId);
    if (!pause) return;
    document.getElementById('pause-date').value = dateStr;
    document.getElementById('pause-start').value = pause.start;
    document.getElementById('pause-end').value = pause.end;
    document.getElementById('pause-id').value = pauseId;
    document.getElementById('pause-modal-title').textContent = 'Pause bearbeiten';
    this.openModal('pause-modal');
  },

  savePause() {
    const dateStr = document.getElementById('pause-date')?.value;
    const start = document.getElementById('pause-start')?.value;
    const end = document.getElementById('pause-end')?.value;
    const pauseId = document.getElementById('pause-id')?.value;

    if (!start || !end || !dateStr) {
      this.showToast('Bitte Start- und Endzeit eingeben', 'error'); return;
    }
    const startM = DB.timeToMinutes(start);
    const endM = DB.timeToMinutes(end);
    if (endM <= startM) {
      this.showToast('Endzeit muss nach Startzeit liegen', 'error'); return;
    }
    const dauer = endM - startM;

    if (pauseId) {
      DB.updatePause(dateStr, parseInt(pauseId), { start, end, dauer });
    } else {
      DB.addPause(dateStr, { start, end, dauer });
    }

    this.closeModal('pause-modal');
    this.showToast('Pause gespeichert ✓', 'success');
    this.renderPausenListe(dateStr);
    if (dateStr === DB.todayStr()) Timer.renderTimerUI();
    Calendar.render();
  },

  deletePause(dateStr, pauseId) {
    if (!confirm('Pause wirklich löschen?')) return;
    DB.deletePause(dateStr, pauseId);
    this.showToast('Pause gelöscht', 'info');
    this.renderPausenListe(dateStr);
    if (dateStr === DB.todayStr()) Timer.renderTimerUI();
    Calendar.render();
  },

  toggleUrlaub(dateStr) {
    const isUrlaub = DB.isUrlaub(dateStr);
    DB.setUrlaub(dateStr, !isUrlaub);
    this.showToast(isUrlaub ? 'Urlaubstag entfernt' : 'Als Urlaubstag markiert ✓', 'success');
    this.openDayDetail(dateStr);
    Calendar.render();
  },

  doCSVExport() {
    const von = document.getElementById('csv-von')?.value;
    const bis = document.getElementById('csv-bis')?.value;
    DB.exportCSV(von, bis);
    this.closeModal('csv-export-modal');
    this.showToast('CSV exportiert ✓', 'success');
  },

  // ─── Toast ────────────────────────────────────────────────────────────────
  showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

// ─── Notifications ────────────────────────────────────────────────────────────
const Notifications = {
  async init() {
    const s = DB.getSettings();
    if (s.pushNotifications && 'Notification' in window) {
      if (Notification.permission === 'granted') this.scheduleReminders();
    }
  },

  async requestPermission() {
    if (!('Notification' in window)) {
      App.showToast('Benachrichtigungen werden nicht unterstützt', 'error'); return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      App.showToast('Benachrichtigungen aktiviert ✓', 'success');
      const s = DB.getSettings();
      DB.saveSettings({ ...s, pushNotifications: true });
      this.scheduleReminders();
    } else {
      App.showToast('Benachrichtigungen wurden abgelehnt', 'error');
    }
  },

  scheduleReminders() {
    const s = DB.getSettings();
    if (!s.startErinnerung && !s.endeErinnerung) return;
    setInterval(() => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      const today = DB.todayStr();
      const eintrag = DB.getEintrag(today);
      if (s.startErinnerung === timeStr && !eintrag?.start) {
        new Notification('Zeiterfassung Pro', {
          body: '⏰ Vergiss nicht, deine Arbeitszeit zu starten!', icon: 'icon-192.png'
        });
      }
      if (s.endeErinnerung === timeStr && eintrag?.start && !eintrag?.end) {
        new Notification('Zeiterfassung Pro', {
          body: '🔔 Möchtest du deine Arbeitszeit beenden?', icon: 'icon-192.png'
        });
      }
    }, 60000);
  }
};

window.App = App;
window.Notifications = Notifications;

document.addEventListener('DOMContentLoaded', () => {
  App.init();
  // CSV Export: Default-Datum
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  const today = now.toISOString().substring(0, 10);
  const csvVon = document.getElementById('csv-von');
  const csvBis = document.getElementById('csv-bis');
  if (csvVon) csvVon.value = firstOfMonth;
  if (csvBis) csvBis.value = today;
});
