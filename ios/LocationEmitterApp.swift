import SwiftUI

@main
struct LocationEmitterApp: App {
  @StateObject private var coordinator = AppCoordinator()

  var body: some Scene {
    WindowGroup {
      RootView()
        .environmentObject(coordinator)
    }
  }
}
