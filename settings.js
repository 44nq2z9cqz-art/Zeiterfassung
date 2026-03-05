// Einstellungen v1.2 – mit Apple Drum-Roll Picker & Entnahmen
const Settings = {
  _temp: {},

  render() {
    const container = document.getElementById('settings-container');
    if (!container) return;
    const s = DB.getSettings();
    this._temp = {};

    container.innerHTML = `
      <!-- Allgemein -->
      <div class="settings-section">
        <h3 class="settings-title">Allgemein</h3>
        <div class="settings-card">
          <div class="setting-row">
            <label>Mein Name</label>
            <input type="text" class="setting-input" id="s-name" value="${s.mitarbeiterName}">
          </div>
        </div>
      </div>

      <!-- Sollarbeitszeit mit Drum-Roll Picker -->
      <div class="settings-section">
        <h3 class="settings-title">Arbeitszeit</h3>
        <div class="settings-card">
          <div class="setting-row setting-row-col">
            <label>Soll-Arbeitszeit (Mo–Fr)</label>
            <div class="drum-picker-wrap" id="drum-soll">
              ${this.buildDrumPicker('soll', s.sollarbeitszeitMinuten, 0, 600)}
            </div>
          </div>
          <div class="setting-row setting-row-col">
            <label>Überstunden-Sockel Limit</label>
            <div class="drum-picker-wrap" id="drum-sockelLimit">
              ${this.buildDrumPicker('sockelLimit', s.ueberstundenSockelLimit, 0, 9999)}
            </div>
          </div>
        </div>
      </div>

      <!-- Startsaldo minutengenau mit Drum-Roll + Vorzeichen -->
      <div class="settings-section">
        <h3 class="settings-title">Startsaldo Zeitkonten</h3>
        <div class="settings-info-box">
          Bereits vorhandene Überstunden zum Stichtag eintragen – minutengenau. Ab dem Stichtag fließen neue Arbeitstage auf die Konten.
        </div>
        <div class="settings-card">
          <div class="setting-row">
            <label>Stichtag</label>
            <input type="date" class="setting-input" id="s-stichtag" value="${s.startsaldoDatum || ''}">
          </div>
          <div class="setting-row setting-row-col">
            <label>
              Konto 1 – Sockel
              <span class="label-hint">positiv = Guthaben · negativ = Schulden</span>
            </label>
            <div class="saldo-sign-row">
              <div class="sign-toggle">
                <button class="sign-btn ${(s.startsaldoSockel||0) >= 0 ? 'active' : ''}"
                        id="sign-sockel-pos" onclick="Settings.setSign('sockel', 1)">+</button>
                <button class="sign-btn ${(s.startsaldoSockel||0) < 0 ? 'active' : ''}"
                        id="sign-sockel-neg" onclick="Settings.setSign('sockel', -1)">−</button>
              </div>
              <div class="drum-picker-wrap" id="drum-saldoSockel">
                ${this.buildDrumPicker('saldoSockel', Math.abs(s.startsaldoSockel||0), 0, 9999)}
              </div>
            </div>
          </div>
          <div class="setting-row setting-row-col">
            <label>
              Konto 2 – Über dem Sockel
              <span class="label-hint">positiv = Guthaben · negativ = Schulden</span>
            </label>
            <div class="saldo-sign-row">
              <div class="sign-toggle">
                <button class="sign-btn ${(s.startsaldoUeberSockel||0) >= 0 ? 'active' : ''}"
                        id="sign-ueber-pos" onclick="Settings.setSign('ueberSockel', 1)">+</button>
                <button class="sign-btn ${(s.startsaldoUeberSockel||0) < 0 ? 'active' : ''}"
                        id="sign-ueber-neg" onclick="Settings.setSign('ueberSockel', -1)">−</button>
              </div>
              <div class="drum-picker-wrap" id="drum-saldoUeberSockel">
                ${this.buildDrumPicker('saldoUeberSockel', Math.abs(s.startsaldoUeberSockel||0), 0, 9999)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Kontobuchungen / Entnahmen -->
      <div class="settings-section">
        <h3 class="settings-title">Kontobuchungen</h3>
        <div class="settings-info-box">
          Hier werden Entnahmen, Auszahlungen oder Korrekturen der Zeitkonten protokolliert.
        </div>
        <div id="entnahmen-list">
          ${this.buildEntnahmenList()}
        </div>
        <button class="btn-outline btn-full mt-8" onclick="Settings.openEntnahmeModal()">
          + Neue Buchung eintragen
        </button>
      </div>

      <!-- Pausenkorrektur -->
      <div class="settings-section">
        <h3 class="settings-title">Pausen-Stoppuhr Korrektur</h3>
        <div class="settings-info-box">
          Stoppuhr-Start oder -Ende um Sekunden verschieben. Negativ = früher, Positiv = später.
        </div>
        <div class="settings-card">
          <div class="setting-row">
            <label>Pause Start <span class="label-hint">Sekunden</span></label>
            <div class="sek-adjuster">
              <button onclick="Settings.adjustSek('pauseStart',-30)">−30s</button>
              <button onclick="Settings.adjustSek('pauseStart',-5)">−5s</button>
              <span id="s-pause-start-korr-display" class="${(s.pauseStartKorrekturSek||0)!==0?'highlight-val':''}">${this.formatSek(s.pauseStartKorrekturSek||0)}</span>
              <button onclick="Settings.adjustSek('pauseStart',5)">+5s</button>
              <button onclick="Settings.adjustSek('pauseStart',30)">+30s</button>
            </div>
          </div>
          <div class="setting-row">
            <label>Pause Ende <span class="label-hint">Sekunden</span></label>
            <div class="sek-adjuster">
              <button onclick="Settings.adjustSek('pauseEnde',-30)">−30s</button>
              <button onclick="Settings.adjustSek('pauseEnde',-5)">−5s</button>
              <span id="s-pause-ende-korr-display" class="${(s.pauseEndeKorrekturSek||0)!==0?'highlight-val':''}">${this.formatSek(s.pauseEndeKorrekturSek||0)}</span>
              <button onclick="Settings.adjustSek('pauseEnde',5)">+5s</button>
              <button onclick="Settings.adjustSek('pauseEnde',30)">+30s</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Benachrichtigungen -->
      <div class="settings-section">
        <h3 class="settings-title">Benachrichtigungen</h3>
        <div class="settings-card">
          <div class="setting-row">
            <label>Push-Benachrichtigungen</label>
            <div class="toggle-wrap">
              <input type="checkbox" id="s-push" class="toggle-input" ${s.pushNotifications?'checked':''} onchange="Settings.togglePush(this.checked)">
              <label for="s-push" class="toggle-label"></label>
            </div>
          </div>
          <div class="setting-row ${!s.pushNotifications?'disabled':''}">
            <label>Erinnerung Arbeitsbeginn</label>
            <input type="time" class="setting-input time-input" id="s-start-reminder" value="${s.startErinnerung||''}" ${!s.pushNotifications?'disabled':''}>
          </div>
          <div class="setting-row ${!s.pushNotifications?'disabled':''}">
            <label>Erinnerung Arbeitsende</label>
            <input type="time" class="setting-input time-input" id="s-end-reminder" value="${s.endeErinnerung||''}" ${!s.pushNotifications?'disabled':''}>
          </div>
        </div>
      </div>

      <!-- Daten -->
      <div class="settings-section">
        <h3 class="settings-title">Daten</h3>
        <div class="settings-card">
          <div class="setting-row">
            <label>Backup erstellen</label>
            <button class="btn-outline btn-sm" onclick="DB.createBackup()">💾 Download</button>
          </div>
          <div class="setting-row">
            <label>Backup wiederherstellen</label>
            <button class="btn-outline btn-sm" onclick="Settings.triggerRestore()">📂 Wählen</button>
            <input type="file" id="restore-file" accept=".json" style="display:none" onchange="Settings.doRestore(event)">
          </div>
          <div class="setting-row">
            <label>CSV Export</label>
            <button class="btn-outline btn-sm" onclick="App.openModal('csv-export-modal')">📊 Exportieren</button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-card">
          <div class="setting-row danger-row">
            <label>Alle Daten löschen</label>
            <button class="btn-danger btn-sm" onclick="Settings.deleteAll()">🗑 Löschen</button>
          </div>
        </div>
      </div>

      <button class="btn-primary btn-full" onclick="Settings.save()">Einstellungen speichern</button>
      <div style="height:8px"></div>
    `;

    // Drum-Picker nach dem Rendern initialisieren
    requestAnimationFrame(() => this.initAllDrums());
  },

  // ─── Drum Roll Picker ──────────────────────────────────────────────────────
  // Erzeugt zwei scrollbare Spalten: Stunden + Minuten (je 1-Min-Schritt)
  buildDrumPicker(id, totalMin, minVal, maxVal) {
    const h = Math.floor(Math.abs(totalMin) / 60);
    const m = Math.abs(totalMin) % 60;
    return `
      <div class="drum-picker" data-id="${id}" data-min="${minVal}" data-max="${maxVal}">
        <div class="drum-col" data-col="h" data-val="${h}">
          <div class="drum-scroll" id="drum-${id}-h"></div>
        </div>
        <div class="drum-sep">:</div>
        <div class="drum-col" data-col="m" data-val="${m}">
          <div class="drum-scroll" id="drum-${id}-m"></div>
        </div>
        <div class="drum-unit">h&nbsp;min</div>
        <div class="drum-selection-bar"></div>
      </div>`;
  },

  initAllDrums() {
    document.querySelectorAll('.drum-picker').forEach(picker => {
      const id = picker.dataset.id;
      const hCol = picker.querySelector('[data-col="h"]');
      const mCol = picker.querySelector('[data-col="m"]');
      this.initDrumCol(id, 'h', parseInt(hCol.dataset.val), 0, 999);
      this.initDrumCol(id, 'm', parseInt(mCol.dataset.val), 0, 59);
    });
  },

  ITEM_H: 40, // px per item

  initDrumCol(pickerId, col, initVal, minV, maxV) {
    const el = document.getElementById(`drum-${pickerId}-${col}`);
    if (!el) return;

    const ITEM = this.ITEM_H;
    const VISIBLE = 5; // sichtbare Items
    const PAD = Math.floor(VISIBLE / 2); // 2 Padding-Items oben/unten

    // Items aufbauen (mit Padding für Loop-Gefühl)
    const range = maxV - minV + 1;
    let html = '';
    // Padding oben
    for (let i = PAD; i > 0; i--) {
      const v = ((initVal - i) % range + range) % range + minV;
      html += `<div class="drum-item drum-pad">${String(v).padStart(2,'0')}</div>`;
    }
    // Echte Items
    for (let v = minV; v <= maxV; v++) {
      html += `<div class="drum-item" data-v="${v}">${String(v).padStart(2,'0')}</div>`;
    }
    // Padding unten
    for (let i = 0; i < PAD; i++) {
      const v = (i % range) + minV;
      html += `<div class="drum-item drum-pad">${String(v).padStart(2,'0')}</div>`;
    }
    el.innerHTML = html;

    // Zum Initialwert scrollen
    const targetIdx = initVal - minV;
    el.scrollTop = targetIdx * ITEM;

    // Snap-Scroll bei Ende
    let snapTimer;
    const onScroll = () => {
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        const idx = Math.round(el.scrollTop / ITEM);
        el.scrollTo({ top: idx * ITEM, behavior: 'smooth' });
        const newVal = Math.min(maxV, Math.max(minV, idx + minV));
        el.closest('.drum-col').dataset.val = newVal;
        this._onDrumChange(pickerId);
      }, 120);
    };
    el.addEventListener('scroll', onScroll, { passive: true });

    // Touch/Maus Drag
    let startY = 0, startScroll = 0, dragging = false;
    const onStart = (e) => {
      startY = e.touches ? e.touches[0].clientY : e.clientY;
      startScroll = el.scrollTop;
      dragging = true;
      el.style.scrollSnapType = 'none';
    };
    const onMove = (e) => {
      if (!dragging) return;
      const dy = (e.touches ? e.touches[0].clientY : e.clientY) - startY;
      el.scrollTop = startScroll - dy;
    };
    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      el.style.scrollSnapType = '';
      onScroll();
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
  },

  _onDrumChange(pickerId) {
    const picker = document.querySelector(`.drum-picker[data-id="${pickerId}"]`);
    if (!picker) return;
    const h = parseInt(picker.querySelector('[data-col="h"]').dataset.val || 0);
    const m = parseInt(picker.querySelector('[data-col="m"]').dataset.val || 0);
    const total = h * 60 + m;
    this._temp[pickerId] = total;
    // Live-Vorschau im Display-Element falls vorhanden
    const preview = document.getElementById(`drum-${pickerId}-preview`);
    if (preview) preview.textContent = DB.formatDuration(total);
  },

  getDrumValue(pickerId) {
    if (this._temp[pickerId] !== undefined) return this._temp[pickerId];
    const picker = document.querySelector(`.drum-picker[data-id="${pickerId}"]`);
    if (!picker) return 0;
    const h = parseInt(picker.querySelector('[data-col="h"]')?.dataset.val || 0);
    const m = parseInt(picker.querySelector('[data-col="m"]')?.dataset.val || 0);
    return h * 60 + m;
  },

  // ─── Vorzeichen für Startsaldo ────────────────────────────────────────────
  _signs: { sockel: 1, ueberSockel: 1 },

  setSign(which, sign) {
    this._signs[which] = sign;
    const pos = document.getElementById(`sign-${which === 'sockel' ? 'sockel' : 'ueber'}-pos`);
    const neg = document.getElementById(`sign-${which === 'sockel' ? 'sockel' : 'ueber'}-neg`);
    if (pos) pos.classList.toggle('active', sign > 0);
    if (neg) neg.classList.toggle('active', sign < 0);
  },

  // ─── Entnahmen Liste ──────────────────────────────────────────────────────
  buildEntnahmenList() {
    const list = DB.getEntnahmen();
    if (!list.length) return '<p class="no-data no-data-settings">Noch keine Buchungen</p>';
    const sorted = [...list].sort((a,b) => b.datum.localeCompare(a.datum));
    return `<div class="entnahmen-list">${sorted.map(en => `
      <div class="entnahme-item">
        <div class="entnahme-left">
          <span class="entnahme-datum">${new Date(en.datum+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'short',year:'numeric'})}</span>
          <span class="entnahme-konto">${en.konto==='sockel'?'Konto 1 · Sockel':'Konto 2 · Über Sockel'}</span>
          ${en.grund ? `<span class="entnahme-grund">${en.grund}</span>` : ''}
        </div>
        <div class="entnahme-right">
          <span class="entnahme-betrag neg">−${DB.formatDuration(en.betragMin)}</span>
          <div class="entnahme-actions">
            <button class="icon-btn" onclick="Settings.openEntnahmeModal(${en.id})">✏️</button>
            <button class="icon-btn danger" onclick="Settings.deleteEntnahme(${en.id})">🗑</button>
          </div>
        </div>
      </div>`).join('')}</div>`;
  },

  refreshEntnahmen() {
    const el = document.getElementById('entnahmen-list');
    if (el) el.innerHTML = this.buildEntnahmenList();
  },

  // ─── Entnahme Modal ───────────────────────────────────────────────────────
  openEntnahmeModal(id) {
    const modal = document.getElementById('entnahme-modal');
    if (!modal) return;
    const existing = id ? DB.getEntnahmen().find(e => e.id === id) : null;

    document.getElementById('entnahme-id').value = id || '';
    document.getElementById('entnahme-datum').value = existing?.datum || DB.todayStr();
    document.getElementById('entnahme-grund').value = existing?.grund || '';

    // Konto
    const konto = existing?.konto || 'sockel';
    document.querySelectorAll('.konto-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.konto === konto));
    document.getElementById('entnahme-konto').value = konto;

    // Betrag via Drum
    const betrag = existing?.betragMin || 0;
    document.getElementById('entnahme-modal-title').textContent =
      id ? 'Buchung bearbeiten' : 'Neue Kontobuchung';

    modal.classList.add('open');

    // Drum im Modal initialisieren
    requestAnimationFrame(() => {
      document.getElementById('entnahme-drum-wrap').innerHTML =
        this.buildDrumPicker('entnahmeBetrag', betrag, 0, 9999);
      requestAnimationFrame(() => this.initAllDrums());
    });
  },

  saveEntnahme() {
    const id = document.getElementById('entnahme-id')?.value;
    const datum = document.getElementById('entnahme-datum')?.value;
    const konto = document.getElementById('entnahme-konto')?.value;
    const grund = document.getElementById('entnahme-grund')?.value?.trim() || '';
    const betragMin = this.getDrumValue('entnahmeBetrag');

    if (!datum) { App.showToast('Datum fehlt', 'error'); return; }
    if (betragMin <= 0) { App.showToast('Betrag muss > 0 sein', 'error'); return; }

    if (id) {
      DB.updateEntnahme(parseInt(id), { datum, konto, betragMin, grund });
    } else {
      DB.addEntnahme({ datum, konto, betragMin, grund });
    }

    App.closeModal('entnahme-modal');
    App.showToast('Buchung gespeichert ✓', 'success');
    this.refreshEntnahmen();
    if (document.getElementById('tab-calendar')?.classList.contains('active')) Calendar.render();
  },

  deleteEntnahme(id) {
    if (!confirm('Buchung wirklich löschen?')) return;
    DB.deleteEntnahme(id);
    App.showToast('Buchung gelöscht', 'info');
    this.refreshEntnahmen();
    if (document.getElementById('tab-calendar')?.classList.contains('active')) Calendar.render();
  },

  // ─── Sek-Adjuster ─────────────────────────────────────────────────────────
  adjustSek(which, delta) {
    const s = DB.getSettings();
    const fm = { pauseStart: 'pauseStartKorrekturSek', pauseEnde: 'pauseEndeKorrekturSek' };
    const dm = { pauseStart: 's-pause-start-korr-display', pauseEnde: 's-pause-ende-korr-display' };
    const f = fm[which];
    if (this._temp[f] === undefined) this._temp[f] = s[f] || 0;
    this._temp[f] += delta;
    const el = document.getElementById(dm[which]);
    if (el) { el.textContent = this.formatSek(this._temp[f]); el.className = this._temp[f] !== 0 ? 'highlight-val' : ''; }
  },

  formatSek(s) { return s === 0 ? '0s' : `${s > 0 ? '+' : ''}${s}s`; },

  togglePush(enabled) {
    if (enabled) Notifications.requestPermission();
    document.querySelectorAll('#settings-container input[type="time"]')
      .forEach(i => i.disabled = !enabled);
  },

  // ─── Speichern ────────────────────────────────────────────────────────────
  save() {
    const s = DB.getSettings();

    // Startsaldo: Vorzeichen × Betrag
    const saldoSockelAbs = this.getDrumValue('saldoSockel');
    const saldoUeberAbs  = this.getDrumValue('saldoUeberSockel');
    const signSockel     = this._signs.sockel ?? (s.startsaldoSockel < 0 ? -1 : 1);
    const signUeber      = this._signs.ueberSockel ?? (s.startsaldoUeberSockel < 0 ? -1 : 1);

    const updated = {
      ...s,
      mitarbeiterName:       document.getElementById('s-name')?.value || s.mitarbeiterName,
      sollarbeitszeitMinuten: this.getDrumValue('soll') || s.sollarbeitszeitMinuten,
      ueberstundenSockelLimit: this.getDrumValue('sockelLimit') || s.ueberstundenSockelLimit,
      startsaldoDatum:       document.getElementById('s-stichtag')?.value || null,
      startsaldoSockel:      signSockel * saldoSockelAbs,
      startsaldoUeberSockel: signUeber  * saldoUeberAbs,
      pauseStartKorrekturSek: this._temp.pauseStartKorrekturSek ?? s.pauseStartKorrekturSek,
      pauseEndeKorrekturSek:  this._temp.pauseEndeKorrekturSek  ?? s.pauseEndeKorrekturSek,
      pushNotifications:     document.getElementById('s-push')?.checked ?? s.pushNotifications,
      startErinnerung:       document.getElementById('s-start-reminder')?.value || null,
      endeErinnerung:        document.getElementById('s-end-reminder')?.value || null,
    };
    DB.saveSettings(updated);
    this._temp = {};
    App.showToast('Einstellungen gespeichert ✓', 'success');
    DB.recalcUeberstunden();
    if (document.getElementById('tab-calendar')?.classList.contains('active')) Calendar.render();
  },

  triggerRestore() { document.getElementById('restore-file')?.click(); },
  doRestore(event) {
    const f = event.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => {
      try { DB.restoreBackup(e.target.result); App.showToast('Backup wiederhergestellt ✓', 'success'); App.init(); }
      catch(err) { App.showToast('Fehler: ' + err.message, 'error'); }
    };
    r.readAsText(f);
  },
  deleteAll() {
    if (!confirm('Wirklich alle Daten löschen?')) return;
    [DB.KEYS.EINTRAEGE, DB.KEYS.SETTINGS, DB.KEYS.UEBERSTUNDEN, DB.KEYS.URLAUB, DB.KEYS.ENTNAHMEN]
      .forEach(k => localStorage.removeItem(k));
    App.showToast('Alle Daten gelöscht', 'info');
    App.init();
  }
};

window.Settings = Settings;
