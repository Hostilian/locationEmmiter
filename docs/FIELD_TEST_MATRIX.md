# Field test matrix

Use this checklist when validating **GNSS + RF** together. Record notes in a dated log (notebook or spreadsheet).

## Environments

| Scenario | GNSS expectation | RF (LoRa) expectation | BLE short expectation |
|----------|------------------|------------------------|------------------------|
| **Open field / desert** | Fast fix, low error | Longest range; note **km** if LOS to base | N/A or short range between testers |
| **Urban canyon** | Multipath, slow / degraded fix | Reduced range; try **roof relay** | May outperform LoRa *between* nearby sidewalks |
| **Mixed suburb** | Moderate | Intermediate range | Building-dependent |
| **Forest / dense trees** | Somewhat slower fix | Attenuated; height helps | Very short unless line-of-sight |

## Per-session procedure

1. **Cold start GNSS:** power-cycle emitter; log **time-to-first-fix** and **reported accuracy** (if available from module).
2. **Send beacons:** full packet on LoRa at planned interval (e.g. 30 s idle, 10 s SOS).
3. **Walk / drive legs:** predefine **A → B** distances (e.g. 100 m, 500 m, 1 km) and note where link drops.
4. **Log RSSI/SNR** if your radio provides it (LoRa).
5. **Capture ground truth** (phone with online maps is fine for comparison) for **horizontal error** estimate.

## Power budget (emitter)

| Mode | Parameter to measure | Target idea |
|------|----------------------|-------------|
| **Idle beacon** | Average mA during TX burst + sleep | Document duty cycle vs battery mAh |
| **SOS** | Duty cycle under SOS rules | Must not thermal-throttle PA or flatten small cells in &lt; planned mission time |
| **GNSS always-on** | mA | Often dominates; consider **fix-then-sleep** if module supports it |

Record: **battery chemistry**, **mAh**, **hours until cutoff**, and **beacon period**.

## Success criteria (suggested starting points)

- **LoRa (open terrain):** decode at **≥ 1 km** with handheld receiver and **stock antennas** at ground level (adjust upward for your band/power legal limit).
- **Decode integrity:** **0 CRC failures** in 100 consecutive frames in bench testing; field **&lt; 1%** corrupted frames after FEC (if any).
- **SOS path:** raising **SOS** causes relay nodes to forward within **2×** normal beacon latency.

## Safety

Test on **unused** channels or compliant test harnesses; avoid interfering with manned services. Follow local RF rules.
