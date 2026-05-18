# ADR-001: Project Architecture — SvelteKit + TypeScript Monorepo

> Imported legacy ADR artifact from `docs/architecture/ADR-001-project-architecture.md`. Keep future lifecycle work in OpenSpec.

**Status:** Accepted  
**Date:** 2026-05-17  
**Deciders:** Project maintainers

## Context

SvelteUML needs a runtime-independent architecture analysis tool that parses SvelteKit projects and emits PlantUML diagrams. Unlike typical SvelteKit apps, this is a CLI tool/library that consumes SvelteKit projects as input. Key requirements:

- Parse TypeScript, JavaScript, and `.svelte` files from target projects
- Resolve import relationships and SvelteKit route conventions
- Emit PlantUML `.puml` output (text, SVG, PNG)
- CLI-first interface, publishable as npm package

## Decision

Use **SvelteKit project conventions as analysis target**, with a **pure TypeScript CLI/library** architecture:

1. **Single pnpm workspace package** (no monorepo split) — the tool is one package published to npm
2. **TypeScript ESM** with Node16 module resolution — strict ESM throughout
3. **Pipeline architecture** with discrete phases:
   - **Config** (`src/config/`) — schema validation via Zod
   - **Discovery** (`src/discovery/`) — file globbing, svelte.config discovery, tsconfig parsing
   - **Parsing** (`src/parsing/`) — svelte2tsx conversion, ts-morph AST project building
   - **Extraction** (`src/extraction/`) — symbol extraction from AST (classes, functions, stores, props, routes)
   - **Dependency** (`src/dependency/`) — import scanning, edge building, reactive tracking
   - **Emission** (`src/emission/`) — PlantUML rendering (class diagrams, package diagrams)
   - **CLI** (`src/cli/`) — commander.js entry point, progress reporting, watch mode
   - **Pipeline** (`src/pipeline/`) — error handling, cross-phase orchestration
4. **No runtime framework dependency** — SvelteKit is a *target* format, not a runtime dependency. The tool only needs `svelte` and `svelte2tsx` for parsing.

## Consequences

**Positive:**
- Clean separation of concerns — each phase independently testable
- Easy to add new diagram types, output formats, or analysis passes
- CLI and library API from the same codebase (`dist/index.js` + `dist/cli.js`)
- TypeScript provides excellent DX for AST-heavy code

**Negative:**
- Pipeline orchestration requires careful data flow between phases
- No hot-reload during development (CLI tool, not a web app)
- ESM-only limits compatibility with CJS consumers

**Neutral:**
- `ts-morph` wraps the TypeScript compiler API, adding a dependency but simplifying AST traversal
- Self-hosted CI runners required (macOS for local testing parity)
