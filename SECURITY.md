# Security policy

## Reporting

If you believe you have found a security vulnerability, please **do not** open a public GitHub issue.

Instead, email maintainers with:

- A short description of the issue and impact
- Steps to reproduce (proof-of-concept if possible)
- Affected components (e.g. `shared/packet`, `web/peer-map`, firmware, Android shell)

We will acknowledge receipt within a few business days where possible.

## Scope (high level)

- **On-air format**: LEP v1 is intentionally plaintext with CRC only; it is not confidential or authenticated. Treat as broadcast telemetry, not a secret channel.
- **Dependencies**: supply-chain issues in npm / Gradle / PlatformIO dependencies should be reported the same way if they affect this repo’s usage.

## Automated checks

- CI includes scheduled and PR security scanning workflows (`CodeQL`, `gitleaks`).
- Dependency freshness is tracked through Dependabot updates in `.github/dependabot.yml`.
- For suspected secret exposure, rotate credentials immediately, then open a private report.

## Supported versions

This repository is pre-1.0; security fixes land on the default branch. After tagging releases, critical fixes will be noted in `CHANGELOG.md`.
