// Kalender & Wochenansicht Modul
const Calendar = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(), // 0-based
  view: 'month', // 'month' | 'week'
  currentWeekStart: null,

  init() {
    this.currentWeekStart = this.getWeekStart(new Date());
    this.render();
  },

  getWeekStart(date) {
    const d = new Date(date);
    const dow = d.getDay();
    const diff = dow === 0 ? -6 : 1 - dow; // Montag als Start
    d.setDate(d.getDate() + diff);
    d.setHours(0,0,0,0);
    return d;
  },

  prevPeriod() {
    if (this.view === 'month') {
      this.currentMonth--;
      if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
    } else {
      this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    }
    this.render();
  },

  nextPeriod() {
    if (this.view === 'month') {
      this.currentMonth++;
      if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
    } else {
      this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    }
    this.render();
  },

  goToToday() {
    this.currentYear = new Date().getFullYear();
    this.currentMonth = new Date().getMonth();
    this.currentWeekStart = this.getWeekStart(new Date());
    this.render();
  },

  switchView(view) {
    this.view = view;
    document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.view-tab[data-view="${view}"]`)?.classList.add('active');
    this.render();
  },

  render() {
    const container = document.getElementById('calendar-container');
    if (!container) return;

    const monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

    if (this.view === 'month') {
      this.renderMonthHeader(monthNames);
      container.innerHTML = this.buildMonthGrid();
    } else {
      this.renderWeekHeader();
      container.innerHTML = this.buildWeekGrid();
    }
  },

  renderMonthHeader(monthNames) {
    const el = document.getElementById('cal-period-label');
    if (el) el.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
  },

  renderWeekHeader() {
    const el = document.getElementById('cal-period-label');
    if (!el) return;
    const end = new Date(this.currentWeekStart);
    end.setDate(end.getDate() + 6);
    el.textContent = `KW ${this.getKW(this.currentWeekStart)} · ${this.currentWeekStart.toLocaleDateString('de-DE',{day:'2-digit',month:'short'})} – ${end.toLocaleDateString('de-DE',{day:'2-digit',month:'short',year:'numeric'})}`;
  },

  getKW(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  },

  buildMonthGrid() {
    const today = DB.todayStr();
    const settings = DB.getSettings();
    const eintraege = DB.getEintraege();
    const urlaub = DB.getUrlaub();
    const entnahmenRaw = DB.getEntnahmen();
    const entnahmenMap = {};
    entnahmenRaw.forEach(e => { if (!entnahmenMap[e.datum]) entnahmenMap[e.datum] = []; entnahmenMap[e.datum].push(e); });
    const year = this.currentYear;
    const month = this.currentMonth;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    let html = '<div class="cal-grid">';
    const dayNames = ['Mo','Di','Mi','Do','Fr','Sa','So'];
    dayNames.forEach(d => html += `<div class="cal-header-cell">${d}</div>`);

    // Leere Zellen vor dem 1.
    for (let i = 0; i < startDow; i++) html += '<div class="cal-cell empty"></div>';

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const date = new Date(year, month, day);
      const dow = date.getDay();
      const isToday = dateStr === today;
      const isFuture = dateStr > today;
      const feiertag = window.Feiertage.isFeiertag(dateStr, year);
      const isUrlaub = urlaub[dateStr];
      const eintrag = eintraege[dateStr];
      const soll = DB.getSollMinuten(dateStr, settings);
      const ist = eintrag ? DB.calcArbeitszeit(eintrag) : null;
      const diff = (ist !== null && soll > 0) ? ist - soll : null;

      let classes = ['cal-cell'];
      if (isToday) classes.push('today');
      if (isFuture) classes.push('future');
      if (dow === 0 || dow === 6) classes.push('weekend');
      if (feiertag) classes.push('feiertag');
      if (isUrlaub) classes.push('urlaub');

      let statusDot = '';
      if (!isFuture && soll > 0 && !feiertag && !isUrlaub) {
        if (ist !== null) {
          const cls = diff >= 0 ? 'dot-ok' : 'dot-minus';
          statusDot = `<span class="status-dot ${cls}"></span>`;
        } else {
          statusDot = `<span class="status-dot dot-missing"></span>`;
        }
      }

      let diffTag = '';
      if (diff !== null && !isFuture) {
        diffTag = `<span class="cal-diff ${diff >= 0 ? 'pos' : 'neg'}">${DB.formatDuration(diff, true)}</span>`;
      }

      html += `
        <div class="${classes.join(' ')}" onclick="App.selectDay('${dateStr}')">
          <div class="cal-day-num">${day}${statusDot}</div>
          ${feiertag ? `<span class="cal-label holiday">${feiertag.substring(0,8)}</span>` : ''}
          ${isUrlaub ? `<span class="cal-label vacation">Urlaub</span>` : ''}
          ${eintrag?.start ? `<span class="cal-label time">${eintrag.start}${eintrag.end ? '–'+eintrag.end : ''}</span>` : ''}
          ${diffTag}
          ${entnahmenMap[dateStr] ? `<span class="cal-label entnahme">↓${DB.formatDuration(entnahmenMap[dateStr].reduce((s,e)=>s+e.betragMin,0))}</span>` : ''}
        </div>`;
    }

    html += '</div>';

    // Monats-Zusammenfassung
    html += this.buildMonthSummary(year, month);

    return html;
  },

  buildMonthSummary(year, month) {
    const settings = DB.getSettings();
    const eintraege = DB.getEintraege();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let gesamtIst = 0, gesamtSoll = 0, tageErfasst = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const soll = DB.getSollMinuten(dateStr, settings);
      const eintrag = eintraege[dateStr];
      const ist = eintrag ? DB.calcArbeitszeit(eintrag) : null;
      gesamtSoll += soll;
      if (ist !== null) { gesamtIst += ist; tageErfasst++; }
    }

    const diff = gesamtIst - gesamtSoll;
    const ueberstunden = DB.getUeberstunden();

    return `
      <div class="month-summary">
        <div class="summary-item">
          <span class="summary-label">Ist Gesamt</span>
          <span class="summary-value">${DB.formatDuration(gesamtIst)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Soll Gesamt</span>
          <span class="summary-value">${DB.formatDuration(gesamtSoll)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Monatsdiff.</span>
          <span class="summary-value ${diff >= 0 ? 'pos' : 'neg'}">${DB.formatDuration(diff, true)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Tage erfasst</span>
          <span class="summary-value">${tageErfasst}</span>
        </div>
      </div>
      <div class="ueberstunden-konten">
        <div class="konto-card">
          <div class="konto-label">Überstunden-Sockel</div>
          <div class="konto-bar-wrap">
            <div class="konto-bar" style="width: ${Math.min(100, Math.round(ueberstunden.sockelSaldo / ueberstunden.limit * 100))}%"></div>
          </div>
          <div class="konto-wert">${DB.formatDuration(ueberstunden.sockelSaldo)} / ${DB.formatDuration(ueberstunden.limit)}</div>
        </div>
        <div class="konto-card konto-card-2">
          <div class="konto-label">Über dem Sockel</div>
          <div class="konto-wert konto-wert-2">${DB.formatDuration(ueberstunden.ueberSockelSaldo)}</div>
        </div>
      </div>`;
  },

  buildWeekGrid() {
    const settings = DB.getSettings();
    const eintraege = DB.getEintraege();
    const today = DB.todayStr();
    const wochentage = ['Mo','Di','Mi','Do','Fr','Sa','So'];
    let gesamtIst = 0, gesamtSoll = 0;

    let html = '<div class="week-grid">';

    for (let i = 0; i < 7; i++) {
      const date = new Date(this.currentWeekStart);
      date.setDate(date.getDate() + i);
      const dateStr = DB.dateToStr(date);
      const isToday = dateStr === today;
      const dow = date.getDay();
      const year = date.getFullYear();
      const feiertag = window.Feiertage.isFeiertag(dateStr, year);
      const isUrlaub = DB.isUrlaub(dateStr);
      const eintrag = eintraege[dateStr];
      const soll = DB.getSollMinuten(dateStr, settings);
      const ist = eintrag ? DB.calcArbeitszeit(eintrag) : null;
      const diff = ist !== null ? ist - soll : null;
      const pausen = (eintrag?.pausen || []).reduce((s,p) => s + (p.dauer||0), 0);

      if (ist !== null) gesamtIst += ist;
      gesamtSoll += soll;

      let classes = ['week-row'];
      if (isToday) classes.push('today');
      if (dow === 0 || dow === 6) classes.push('weekend');
      if (feiertag) classes.push('feiertag');

      html += `
        <div class="${classes.join(' ')}" onclick="App.selectDay('${dateStr}')">
          <div class="week-dow">
            <span class="week-day-name">${wochentage[i]}</span>
            <span class="week-day-num ${isToday ? 'today-num' : ''}">${date.getDate()}</span>
          </div>
          <div class="week-zeiten">
            ${feiertag ? `<span class="week-special">${feiertag}</span>` :
              isUrlaub ? `<span class="week-special vacation">Urlaub</span>` :
              eintrag?.start ? `
                <span class="week-time">${eintrag.start} – ${eintrag.end || '...'}</span>
                ${pausen > 0 ? `<span class="week-pause">Pause: ${pausen}min</span>` : ''}
              ` : (soll > 0 ? '<span class="week-missing">Nicht erfasst</span>' : '<span class="week-nowork">–</span>')}
          </div>
          <div class="week-ist">
            ${ist !== null ? DB.formatDuration(ist) : (soll > 0 ? '--:--' : '–')}
          </div>
          <div class="week-diff ${diff !== null ? (diff >= 0 ? 'pos' : 'neg') : ''}">
            ${diff !== null ? DB.formatDuration(diff, true) : ''}
          </div>
        </div>`;
    }

    html += '</div>';

    const totalDiff = gesamtIst - gesamtSoll;
    html += `
      <div class="week-summary">
        <span>Ist: <strong>${DB.formatDuration(gesamtIst)}</strong></span>
        <span>Soll: <strong>${DB.formatDuration(gesamtSoll)}</strong></span>
        <span class="${totalDiff >= 0 ? 'pos' : 'neg'}">Diff: <strong>${DB.formatDuration(totalDiff, true)}</strong></span>
      </div>`;

    return html;
  }
};

window.Calendar = Calendar;
