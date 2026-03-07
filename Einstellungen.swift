import Foundation

class Einstellungen: ObservableObject {
    static let shared = Einstellungen()

    @Published var startVerzoegerungSekunden: Int {
        didSet { UserDefaults.standard.set(startVerzoegerungSekunden, forKey: "startV") }
    }
    @Published var stoppVorlaufSekunden: Int {
        didSet { UserDefaults.standard.set(stoppVorlaufSekunden, forKey: "stoppV") }
    }

    private init() {
        self.startVerzoegerungSekunden = UserDefaults.standard.integer(forKey: "startV")
        self.stoppVorlaufSekunden = UserDefaults.standard.integer(forKey: "stoppV")
    }

    func tatsaechlicheStartzeit(tippZeit: Date) -> Date {
        tippZeit.addingTimeInterval(TimeInterval(startVerzoegerungSekunden))
    }

    func tatsaechlicheEndzeit(tippZeit: Date) -> Date {
        tippZeit.addingTimeInterval(-TimeInterval(stoppVorlaufSekunden))
    }
}
