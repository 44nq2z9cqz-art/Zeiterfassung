import SwiftUI
import SwiftData

struct MonatsView: View {
    @Query(sort: \ZeitEintrag.startzeit, order: .reverse)
    private var alle: [ZeitEintrag]
    @State private var angezeigterMonat: Date = Calendar.current.startOfMonth(for: Date())
    private let cal = Calendar.current

    private var eintraegeDesMonats: [ZeitEintrag] {
        let start = angezeigterMonat
        let ende = cal.date(byAdding: .month, value: 1, to: start) ?? start
        return alle.filter { $0.endzeit != nil && $0.startzeit >= start && $0.startzeit < ende }
    }

    private var gruppiertNachTag: [(Date, [ZeitEintrag])] {
        var gruppen: [Date: [ZeitEintrag]] = [:]
        for e in eintraegeDesMonats { gruppen[e.datum, default: []].append(e) }
        return gruppen.sorted { $0.key > $1.key }
    }

    private var gesamtDauerMonat: TimeInterval {
        eintraegeDesMonats.compactMap { $0.dauer }.reduce(0, +)
    }

    var body: some View {
        NavigationStack {
            List {
                // Navigator
                Section {
                    HStack {
                        Button {
                            angezeigterMonat = cal.date(byAdding: .month, value: -1, to: angezeigterMonat) ?? angezeigterMonat
                        } label: {
                            Image(systemName: "chevron.left.circle.fill")
                                .font(.title2)
                                .foregroundColor(.blue)
                        }
                        Spacer()
                        Text(angezeigterMonat.formatted(.dateTime.month(.wide).year()))
                            .font(.title2)
                            .fontWeight(.semibold)
                        Spacer()
                        Button {
                            let n = cal.date(byAdding: .month, value: 1, to: angezeigterMonat) ?? angezeigterMonat
                            if n <= Date() { angezeigterMonat = n }
                        } label: {
                            Image(systemName: "chevron.right.circle.fill")
                                .font(.title2)
                                .foregroundColor(
                                    (cal.date(byAdding: .month, value: 1, to: angezeigterMonat) ?? Date()) <= Date()
                                    ? .blue : .gray
                                )
                        }
                    }
                    .padding(.vertical, 8)
                }
                .listRowBackground(Color.clear)

                if eintraegeDesMonats.isEmpty {
                    ContentUnavailableView(
                        "Keine Eintraege",
                        systemImage: "calendar.badge.minus",
                        description: Text("In diesem Monat wurden keine Zeiten aufgezeichnet.")
                    )
                } else {
                    // Gesamtzeit
                    Section {
                        VStack(spacing: 4) {
                            Text("Gesamtzeit im Monat")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text(ZeitEintrag.formatiereDauer(gesamtDauerMonat))
                                .font(.system(size: 42, weight: .bold, design: .rounded))
                                .foregroundColor(.blue)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        
                        HStack(spacing: 12) {
                            VStack(spacing: 4) {
                                Text("\(gruppiertNachTag.count)")
                                    .font(.title2).fontWeight(.bold)
                                Text("Aktive Tage")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.green.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 12))

                            if let bester = gruppiertNachTag.map({ ($0.0, $0.1.compactMap { $0.dauer }.reduce(0, +)) }).max(by: { $0.1 < $1.1 }) {
                                VStack(spacing: 4) {
                                    Text(ZeitEintrag.formatiereDauer(bester.1))
                                        .font(.headline).fontWeight(.bold)
                                    Text("Laengster Tag")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    Text(bester.0.formatted(.dateTime.day().month()))
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.orange.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                        }
                    }
                    .listRowBackground(Color.clear)

                    // Tage
                    Section("Tage") {
                        ForEach(gruppiertNachTag, id: \.0) { datum, eintraege in
                            let tagesDauer = eintraege.compactMap { $0.dauer }.reduce(0, +)
                            let anteil = gesamtDauerMonat > 0 ? tagesDauer / gesamtDauerMonat : 0
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Text(datum.formatted(.dateTime.weekday(.abbreviated).day().month()))
                                        .font(.subheadline).fontWeight(.medium)
                                    Spacer()
                                    Text(ZeitEintrag.formatiereDauer(tagesDauer))
                                        .font(.subheadline).fontWeight(.bold)
                                        .foregroundColor(.blue)
                                }
                                GeometryReader { geo in
                                    ZStack(alignment: .leading) {
                                        RoundedRectangle(cornerRadius: 3)
                                            .fill(Color.blue.opacity(0.12))
                                            .frame(height: 6)
                                        RoundedRectangle(cornerRadius: 3)
                                            .fill(Color.blue)
                                            .frame(width: geo.size.width * anteil, height: 6)
                                    }
                                }
                                .frame(height: 6)
                                Text("\(eintraege.count) Eintraege  \(Int(anteil * 100))% des Monats")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
            }
            .navigationTitle("Monatsuebersicht")
        }
    }
}

extension Calendar {
    func startOfMonth(for date: Date) -> Date {
        let c = dateComponents([.year, .month], from: date)
        return self.date(from: c) ?? date
    }
}
