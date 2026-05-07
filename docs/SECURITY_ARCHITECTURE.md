# Location Emitter Security & Threat Model

This document outlines the security architecture for the Location Emitter protocol (`lep_v1` and the upcoming `lep_v2`). Given that this system is designed for high-stakes, off-grid peer tracking and SOS deployments, robust mitigation of adversarial threats is a core design pillar.

## Threat Landscape

The system operates over unencrypted ISM bands (LoRa 868/915MHz) and Bluetooth Low Energy (BLE), making it inherently susceptible to the following attack vectors:

### 1. Packet Spoofing (Impersonation)
- **Threat:** An adversary constructs a forged `lep_v1` packet and transmits it over LoRa to impersonate a legitimate node (e.g., transmitting a false SOS or misleading GPS coordinates).
- **Impact:** High. False rescue deployments or misdirection of peers.
- **Current Status (v1):** Vulnerable. `lep_v1` relies purely on a CRC16 check for data integrity, not authenticity.

### 2. Replay Attacks
- **Threat:** An adversary records a valid SOS or coordinate packet from the airwaves and retransmits it hours or days later.
- **Impact:** Moderate. Can cause confusion, though `unixTime` within the payload mitigates this if receivers strictly enforce timestamp bounds.
- **Current Status (v1):** Partially mitigated. The `unixTime` field (seconds since epoch) allows receiving nodes to drop packets older than a configured threshold (e.g., 30 minutes).

### 3. Eavesdropping (Privacy Loss)
- **Threat:** Any node listening on the same LoRa frequency and spreading factor can decode the plain-text `lep_v1` packets, extracting precise GNSS coordinates of the users.
- **Impact:** High. Loss of privacy for all active users.
- **Current Status (v1):** Vulnerable. `lep_v1` is broadcast in the clear.

### 4. Denial of Service (Mesh Flooding)
- **Threat:** An attacker blasts the RF channel with thousands of high-power, valid-looking mesh packets, triggering the `RelayEngine` on legitimate nodes and causing them to exhaust their duty cycle / battery.
- **Impact:** High. Exhausts mesh capacity and silences legitimate SOS beacons.
- **Current Status (v1):** Partially mitigated. `RelayEngine` deduplicates payloads via FNV-1a hashing and strictly limits relaying frequency to 1 packet per 30 seconds per Device ID (`RELAY_GAP_NORMAL_MS`).

---

## Mitigation Roadmap: `lep_v2` Architecture

To achieve Y Combinator enterprise readiness and military-grade privacy, the `lep_v2` protocol will introduce the following cryptographic primitives:

### Symmetric Payload Encryption (AES-128-GCM or ChaCha20-Poly1305)
- **Implementation:** The 24-byte payload (excluding the Device ID header) will be encrypted using a pre-shared group key.
- **Benefit:** Completely eliminates eavesdropping. Only nodes provisioned with the group key via the mobile app (over secure BLE bonding) can decrypt the coordinates.

### Cryptographic Signatures & Authenticated Encryption (AEAD)
- **Implementation:** The GCM/Poly1305 MAC tag will be appended to the packet.
- **Benefit:** Solves Packet Spoofing. Any modification to the packet by an adversary will invalidate the MAC tag, causing the receiver to silently drop the packet before passing it to the UI.

### Strict Nonce / Timestamp Validation
- **Implementation:** The encryption nonce will be derived from the `unixTime` and the sender's `deviceId`.
- **Benefit:** Completely eliminates Replay Attacks. A retransmitted packet will either fail timestamp validation (too old) or fail nonce validation (duplicate nonce).

### CSMA/CA (Carrier-Sense Multiple Access with Collision Avoidance)
- **Implementation:** At the firmware level (ESP32 `RadioLib`), nodes will perform a Clear Channel Assessment (CCA) before transmitting. If the channel is busy, they will back off for a randomized jitter period.
- **Benefit:** Drastically reduces self-inflicted Denial of Service (collisions) in dense mesh deployments.
