import Foundation
import SwiftData

@Model
class ZeitEintrag {
    var id: UUID
    var startzeit: Date
    var endzeit: Date?
    var datum: Date

    init(startzeit: Date = Date()) {
        self.id = UUID()
        self.startzeit = startzeit
        self.endzeit = nil
        self.datum = Calendar.current.startOfDay(for: startzeit)
    }

    var dauer: TimeInterval? {
        guard let ende = endzeit else { return nil }
        return ende.timeIntervalSince(startzeit)
    }

    var istAktiv: Bool { endzeit == nil }

    var dauerFormatiert: String {
        guard let d = dauer else { return "laeuft..." }
        return ZeitEintrag.formatiereDauer(d)
    }

    static func formatiereDauer(_ sekunden: TimeInterval) -> String {
        let gesamt = Int(max(0, sekunden))
        let h = gesamt / 3600
        let m = (gesamt % 3600) / 60
        let s = gesamt % 60
        if h > 0 {
            return String(format: "%02d:%02d:%02d Std", h, m, s)
        } else {
            return String(format: "%02d:%02d Min", m, s)
        }
    }
}
