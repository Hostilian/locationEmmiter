# Modernize Location Emitter for 2026

Modernize the Location Emitter monorepo to meet 2026 standards for code structure, UI/UX, and dependency management. This includes refactoring the monolithic `main.ts`, refining the CSS for a "glassmorphism" aesthetic, and adding new features like live metrics and toast notifications.

## User Review Required

> [!IMPORTANT]
> - **Architectural Shift**: Splitting `main.ts` into modules (`ui.ts`, `map.ts`, `state.ts`, `logic.ts`) changes how the web app is structured but maintains the same functionality.
> - **Visual Overhaul**: Moving from a standard "clean" look to a more modern 2026 "glass" aesthetic might change some UI element positions slightly.

## Proposed Changes

### [Web App] Refactoring & Modernization

#### [main.ts](file:///D:/CZUU/locationEmmiter/web/peer-map/src/main.ts)
- Slim down to an entry point that initializes the modular components.
- Move event listeners and DOM references to `ui.ts`.
- Move map logic to `map.ts`.
- Move encode/decode orchestration to `logic.ts`.

#### [NEW] [ui.ts](file:///D:/CZUU/locationEmmiter/web/peer-map/src/ui.ts)
- Centralize all DOM element references using typed getters.
- Implement a simple "Toast" notification system for non-intrusive feedback.

#### [NEW] [map.ts](file:///D:/CZUU/locationEmmiter/web/peer-map/src/map.ts)
- Encapsulate Leaflet map initialization.
- Provide methods for plotting decode markers, encode markers, and managing layers.
- Implement "Live Metrics" overlay (distance to me).

#### [NEW] [state.ts](file:///D:/CZUU/locationEmmiter/web/peer-map/src/state.ts)
- Centralized reactive-like state for managing history, theme, and ingest status.

#### [index.html](file:///D:/CZUU/locationEmmiter/web/peer-map/index.html)
- Update CSS for "2026 glassmorphism" aesthetic (translucency, refined shadows, better spacing).
- Add placeholders for Toast notifications.

---

### [Monorepo] Dependency Management

#### [package.json](file:///D:/CZUU/locationEmmiter/package.json)
- Update global devDependencies (ESLint, Prettier, TypeScript).

#### [web/peer-map/package.json](file:///D:/CZUU/locationEmmiter/web/peer-map/package.json)
- Update Capacitor 7 dependencies to latest minor/patch.
- Update Vite, Vitest, and Playwright.
- Add `@capacitor/haptics` for better mobile feedback.

---

### [Firmware] ESP32-Lora

#### [platformio.ini](file:///D:/CZUU/locationEmmiter/firmware/esp32-lora/platformio.ini)
- Update `jgromes/RadioLib` to the latest stable (likely 7.x by 2026 standards, but I'll check).

## Verification Plan

### Automated Tests
- Run existing test suites: `npm test`
- Add new unit tests for `logic.ts` and `state.ts` in `web/peer-map/src`.
- Command: `npm test` (root) and `npm run test` (web/peer-map).

### Manual Verification
- **Build & Run Web**: `npm run dev` in `web/peer-map`.
- **UI/UX Audit**:
    - Verify dark/light mode transition is smooth.
    - Test Toast notifications on success (e.g., "Link copied", "Location encoded").
    - Verify "Live Metrics" shows distance between "Me" and a sample decoded packet.
- **Android**:
    - Build and run on an emulator/device.
    - Verify Haptic feedback on button taps (Plot, Locate).
