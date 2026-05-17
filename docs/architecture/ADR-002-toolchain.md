# ADR-002: Toolchain — pnpm, Biome, TypeScript, Svelte-Check

**Status:** Accepted  
**Date:** 2026-05-17  
**Deciders:** Project maintainers

## Context

The project requires a modern JavaScript toolchain that enforces code quality, type safety, and consistent formatting across a TypeScript ESM codebase. Multiple tools were available for each concern.

## Decision

### Package Manager: pnpm

- **pnpm** is the sole package manager. Prohibited: `npm`, `yarn`.
- `pnpm@10.33.2` with `onlyBuiltDependencies: ["esbuild", "svelte", "@biomejs/biome"]`
- Corepack-enabled CI workflow

### Linting & Formatting: Biome

- **Biome** v2 for both linting and formatting. Prohibited: `eslint`, `prettier`, `ruff` (Python not used).
- Single configuration, zero plugins needed
- Run as `pnpm biome check src/` in CI (lint job) and `pnpm biome format --write src/` locally
- lint-staged configured to auto-format staged files

### Type Checking: TypeScript Compiler (tsc)

- **tsc --noEmit** for type checking. Prohibited: none (standard).
- Strict ESM with `Node16` module resolution
- Separate `build` step emits to `dist/`

### Additional Checks

- **Husky** + `lint-staged` for pre-commit gating
- **commitlint** with conventional commit rules (`@commitlint/config-conventional`)
- **svelte-check** available but not in CI loop (svelte files are converted to TSX via svelte2tsx, validated by tsc)

### Dependency Management

- **Renovate** / **Dependabot** configured for automated updates
- **changesets** for version management and changelog generation

## Consequences

**Positive:**
- Biome replaces both eslint and prettier — simpler config, faster execution
- pnpm ensures deterministic installs with content-addressable storage
- lint-staged prevents non-conformant code from being committed

**Negative:**
- Biome ecosystem is newer — some niche lint rules may be missing
- pnpm requires corepack enablement in CI

**Neutral:**
- Team must be familiar with Biome rule set vs. eslint
- Conventional commits enforced via commitlint + husky
