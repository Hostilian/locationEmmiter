# Release and Incident Runbook

## Release Checklist (v1.1.0+)
1. **Version Bump**: Confirm `versionCode` and `versionName` in `build.gradle` and `package.json` match the release target.
2. **Pre-Release Audit**:
   - Run `npm audit` in `web/peer-map` and `backend`.
   - Verify `THIRD_PARTY_LICENSES.md` is up to date.
   - Run `npm test` and `npm run build` in `web/peer-map`.
3. **CI/CD Verification**:
   - Ensure GitHub Actions (CodeQL, Dependency Audit) are green on `main`.
4. **Artifact Generation**:
   - Build Android Release APK: `cd web/peer-map/android && ./gradlew assembleRelease`.
   - Build firmware binaries for supported boards (Heltec V3, T-Beam SX1262).
5. **Tagging**: Create and push tag `v1.1.0`.

## Rollback
1. Revert the problematic merge commit on `main`.
2. Re-run CI and re-tag with patch increment (e.g., `v1.1.1`).
3. Communicate impact window and mitigation in release notes.

## Incident Triage
1. Identify affected scope (`web/peer-map`, firmware env, shared codecs).
2. Preserve failing payload/log samples and exact commit SHA.
3. Classify severity:
   - **Sev1**: Safety-impacting decode or SOS regressions.
   - **Sev2**: Major feature unavailable (e.g., BLE pairing failure).
   - **Sev3**: Degraded UX/performance without data loss.
4. Patch with regression test before release.
