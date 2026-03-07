import Foundation
import UserNotifications

class NotificationManager {
    static let shared = NotificationManager()
    private init() {}

    func sendeStartBenachrichtigung(startzeit: Date) {
        let content = UNMutableNotificationContent()
        content.title = "Aufzeichnung gestartet"
        content.body = "Beginn: \(startzeit.formatted(date: .omitted, time: .shortened))"
        content.sound = .default
        sende(content: content, id: "start")
    }

    func sendeStoppBenachrichtigung(dauer: TimeInterval, tagesgesamt: TimeInterval) {
        let content = UNMutableNotificationContent()
        content.title = "Aufzeichnung gestoppt"
        content.body = "Dauer: \(ZeitEintrag.formatiereDauer(dauer))  |  Heute gesamt: \(ZeitEintrag.formatiereDauer(tagesgesamt))"
        content.sound = .default
        sende(content: content, id: "stopp")
    }

    private func sende(content: UNMutableNotificationContent, id: String) {
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 0.5, repeats: false)
        let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)
    }
}
