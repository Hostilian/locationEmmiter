# App Store & Regulatory Compliance Documentation

This document provides justifications for sensitive permissions and data safety disclosures required by the Apple App Store and Google Play Store.

## 1. Apple App Store: Guideline 5.5 (Background Location)

**App ID**: `com.locationemitter.peermap`

### Background Location Justification
Location Emitter requires the `Location` background mode to ensure continuous tracking and safety during off-grid operations. 

- **Core Feature**: The primary value proposition is real-time peer-to-peer tracking and SOS broadcasting via LoRa mesh hardware.
- **Critical Use Case**: Users rely on this app for safety during search-and-rescue (SAR), group hiking, and expeditions where cellular service is unavailable. 
- **Necessity**: To maintain a persistent "lifeline" to the mesh network, the app must periodically update the user's coordinates and transmit them via the paired Bluetooth LoRa transmitter, even when the device is in the user's pocket or the screen is off.
- **User Control**: Users can explicitly start and stop tracking via the "Connect" toggle in the main interface. A persistent notification (on Android) and the location indicator (on iOS) provide clear transparency when background tracking is active.

## 2. iOS Privacy Label (Privacy Policy Summary)

| Data Category | Purpose | Data Linked to User? |
| :--- | :--- | :--- |
| **Location** | App Functionality (Mesh Tracking) | No (Anonymous/Local-Only) |
| **Device ID** | App Functionality (Mesh ID) | No (Randomized/Local-Only) |
| **Diagnostics** | Analytics (Performance monitoring) | No |

*Note: All mesh data is local-first and does not leave the user's private mesh network unless they explicitly export logs.*

## 3. Google Play Store: Data Safety Form

### Data Collection & Sharing
- **Is any data shared?**: No. The app is designed for private, off-grid use.
- **Is any data collected?**: 
    - **Location**: Collected only for the purpose of broadcasting to the mesh and displaying on the map.
    - **Device ID**: An opaque ID is used for peer identification within the mesh.
- **Is data encrypted in transit?**: Yes, if using LEP v2. The local Bluetooth link uses standard BLE encryption.
- **Can users request data deletion?**: Yes. The app provides a "Delete All History" and "Delete Account" (Local) feature.

### Permissions Requested
- `ACCESS_FINE_LOCATION`: Required for accurate positioning.
- `ACCESS_BACKGROUND_LOCATION`: Required for continuous safety tracking.
- `BLUETOOTH_SCAN/CONNECT`: Required to communicate with LoRa mesh hardware.
- `POST_NOTIFICATIONS`: Required for SOS alerts and background service status.

## 4. Permission Pre-Prompts (Educational)

To improve user trust and compliance, the app implements "educational pre-prompts" before triggering system permission dialogs:
1. **Bluetooth Prompt**: Explains that BLE is required to communicate with the LoRa transmitter.
2. **Location Prompt**: Explains that background location is necessary for the "SOS Lifeline" feature.
