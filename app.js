// App Controller v2.1
const App = {
  init() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(console.error);
    Timer.init();
    Calendar.init();
    Zeitkonto.render();
    Settings._page = 'main';
    this.switchTab('today');
    Notifications.init();
    this.renderHeutePausen(DB.todayStr());
  },

  switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${tab}`)?.classList.add('active');
    if (tab === 'calendar')   { Calendar.selectedDate = null; Calendar.render(); }
    if (tab === 'zeitkonto')    Zeitkonto.render();
    if (tab === 'settings')     Settings.render();
    if (tab === 'today')      { Timer.render(); this.renderHeutePausen(DB.todayStr()); }
  },

  // ─── Heute: Pausen-Liste ─────────────────────────────────────────────────
  renderHeutePausen(dateStr) {
    const el = document.getElementById('tages-pausen');
    if (!el) return;
    const e = DB.getEintrag(dateStr) || {};
    const pausen = [...(e.pausen || [])].sort((a, b) => b.id - a.id);
    if (!pausen.length) { el.innerHTML = '<p class="no-data">Keine Pausen heute</p>'; return; }
    const total = pausen.reduce((a, p) => a + (p.dauer || 0), 0);
    el.innerHTML = pausen.map(p => {
      const sec = (p.dauerSek !== undefined) ? p.dauerSek % 60 : 0;
      const minStr = `${p.dauer}:${String(sec).padStart(2,'0')} min`;
      return `<div class="pause-item">
        <div class="pause-info"><span class="pause-time">${p.start} – ${p.end}</span></div>
        <span class="pause-dauer">${minStr}</span>
      </div>`;
    }).join('') +
    `<div class="pause-summe">Gesamt: ${DB.formatDuration(total)}</div>`;
  },

  // ─── Kalender Tag öffnen ─────────────────────────────────────────────────
  openKalenderTag(dateStr) {
    App.switchTab('calendar');
    setTimeout(() => Calendar.selectDay(dateStr), 80);
  },

  // ─── Zeit-Edit mit Drum ──────────────────────────────────────────────────
  editZeit(dateStr, field) {
    const e = DB.getEintrag(dateStr) || {};
    const label = field === 'start' ? 'Arbeitsbeginn' : 'Arbeitsende';
    document.getElementById('ez-title').textContent = `${label} bearbeiten`;
    document.getElementById('ez-date').value  = dateStr;
    document.getElementById('ez-field').value = field;
    const cur = e[field] || (field === 'start' ? '08:00' : '17:00');
    document.getElementById('ez-drum-wrap').innerHTML = Drum.htmlTime('ezTime', cur);
    document.getElementById('edit-zeit-modal').classList.add('open');
    requestAnimationFrame(() => Drum.initAll(document.getElementById('ez-drum-wrap')));
  },

  saveZeit() {
    const dateStr = document.getElementById('ez-date').value;
    const field   = document.getElementById('ez-field').value;
    const timeStr = Drum.getTime('ezTime');
    DB.saveEintrag(dateStr, { [field]: timeStr });
    this.closeModal('edit-zeit-modal');
    App.showToast('Gespeichert ✓', 'success');
    Calendar.selectedDate = dateStr; Calendar.render();
    if (dateStr === DB.todayStr()) Timer.render();
  },

  editSoll(dateStr) {
    if (!confirm(`Sollzeit für ${DB.formatDateDE(dateStr)} anpassen?`)) return;
    const e = DB.getEintrag(dateStr) || {};
    const s = DB.getSettings();
    const cur = typeof e.sollOverrideMinuten === 'number' ? e.sollOverrideMinuten : DB.getSollMinuten(dateStr, s);
    document.getElementById('es-date').value = dateStr;
    document.getElementById('es-drum-wrap').innerHTML = Drum.html('esSoll', cur, { maxH: 24 });
    document.getElementById('edit-soll-modal').classList.add('open');
    requestAnimationFrame(() => Drum.initAll(document.getElementById('es-drum-wrap')));
  },

  saveSoll() {
    const dateStr = document.getElementById('es-date').value;
    DB.saveEintrag(dateStr, { sollOverrideMinuten: Drum.getMinutes('esSoll') });
    this.closeModal('edit-soll-modal');
    App.showToast('Sollzeit gespeichert ✓', 'success');
    Calendar.selectedDate = dateStr; Calendar.render();
  },

  editKommentar(dateStr) {
    const e = DB.getEintrag(dateStr) || {};
    document.getElementById('ek-date').value = dateStr;
    document.getElementById('ek-kommentar').value = e.kommentar || '';
    document.querySelectorAll('.quick-tag').forEach(b => b.classList.toggle('active', b.dataset.tag === e.kommentar));
    document.getElementById('edit-kommentar-modal').classList.add('open');
  },

  saveKommentar() {
    const dateStr = document.getElementById('ek-date').value;
    DB.saveEintrag(dateStr, { kommentar: document.getElementById('ek-kommentar').value.trim() });
    this.closeModal('edit-kommentar-modal');
    App.showToast('Gespeichert ✓', 'success');
    Calendar.selectedDate = dateStr; Calendar.render();
    if (dateStr === DB.todayStr()) Timer.render();
  },

  setQuickKommentar(tag, btn) {
    const inp = document.getElementById('ek-kommentar');
    document.querySelectorAll('.quick-tag').forEach(b => b.classList.remove('active'));
    inp.value = inp.value === tag ? '' : tag;
    if (inp.value) btn.classList.add('active');
  },

  editPausenDetail(dateStr) {
    document.getElementById('ep-date').value = dateStr;
    this._renderPausenModalList(dateStr);
    document.getElementById('edit-pausen-modal').classList.add('open');
  },

  _renderPausenModalList(dateStr) {
    const el = document.getElementById('ep-pausen-list');
    if (!el) return;
    const e = DB.getEintrag(dateStr) || {};
    const pausen = [...(e.pausen || [])].sort((a, b) => b.id - a.id);
    if (!pausen.length) { el.innerHTML = '<p class="no-data">Keine Pausen</p>'; return; }
    el.innerHTML = pausen.map(p => {
      const sec = (p.dauerSek !== undefined) ? p.dauerSek % 60 : 0;
      return `<div class="pause-item">
        <div class="pause-info"><span class="pause-time">${p.start} – ${p.end}</span></div>
        <span class="pause-dauer">${p.dauer}:${String(sec).padStart(2,'0')} min</span>
        <div class="pause-actions">
          <button class="icon-btn danger" onclick="App.deletePauseFromModal('${dateStr}',${p.id})">🗑</button>
        </div>
      </div>`;
    }).join('');
  },

  deletePauseFromModal(dateStr, id) {
    if (!confirm('Pause löschen?')) return;
    DB.deletePause(dateStr, id);
    this._renderPausenModalList(dateStr);
    Calendar.selectedDate = dateStr; Calendar.render();
    if (dateStr === DB.todayStr()) { Timer.render(); this.renderHeutePausen(dateStr); }
  },

  addPauseFromModal() {
    const dateStr = document.getElementById('ep-date').value;
    const start = document.getElementById('ep-start').value;
    const end   = document.getElementById('ep-end').value;
    if (!start || !end) { App.showToast('Bitte Start und Ende eingeben', 'error'); return; }
    const sm = DB.timeToMinutes(start), em = DB.timeToMinutes(end);
    if (em <= sm) { App.showToast('Ende muss nach Start liegen', 'error'); return; }
    DB.addPause(dateStr, { start, end, dauer: em - sm });
    document.getElementById('ep-start').value = '';
    document.getElementById('ep-end').value = '';
    this._renderPausenModalList(dateStr);
    Calendar.selectedDate = dateStr; Calendar.render();
    if (dateStr === DB.todayStr()) { Timer.render(); this.renderHeutePausen(dateStr); }
    App.showToast('Pause gespeichert ✓', 'success');
  },

  // ─── Entnahmen – kein Konto-Auswahl, +/- Vorzeichen, Tags ───────────────
  _entnahmeSign: 1,  // 1 = Abzug (default), -1 = Gutschrift

  openEntnahmeNeu(dateStr) { this._openEntnahmeModal(null, dateStr); },
  openEntnahmeEdit(id) {
    const en = DB.getEntnahmen().find(e => e.id === id);
    this._openEntnahmeModal(en);
  },

  _openEntnahmeModal(existing, defaultDate) {
    const modal = document.getElementById('entnahme-modal');
    document.getElementById('en-id').value    = existing?.id || '';
    document.getElementById('en-datum').value = existing?.datum || defaultDate || DB.todayStr();
    document.getElementById('en-grund').value = existing?.grund || '';
    document.getElementById('en-modal-title').textContent = existing ? 'Buchung bearbeiten' : 'Neue Zeitkonto-Buchung';

    // Vorzeichen: betragMin negativ = Gutschrift
    const isGutschrift = existing ? (existing.betragMin < 0) : false;
    this._entnahmeSign = isGutschrift ? -1 : 1;
    this._updateEntnahmeSign();

    // Tags
    document.querySelectorAll('.en-tag').forEach(b => b.classList.toggle('active', b.dataset.tag === (existing?.buchungstyp || '')));

    const betrag = existing ? Math.abs(existing.betragMin) : 0;
    document.getElementById('en-drum-wrap').innerHTML = Drum.html('enBetrag', betrag, { maxH: 999 });
    modal.classList.add('open');
    requestAnimationFrame(() => Drum.initAll(document.getElementById('en-drum-wrap')));
  },

  _updateEntnahmeSign() {
    document.getElementById('en-sign-minus')?.classList.toggle('active', this._entnahmeSign === 1);
    document.getElementById('en-sign-plus')?.classList.toggle('active', this._entnahmeSign === -1);
  },

  setEntnahmeSign(sign) {
    this._entnahmeSign = sign;
    this._updateEntnahmeSign();
  },

  setEntnahmeTag(tag, btn) {
    document.querySelectorAll('.en-tag').forEach(b => b.classList.remove('active'));
    const inp = document.getElementById('en-grund');
    if (inp.dataset.lastTag === tag) { inp.dataset.lastTag = ''; }
    else { inp.value = inp.value || tag; btn.classList.add('active'); inp.dataset.lastTag = tag; }
  },

  saveEntnahme() {
    const id      = document.getElementById('en-id').value;
    const datum   = document.getElementById('en-datum').value;
    const grund   = document.getElementById('en-grund').value.trim();
    const buchungstyp = document.querySelector('.en-tag.active')?.dataset.tag || '';
    const absBetrag = Drum.getMinutes('enBetrag');
    const betragMin = this._entnahmeSign * absBetrag;  // negativ = Gutschrift

    if (!datum) { App.showToast('Datum fehlt', 'error'); return; }
    if (absBetrag <= 0) { App.showToast('Betrag muss > 0 sein', 'error'); return; }

    if (id) DB.updateEntnahme(parseInt(id), { datum, betragMin, grund, buchungstyp });
    else    DB.addEntnahme({ datum, betragMin, grund, buchungstyp });

    this.closeModal('entnahme-modal');
    App.showToast('Buchung gespeichert ✓', 'success');
    Zeitkonto.render();
    if (Calendar.selectedDate) Calendar.render();
  },

  // ─── Auswertungen ────────────────────────────────────────────────────────
  openAuswertungen() {
    document.getElementById('au-modal').classList.add('open');
    this.setAuswertungRange('month');
  },

  setAuswertungRange(preset) {
    const now = new Date(); const today = DB.todayStr();
    let von, bis;
    const pad = n => String(n).padStart(2, '0');
    if      (preset === 'today')     { von = bis = today; }
    else if (preset === 'yesterday') { von = bis = DB.dateAdd(today, -1); }
    else if (preset === 'week')      { const d = new Date(); d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1)); von = DB.dateToStr(d); bis = today; }
    else if (preset === 'month')     { von = `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`; bis = today; }
    else if (preset === 'lastmonth') { const lm = new Date(now.getFullYear(), now.getMonth()-1, 1); const last = new Date(now.getFullYear(), now.getMonth(), 0); von = DB.dateToStr(lm); bis = DB.dateToStr(last); }
    else if (preset === 'year')      { von = `${now.getFullYear()}-01-01`; bis = today; }
    else if (preset === 'lastyear')  { von = `${now.getFullYear()-1}-01-01`; bis = `${now.getFullYear()-1}-12-31`; }
    document.getElementById('au-von').value = von;
    document.getElementById('au-bis').value = bis;
    document.querySelectorAll('.au-preset').forEach(b => b.classList.toggle('active', b.dataset.p === preset));
  },

  doExportCSV() {
    DB.exportCSV(document.getElementById('au-von').value, document.getElementById('au-bis').value);
    App.showToast('CSV exportiert ✓', 'success');
  },

  doExportPDF() {
    this.generatePDF(document.getElementById('au-von').value, document.getElementById('au-bis').value);
  },

  generatePDF(von, bis) {
    const all = DB.getEintraege(); const s = DB.getSettings();
    const wt = ['So','Mo','Di','Mi','Do','Fr','Sa'];
    let rows = [], totalIst = 0, totalSoll = 0;
    let cur = new Date((von||'2024-01-01')+'T12:00:00');
    const end = new Date((bis||DB.todayStr())+'T12:00:00');
    while (cur <= end) {
      const ds = DB.dateToStr(cur); const e = all[ds]||{};
      const ist  = e.start&&e.end ? DB.calcArbeitszeit(e) : null;
      const soll = DB.getSollMinuten(ds, s);
      const diff = ist !== null ? ist - soll : null;
      const pausen = (e.pausen||[]).reduce((a,p)=>a+(p.dauer||0),0);
      if (ist !== null) totalIst += ist;
      totalSoll += soll;
      rows.push({ds,dow:wt[cur.getDay()],start:e.start||'',end:e.end||'',pausen,ist,soll,diff,typ:e.tagTyp||window.Feiertage.isFeiertag(ds,cur.getFullYear())||'',kommentar:e.kommentar||''});
      cur.setDate(cur.getDate()+1);
    }
    const totalDiff = totalIst - totalSoll;
    const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
      <title>Zeiterfassung ${von}–${bis}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:11px;margin:20px;color:#1a2e21}
        h1{font-size:15px;color:#4a7c59;margin-bottom:4px}
        .sub{font-size:10px;color:#6a8a72;margin-bottom:12px}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th{background:#4a7c59;color:white;padding:5px 4px;text-align:left;font-size:10px}
        td{padding:4px;border-bottom:1px solid #e0e8e2;font-size:10px}
        tr:nth-child(even){background:#f5f7f5}
        .pos{color:#2e7d32;font-weight:700} .neg{color:#c62828;font-weight:700}
        .we{color:#9e9e9e} .sp{background:#e8f5e9}
        tfoot td{font-weight:700;background:#e8f5e9;border-top:2px solid #4a7c59}
        @media print{body{margin:8px}}
      </style></head><body>
      <h1>Zeiterfassung Pro</h1>
      <div class="sub">${DB.formatDateDE(von)} – ${DB.formatDateDE(bis)}</div>
      <table><thead><tr>
        <th>Datum</th><th>Tag</th><th>Beginn</th><th>Ende</th>
        <th>Pausen</th><th>Ist</th><th>Soll</th><th>Diff</th><th>Typ</th><th>Kommentar</th>
      </tr></thead><tbody>
      ${rows.map(r=>`<tr class="${r.dow==='Sa'||r.dow==='So'?'we':''} ${r.typ?'sp':''}">
        <td>${DB.formatDateDE(r.ds)}</td><td>${r.dow}</td>
        <td>${r.start}</td><td>${r.end}</td>
        <td>${r.pausen?r.pausen+' Min':''}</td>
        <td>${r.ist!==null?DB.formatDuration(r.ist):''}</td>
        <td>${DB.formatDuration(r.soll)}</td>
        <td class="${r.diff!==null?(r.diff>=0?'pos':'neg'):''}">${r.diff!==null?DB.formatDuration(r.diff,true):''}</td>
        <td>${r.typ}</td><td>${r.kommentar}</td>
      </tr>`).join('')}
      </tbody><tfoot><tr>
        <td colspan="5">Gesamt</td>
        <td>${DB.formatDuration(totalIst)}</td>
        <td>${DB.formatDuration(totalSoll)}</td>
        <td class="${totalDiff>=0?'pos':'neg'}">${DB.formatDuration(totalDiff,true)}</td>
        <td colspan="2"></td>
      </tr></tfoot></table>
      <script>window.onload=()=>window.print();<\/script></body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html); w.document.close();
  },

  // ─── Modal / Toast ───────────────────────────────────────────────────────
  openModal(id)   { document.getElementById(id)?.classList.add('open'); },
  closeModal(id)  { document.getElementById(id)?.classList.remove('open'); },

  showToast(msg, type = 'info') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`; t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
  }
};

const Notifications = {
  async init() {
    const s = DB.getSettings();
    if (s.pushNotifications && 'Notification' in window && Notification.permission === 'granted') this._schedule();
  },
  async requestPermission() {
    if (!('Notification' in window)) { App.showToast('Nicht unterstützt', 'error'); return; }
    const p = await Notification.requestPermission();
    if (p === 'granted') { App.showToast('Benachrichtigungen aktiv ✓', 'success'); this._schedule(); }
    else App.showToast('Benachrichtigungen abgelehnt', 'error');
  },
  _schedule() {
    const s = DB.getSettings();
    setInterval(() => {
      const now = new Date();
      const ts  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      const today = DB.todayStr(); const e = DB.getEintrag(today);
      if (s.startErinnerung === ts && !e?.start) new Notification('Zeiterfassung', { body: '⏰ Arbeitszeit starten?', icon: 'icon-192.png' });
      if (s.endeErinnerung  === ts && e?.start && !e?.end) new Notification('Zeiterfassung', { body: '🔔 Arbeitstag beenden?', icon: 'icon-192.png' });
    }, 60000);
  }
};

window.App = App;
window.Notifications = Notifications;
document.addEventListener('DOMContentLoaded', () => App.init());
