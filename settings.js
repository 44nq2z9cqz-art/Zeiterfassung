// Einstellungen v2.0 – Untermenü-Struktur
const Settings = {
  _page: 'main',    // 'main' | 'arbeitszeit' | 'zeitkonto' | 'pausen' | 'notifications' | 'daten'
  _temp: {},
  _signs: { sockel: 1, ueberSockel: 1 },

  render() {
    const container = document.getElementById('settings-container');
    if (!container) return;
    this._signs = { sockel:1, ueberSockel:1 };
    if (this._page === 'main') this._renderMain(container);
    else this._renderSubPage(container, this._page);
  },

  _renderMain(container) {
    container.innerHTML = `
      <div class="settings-menu">
        <div class="settings-menu-item" onclick="Settings.goTo('arbeitszeit')">
          <span class="smi-icon">⏰</span>
          <span class="smi-label">Einstellungen Arbeitszeit</span>
          <span class="smi-arrow">›</span>
        </div>
        <div class="settings-menu-item" onclick="Settings.goTo('zeitkonto')">
          <span class="smi-icon">🏦</span>
          <span class="smi-label">Einstellungen Zeitkonto</span>
          <span class="smi-arrow">›</span>
        </div>
        <div class="settings-menu-item" onclick="Settings.goTo('pausen')">
          <span class="smi-icon">⏸</span>
          <span class="smi-label">Pausentracker</span>
          <span class="smi-arrow">›</span>
        </div>
        <div class="settings-menu-item" onclick="Settings.goTo('notifications')">
          <span class="smi-icon">🔔</span>
          <span class="smi-label">Benachrichtigungen</span>
          <span class="smi-arrow">›</span>
        </div>
        <div class="settings-menu-item" onclick="Settings.goTo('daten')">
          <span class="smi-icon">💾</span>
          <span class="smi-label">Daten & Backup</span>
          <span class="smi-arrow">›</span>
        </div>
      </div>
      <div class="settings-section mt-16">
        <div class="settings-card">
          <div class="setting-row danger-row">
            <label>Alle Daten löschen</label>
            <button class="btn-danger btn-sm" onclick="Settings.deleteAll()">🗑 Löschen</button>
          </div>
        </div>
      </div>`;
  },

  goTo(page) {
    this._page = page; this._temp = {};
    const container = document.getElementById('settings-container');
    if (container) this._renderSubPage(container, page);
  },
  goBack() { this._page = 'main'; this.render(); },

  _backBtn(title) {
    return `<div class="subpage-header">
      <button class="back-btn" onclick="Settings.goBack()">‹ Einstellungen</button>
      <h3>${title}</h3>
    </div>`;
  },

  _renderSubPage(container, page) {
    const s = DB.getSettings();
    const pages = {
      arbeitszeit: () => `
        ${this._backBtn('Arbeitszeit')}
        <div class="settings-info-box">Änderungen wirken ab dem aktuellen Tag.</div>
        <div class="settings-section">
          <div class="settings-card">
            <div class="setting-row setting-row-col">
              <label>Arbeitszeit Montag–Freitag</label>
              <div class="drum-picker-wrap">${this._drumPicker('soll', s.sollarbeitszeitMinuten)}</div>
            </div>
            <div class="setting-row setting-row-col">
              <label>Soll-Zeit Urlaub / Krankheit</label>
              <div class="drum-picker-wrap">${this._drumPicker('urlaubKrank', s.sollUrlaubKrankMinuten??0)}</div>
            </div>
            <div class="setting-row setting-row-col">
              <label>Soll-Zeit 24.12 + 31.12 (wenn Werktag)</label>
              <div class="drum-picker-wrap">${this._drumPicker('halbtag', s.sollFeiertageHalbMinuten??240)}</div>
            </div>
          </div>
        </div>
        <button class="btn-primary btn-full" onclick="Settings.saveArbeitszeit()">Speichern</button>`,

      zeitkonto: () => `
        ${this._backBtn('Zeitkonto')}
        <div class="settings-section">
          <div class="settings-card">
            <div class="setting-row">
              <label>Stichtag Startsaldo</label>
              <input type="date" class="setting-input" id="s-stichtag" value="${s.startsaldoDatum||''}">
            </div>
            <div class="setting-row setting-row-col">
              <label>Startsaldo Konto 1 · Sockel <span class="label-hint">+ Guthaben · − Schulden</span></label>
              <div class="saldo-sign-row">
                <div class="sign-toggle">
                  <button class="sign-btn ${(s.startsaldoSockel||0)>=0?'active':''}" id="sign-s-pos" onclick="Settings.setSign('sockel',1)">+</button>
                  <button class="sign-btn ${(s.startsaldoSockel||0)<0?'active':''}"  id="sign-s-neg" onclick="Settings.setSign('sockel',-1)">−</button>
                </div>
                <div class="drum-picker-wrap">${this._drumPicker('saldoSockel', Math.abs(s.startsaldoSockel||0))}</div>
              </div>
            </div>
            <div class="setting-row setting-row-col">
              <label>Startsaldo Konto 2 · Über Sockel <span class="label-hint">+ Guthaben · − Schulden</span></label>
              <div class="saldo-sign-row">
                <div class="sign-toggle">
                  <button class="sign-btn ${(s.startsaldoUeberSockel||0)>=0?'active':''}" id="sign-u-pos" onclick="Settings.setSign('ueberSockel',1)">+</button>
                  <button class="sign-btn ${(s.startsaldoUeberSockel||0)<0?'active':''}"  id="sign-u-neg" onclick="Settings.setSign('ueberSockel',-1)">−</button>
                </div>
                <div class="drum-picker-wrap">${this._drumPicker('saldoUeberSockel', Math.abs(s.startsaldoUeberSockel||0))}</div>
              </div>
            </div>
            <div class="setting-row setting-row-col">
              <label>Sockel-Limit</label>
              <div class="drum-picker-wrap">${this._drumPicker('sockelLimit', s.ueberstundenSockelLimit)}</div>
            </div>
          </div>
        </div>
        <button class="btn-primary btn-full" onclick="Settings.saveZeitkonto()">Speichern</button>`,

      pausen: () => `
        ${this._backBtn('Pausentracker')}
        <div class="settings-info-box">Stoppuhr-Korrektur in Sekunden. Negativ = früher, Positiv = später.</div>
        <div class="settings-section">
          <div class="settings-card">
            <div class="setting-row setting-row-col">
              <label>Verzögerung Pause Start</label>
              <div class="slider-row">
                <input type="range" id="sl-pause-start" min="-60" max="60" step="1"
                  value="${s.pauseStartKorrekturSek||0}" class="sek-slider"
                  oninput="Settings.updateSlider('pause-start',this.value)">
                <span class="slider-val" id="sl-pause-start-val">${this._fmtSek(s.pauseStartKorrekturSek||0)}</span>
              </div>
            </div>
            <div class="setting-row setting-row-col">
              <label>Verzögerung Pause Stopp</label>
              <div class="slider-row">
                <input type="range" id="sl-pause-ende" min="-60" max="60" step="1"
                  value="${s.pauseEndeKorrekturSek||0}" class="sek-slider"
                  oninput="Settings.updateSlider('pause-ende',this.value)">
                <span class="slider-val" id="sl-pause-ende-val">${this._fmtSek(s.pauseEndeKorrekturSek||0)}</span>
              </div>
            </div>
          </div>
        </div>
        <button class="btn-primary btn-full" onclick="Settings.savePausen()">Speichern</button>`,

      notifications: () => `
        ${this._backBtn('Benachrichtigungen')}
        <div class="settings-section">
          <div class="settings-card">
            <div class="setting-row">
              <label>Push-Benachrichtigungen</label>
              <div class="toggle-wrap">
                <input type="checkbox" id="s-push" class="toggle-input" ${s.pushNotifications?'checked':''}
                  onchange="Settings.togglePush(this.checked)">
                <label for="s-push" class="toggle-label"></label>
              </div>
            </div>
            <div class="setting-row">
              <label>Erinnerung Arbeitsbeginn</label>
              <input type="time" class="setting-input time-input" id="s-start-reminder" value="${s.startErinnerung||''}">
            </div>
            <div class="setting-row">
              <label>Erinnerung Arbeitsende</label>
              <input type="time" class="setting-input time-input" id="s-end-reminder" value="${s.endeErinnerung||''}">
            </div>
            <div class="setting-row">
              <label>Benachrichtigung bei Pausenbeginn</label>
              <div class="toggle-wrap">
                <input type="checkbox" id="s-push-pause-start" class="toggle-input" ${s.pushPauseStart?'checked':''}> 
                <label for="s-push-pause-start" class="toggle-label"></label>
              </div>
            </div>
            <div class="setting-row">
              <label>Benachrichtigung bei Pausenende</label>
              <div class="toggle-wrap">
                <input type="checkbox" id="s-push-pause-ende" class="toggle-input" ${s.pushPauseEnde?'checked':''}>
                <label for="s-push-pause-ende" class="toggle-label"></label>
              </div>
            </div>
            <div class="setting-row">
              <label>Erinnerung Datensicherung</label>
              <select class="setting-input" id="s-datensicherung">
                <option value="" ${!s.pushDatensicherung?'selected':''}>Aus</option>
                <option value="daily" ${s.pushDatensicherung==='daily'?'selected':''}>Täglich</option>
                <option value="weekly" ${s.pushDatensicherung==='weekly'?'selected':''}>Wöchentlich</option>
              </select>
            </div>
            <div class="setting-row setting-row-col">
              <label>E-Mail für Tagesabschluss-Bericht</label>
              <input type="email" class="setting-input" id="s-email" value="${s.emailEmpfaenger||''}" placeholder="deine@email.de">
            </div>
          </div>
        </div>
        <button class="btn-primary btn-full" onclick="Settings.saveNotifications()">Speichern</button>`,

      daten: () => `
        ${this._backBtn('Daten & Backup')}
        <div class="settings-section">
          <div class="settings-card">
            <div class="setting-row">
              <label>Backup erstellen</label>
              <button class="btn-outline btn-sm" onclick="DB.createBackup()">💾 Download</button>
            </div>
            <div class="setting-row">
              <label>Backup wiederherstellen</label>
              <button class="btn-outline btn-sm" onclick="Settings.triggerRestore()">📂 Datei wählen</button>
              <input type="file" id="restore-file" accept=".json" style="display:none" onchange="Settings.doRestore(event)">
            </div>
          </div>
        </div>`
    };

    container.innerHTML = pages[page]?.() || '';
    requestAnimationFrame(() => {
      this._signs.sockel = (DB.getSettings().startsaldoSockel||0) < 0 ? -1 : 1;
      this._signs.ueberSockel = (DB.getSettings().startsaldoUeberSockel||0) < 0 ? -1 : 1;
      this._initAllDrums();
    });
  },

  // ─── Drum Picker ──────────────────────────────────────────────────────────
  _drumPicker(id, totalMin) {
    const h=Math.floor(Math.abs(totalMin)/60), m=Math.abs(totalMin)%60;
    return `<div class="drum-picker" data-id="${id}">
      <div class="drum-col" data-col="h" data-val="${h}"><div class="drum-scroll" id="drum-${id}-h"></div></div>
      <div class="drum-sep">:</div>
      <div class="drum-col" data-col="m" data-val="${m}"><div class="drum-scroll" id="drum-${id}-m"></div></div>
      <div class="drum-unit">h&nbsp;min</div>
    </div>`;
  },

  _initAllDrums() {
    document.querySelectorAll('.drum-picker').forEach(p => {
      const id = p.dataset.id;
      const hv = parseInt(p.querySelector('[data-col="h"]').dataset.val);
      const mv = parseInt(p.querySelector('[data-col="m"]').dataset.val);
      this._initCol(id,'h',hv,0,999);
      this._initCol(id,'m',mv,0,59);
    });
  },

  ITEM_H: 40,
  _initCol(pid, col, initV, minV, maxV) {
    const el = document.getElementById(`drum-${pid}-${col}`);
    if (!el) return;
    const PAD=2;
    let html='';
    for(let i=PAD;i>0;i--){const v=((initV-i)%(maxV-minV+1)+(maxV-minV+1))%(maxV-minV+1)+minV;html+=`<div class="drum-item drum-pad">${String(v).padStart(2,'0')}</div>`;}
    for(let v=minV;v<=maxV;v++) html+=`<div class="drum-item" data-v="${v}">${String(v).padStart(2,'0')}</div>`;
    for(let i=0;i<PAD;i++){const v=i%(maxV-minV+1)+minV;html+=`<div class="drum-item drum-pad">${String(v).padStart(2,'0')}</div>`;}
    el.innerHTML=html;
    el.scrollTop=(initV-minV)*this.ITEM_H;
    let snapT;
    el.addEventListener('scroll',()=>{
      clearTimeout(snapT);
      snapT=setTimeout(()=>{
        const idx=Math.round(el.scrollTop/this.ITEM_H);
        el.scrollTo({top:idx*this.ITEM_H,behavior:'smooth'});
        el.closest('.drum-col').dataset.val=Math.min(maxV,Math.max(minV,idx+minV));
        this._onDrumChange(el.closest('.drum-picker').dataset.id);
      },120);
    },{passive:true});
    // Touch/Mouse drag
    let sy=0,ss=0,drag=false;
    const onS=e=>{sy=e.touches?e.touches[0].clientY:e.clientY;ss=el.scrollTop;drag=true;};
    const onM=e=>{if(!drag)return;el.scrollTop=ss-(e.touches?e.touches[0].clientY:e.clientY)+sy;};
    const onE=()=>{drag=false;};
    el.addEventListener('touchstart',onS,{passive:true});
    el.addEventListener('touchmove',onM,{passive:true});
    el.addEventListener('touchend',onE);
    el.addEventListener('mousedown',onS);
    window.addEventListener('mousemove',onM);
    window.addEventListener('mouseup',onE);
  },

  _onDrumChange(pid) {
    const p=document.querySelector(`.drum-picker[data-id="${pid}"]`);
    if(!p)return;
    const h=parseInt(p.querySelector('[data-col="h"]').dataset.val||0);
    const m=parseInt(p.querySelector('[data-col="m"]').dataset.val||0);
    this._temp[pid]=h*60+m;
  },

  _getDrum(pid) {
    if(this._temp[pid]!==undefined)return this._temp[pid];
    const p=document.querySelector(`.drum-picker[data-id="${pid}"]`);
    if(!p)return 0;
    const h=parseInt(p.querySelector('[data-col="h"]')?.dataset.val||0);
    const m=parseInt(p.querySelector('[data-col="m"]')?.dataset.val||0);
    return h*60+m;
  },

  setSign(which, sign) {
    this._signs[which]=sign;
    const map={sockel:['sign-s-pos','sign-s-neg'],ueberSockel:['sign-u-pos','sign-u-neg']};
    const [pid,nid]=map[which];
    document.getElementById(pid)?.classList.toggle('active',sign>0);
    document.getElementById(nid)?.classList.toggle('active',sign<0);
  },

  updateSlider(id, val) {
    document.getElementById(`sl-${id}-val`).textContent = this._fmtSek(parseInt(val));
  },
  _fmtSek(s){return s===0?'0s':`${s>0?'+':''}${s}s`;},

  // ─── Speichern ────────────────────────────────────────────────────────────
  saveArbeitszeit() {
    const s=DB.getSettings();
    DB.saveSettings({...s,
      sollarbeitszeitMinuten:   this._getDrum('soll')||s.sollarbeitszeitMinuten,
      sollUrlaubKrankMinuten:   this._getDrum('urlaubKrank'),
      sollFeiertageHalbMinuten: this._getDrum('halbtag'),
    });
    DB.recalcUeberstunden();
    App.showToast('Arbeitszeit gespeichert ✓','success');
    this.goBack();
  },
  saveZeitkonto() {
    const s=DB.getSettings();
    DB.saveSettings({...s,
      startsaldoDatum:       document.getElementById('s-stichtag')?.value||null,
      startsaldoSockel:      this._signs.sockel     * this._getDrum('saldoSockel'),
      startsaldoUeberSockel: this._signs.ueberSockel* this._getDrum('saldoUeberSockel'),
      ueberstundenSockelLimit: this._getDrum('sockelLimit')||s.ueberstundenSockelLimit,
    });
    DB.recalcUeberstunden();
    App.showToast('Zeitkonto gespeichert ✓','success');
    this.goBack();
  },
  savePausen() {
    const s=DB.getSettings();
    DB.saveSettings({...s,
      pauseStartKorrekturSek: parseInt(document.getElementById('sl-pause-start')?.value||0),
      pauseEndeKorrekturSek:  parseInt(document.getElementById('sl-pause-ende')?.value||0),
    });
    App.showToast('Pausentracker gespeichert ✓','success');
    this.goBack();
  },
  saveNotifications() {
    const s=DB.getSettings();
    DB.saveSettings({...s,
      pushNotifications: document.getElementById('s-push')?.checked??s.pushNotifications,
      startErinnerung:   document.getElementById('s-start-reminder')?.value||null,
      endeErinnerung:    document.getElementById('s-end-reminder')?.value||null,
      pushPauseStart:    document.getElementById('s-push-pause-start')?.checked??false,
      pushPauseEnde:     document.getElementById('s-push-pause-ende')?.checked??false,
      pushDatensicherung:document.getElementById('s-datensicherung')?.value||null,
      emailEmpfaenger:   document.getElementById('s-email')?.value||'',
    });
    App.showToast('Benachrichtigungen gespeichert ✓','success');
    this.goBack();
  },

  togglePush(enabled) { if(enabled) Notifications.requestPermission(); },

  triggerRestore() { document.getElementById('restore-file')?.click(); },
  doRestore(event) {
    const f=event.target.files[0]; if(!f)return;
    const r=new FileReader();
    r.onload=e=>{try{DB.restoreBackup(e.target.result);App.showToast('Backup wiederhergestellt ✓','success');App.init();}catch(err){App.showToast('Fehler: '+err.message,'error');}};
    r.readAsText(f);
  },
  deleteAll() {
    if(!confirm('Wirklich alle Daten löschen? Nicht rückgängig machbar!'))return;
    [DB.KEYS.EINTRAEGE,DB.KEYS.SETTINGS,DB.KEYS.UEBERSTUNDEN,DB.KEYS.ENTNAHMEN].forEach(k=>localStorage.removeItem(k));
    App.showToast('Alle Daten gelöscht','info');
    App.init();
  }
};
window.Settings = Settings;
