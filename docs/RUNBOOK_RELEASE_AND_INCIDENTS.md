# Release and Incident Runbook

## Release Checklist
1. Confirm CI green on `main`.
2. Run local verification:
   - `npm test`
   - `npm run build`
   - `npm run verify:decode`
3. Build Android debug artifact:
   - `cd web/peer-map/android && ./gradlew assembleDebug`
4. Build firmware targets impacted by the change:
   - `cd firmware/esp32-lora && pio run -e <env>`
5. Create and push tag `vX.Y.Z`.

## Rollback
1. Revert the problematic merge commit on `main`.
2. Re-run CI and re-tag with patch increment if needed.
3. Communicate impact window and mitigation in release notes.

## Incident Triage
1. Identify affected scope (`web/peer-map`, firmware env, shared codecs).
2. Preserve failing payload/log samples and exact commit SHA.
3. Classify severity:
   - Sev1: safety-impacting decode or SOS regressions.
   - Sev2: major feature unavailable.
   - Sev3: degraded UX/performance without data loss.
4. Patch with regression test before release.
