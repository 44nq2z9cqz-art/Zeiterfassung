// App Controller v2.0
const App = {
  init() {
    if('serviceWorker' in navigator)
      navigator.serviceWorker.register('sw.js').catch(console.error);
    Timer.init();
    Calendar.init();
    Zeitkonto.render();
    Settings._page = 'main';
    this.switchTab('today');
    Notifications.init();
    this.renderHeutePausen(DB.todayStr());
  },

  // ─── Tabs ─────────────────────────────────────────────────────────────────
  switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
    document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
    document.getElementById(`tab-${tab}`)?.classList.add('active');
    if(tab==='calendar'){Calendar.selectedDate=null;Calendar.render();}
    if(tab==='zeitkonto') Zeitkonto.render();
    if(tab==='settings') Settings.render();
    if(tab==='today'){Timer.render();this.renderHeutePausen(DB.todayStr());}
  },

  // ─── Heute: Pausen-Liste ──────────────────────────────────────────────────
  renderHeutePausen(dateStr) {
    const el = document.getElementById('tages-pausen');
    if (!el) return;
    const e = DB.getEintrag(dateStr) || {};
    const pausen = [...(e.pausen||[])].sort((a,b)=>b.id-a.id); // jüngste zuerst
    if (!pausen.length) { el.innerHTML='<p class="no-data">Keine Pausen heute</p>'; return; }
    el.innerHTML = pausen.map(p=>`
      <div class="pause-item">
        <div class="pause-info">
          <span class="pause-time">${p.start} – ${p.end}</span>
        </div>
        <span class="pause-dauer">${p.dauer} Min</span>
      </div>`).join('');
  },

  // ─── Kalender Tag öffnen ─────────────────────────────────────────────────
  openKalenderTag(dateStr) {
    App.switchTab('calendar');
    setTimeout(()=>Calendar.selectDay(dateStr), 80);
  },

  // ─── Edit-Dialoge (Zeit, Soll, Kommentar, Pausen) ────────────────────────
  editZeit(dateStr, field) {
    const e = DB.getEintrag(dateStr)||{};
    const label = field==='start' ? 'Arbeitsbeginn' : 'Arbeitsende';
    const cur   = e[field] || '';
    const modal = document.getElementById('edit-zeit-modal');
    document.getElementById('ez-title').textContent = `${label} bearbeiten`;
    document.getElementById('ez-date').value  = dateStr;
    document.getElementById('ez-field').value = field;
    // Drum auf aktuellen Wert setzen
    const h = cur ? parseInt(cur.split(':')[0]) : 8;
    const m = cur ? parseInt(cur.split(':')[1]) : 0;
    document.getElementById('ez-drum-wrap').innerHTML = this._timeDrumHTML('ezTime', h, m);
    modal.classList.add('open');
    requestAnimationFrame(()=>Settings._initAllDrums());
  },

  _timeDrumHTML(id, h, m) {
    return `<div class="drum-picker" data-id="${id}">
      <div class="drum-col" data-col="h" data-val="${h}"><div class="drum-scroll" id="drum-${id}-h"></div></div>
      <div class="drum-sep">:</div>
      <div class="drum-col" data-col="m" data-val="${m}"><div class="drum-scroll" id="drum-${id}-m"></div></div>
      <div class="drum-unit">Uhr</div>
    </div>`;
  },

  saveZeit() {
    const dateStr = document.getElementById('ez-date').value;
    const field   = document.getElementById('ez-field').value;
    const val     = Settings._getDrum('ezTime');
    const timeStr = DB.minutesToTime(val);
    DB.saveEintrag(dateStr, { [field]: timeStr });
    this.closeModal('edit-zeit-modal');
    App.showToast('Gespeichert ✓','success');
    Calendar.selectedDate = dateStr; Calendar.render();
    if(dateStr===DB.todayStr()) Timer.render();
  },

  editSoll(dateStr) {
    if (!confirm(`Sollzeit für ${DB.formatDateDE(dateStr)} anpassen?`)) return;
    const e = DB.getEintrag(dateStr)||{};
    const s = DB.getSettings();
    const cur = typeof e.sollOverrideMinuten==='number' ? e.sollOverrideMinuten : DB.getSollMinuten(dateStr,s);
    const modal = document.getElementById('edit-soll-modal');
    document.getElementById('es-date').value = dateStr;
    document.getElementById('es-drum-wrap').innerHTML =
      `<div class="drum-picker" data-id="esSoll">
        <div class="drum-col" data-col="h" data-val="${Math.floor(cur/60)}"><div class="drum-scroll" id="drum-esSoll-h"></div></div>
        <div class="drum-sep">:</div>
        <div class="drum-col" data-col="m" data-val="${cur%60}"><div class="drum-scroll" id="drum-esSoll-m"></div></div>
        <div class="drum-unit">h&nbsp;min</div>
      </div>`;
    modal.classList.add('open');
    requestAnimationFrame(()=>Settings._initAllDrums());
  },

  saveSoll() {
    const dateStr = document.getElementById('es-date').value;
    const val = Settings._getDrum('esSoll');
    DB.saveEintrag(dateStr, { sollOverrideMinuten: val });
    this.closeModal('edit-soll-modal');
    App.showToast('Sollzeit gespeichert ✓','success');
    Calendar.selectedDate = dateStr; Calendar.render();
  },

  editKommentar(dateStr) {
    const e = DB.getEintrag(dateStr)||{};
    document.getElementById('ek-date').value = dateStr;
    document.getElementById('ek-kommentar').value = e.kommentar||'';
    document.querySelectorAll('.quick-tag').forEach(b=>b.classList.toggle('active',b.dataset.tag===e.kommentar));
    document.getElementById('edit-kommentar-modal').classList.add('open');
  },

  saveKommentar() {
    const dateStr = document.getElementById('ek-date').value;
    const val = document.getElementById('ek-kommentar').value.trim();
    DB.saveEintrag(dateStr, { kommentar: val });
    this.closeModal('edit-kommentar-modal');
    App.showToast('Kommentar gespeichert ✓','success');
    Calendar.selectedDate = dateStr; Calendar.render();
    if(dateStr===DB.todayStr()) Timer.render();
  },

  setQuickKommentar(tag, btn) {
    const inp = document.getElementById('ek-kommentar');
    document.querySelectorAll('.quick-tag').forEach(b=>b.classList.remove('active'));
    inp.value = inp.value===tag ? '' : tag;
    if(inp.value) btn.classList.add('active');
  },

  editPausenDetail(dateStr) {
    const e = DB.getEintrag(dateStr)||{};
    const modal = document.getElementById('edit-pausen-modal');
    document.getElementById('ep-date').value = dateStr;
    this._renderPausenModalList(dateStr);
    modal.classList.add('open');
  },

  _renderPausenModalList(dateStr) {
    const el = document.getElementById('ep-pausen-list');
    if (!el) return;
    const e = DB.getEintrag(dateStr)||{};
    const pausen = [...(e.pausen||[])].sort((a,b)=>b.id-a.id);
    if (!pausen.length){el.innerHTML='<p class="no-data">Keine Pausen</p>';return;}
    el.innerHTML = pausen.map(p=>`
      <div class="pause-item">
        <div class="pause-info"><span class="pause-time">${p.start} – ${p.end}</span></div>
        <span class="pause-dauer">${p.dauer} Min</span>
        <div class="pause-actions">
          <button class="icon-btn danger" onclick="App.deletePauseFromModal('${dateStr}',${p.id})">🗑</button>
        </div>
      </div>`).join('');
  },

  deletePauseFromModal(dateStr, id) {
    if (!confirm('Pause löschen?')) return;
    DB.deletePause(dateStr, id);
    this._renderPausenModalList(dateStr);
    Calendar.selectedDate = dateStr; Calendar.render();
    if(dateStr===DB.todayStr()){Timer.render();this.renderHeutePausen(dateStr);}
  },

  addPauseFromModal() {
    const dateStr = document.getElementById('ep-date').value;
    const start   = document.getElementById('ep-start').value;
    const end     = document.getElementById('ep-end').value;
    if(!start||!end){App.showToast('Bitte Start und Ende eingeben','error');return;}
    const sm=DB.timeToMinutes(start), em=DB.timeToMinutes(end);
    if(em<=sm){App.showToast('Ende muss nach Start liegen','error');return;}
    DB.addPause(dateStr,{start,end,dauer:em-sm});
    document.getElementById('ep-start').value='';
    document.getElementById('ep-end').value='';
    this._renderPausenModalList(dateStr);
    Calendar.selectedDate=dateStr;Calendar.render();
    if(dateStr===DB.todayStr()){Timer.render();this.renderHeutePausen(dateStr);}
    App.showToast('Pause gespeichert ✓','success');
  },

  // ─── Entnahmen ────────────────────────────────────────────────────────────
  openEntnahmeNeu(dateStr) {
    this._openEntnahmeModal(null, dateStr);
  },
  openEntnahmeEdit(id) {
    const en = DB.getEntnahmen().find(e=>e.id===id);
    this._openEntnahmeModal(en);
  },
  _openEntnahmeModal(existing, defaultDate) {
    const modal = document.getElementById('entnahme-modal');
    document.getElementById('en-id').value   = existing?.id || '';
    document.getElementById('en-datum').value= existing?.datum || defaultDate || DB.todayStr();
    document.getElementById('en-grund').value= existing?.grund || '';
    const konto = existing?.konto || 'sockel';
    document.querySelectorAll('.konto-tab').forEach(t=>t.classList.toggle('active',t.dataset.konto===konto));
    document.getElementById('en-konto').value = konto;
    document.getElementById('en-modal-title').textContent = existing ? 'Buchung bearbeiten' : 'Neue Kontobuchung';
    const betrag = existing?.betragMin || 0;
    document.getElementById('en-drum-wrap').innerHTML =
      `<div class="drum-picker" data-id="enBetrag">
        <div class="drum-col" data-col="h" data-val="${Math.floor(betrag/60)}"><div class="drum-scroll" id="drum-enBetrag-h"></div></div>
        <div class="drum-sep">:</div>
        <div class="drum-col" data-col="m" data-val="${betrag%60}"><div class="drum-scroll" id="drum-enBetrag-m"></div></div>
        <div class="drum-unit">h&nbsp;min</div>
      </div>`;
    modal.classList.add('open');
    requestAnimationFrame(()=>Settings._initAllDrums());
  },

  saveEntnahme() {
    const id      = document.getElementById('en-id').value;
    const datum   = document.getElementById('en-datum').value;
    const konto   = document.getElementById('en-konto').value;
    const grund   = document.getElementById('en-grund').value.trim();
    const betragMin = Settings._getDrum('enBetrag');
    if(!datum){App.showToast('Datum fehlt','error');return;}
    if(betragMin<=0){App.showToast('Betrag muss > 0 sein','error');return;}
    if(id) DB.updateEntnahme(parseInt(id),{datum,konto,betragMin,grund});
    else   DB.addEntnahme({datum,konto,betragMin,grund});
    this.closeModal('entnahme-modal');
    App.showToast('Buchung gespeichert ✓','success');
    Zeitkonto.refresh();
    Calendar.selectedDate && Calendar.render();
  },

  // ─── Auswertungen ─────────────────────────────────────────────────────────
  openAuswertungen() {
    const now = new Date(); const today = DB.todayStr();
    document.getElementById('au-modal').classList.add('open');
    this.setAuswertungRange('month');
  },

  setAuswertungRange(preset) {
    const now   = new Date(); const today = DB.todayStr();
    let von, bis;
    if(preset==='today')    { von=bis=today; }
    else if(preset==='yesterday'){ von=bis=DB.dateAdd(today,-1); }
    else if(preset==='week'){
      const d=new Date(); const dow=d.getDay()===0?6:d.getDay()-1;
      d.setDate(d.getDate()-dow); von=DB.dateToStr(d); bis=today;
    }
    else if(preset==='month')  { von=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`; bis=today; }
    else if(preset==='lastmonth'){
      const lm=new Date(now.getFullYear(),now.getMonth()-1,1);
      const last=new Date(now.getFullYear(),now.getMonth(),0);
      von=DB.dateToStr(lm); bis=DB.dateToStr(last);
    }
    else if(preset==='year')  { von=`${now.getFullYear()}-01-01`; bis=today; }
    else if(preset==='lastyear'){ von=`${now.getFullYear()-1}-01-01`; bis=`${now.getFullYear()-1}-12-31`; }
    document.getElementById('au-von').value = von;
    document.getElementById('au-bis').value = bis;
    document.querySelectorAll('.au-preset').forEach(b=>b.classList.toggle('active',b.dataset.p===preset));
  },

  doExportCSV() {
    const von=document.getElementById('au-von').value;
    const bis=document.getElementById('au-bis').value;
    DB.exportCSV(von,bis);
    App.showToast('CSV exportiert ✓','success');
  },

  doExportPDF() {
    const von=document.getElementById('au-von').value;
    const bis=document.getElementById('au-bis').value;
    this.generatePDF(von,bis);
  },

  generatePDF(von,bis) {
    const all=DB.getEintraege(); const s=DB.getSettings();
    const wt=['So','Mo','Di','Mi','Do','Fr','Sa'];
    let rows=[];
    let cur=new Date((von||'2024-01-01')+'T12:00:00');
    const end=new Date((bis||DB.todayStr())+'T12:00:00');
    while(cur<=end){
      const ds=DB.dateToStr(cur); const e=all[ds]||{};
      const ist=e.start&&e.end?DB.calcArbeitszeit(e):null;
      const soll=DB.getSollMinuten(ds,s);
      const diff=ist!==null?ist-soll:null;
      rows.push({ds,dow:wt[cur.getDay()],start:e.start||'',end:e.end||'',
        pausen:(e.pausen||[]).reduce((a,p)=>a+(p.dauer||0),0),
        ist,soll,diff,typ:e.tagTyp||window.Feiertage.isFeiertag(ds,cur.getFullYear())||'',
        kommentar:e.kommentar||''});
      cur.setDate(cur.getDate()+1);
    }
    // einfaches HTML-PDF über Print-Dialog
    const html=`<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
      <title>Zeiterfassung ${von}–${bis}</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:11px;margin:20px;}
        h1{font-size:16px;color:#4a7c59;}
        table{width:100%;border-collapse:collapse;margin-top:12px;}
        th{background:#4a7c59;color:white;padding:5px;text-align:left;}
        td{padding:4px;border-bottom:1px solid #e0e0e0;}
        tr:nth-child(even){background:#f5f5f5;}
        .pos{color:#2e7d32;} .neg{color:#c62828;}
        .weekend{color:#9e9e9e;} .special{background:#e8f5e9;}
        @media print{body{margin:0;}}
      </style></head><body>
      <h1>Zeiterfassung · ${DB.formatDateDE(von)} – ${DB.formatDateDE(bis)}</h1>
      <table><thead><tr>
        <th>Datum</th><th>Tag</th><th>Beginn</th><th>Ende</th>
        <th>Pause</th><th>Ist</th><th>Soll</th><th>Diff</th><th>Typ</th><th>Kommentar</th>
      </tr></thead><tbody>
      ${rows.map(r=>`<tr class="${r.dow==='Sa'||r.dow==='So'?'weekend':''} ${r.typ?'special':''}">
        <td>${DB.formatDateDE(r.ds)}</td><td>${r.dow}</td>
        <td>${r.start}</td><td>${r.end}</td>
        <td>${r.pausen?r.pausen+' Min':''}</td>
        <td>${r.ist!==null?DB.formatDuration(r.ist):''}</td>
        <td>${DB.formatDuration(r.soll)}</td>
        <td class="${r.diff!==null?(r.diff>=0?'pos':'neg'):''}">${r.diff!==null?DB.formatDuration(r.diff,true):''}</td>
        <td>${r.typ}</td><td>${r.kommentar}</td>
      </tr>`).join('')}
      </tbody></table>
      <script>window.onload=()=>window.print();<\/script></body></html>`;
    const w=window.open('','_blank');
    w.document.write(html); w.document.close();
  },

  // ─── Modals ───────────────────────────────────────────────────────────────
  openModal(id)  { document.getElementById(id)?.classList.add('open'); },
  closeModal(id) { document.getElementById(id)?.classList.remove('open'); },
  closeAllModals(){ document.querySelectorAll('.modal.open').forEach(m=>m.classList.remove('open')); },

  // ─── Toast ────────────────────────────────────────────────────────────────
  showToast(msg, type='info') {
    const c=document.getElementById('toast-container');
    const t=document.createElement('div');
    t.className=`toast toast-${type}`; t.textContent=msg;
    c.appendChild(t);
    setTimeout(()=>t.classList.add('show'),10);
    setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300);},3000);
  }
};

// ─── Notifications ────────────────────────────────────────────────────────────
const Notifications = {
  async init() {
    const s=DB.getSettings();
    if(s.pushNotifications&&'Notification' in window&&Notification.permission==='granted')
      this._schedule();
  },
  async requestPermission() {
    if(!('Notification' in window)){App.showToast('Nicht unterstützt','error');return;}
    const p=await Notification.requestPermission();
    if(p==='granted'){App.showToast('Benachrichtigungen aktiv ✓','success');this._schedule();}
    else App.showToast('Benachrichtigungen abgelehnt','error');
  },
  _schedule() {
    const s=DB.getSettings();
    setInterval(()=>{
      const now=new Date();
      const ts=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      const today=DB.todayStr(); const e=DB.getEintrag(today);
      if(s.startErinnerung===ts&&!e?.start)
        new Notification('Zeiterfassung',{body:'⏰ Arbeitszeit starten?',icon:'icon-192.png'});
      if(s.endeErinnerung===ts&&e?.start&&!e?.end)
        new Notification('Zeiterfassung',{body:'🔔 Arbeitstag beenden?',icon:'icon-192.png'});
    },60000);
  }
};

window.App=App; window.Notifications=Notifications;

document.addEventListener('DOMContentLoaded',()=>App.init());
