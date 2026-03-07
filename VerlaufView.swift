import SwiftUI
import SwiftData

struct VerlaufView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \ZeitEintrag.startzeit, order: .reverse)
    private var alle: [ZeitEintrag]

    private var gruppiertNachDatum: [(Date, [ZeitEintrag])] {
        var gruppen: [Date: [ZeitEintrag]] = [:]
        for e in alle { gruppen[e.datum, default: []].append(e) }
        return gruppen.sorted { $0.key > $1.key }
    }

    var body: some View {
        NavigationStack {
            List {
                if gruppiertNachDatum.isEmpty {
                    ContentUnavailableView(
                        "Noch keine Eintraege",
                        systemImage: "clock.badge.xmark",
                        description: Text("Starte eine Aufzeichnung im Starten-Tab")
                    )
                } else {
                    ForEach(gruppiertNachDatum, id: \.0) { datum, eintraege in
                        Section {
                            ForEach(eintraege) { eintrag in
                                HStack {
                                    HStack(spacing: 6) {
                                        Text(eintrag.startzeit.formatted(date: .omitted, time: .shortened))
                                        Text("->")
                                            .font(.caption2)
                                            .foregroundColor(.secondary)
                                        if let ende = eintrag.endzeit {
                                            Text(ende.formatted(date: .omitted, time: .shortened))
                                        } else {
                                            Text("laeuft...")
                                                .foregroundColor(.orange)
                                        }
                                    }
                                    .font(.subheadline)
                                    Spacer()
                                    Text(eintrag.dauerFormatiert)
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .foregroundColor(eintrag.istAktiv ? .orange : .primary)
                                }
                            }
                            .onDelete { offsets in
                                offsets.forEach { modelContext.delete(eintraege[$0]) }
                            }
                            let abgeschlossen = eintraege.filter { !$0.istAktiv }
                            let gesamt = abgeschlossen.compactMap { $0.dauer }.reduce(0, +)
                            if !abgeschlossen.isEmpty {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Tagesgesamt")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                        Text("\(abgeschlossen.count) Eintraege")
                                            .font(.caption2)
                                            .foregroundColor(.secondary)
                                    }
                                    Spacer()
                                    Text(ZeitEintrag.formatiereDauer(gesamt))
                                        .font(.title3)
                                        .fontWeight(.bold)
                                        .foregroundColor(.blue)
                                }
                                .padding(.vertical, 6)
                                .padding(.horizontal, 10)
                                .background(Color.blue.opacity(0.08))
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                        } header: {
                            Text(datumLabel(datum)).textCase(nil).font(.headline)
                        }
                    }
                }
            }
            .navigationTitle("Verlauf")
        }
    }

    private func datumLabel(_ datum: Date) -> String {
        if Calendar.current.isDateInToday(datum) { return "Heute" }
        if Calendar.current.isDateInYesterday(datum) { return "Gestern" }
        return datum.formatted(.dateTime.weekday(.wide).day().month().year())
    }
}
