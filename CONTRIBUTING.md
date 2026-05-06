# Contributing

Thanks for helping improve Location Emitter.

## Quick start

- **Packet + mesh (TypeScript)**  
  From repo root: `npm install`, `npm test`, `npm run build`.

- **Decode / airtime CLIs**  
  `npm run build` then `npm run decode-packet -- --help`, `npm run airtime -- --help`.

- **Peer map (web)**  
  `cd web/peer-map && npm install && npm run dev` (or `npm run build`).

- **Android (Capacitor)**  
  See [docs/ANDROID_STUDIES.md](docs/ANDROID_STUDIES.md) and `web/peer-map/README.md`.

- **ESP32 firmware**  
  See [docs/BOARDS.md](docs/BOARDS.md) and `firmware/esp32-lora/platformio.ini`.

## Pull requests

- Keep changes focused; link to an issue when possible.
- Run `npm test` at the root before pushing.
- For web: `npm run typecheck` and `npm run lint` under `web/peer-map` when those scripts exist.
- For firmware: build the relevant `pio run -e <env>` environment you touched.
- Enable local pre-commit checks once: `git config core.hooksPath .githooks`
- If you touch security-sensitive decode/ingest paths, include at least one negative test.

## Code style

- TypeScript: strict mode; prefer explicit types on public APIs.
- Follow existing formatting (Prettier + ESLint at repo root).
