import SwiftUI
import SwiftData
import UserNotifications

@main
struct ZeitApp: App {
    let container: ModelContainer

    init() {
        do {
            container = try ModelContainer(for: ZeitEintrag.self)
        } catch {
            fatalError("Fehler")
        }
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in
                    if url.scheme == "zeitapp" {
                        self.toggle()
                    }
                }
        }
        .modelContainer(container)
    }

    @MainActor
    func toggle() {
        let context = container.mainContext
        let einst = Einstellungen.shared
        do {
            let aktive = try context.fetch(
                FetchDescriptor<ZeitEintrag>(predicate: #Predicate { $0.endzeit == nil })
            )
            if let aktiv = aktive.first {
                let ende = einst.tatsaechlicheEndzeit(tippZeit: Date())
                aktiv.endzeit = ende
                try context.save()
                let dauer = aktiv.dauer ?? 0
                let heute = Calendar.current.startOfDay(for: Date())
                let alleHeute = try context.fetch(
                    FetchDescriptor<ZeitEintrag>(predicate: #Predicate { $0.datum == heute && $0.endzeit != nil })
                )
                let tagesgesamt = alleHeute.compactMap { $0.dauer }.reduce(0, +)
                NotificationManager.shared.sendeStoppBenachrichtigung(dauer: dauer, tagesgesamt: tagesgesamt)
            } else {
                let start = einst.tatsaechlicheStartzeit(tippZeit: Date())
                let neu = ZeitEintrag(startzeit: start)
                context.insert(neu)
                try context.save()
                NotificationManager.shared.sendeStartBenachrichtigung(startzeit: start)
            }
        } catch {
            print("Fehler: \(error)")
        }
    }
}
