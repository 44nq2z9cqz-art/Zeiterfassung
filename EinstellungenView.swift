import SwiftUI

struct EinstellungenView: View {
    @ObservedObject private var einst = Einstellungen.shared

    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Start-Verzoegerung")
                                .fontWeight(.medium)
                            Spacer()
                            Text(einst.startVerzoegerungSekunden == 0 ? "Aus" : "\(einst.startVerzoegerungSekunden) Sek.")
                                .foregroundColor(einst.startVerzoegerungSekunden == 0 ? .secondary : .blue)
                                .fontWeight(.semibold)
                        }
                        Slider(
                            value: Binding(
                                get: { Double(einst.startVerzoegerungSekunden) },
                                set: { einst.startVerzoegerungSekunden = Int($0) }
                            ),
                            in: 0...300, step: 5
                        )
                        .tint(.blue)
                        Text(einst.startVerzoegerungSekunden == 0
                             ? "Kein Versatz - Zeit startet beim Tippen."
                             : "Zeit startet \(einst.startVerzoegerungSekunden) Sek. nach dem Tippen.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 4)
                } header: {
                    Text("Zeitversatz beim Starten")
                } footer: {
                    Text("Nuetzlich wenn du erst nach dem Tippen losgehst.")
                }

                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Stopp-Vorlauf")
                                .fontWeight(.medium)
                            Spacer()
                            Text(einst.stoppVorlaufSekunden == 0 ? "Aus" : "\(einst.stoppVorlaufSekunden) Sek.")
                                .foregroundColor(einst.stoppVorlaufSekunden == 0 ? .secondary : .orange)
                                .fontWeight(.semibold)
                        }
                        Slider(
                            value: Binding(
                                get: { Double(einst.stoppVorlaufSekunden) },
                                set: { einst.stoppVorlaufSekunden = Int($0) }
                            ),
                            in: 0...300, step: 5
                        )
                        .tint(.orange)
                        Text(einst.stoppVorlaufSekunden == 0
                             ? "Kein Versatz - Zeit stoppt beim Tippen."
                             : "Zeit stoppt \(einst.stoppVorlaufSekunden) Sek. vor dem Tippen.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 4)
                } header: {
                    Text("Zeitversatz beim Stoppen")
                } footer: {
                    Text("Nuetzlich wenn du schon angekommen bist bevor du die App oeffnest.")
                }

                Section("So funktioniert es") {
                    ForEach(["1. Tab Starten oeffnen",
                             "2. Grossen Button tippen - Timer laeuft",
                             "3. Nochmal tippen - Eintrag gespeichert",
                             "4. Tab Verlauf zeigt Eintraege mit Tagessumme",
                             "5. Tab Monat zeigt die Gesamtuebersicht"], id: \.self) { schritt in
                        Text(schritt).font(.subheadline)
                    }
                }
            }
            .navigationTitle("Einstellungen")
        }
    }
}
