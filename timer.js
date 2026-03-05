// Timer & Pausentracker Modul v1.1
const Timer = {
  state: {
    arbeitsStart: null,
    arbeitsEnd: null,
    aktuellesPause: null,   // { start: Date, id: number }
    laufend: false,
    pauseLaufend: false
  },
  _ticker: null,

  init() {
    const today = DB.todayStr();
    const eintrag = DB.getEintrag(today);

    if (eintrag?.start) {
      this.state.arbeitsStart = new Date(`${today}T${eintrag.start}:00`);
      this.state.laufend = !eintrag.end;
    }
    if (eintrag?.end) {
      this.state.arbeitsEnd = new Date(`${today}T${eintrag.end}:00`);
      this.state.laufend = false;
    }
    if (eintrag?._pauseAktiv) {
      this.state.aktuellesPause = {
        start: new Date(eintrag._pauseAktiv),
        id: eintrag._pauseAktivId
      };
      this.state.pauseLaufend = true;
    }
    this.startTicker();
    this.renderTimerUI();
  },

  // ─── Arbeitszeit ──────────────────────────────────────────────────────────
  arbeitsStart() {
    const now = new Date();
    const today = DB.todayStr();
    this.state.arbeitsStart = now;
    this.state.laufend = true;
    this.state.arbeitsEnd = null;
    DB.saveEintrag(today, { start: DB.dateToTimeStr(now), end: null });
    this.renderTimerUI();
    App.showToast('Arbeitszeit gestartet ✓', 'success');
  },

  arbeitsEnde() {
    if (!this.state.laufend) return;
    if (this.state.pauseLaufend) this.pauseEnde();
    const now = new Date();
    const today = DB.todayStr();
    this.state.arbeitsEnd = now;
    this.state.laufend = false;
    DB.saveEintrag(today, { end: DB.dateToTimeStr(now) });
    this.renderTimerUI();
    App.showToast('Arbeitszeit gestoppt ✓', 'success');
    App.renderTagesansicht(today);
  },

  // ─── Pause mit Sekundenkorrektur ──────────────────────────────────────────
  pauseStart() {
    if (!this.state.laufend || this.state.pauseLaufend) return;
    const settings = DB.getSettings();
    const now = new Date();
    const korrektur = settings.pauseStartKorrekturSek || 0;
    // Korrigiertes Datum für Anzeige/Speicherung, aber echtes Date für Differenzberechnung
    const korrigiertesDate = new Date(now.getTime() + korrektur * 1000);
    const id = Date.now();

    this.state.aktuellesPause = { start: korrigiertesDate, id };
    this.state.pauseLaufend = true;

    const eintraege = DB.getEintraege();
    const today = DB.todayStr();
    if (!eintraege[today]) eintraege[today] = { dateStr: today };
    eintraege[today]._pauseAktiv = korrigiertesDate.toISOString();
    eintraege[today]._pauseAktivId = id;
    eintraege[today]._pauseStartKorrektur = korrektur;
    localStorage.setItem(DB.KEYS.EINTRAEGE, JSON.stringify(eintraege));

    this.renderTimerUI();
    const korrekturText = korrektur !== 0
      ? ` (${korrektur > 0 ? '+' : ''}${korrektur}s Korrektur)`
      : '';
    App.showToast(`Pause gestartet${korrekturText}`, 'info');
  },

  pauseEnde() {
    if (!this.state.pauseLaufend || !this.state.aktuellesPause) return;
    const settings = DB.getSettings();
    const today = DB.todayStr();
    const endeKorrektur = settings.pauseEndeKorrekturSek || 0;
    const now = new Date();
    const korrigiertesEnde = new Date(now.getTime() + endeKorrektur * 1000);

    const start = this.state.aktuellesPause.start;
    // Dauer in Minuten (gerundet), basierend auf korrigierten Zeiten
    const dauerMs = korrigiertesEnde - start;
    const dauer = Math.max(0, Math.round(dauerMs / 60000));

    const startStr = DB.dateToTimeStr(start);
    const endStr = DB.dateToTimeStr(korrigiertesEnde);

    // Korrektur-Info speichern
    const eintraege = DB.getEintraege();
    const startKorrektur = eintraege[today]?._pauseStartKorrektur || 0;

    DB.addPause(today, {
      start: startStr,
      end: endStr,
      dauer,
      korrekturStart: startKorrektur,
      korrekturEnde: endeKorrektur
    });

    if (eintraege[today]) {
      delete eintraege[today]._pauseAktiv;
      delete eintraege[today]._pauseAktivId;
      delete eintraege[today]._pauseStartKorrektur;
    }
    localStorage.setItem(DB.KEYS.EINTRAEGE, JSON.stringify(eintraege));

    this.state.aktuellesPause = null;
    this.state.pauseLaufend = false;

    this.renderTimerUI();
    const korrekturText = endeKorrektur !== 0
      ? ` (${endeKorrektur > 0 ? '+' : ''}${endeKorrektur}s)` : '';
    App.showToast(`Pause beendet: ${dauer} Min${korrekturText} ✓`, 'success');
    App.renderPausenListe(today);
  },

  // ─── Live Ticker ──────────────────────────────────────────────────────────
  startTicker() {
    if (this._ticker) clearInterval(this._ticker);
    this._ticker = setInterval(() => {
      if (this.state.laufend || this.state.pauseLaufend) this.updateLiveDauer();
    }, 1000);
  },

  updateLiveDauer() {
    const now = new Date();
    const today = DB.todayStr();
    const eintrag = DB.getEintrag(today);

    if (this.state.laufend && this.state.arbeitsStart) {
      const brutto = Math.floor((now - this.state.arbeitsStart) / 60000);
      const pausen = (eintrag?.pausen || []).reduce((s, p) => s + (p.dauer || 0), 0);
      const pauseLaufendDauer = this.state.pauseLaufend && this.state.aktuellesPause
        ? Math.floor((now - this.state.aktuellesPause.start) / 60000) : 0;
      const netto = brutto - pausen - pauseLaufendDauer;

      const el = document.getElementById('live-arbeitszeit');
      if (el) el.textContent = DB.formatDuration(netto);

      if (this.state.pauseLaufend) {
        const pauseEl = document.getElementById('live-pause-dauer');
        if (pauseEl) pauseEl.textContent = DB.formatDuration(pauseLaufendDauer);
      }
    }
  },

  // ─── Render ───────────────────────────────────────────────────────────────
  renderTimerUI() {
    const container = document.getElementById('timer-section');
    if (!container) return;

    const today = DB.todayStr();
    const eintrag = DB.getEintrag(today);
    const settings = DB.getSettings();
    const soll = DB.getSollMinuten(today, settings);
    const istMin = eintrag ? DB.calcArbeitszeit(eintrag) : null;
    const diff = istMin !== null ? istMin - soll : null;
    const feiertag = window.Feiertage.isFeiertag(today, new Date().getFullYear());
    const urlaub = DB.isUrlaub(today);

    const wochentage = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
    const heute = new Date();
    const datum = heute.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });

    let statusBadge = '';
    if (feiertag)                statusBadge = `<span class="badge badge-holiday">🎉 ${feiertag}</span>`;
    else if (urlaub)             statusBadge = `<span class="badge badge-vacation">🏖 Urlaub</span>`;
    else if (this.state.pauseLaufend) statusBadge = `<span class="badge badge-pause">⏸ Pause läuft</span>`;
    else if (this.state.laufend) statusBadge = `<span class="badge badge-running">● Läuft</span>`;
    else if (eintrag?.end)       statusBadge = `<span class="badge badge-done">✓ Abgeschlossen</span>`;

    let diffHtml = '';
    if (diff !== null && soll > 0) {
      diffHtml = `<div class="diff-indicator ${diff >= 0 ? 'positive' : 'negative'}">${DB.formatDuration(diff, true)}</div>`;
    }

    // Kommentar des heutigen Tages
    const kommentarHtml = eintrag?.kommentar
      ? `<div class="timer-kommentar"><span>💬</span><span>${eintrag.kommentar}</span></div>` : '';

    container.innerHTML = `
      <div class="timer-card">
        <div class="timer-header">
          <div class="timer-date">
            <span class="timer-weekday">${wochentage[heute.getDay()]}</span>
            <span class="timer-datum">${datum}</span>
          </div>
          ${statusBadge}
        </div>

        <div class="timer-zeiten">
          <div class="zeit-block">
            <span class="zeit-label">Beginn</span>
            <span class="zeit-wert">${eintrag?.start || '--:--'}</span>
          </div>
          <div class="zeit-block">
            <span class="zeit-label">Ende</span>
            <span class="zeit-wert">${eintrag?.end || '--:--'}</span>
          </div>
          <div class="zeit-block">
            <span class="zeit-label">Pause</span>
            <span class="zeit-wert">${DB.formatDuration((eintrag?.pausen||[]).reduce((s,p)=>s+(p.dauer||0),0))}</span>
          </div>
          <div class="zeit-block highlight">
            <span class="zeit-label">Arbeitszeit</span>
            <span class="zeit-wert" id="live-arbeitszeit">${istMin !== null ? DB.formatDuration(istMin) : '--:--'}</span>
          </div>
        </div>

        <div class="soll-bar-container">
          <div class="soll-bar-labels">
            <span>Soll: ${DB.formatDuration(soll)}</span>
            ${diffHtml}
          </div>
          ${soll > 0 ? `
          <div class="soll-bar">
            <div class="soll-bar-fill ${diff !== null && diff >= 0 ? 'over' : ''}"
                 style="width: ${istMin !== null ? Math.min(100, Math.round(istMin/soll*100)) : 0}%"></div>
          </div>` : ''}
        </div>

        ${kommentarHtml}

        <div class="timer-buttons">
          ${this.renderButtons(eintrag, feiertag, urlaub, soll)}
        </div>
      </div>

      ${this.state.pauseLaufend ? `
      <div class="pause-laufend-card">
        <div class="pause-laufend-info">
          <span class="pulse-dot"></span>
          <span>Pause seit ${eintrag?._pauseAktiv
            ? new Date(eintrag._pauseAktiv).toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'})
            : '--:--'}</span>
        </div>
        <span class="pause-live" id="live-pause-dauer">0:00h</span>
      </div>` : ''}
    `;
  },

  renderButtons(eintrag, feiertag, urlaub, soll) {
    if (feiertag || urlaub || soll === 0) {
      return `<p class="no-work-hint">${feiertag ? 'Feiertag' : (urlaub ? 'Urlaubstag' : 'Kein Arbeitstag')}</p>`;
    }
    if (!this.state.laufend && !eintrag?.end) {
      return `<button class="btn-primary btn-lg" onclick="Timer.arbeitsStart()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        Arbeit starten</button>`;
    }
    if (this.state.laufend) {
      return `<div class="btn-row">
        ${!this.state.pauseLaufend
          ? `<button class="btn-secondary" onclick="Timer.pauseStart()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              Pause</button>`
          : `<button class="btn-pause-end" onclick="Timer.pauseEnde()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              Pause beenden</button>`}
        <button class="btn-danger" onclick="Timer.arbeitsEnde()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16"/></svg>
          Beenden</button>
      </div>`;
    }
    if (eintrag?.end) {
      return `<button class="btn-outline btn-sm" onclick="App.openEditModal('${DB.todayStr()}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Eintrag bearbeiten</button>`;
    }
    return '';
  }
};

window.Timer = Timer;
