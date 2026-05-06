import SwiftUI

struct RootView: View {
  @EnvironmentObject var coordinator: AppCoordinator

  var body: some View {
    NavigationStack {
      VStack(alignment: .leading, spacing: 12) {
        Text("Location Emitter")
          .font(.title2)
        Text(coordinator.isReady ? "Ready" : "Initializing")
          .foregroundStyle(.secondary)
      }
      .padding()
      .navigationTitle("Peer Map")
    }
  }
}
