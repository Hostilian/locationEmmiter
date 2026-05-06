# iOS Blueprint

This scaffold defines a secure starting point for a native iOS app.

## Architecture
- SwiftUI entry + coordinator routing pattern.
- `@StateObject` ownership at scene root.
- Service protocols for testability and dependency inversion.

## Security Defaults
- Store sensitive values in Keychain, not `UserDefaults`.
- Enforce ATS defaults in `Info.plist`.
- Use explicit permission descriptions and background modes only when needed.

## Suggested Structure
- `LocationEmitterApp.swift`
- `Sources/AppCoordinator.swift`
- `Sources/ViewModels/`
- `Sources/Services/`
- `Tests/` for unit and snapshot/UI smoke tests
