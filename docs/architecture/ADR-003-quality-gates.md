# ADR-003: Quality Gates — CI/CD Workflows for PR and Merge

**Status:** Accepted  
**Date:** 2026-05-17  
**Deciders:** Project maintainers
**Authors:** Jonathan Gadea Harder
**Reviewers:** Jonathan Gadea Harder

## Context

The project needs automated quality enforcement on every pull request and merge to main. Multiple CI approaches were possible: GitHub Actions only, external CI services, or self-hosted runners.

## Decision

### Runner Infrastructure

**Self-hosted macOS ARM64 runner** for all CI jobs. Rationale:
- macOS runner matches local development environment
- Avoids macOS-specific CI minutes costs
- Full control over installed tooling (pnpm, Node.js versions)

### CI Workflows

Three workflows plus supporting jobs:

#### `pr-gate.yml` (PR + push to main)
Runs on PRs targeting main and on push to main. Jobs:

| Job | Command | Purpose |
|-----|---------|---------|
| `lint` | `pnpm dlx @biomejs/biome check src/` | Code style and anti-pattern detection |
| `typecheck` | `pnpm exec tsc --noEmit` | Type safety verification |
| `test` | `pnpm run test:coverage` | Vitest with branch coverage ≥70% (matrix: Node 22) |
| `build` | `pnpm run build` | TypeScript compilation + dist output verification |
| `smoke` | `node dist/cli.js --help/--version` | CLI smoke test after build |
| `mutation` | `pnpm exec stryker run --incremental` | Incremental mutation testing on changed files (PR only) |
| `integration` | placeholder | Integration tests (main branch only) |
| `gitleaks` | `gitleaks detect --source .` | Secrets scanning |
| `trivy` | Trivy filesystem scan | Vulnerability scanning (SARIF) |
| `structure` | `structurelint .` | Repository structure validation |
| `vitest-lint` | `vitest-linter .` | Test quality linting |
| `required-checks` | Gate job | Verifies all required jobs passed |

`build` depends on `typecheck` + `test`. `smoke` depends on `build`. `mutation` depends on `test`.

#### `merge-gate.yml` (push to main)
Reuses `pr-gate.yml` via `workflow_call`, then adds:

| Job | Purpose |
|-----|---------|
| `codeql` | CodeQL security analysis (JavaScript/TypeScript) |
| `mutation` | Full Stryker mutation test suite (incremental) |
| `integration` | `pnpm run test:integration` |
| `snapshot-diff` | Generate & post PlantUML snapshot diffs |
| `repo-structure` | Repository structure validation |
| `sonarcloud` | SonarCloud code quality analysis |
| `publish` | npm publish on version tags |

#### `mutation-test.yml` (push to main)
Standalone full Stryker mutation test suite with incremental caching. Duplicates merge-gate mutation job for independent triggering.

### Security Scanning

- **Gitleaks**: Runs on every PR to detect committed secrets
- **Trivy**: Filesystem vulnerability scan on every PR (HIGH/CRITICAL severity, non-blocking SARIF upload)
- **CodeQL**: Runs on push to main for JavaScript/TypeScript security analysis

### Code Quality

- **SonarCloud**: Configured in merge-gate, runs `sonar-scanner` with `SONAR_TOKEN` secret
- **Structurelint**: Custom repository structure validation tool, runs on PR and merge
- **Vitest-linter**: Test quality linting on every PR

### Automated Code Review

- **PR-Agent**: Configured in `.github/workflows/pr-agent.yml` (slash-command only: `/review`, `/describe`, `/improve`, `/ask`). Disabled by default, enabled via `ENABLE_PR_AGENT` repository variable.

## Consequences

**Positive:**
- Every PR gets lint, typecheck, test+coverage, build, secrets scan, and structure validation
- Self-hosted runner provides consistent environment with local dev
- Incremental mutation testing runs on PRs (changed files only), full suite on merge
- Security scanning (Gitleaks, Trivy, CodeQL) catches vulnerabilities early
- SonarCloud provides continuous code quality metrics

**Negative:**
- Self-hosted runner maintenance burden (OS updates, toolchain upgrades)
- Many CI jobs increase PR feedback latency
- PR-Agent requires LM Studio for local model inference

**Neutral:**
- Coverage threshold at 70% branches balances quality with PR velocity
- Single Node version matrix (22) — no cross-version testing
