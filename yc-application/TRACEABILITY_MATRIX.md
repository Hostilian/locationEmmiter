# Traceability Matrix

This matrix ensures every application requirement is backed by technical implementation, verification, and documentation.

| Requirement ID | Description | Checklist Item | Acceptance Test | Evidence Document |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-SEC-01** | End-to-end encryption for off-grid packets | [TASK_INVENTORY.md](file:///d:/CZUU/locationEmmiter/yc-application/TASK_INVENTORY.md#L11) | `lep_crypto_test.cpp` | [SECURITY_ARCHITECTURE.md](file:///d:/CZUU/locationEmmiter/docs/SECURITY_ARCHITECTURE.md) |
| **REQ-PRIV-01** | GDPR Compliance (Right to Erasure) | [COMPLIANCE.md](file:///d:/CZUU/locationEmmiter/yc-application/COMPLIANCE.md#L20) | `user_delete_workflow.test.ts` | `PRIVACY_POLICY.md` (Draft) |
| **REQ-SCAL-01** | Support 100+ concurrent mesh nodes | [UPGRADE_ROADMAP.md](file:///d:/CZUU/locationEmmiter/yc-application/UPGRADE_ROADMAP.md#L6) | [simulate-mesh.mjs](file:///d:/CZUU/locationEmmiter/tools/simulate-mesh.mjs) | [MESH_FRAME.md](file:///d:/CZUU/locationEmmiter/docs/MESH_FRAME.md) |
| **REQ-REG-01** | FCC Part 15 Compliance (915MHz) | [COMPLIANCE.md](file:///d:/CZUU/locationEmmiter/yc-application/COMPLIANCE.md#L11) | [lora-airtime.test.mjs](file:///d:/CZUU/locationEmmiter/tools/lora-airtime.test.mjs) | [REGULATORY_AIRTIME.md](file:///d:/CZUU/locationEmmiter/docs/REGULATORY_AIRTIME.md) |
| **REQ-LOC-01** | Multi-language support (ES, PT, FR) | [UPGRADE_ROADMAP.md](file:///d:/CZUU/locationEmmiter/yc-application/UPGRADE_ROADMAP.md#L13) | `i18n_smoke_test.ts` | [i18n.ts](file:///d:/CZUU/locationEmmiter/web/peer-map/src/i18n.ts) |
| **REQ-BAT-01** | 7-day battery life in beacon mode | [UPGRADE_ROADMAP.md](file:///d:/CZUU/locationEmmiter/yc-application/UPGRADE_ROADMAP.md#L29) | `power_consumption_test.ino` | [POWER_METRICS.md](file:///d:/CZUU/locationEmmiter/docs/POWER_METRICS.md) |

## Verification Key
- **Checklist Item**: Link to the specific line in the inventory or compliance docs.
- **Acceptance Test**: The script or test suite that validates the requirement.
- **Evidence Document**: The technical specification or regulatory filing.
