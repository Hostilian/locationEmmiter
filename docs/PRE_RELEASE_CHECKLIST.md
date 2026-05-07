# Pre-Release Checklist and Action Plan

This document outlines the critical steps and requirements for upgrading the APK version and preparing the **locationEmmiter** application for a successful public release and customer deployment.

## 1. Technical & Versioning Updates
| Item | Owner | Deadline | Success Criteria | Evidence of Completion |
| :--- | :--- | :--- | :--- | :--- |
| **Upgrade APK Version Code** | Lead Developer | T-14 Days | `versionCode` in `build.gradle` incremented from current (1). | Git commit in `web/peer-map/android/app/build.gradle`. |
| **Upgrade APK Version Name** | Lead Developer | T-14 Days | `versionName` in `build.gradle` updated (e.g., to "1.1.0"). | Git commit in `web/peer-map/android/app/build.gradle`. |
| **Sync Versioning** | Lead Developer | T-14 Days | `package.json` and `firmware` versions match APK release version. | `package.json` version bump; `lep_v1.h` / `lep_v2.h` version check. |
| **ProGuard/R8 Review** | Lead Developer | T-10 Days | `proguard-rules.pro` updated to ensure no critical code is stripped. | Successful release build with no runtime crashes. |

## 2. Feature Testing & Quality Assurance
| Item | Owner | Deadline | Success Criteria | Evidence of Completion |
| :--- | :--- | :--- | :--- | :--- |
| **End-to-End Regression** | QA Lead | T-7 Days | All smoke tests and E2E suites pass on physical hardware. | Playwright report; manual test log in `docs/FIELD_TEST_MATRIX.md`. |
| **Localization Verification** | UX Lead | T-7 Days | All UI strings translated (EN, FR, ES) and fit within bounds. | Screenshot audit of all app screens in all 3 languages. |
| **Accessibility Audit** | UX Lead | T-7 Days | App meets WCAG 2.1 Level AA (Contrast, Screen Readers, Touch Targets). | Accessibility scanner report (e.g., TalkBack/VoiceOver logs). |
| **Hardware Interop** | Lead Developer | T-7 Days | App correctly interfaces with all supported ESP32-LoRa boards. | Interop matrix check in `docs/BOARDS.md`. |

## 3. Legal & Compliance
| Item | Owner | Deadline | Success Criteria | Evidence of Completion |
| :--- | :--- | :--- | :--- | :--- |
| **Privacy Policy Review** | Legal Counsel | T-21 Days | Privacy policy updated to reflect current data collection (BLE, GPS). | Published URL in app store and "About" section. |
| **GDPR/CCPA Compliance** | Legal Counsel | T-21 Days | Data deletion and "Right to be Forgotten" workflows verified. | Audit log of manual/automated deletion request handling. |
| **Terms of Service Update**| Legal Counsel | T-21 Days | TOS includes LoRa broadcast limitations and safety disclaimers. | Updated `yc-application/LEGAL_TERMS.md`. |
| **Export Control (ECCN)** | Compliance | T-21 Days | Encryption (AES-GCM in `lep_crypto`) classified (e.g., 5D992). | Documentation in `yc-application/COMPLIANCE.md`. |

## 4. Licensing & Attribution
| Item | Owner | Deadline | Success Criteria | Evidence of Completion |
| :--- | :--- | :--- | :--- | :--- |
| **Dependency License Audit**| Lead Developer | T-14 Days | All NPM/Gradle/PIO licenses (MIT, Apache, etc.) are compatible. | Generated `THIRD_PARTY_LICENSES.md` or similar attribution file. |
| **License Attribution UI** | Lead Developer | T-10 Days | Licenses visible to users within the app's "Open Source" section. | Verification of "Licenses" menu item in Peer Map app. |

## 5. Security & Vulnerability Management
| Item | Owner | Deadline | Success Criteria | Evidence of Completion |
| :--- | :--- | :--- | :--- | :--- |
| **Static Analysis (SAST)** | Security Lead | T-14 Days | CodeQL and Semgrep scans return 0 high/critical issues. | GitHub Actions Security tab summary. |
| **Dependency Scanning** | Security Lead | T-14 Days | No critical CVEs in production dependencies. | Dependabot/Snyk/`npm audit` clean report. |
| **Penetration Testing** | Security Lead | T-10 Days | Dynamic analysis of BLE ingest and Backend API completed. | Internal security audit report; remediation of identified bugs. |
| **Secret Scanning** | Security Lead | T-14 Days | No API keys or credentials committed to repository. | Gitleaks/Secret-scan workflow report. |

## 6. App Store & Marketing
| Item | Owner | Deadline | Success Criteria | Evidence of Completion |
| :--- | :--- | :--- | :--- | :--- |
| **Metadata Review** | Marketing Lead | T-10 Days | App title, description, and keywords optimized for search. | Staged metadata in Play Store Console. |
| **Store Screenshots** | Design Lead | T-10 Days | High-quality screenshots for 5", 7", and 10" devices in all languages. | Uploaded assets in Play Store Console. |
| **Promotional Material** | Marketing Lead | T-7 Days | "How-it-works" video and pitch assets ready for launch. | Link to `tools/pitch-assets/index.html` or YouTube. |

## 7. Backend & Infrastructure
| Item | Owner | Deadline | Success Criteria | Evidence of Completion |
| :--- | :--- | :--- | :--- | :--- |
| **Scalability Load Test** | DevOps Lead | T-10 Days | Backend handles 10x expected initial concurrent users. | Load test report (e.g., k6 or JMeter results). |
| **Monitoring & Alerting** | DevOps Lead | T-10 Days | Health checks and error rate alerts configured (e.g., Sentry). | Monitoring dashboard (e.g., CloudWatch/Grafana) active. |
| **Rollback Plan** | DevOps Lead | T-14 Days | Database migration and deployment rollbacks tested and verified. | Verified rollback procedure in `docs/RUNBOOK_RELEASE_AND_INCIDENTS.md`. |

## 8. Customer Support & Documentation
| Item | Owner | Deadline | Success Criteria | Evidence of Completion |
| :--- | :--- | :--- | :--- | :--- |
| **Public FAQs** | Support Lead | T-7 Days | Documentation for common issues (pairing, LoRa range, battery). | Published FAQ on landing page or support portal. |
| **Contact Channels** | Support Lead | T-7 Days | Email and/or Discord support channels monitored and active. | Test message successfully received and replied to. |
| **User Manual** | Support Lead | T-7 Days | PDF or web-based "Quick Start Guide" available. | Link in app and on website. |

## 9. Final Cleanup & Pre-Flight
| Item | Owner | Deadline | Success Criteria | Evidence of Completion |
| :--- | :--- | :--- | :--- | :--- |
| **Remove Debug Logs** | Lead Developer | T-3 Days | All `console.log` and `ESP_LOGD` calls removed/disabled. | Code review of final release branch. |
| **Dead Code Removal** | Lead Developer | T-3 Days | Unused components and trial features removed. | Reduced bundle size; clean linting. |
| **Final Release Build** | Lead Developer | T-2 Days | Signed Release APK generated and verified. | `app-release.apk` artifact ready for upload. |
