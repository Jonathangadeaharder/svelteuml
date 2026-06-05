# ADR-004: Testing Strategy — Vitest, Stryker

**Status:** Accepted  
**Date:** 2026-05-17  
**Deciders:** Project maintainers
**Authors:** Jonathan Gadea Harder
**Reviewers:** Jonathan Gadea Harder

## Context

SvelteUML is a static analysis tool that parses ASTs and generates diagrams. Testing must cover logic correctness (unit), pipeline integration, and output correctness (golden tests). The tool has no UI, so E2E testing is limited to CLI behavior.

## Decision

### Test Framework: Vitest

- **Vitest** v3 with `@vitest/coverage-v8`. Prohibited: Jest, Mocha, Jasmine.
- Compatibility mode with `globals: true` for `describe`/`it`/`expect`
- Pool: `forks` with `singleFork: true` (avoids port conflicts in integration tests)
- Test exclusion: `tests/integration/`, `tests/e2e/`, `node_modules/`, `.stryker-tmp/`

### Coverage Thresholds

| Metric | Minimum | Instrumentation |
|--------|---------|-----------------|
| Branches | 70% | Required (hard fail) |
| Lines | 80% | Required |
| Functions | 80% | Required |
| Statements | 80% | Required |

Per-file overrides: `plantuml-encoder.ts` and `svelte-to-tsx.ts` require ≥80% branches.

Coverage excludes barrel files (`src/**/index.ts`), the CLI entry point (`src/cli.ts`), and specific type files (`src/types/ast.ts`, `src/types/config.ts`, `src/types/pipeline.ts`).

### Test Categories

1. **Unit Tests** (`tests/` mirroring `src/`)
   - Pure logic: import scanning, edge building, diagram rendering, segment parsing
   - No network/disk I/O in unit tests (use in-memory ts-morph projects)
   - Property-based testing via `fast-check` for edge cases

2. **Integration Tests** (`tests/integration/`)
   - Full pipeline runs against fixture projects (pre-built SvelteKit scaffolds)
   - Golden file comparison for PlantUML output
   - Svelte 5 rune detection end-to-end

3. **E2E Tests** (`tests/e2e/`)
   - CLI invocation tests (`svelteuml <target> --flags`)
   - Exit codes, stdout/stderr, file output verification
   - Watch mode lifecycle (start, detect change, stop)

4. **Golden Tests**
   - Pre-built fixture projects in `tests/fixtures/`
   - Expected `.puml` output stored alongside fixtures
   - Snapshot-style comparison on every test run

### Mutation Testing: Stryker

- **Stryker** v9 with `@stryker-mutator/vitest-runner`
- Incremental mutation testing on PRs (changed files only) via `pr-gate.yml`
- Full mutation test suite on push to main via `merge-gate.yml`
- Incremental mode with GitHub Actions caching
- Mutates: `src/discovery/`, `src/parsing/`, `src/extraction/`, `src/dependency/`, `src/emission/`, `src/cli/`
- Excludes `StringLiteral` mutations

### What We Don't Test (Deliberately)

- No Playwright E2E (no browser UI to test)
- No visual regression tests (PlantUML output is text, compared via golden files)
- No performance benchmarks in CI (manual profiling only)

## Consequences

**Positive:**
- Branch coverage (70%) balances quality with PR velocity in AST-heavy code
- Golden tests catch regressions in PlantUML output format
- Property-based testing finds edge cases human-written tests miss

**Negative:**
- Branch coverage at 70% may miss some edge cases; per-file overrides mitigate this for critical modules
- Integration tests require fixture projects that must be kept in sync with SvelteKit versions
- Mutation testing is slow (~5-10x) even with incremental mode

**Neutral:**
- In-memory ts-morph projects in unit tests avoid filesystem dependencies
- Golden file diffs require human review when PlantUML format intentionally changes
