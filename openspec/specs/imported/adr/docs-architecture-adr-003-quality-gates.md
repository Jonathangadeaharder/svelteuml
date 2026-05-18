# ADR-003: Quality Gates — CI/CD Workflows for PR and Merge

> Imported legacy ADR artifact from `docs/architecture/ADR-003-quality-gates.md`. Keep future lifecycle work in OpenSpec.

**Status:** Accepted  
**Date:** 2026-05-17  
**Deciders:** Project maintainers

## Context

The project needs automated quality enforcement on every pull request and merge to main. Multiple CI approaches were possible: GitHub Actions only, external CI services, or self-hosted runners.

## Decision

### Runner Infrastructure

**Self-hosted macOS runner** for all CI jobs. Rationale:
- macOS runner matches local development environment
- Avoids macOS-specific CI minutes costs
- Full control over installed tooling (pnpm, Node.js versions)

### CI Workflows

Two workflows, plus a mutation testing workflow:

#### `ci.yml` (PR + push to main)
Runs four parallel jobs on PR and push to main:

| Job | Command | Purpose |
|-----|---------|---------|
| `lint` | `pnpm biome check src/` | Code style and anti-pattern detection |
| `typecheck` | `pnpm exec tsc --noEmit` | Type safety verification |
| `test` | `pnpm run test:coverage` | Vitest with branch coverage ≥90% (matrix: Node 20, 22) |
| `build` | `pnpm run build` | TypeScript compilation + dist output verification |

`build` depends on `typecheck` + `test` (sequential after those pass).

#### `mutation-test.yml` (push to main only)
Full Stryker mutation test suite with incremental caching. Only runs on main because:
- Mutation testing is expensive (~5-10x test time)
- Incremental mode reuses previous results
- Coverage thresholds already enforced per-PR

### Quality Gates Not Implemented (Deferred)

- **SonarCloud**: Not yet configured. Will be added when SonarCloud project is set up.
- **PR-Agent / CodeRabbit**: Not configured. Manual review process for now.
- **Branch protection rules**: Not enforced on GitHub. Will be added when team workflow stabilizes.

## Consequences

**Positive:**
- Every PR gets lint, typecheck, test+coverage, and build verification
- Self-hosted runner provides consistent environment with local dev
- Mutation testing runs post-merge (non-blocking for PR velocity)

**Negative:**
- Self-hosted runner maintenance burden (OS updates, toolchain upgrades)
- No security scanning (Trivy, CodeQL, Gitleaks) — deferred to future PR
- No automated code review (PR-Agent/CodeRabbit) — deferred

**Neutral:**
- Coverage threshold at 90% branches may cause PR friction but ensures quality
- Matrix testing on Node 20 + 22 catches version-specific issues
