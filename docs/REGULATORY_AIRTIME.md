# LoRa time on air and duty cycle (planning)

EU **863–870 MHz** ISM use is governed by **ETSI EN 300 220** and sub-band rules (**power**, **duty cycle**, sometimes **LBT**). This project does **not** provide legal compliance sign-off.

## Quick estimate

Use the calculator:

```bash
node tools/lora-airtime.mjs --sf 9 --bw 125 --cr 7 --payload 72
```

Tune `--payload` to your **on-air byte length** (e.g. LRM1 header + LEP full frame). Higher **SF** → longer **time on air** → fewer transmissions allowed per hour under a given duty limit.

## Relation to this firmware

[`lora_config.h`](../firmware/esp32-lora/include/lora_config.h) sets **SF / BW / CR** for RadioLib `begin()`. TX and RX must match. If you change SF for range, re-run the airtime tool and check your **regional** limits.

## References

- [REFERENCES.md](REFERENCES.md) — ETSI / TTN / regional links  
- [FIELD_TEST_MATRIX.md](FIELD_TEST_MATRIX.md) — field validation  
