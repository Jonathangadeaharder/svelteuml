# ADR-005: UML Rendering Architecture — PlantUML Emission, Dependency Resolution, Route Awareness

**Status:** Accepted  
**Date:** 2026-05-17  
**Deciders:** Project maintainers

## Context

SvelteUML's core value is generating useful architecture diagrams from SvelteKit projects. The rendering pipeline must handle multiple diagram kinds (class, package), various relationship types, and SvelteKit-specific conventions (routes, stores, components).

## Decision

### Output Format: PlantUML

- **PlantUML** class diagram syntax as the primary output format
- Text `.puml` output by default; SVG/PNG generation deferred to external tooling
- PlantUML was chosen over Mermaid, Graphviz, or custom SVG because:
  - Mature class diagram support (extends, implements, composition, dependency arrows)
  - Widely supported by documentation tools (GitHub Markdown via kroki, IntelliJ plugin, etc.)
  - Skinparam support for visual customization without CSS
  - `@startuml`/`@enduml` delimiting makes embedding trivial

### Rendering Architecture

Two diagram types share a common data model:

#### Class Diagrams (`src/emission/class-diagram.ts`)
- Each `ClassSymbol` → PlantUML class with members (properties + methods)
- `<<interface>>`, `<<abstract>>` stereotypes mapped from symbol kind
- `<<store>>`, `<<state>>`, `<<derived>>` stereotypes for reactive state
- `<<page>>`, `<<layout>>`, `<<endpoint>>`, `<<error-page>>`, `<<PageLoad>>`, `<<LayoutLoad>>` stereotypes for SvelteKit routes
- `<<component>>` stereotype for Svelte components with prop listings
- `<<function>>` stereotype for standalone exported functions

#### Package Diagrams (`src/emission/package-diagram.ts`)
- Classes grouped by filesystem directory into PlantUML `package` blocks
- Inter-package edges aggregated from file-level edges
- `hideEmptyPackages` option for cleaner output
- Route symbols rendered with same stereotypes inside their directory package

### Edge Classification

| Edge Type | PlantUML Arrow | Source | Detection |
|-----------|---------------|--------|-----------|
| `extends` | `<\|--` | Class inheritance | `ClassSymbol.extends` |
| `implements` | `..\|>` | Interface implementation | `ClassSymbol.implements[]` |
| `composition` | `*--` | Store dependency | Store file in import target |
| `aggregation` | `o--` | Class-type property | Reserved for future use |
| `dependency` | `..>` | Generic import | Default classification |
| `association` | `-->` | Route imports component | Route imports component file |
| `state_dependency` | `..>` | Reactive state subscription | `findReferencesAsNodes()` on `$state`/`$derived` |

### Dependency Resolution

- **Import Scanning** (`src/dependency/import-scanner.ts`): Extracts `ImportDeclaration` nodes via ts-morph, resolves specifiers through alias maps and extension probing
- **Edge Building** (`src/dependency/edge-builder.ts`): Classifies resolved imports into edge types by cross-referencing with symbol table
- **Reactive Tracking** (`src/dependency/reactive-tracker.ts`): Uses ts-morph `findReferencesAsNodes()` to trace `$state`/`$derived` variable references across files

### SvelteKit Route Awareness

- Routes detected via `classifyRouteFile()` in `src/extraction/route-extractor.ts`
- Route segments parsed for `[param]`, `[...slug]`, `[[optional]]`, `[param=matcher]`, and `(group)` patterns
- `RouteSymbol` stored in `SymbolTable.routes` and rendered with appropriate stereotypes

## Consequences

**Positive:**
- PlantUML is text-based — easy to diff, version control, and embed in docs
- Rich arrow type support maps naturally to software architecture concepts
- Route awareness provides SvelteKit-specific value no generic UML tool offers

**Negative:**
- PlantUML requires external rendering for SVG/PNG output (Java dependency)
- Package diagram with many files can produce very wide diagrams
- Class diagram type inference requires correct ts-morph AST analysis

**Neutral:**
- Arrow mapping tables and stereotype conventions must be documented for users
- New diagram types (sequence, component) would require separate renderers
- Golden test fixtures need updating when PlantUML output format changes
