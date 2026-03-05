// Data Layer - Zeiterfassung Pro v1.2
const DB = {
  KEYS: {
    EINTRAEGE:  'ze_eintraege',
    SETTINGS:   'ze_settings',
    UEBERSTUNDEN: 'ze_ueberstunden',
    URLAUB:     'ze_urlaub',
    ENTNAHMEN:  'ze_entnahmen'   // NEU: Kontobuchungen
  },

  // ─── Settings ────────────────────────────────────────────────────────────
  defaultSettings() {
    return {
      sollarbeitszeitMinuten: 480,
      ueberstundenSockelLimit: 40 * 60,
      mitarbeiterName: 'Mein Konto',
      pushNotifications: false,
      startErinnerung: null,
      endeErinnerung: null,
      wochenstart: 1,
      zeitzone: 'Europe/Berlin',
      startsaldoDatum: null,
      startsaldoSockel: 0,          // Minuten, minutengenau
      startsaldoUeberSockel: 0,     // Minuten, minutengenau
      pauseStartKorrekturSek: 0,
      pauseEndeKorrekturSek: 0,
    };
  },

  getSettings() {
    try {
      const s = localStorage.getItem(this.KEYS.SETTINGS);
      return s ? { ...this.defaultSettings(), ...JSON.parse(s) } : this.defaultSettings();
    } catch { return this.defaultSettings(); }
  },

  saveSettings(s) { localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(s)); },

  // ─── Einträge ─────────────────────────────────────────────────────────────
  getEintraege() {
    try { const e = localStorage.getItem(this.KEYS.EINTRAEGE); return e ? JSON.parse(e) : {}; }
    catch { return {}; }
  },
  getEintrag(d) { return this.getEintraege()[d] || null; },
  saveEintrag(dateStr, eintrag) {
    const e = this.getEintraege();
    e[dateStr] = { ...e[dateStr], ...eintrag, dateStr };
    localStorage.setItem(this.KEYS.EINTRAEGE, JSON.stringify(e));
    this.recalcUeberstunden();
  },
  deleteEintrag(dateStr) {
    const e = this.getEintraege(); delete e[dateStr];
    localStorage.setItem(this.KEYS.EINTRAEGE, JSON.stringify(e));
    this.recalcUeberstunden();
  },

  // ─── Pausen ───────────────────────────────────────────────────────────────
  addPause(dateStr, pause) {
    const e = this.getEintraege();
    if (!e[dateStr]) e[dateStr] = { dateStr };
    if (!e[dateStr].pausen) e[dateStr].pausen = [];
    e[dateStr].pausen.push({ ...pause, id: Date.now() });
    localStorage.setItem(this.KEYS.EINTRAEGE, JSON.stringify(e));
    this.recalcUeberstunden();
  },
  updatePause(dateStr, id, upd) {
    const e = this.getEintraege();
    if (e[dateStr]?.pausen) e[dateStr].pausen = e[dateStr].pausen.map(p => p.id===id ? {...p,...upd} : p);
    localStorage.setItem(this.KEYS.EINTRAEGE, JSON.stringify(e));
    this.recalcUeberstunden();
  },
  deletePause(dateStr, id) {
    const e = this.getEintraege();
    if (e[dateStr]?.pausen) e[dateStr].pausen = e[dateStr].pausen.filter(p => p.id!==id);
    localStorage.setItem(this.KEYS.EINTRAEGE, JSON.stringify(e));
    this.recalcUeberstunden();
  },

  // ─── Urlaub ───────────────────────────────────────────────────────────────
  getUrlaub() {
    try { const u = localStorage.getItem(this.KEYS.URLAUB); return u ? JSON.parse(u) : {}; }
    catch { return {}; }
  },
  setUrlaub(dateStr, val) {
    const u = this.getUrlaub();
    if (val) u[dateStr] = true; else delete u[dateStr];
    localStorage.setItem(this.KEYS.URLAUB, JSON.stringify(u));
    this.recalcUeberstunden();
  },
  isUrlaub(d) { return !!this.getUrlaub()[d]; },

  // ─── Entnahmen / Auszahlungen ─────────────────────────────────────────────
  getEntnahmen() {
    try { const e = localStorage.getItem(this.KEYS.ENTNAHMEN); return e ? JSON.parse(e) : []; }
    catch { return []; }
  },
  saveEntnahmen(list) {
    localStorage.setItem(this.KEYS.ENTNAHMEN, JSON.stringify(list));
    this.recalcUeberstunden();
  },
  addEntnahme(entnahme) {
    // entnahme = { id, datum, konto ('sockel'|'ueberSockel'), betragMin, grund }
    const list = this.getEntnahmen();
    list.push({ ...entnahme, id: Date.now() });
    list.sort((a, b) => a.datum.localeCompare(b.datum));
    this.saveEntnahmen(list);
  },
  updateEntnahme(id, upd) {
    const list = this.getEntnahmen().map(e => e.id === id ? { ...e, ...upd } : e);
    list.sort((a, b) => a.datum.localeCompare(b.datum));
    this.saveEntnahmen(list);
  },
  deleteEntnahme(id) {
    this.saveEntnahmen(this.getEntnahmen().filter(e => e.id !== id));
  },

  // ─── Berechnungen ─────────────────────────────────────────────────────────
  calcArbeitszeit(eintrag) {
    if (!eintrag?.start || !eintrag?.end) return null;
    const s = this.timeToMinutes(eintrag.start);
    const e = this.timeToMinutes(eintrag.end);
    if (e <= s) return null;
    const pausen = (eintrag.pausen || []).reduce((a, p) => a + (p.dauer || 0), 0);
    return (e - s) - pausen + (eintrag.anpassungMinuten || 0);
  },

  getSollMinuten(dateStr, settings) {
    const s = settings || this.getSettings();
    const eintrag = this.getEintrag(dateStr);
    if (eintrag && typeof eintrag.sollOverrideMinuten === 'number') return eintrag.sollOverrideMinuten;
    if (this.isUrlaub(dateStr)) return 0;
    return window.Feiertage.getSollarbeitszeit(dateStr, s);
  },

  getDiffMinuten(dateStr) {
    const eintrag = this.getEintrag(dateStr);
    const ist = eintrag ? this.calcArbeitszeit(eintrag) : 0;
    const soll = this.getSollMinuten(dateStr);
    if (ist === null) return soll > 0 ? -soll : 0;
    return (ist || 0) - soll;
  },

  // ─── Überstunden-Konto (mit Startsaldo + Entnahmen) ──────────────────────
  recalcUeberstunden() {
    const settings = this.getSettings();
    const eintraege = this.getEintraege();
    const today = this.todayStr();
    const limit = settings.ueberstundenSockelLimit;
    const stichtag = settings.startsaldoDatum || null;

    let sockel = settings.startsaldoSockel || 0;
    let ueberSockel = settings.startsaldoUeberSockel || 0;

    // Entnahmen nach Datum sortiert einbeziehen
    const entnahmen = this.getEntnahmen().filter(e => !stichtag || e.datum > stichtag);
    const entnahmenByDate = {};
    for (const en of entnahmen) {
      if (!entnahmenByDate[en.datum]) entnahmenByDate[en.datum] = [];
      entnahmenByDate[en.datum].push(en);
    }

    // Alle relevanten Tage (ab Stichtag) + Entnahme-Daten zusammenführen
    const arbeitsDaten = Object.keys(eintraege)
      .filter(d => d <= today && (!stichtag || d > stichtag));
    const entnahmeDaten = Object.keys(entnahmenByDate)
      .filter(d => d <= today && (!stichtag || d > stichtag));
    const allDates = [...new Set([...arbeitsDaten, ...entnahmeDaten])].sort();

    for (const dateStr of allDates) {
      // Erst Arbeitszeitdiff buchen
      if (eintraege[dateStr]) {
        const diff = this.getDiffMinuten(dateStr);
        if (diff > 0) {
          const raum = Math.max(0, limit - sockel);
          const ins = Math.min(diff, raum);
          sockel += ins;
          ueberSockel += diff - ins;
        } else if (diff < 0) {
          const abzug = Math.abs(diff);
          const ausSockel = Math.min(abzug, sockel);
          sockel -= ausSockel;
          ueberSockel -= Math.min(abzug - ausSockel, ueberSockel);
        }
      }
      // Dann Entnahmen dieses Tages abziehen
      if (entnahmenByDate[dateStr]) {
        for (const en of entnahmenByDate[dateStr]) {
          const betrag = Math.abs(en.betragMin);
          if (en.konto === 'sockel') {
            sockel = Math.max(-999999, sockel - betrag);
          } else {
            ueberSockel = Math.max(-999999, ueberSockel - betrag);
          }
        }
      }
    }

    const result = { sockel, ueberSockel, limit, updatedAt: Date.now() };
    localStorage.setItem(this.KEYS.UEBERSTUNDEN, JSON.stringify(result));
    return result;
  },

  getUeberstunden() {
    try {
      const u = localStorage.getItem(this.KEYS.UEBERSTUNDEN);
      return u ? JSON.parse(u) : this.recalcUeberstunden();
    } catch { return { sockel: 0, ueberSockel: 0 }; }
  },

  // ─── Helfer ───────────────────────────────────────────────────────────────
  timeToMinutes(t) {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  },
  minutesToTime(min) {
    const h = Math.floor(Math.abs(min) / 60);
    const m = Math.abs(min) % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  },
  formatDuration(min, showSign = false) {
    if (min === null || min === undefined) return '--:--';
    const sign = min < 0 ? '-' : (showSign && min > 0 ? '+' : '');
    const h = Math.floor(Math.abs(min) / 60);
    const m = Math.abs(min) % 60;
    return `${sign}${h}:${String(m).padStart(2,'0')}h`;
  },
  dateToTimeStr(date, korSek = 0) {
    const d = new Date(date.getTime() + korSek * 1000);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  },
  todayStr() { return new Date().toISOString().substring(0, 10); },
  dateToStr(d) { return d.toISOString().substring(0, 10); },

  // ─── Backup & Restore ─────────────────────────────────────────────────────
  createBackup() {
    const backup = {
      version: '1.2.0', exportedAt: new Date().toISOString(), app: 'Zeiterfassung Pro',
      data: {
        eintraege: this.getEintraege(), settings: this.getSettings(),
        urlaub: this.getUrlaub(), entnahmen: this.getEntnahmen()
      }
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `zeiterfassung-backup-${this.todayStr()}.json`;
    a.click();
  },
  restoreBackup(jsonStr) {
    const b = JSON.parse(jsonStr);
    if (b.app !== 'Zeiterfassung Pro') throw new Error('Ungültiges Backup-Format');
    localStorage.setItem(this.KEYS.EINTRAEGE,  JSON.stringify(b.data.eintraege));
    localStorage.setItem(this.KEYS.SETTINGS,   JSON.stringify(b.data.settings));
    localStorage.setItem(this.KEYS.URLAUB,     JSON.stringify(b.data.urlaub || {}));
    localStorage.setItem(this.KEYS.ENTNAHMEN,  JSON.stringify(b.data.entnahmen || []));
    this.recalcUeberstunden();
    return true;
  },

  // ─── CSV Export ───────────────────────────────────────────────────────────
  exportCSV(von, bis) {
    const eintraege = this.getEintraege();
    const settings = this.getSettings();
    const wt = ['So','Mo','Di','Mi','Do','Fr','Sa'];
    const header = ['Datum','Wochentag','Arbeitsbeginn','Arbeitsende','Pausen (min)',
                    'Ist (min)','Soll (min)','Differenz (min)','Feiertag','Urlaub','Kommentar'];
    const rows = [header.join(';')];

    let cur = new Date((von || '2024-01-01') + 'T12:00:00');
    const end = new Date((bis || this.todayStr()) + 'T12:00:00');
    while (cur <= end) {
      const ds = this.dateToStr(cur);
      const e = eintraege[ds] || {};
      const pausen = (e.pausen || []).reduce((s, p) => s + (p.dauer || 0), 0);
      const ist = e.start && e.end ? this.calcArbeitszeit(e) : '';
      const soll = this.getSollMinuten(ds, settings);
      rows.push([
        ds, wt[cur.getDay()], e.start||'', e.end||'',
        pausen||'', ist!==''?ist:'', soll,
        ist!=='' ? (ist - soll) : '',
        window.Feiertage.isFeiertag(ds, cur.getFullYear())||'',
        this.isUrlaub(ds)?'Ja':'',
        (e.kommentar||'').replace(/;/g,',')
      ].join(';'));
      cur.setDate(cur.getDate() + 1);
    }

    // Entnahmen-Tab hinzufügen
    const entnahmen = this.getEntnahmen();
    if (entnahmen.length) {
      rows.push('');
      rows.push('Kontobuchungen;;;;;;;;;;');
      rows.push('Datum;Konto;Betrag (min);Betrag (h);Grund;;;;;;;;;');
      for (const en of entnahmen) {
        rows.push([
          en.datum,
          en.konto === 'sockel' ? 'Konto 1 (Sockel)' : 'Konto 2 (Über Sockel)',
          en.betragMin,
          this.formatDuration(en.betragMin),
          (en.grund||'').replace(/;/g,',')
        ].join(';'));
      }
    }

    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `zeiterfassung-${von||'alle'}-${bis||'heute'}.csv`;
    a.click();
  }
};

window.DB = DB;
