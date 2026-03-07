import SwiftUI
import UserNotifications

class NotificationDelegate: NSObject, UNUserNotificationCenterDelegate, ObservableObject {
    static let shared = NotificationDelegate()
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler handler: @escaping (UNNotificationPresentationOptions) -> Void) {
        handler([.banner, .sound])
    }
}

struct ContentView: View {
    var body: some View {
        TabView {
            ScanView()
                .tabItem { Label("Starten", systemImage: "play.circle.fill") }
            VerlaufView()
                .tabItem { Label("Verlauf", systemImage: "list.bullet.rectangle") }
            MonatsView()
                .tabItem { Label("Monat", systemImage: "chart.bar.fill") }
            EinstellungenView()
                .tabItem { Label("Einstellungen", systemImage: "gearshape.fill") }
        }
        .onAppear {
            UNUserNotificationCenter.current().delegate = NotificationDelegate.shared
        }
    }
}
