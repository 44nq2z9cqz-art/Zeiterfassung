import SwiftUI
import SwiftData

struct ScanView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(filter: #Predicate<ZeitEintrag> { $0.endzeit == nil })
    private var aktiveEintraege: [ZeitEintrag]
    @ObservedObject private var einst = Einstellungen.shared
    @State private var timerAnzeige: String = "00:00"
    @State private var laufenderTimer: Timer?
    @State private var hinweisText: String = ""
    @State private var zeigeHinweis: Bool = false
    @State private var gedrueckt: Bool = false

    private var aktiverEintrag: ZeitEintrag? { aktiveEintraege.first }
    private var istAktiv: Bool { aktiverEintrag != nil }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                statusKarte.padding()
                Spacer()
                hauptButton.padding(.horizontal, 32)
                versatzHinweis.padding(.top, 44).padding(.horizontal, 32)
                Spacer()
                tagesUebersicht.padding(.bottom, 24)
            }
            .navigationTitle("Zeiterfassung")
            .onAppear { starteTimer() }
            .onDisappear { laufenderTimer?.invalidate() }
            .overlay(alignment: .top) {
                if zeigeHinweis {
                    Text(hinweisText)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color(.systemBackground))
                        .clipShape(Capsule())
                        .shadow(radius: 4)
                        .transition(.move(edge: .top).combined(with: .opacity))
                        .padding(.top, 8)
                }
            }
        }
    }

    private var statusKarte: some View {
        RoundedRectangle(cornerRadius: 20)
            .fill(istAktiv ? Color.orange.opacity(0.12) : Color.blue.opacity(0.08))
            .overlay {
                VStack(spacing: 10) {
                    Image(systemName: istAktiv ? "timer" : "clock")
                        .font(.system(size: 44))
                        .foregroundColor(istAktiv ? .orange : .blue)
                    if istAktiv {
                        Text(timerAnzeige)
                            .font(.system(size: 52, weight: .thin, design: .monospaced))
                        if let e = aktiverEintrag {
                            Text("Gestartet: \(e.startzeit.formatted(date: .omitted, time: .shortened))")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    } else {
                        Text("Bereit")
                            .font(.title)
                            .fontWeight(.light)
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
            }
            .frame(height: 160)
    }

    private var hauptButton: some View {
        Button(action: buttonTippen) {
            ZStack {
                Circle()
                    .fill(istAktiv ? Color.orange : Color.blue)
                    .shadow(color: istAktiv ? .orange.opacity(0.4) : .blue.opacity(0.3), radius: 16)
                    .scaleEffect(gedrueckt ? 0.94 : 1.0)
                VStack(spacing: 10) {
                    Image(systemName: istAktiv ? "stop.fill" : "play.fill")
                        .font(.system(size: 44))
                        .foregroundColor(.white)
                    Text(istAktiv ? "STOPPEN" : "STARTEN")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .tracking(2)
                }
            }
            .frame(width: 200, height: 200)
        }
        .buttonStyle(.plain)
        .overlay(alignment: .bottom) {
            Text(istAktiv ? "Tippen zum Stoppen" : "Tippen zum Starten")
                .font(.caption)
                .foregroundColor(.secondary)
                .offset(y: 32)
        }
        .padding(.bottom, 16)
    }

    private var versatzHinweis: some View {
        VStack(spacing: 4) {
            if einst.startVerzoegerungSekunden > 0 {
                Text("Start verzoegert um \(einst.startVerzoegerungSekunden) Sek.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            if einst.stoppVorlaufSekunden > 0 {
                Text("Stopp vorgezogen um \(einst.stoppVorlaufSekunden) Sek.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }

    private var tagesUebersicht: some View {
        TagesUebersichtKompakt()
    }

    private func buttonTippen() {
        withAnimation(.easeIn(duration: 0.08)) { gedrueckt = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) {
            withAnimation { gedrueckt = false }
        }
        let jetzt = Date()
        if let eintrag = aktiverEintrag {
            let ende = einst.tatsaechlicheEndzeit(tippZeit: jetzt)
            eintrag.endzeit = ende
            laufenderTimer?.invalidate()
            timerAnzeige = "00:00"
            let vorlauf = einst.stoppVorlaufSekunden
            let msg = vorlauf > 0
                ? "Gestoppt (\(vorlauf) Sek. frueher): \(eintrag.dauerFormatiert)"
                : "Gespeichert: \(eintrag.dauerFormatiert)"
            zeigeBanner(msg)
            NotificationManager.shared.sendeStoppBenachrichtigung(
                dauer: eintrag.dauer ?? 0,
                tagesgesamt: tagesgesamtHeute()
            )
        } else {
            let start = einst.tatsaechlicheStartzeit(tippZeit: jetzt)
            modelContext.insert(ZeitEintrag(startzeit: start))
            starteTimer()
            let verz = einst.startVerzoegerungSekunden
            let msg = verz > 0 ? "Gestartet (\(verz) Sek. verzoegert)" : "Aufzeichnung gestartet"
            zeigeBanner(msg)
            NotificationManager.shared.sendeStartBenachrichtigung(startzeit: start)
        }
    }

    private func tagesgesamtHeute() -> TimeInterval {
        let heute = Calendar.current.startOfDay(for: Date())
        let descriptor = FetchDescriptor<ZeitEintrag>(
            predicate: #Predicate { $0.datum == heute && $0.endzeit != nil }
        )
        let eintraege = (try? modelContext.fetch(descriptor)) ?? []
        return eintraege.compactMap { $0.dauer }.reduce(0, +)
    }

    private func starteTimer() {
        laufenderTimer?.invalidate()
        laufenderTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            guard let e = aktiverEintrag else { return }
            let v = Date().timeIntervalSince(e.startzeit)
            let h = Int(v) / 3600
            let m = (Int(v) % 3600) / 60
            let s = Int(v) % 60
            timerAnzeige = h > 0
                ? String(format: "%02d:%02d:%02d", h, m, s)
                : String(format: "%02d:%02d", m, s)
        }
    }

    private func zeigeBanner(_ text: String) {
        hinweisText = text
        withAnimation { zeigeHinweis = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            withAnimation { zeigeHinweis = false }
        }
    }
}

struct TagesUebersichtKompakt: View {
    @Query private var alle: [ZeitEintrag]
    private var heute: [ZeitEintrag] {
        let h = Calendar.current.startOfDay(for: Date())
        return alle.filter { $0.datum == h && $0.endzeit != nil }
    }
    private var gesamt: TimeInterval { heute.compactMap { $0.dauer }.reduce(0, +) }
    var body: some View {
        if !heute.isEmpty {
            VStack(spacing: 6) {
                Text("Heute")
                    .font(.caption)
                    .foregroundColor(.secondary)
                HStack(spacing: 20) {
                    Label("\(heute.count) Eintraege", systemImage: "list.bullet")
                    Label(ZeitEintrag.formatiereDauer(gesamt), systemImage: "clock.fill")
                }
                .font(.subheadline)
                .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .padding(.horizontal, 32)
        }
    }
}
