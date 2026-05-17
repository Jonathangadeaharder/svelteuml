# E1+E2: Core Parsing, Type System & Symbol Extraction

## Context

Before dependency resolution and diagram emission can work, SvelteUML needs to ingest SvelteKit projects — discover files, convert `.svelte` to TypeScript, build a ts-morph AST project, and extract symbols (classes, functions, stores, props, routes, exports). These are the foundational pipeline stages.

## Core Type System (`src/types/`)

### `ast.ts` — Symbol Types

Every analyzed artifact maps to a typed symbol:

| Symbol | Fields | Source |
|--------|--------|--------|
| `ClassSymbol` | `kind`, `name`, `filePath`, `extends?`, `implements[]`, `members[]`, `isGeneric`, `typeParams[]`, `isExported?` | Class/interface/abstract class declarations |
| `FunctionSymbol` | `kind`, `name`, `filePath`, `isExported`, `isAsync`, `parameters[]`, `returnType`, `typeParams[]` | Function declarations and arrow exports |
| `StoreSymbol` | `kind`, `name`, `filePath`, `storeType`, `valueType`, `runeKind?`, `isExported?` | Svelte stores (`writable`/`readable`/`derived`) and Svelte 5 runes (`$state`, `$derived`) |
| `PropSymbol` | `kind`, `name`, `filePath`, `componentName`, `type`, `isRequired`, `defaultValue?`, `accessibility?` | Svelte component `export let` / `$props()` rune |
| `ExportSymbol` | `kind`, `name`, `filePath`, `moduleName` | Re-exports |
| `RouteSymbol` | `kind`, `name`, `filePath`, `routeKind`, `isServer`, `routeSegment` | SvelteKit route files (+page, +layout, +server, +error) |
| `MemberSymbol` | `kind` (property/method), `name`, `visibility`, `type`, `isStatic`, `isAbstract`, `isReadonly`, `parameters?`, `returnType?` | Class members |

`SymbolTable` aggregates all: `{ classes, functions, stores, props, exports, routes }`.

### `config.ts` — Configuration Types

- `SvelteUMLConfig` — resolved config with `targetDir`, `outputPath`, `format`, `exclude`, `include`, `maxDepth`, `excludeExternals`, `aliasOverrides`
- `AliasMap` — `Record<string, string>` mapping path aliases (e.g., `$lib` → `/src/lib`)
- `OutputFormat` — `"text" | "svg" | "png"`
- `DiscoveredFiles` — categorized file lists: `{ svelte, typescript, javascript, svelteModules }`

### `diagram.ts` — Diagram Options

- `DiagramOptions` — `kind` (class/package), `title`, `showMembers`, `showMethods`, `showStores`, `showProps`, `showVisibility`, `hideEmptyPackages`
- `EmissionResult` — `{ content: string, diagramKind: string }`
- `DEFAULT_DIAGRAM_OPTIONS` — sensible defaults

### `edge.ts` — Edge (Relationship) Types

- `EdgeType`: `"extends" | "implements" | "composition" | "aggregation" | "dependency" | "association" | "state_dependency"`
- `Edge`: `{ source, target, type, label? }`
- `EdgeSet`: `{ edges: Edge[] }` with `createEdgeSet()` factory

### `pipeline.ts` — Pipeline Types

- `PipelinePhase`: `"discovery" | "parsing" | "extraction" | "resolution" | "emission"`
- `PhaseResult` — generic result wrapper per phase

## Discovery (`src/discovery/`)

### File Discovery (`file-discovery.ts`)
- Uses `fast-glob` to scan target project for `.ts`, `.js`, `.svelte` files
- Respects `.gitignore` patterns
- Returns categorized `DiscoveredFiles`
- Configurable `include`/`exclude` glob patterns

### Svelte Config (`svelte-config.ts`)
- Loads `svelte.config.js/ts` from target project
- Extracts `alias` map from config's `resolve.alias` or `kit.alias`
- Handles ESM dynamic `import()` of the config module

### TSConfig (`tsconfig.ts`)
- Loads `tsconfig.json` / `jsconfig.json` from target project
- Extracts `paths` aliases
- Resolves `compilerOptions.baseUrl` for relative path resolution

### Package Exports (`package-exports.ts`)
- Resolves `package.json` `exports` field
- Handles conditional exports with `svelte` condition priority
- Produces `PackageExportMap` for public API boundary detection

## Parsing (`src/parsing/`)

### svelte2tsx Conversion (`svelte-to-tsx.ts`)
- Converts `.svelte` files to TypeScript using `svelte2tsx`
- Virtual path: `Button.svelte` → `Button.svelte.tsx`
- Returns `SvelteToTsxResult` with `{ tsxCode, sourceMap, success, error, scriptContext? }`
- Source maps tracked for line-number correlation

### ts-morph Project (`ts-morph-project.ts`)
- `ParsingProject` wraps ts-morph `Project` with in-memory filesystem
- `buildParsingProject()` factory creates project from converted svelte2tsx output + plain TS/JS files
- Tracks original path → virtual path mappings
- Stores script context maps for `.svelte` files

### Script Context (`script-context.ts`)
- Parses `<script>` and `<script context="module">` blocks from raw `.svelte` content
- `ScriptContextMap` maps line ranges to `"module" | "instance"` context
- Used to tag prop accessibility (public module-level exports vs. internal instance state)

### Caching (`cache.ts`)
- File-level cache for parsed AST nodes
- Invalidated on file modification time changes (watch mode)

## Extraction (`src/extraction/`)

### Symbol Extractor (`symbol-extractor.ts`)
- Iterates all source files in `ParsingProject`
- Routes each file through specialized extractors:
  - `.svelte` / `.svelte.tsx` → Component Extractor
  - Route files → Route Extractor + Server Extractor
  - Libraries → Lib Extractor
  - All → Store Extractor
  - All → Comment Tags
- Wraps per-file extraction in try/catch via `PipelineErrorHandler`
- Returns aggregated `SymbolTable` with sorted symbols

### Component Extractor (`component-extractor.ts`)
- Detects `export let` declarations (Svelte 4) and `$props()` rune destructuring (Svelte 5)
- Extracts component name from file path
- Returns `PropSymbol[]` with type, required status, and accessibility context

### Route Extractor (`route-extractor.ts`)
- `classifyRouteFile()` — detects `+page`, `+layout`, `+server`, `+error` from file path
- `routeSegmentFromPath()` — extracts the URL segment between `src/routes/` and the route file
- `parseRouteSegment()` — parses dynamic params, rest params, optional params, matchers, and groups
- `extractRouteExports()` — extracts exported load functions and actions

### Lib Extractor (`lib-extractor.ts`)
- Extracts exported functions, classes, interfaces from `src/lib/` files
- Handles TypeScript generics, async functions, parameter types

### Store Extractor (`store-extractor.ts`)
- Detects Svelte 4 stores: `writable()`, `readable()`, `derived()`
- Detects Svelte 5 runes: `$state()`, `$derived()`, `$derived.by()`
- Extracts value type from generic parameters
- Filters out `$effect()` calls

### Server Extractor (`server-extractor.ts`)
- Extracts exported HTTP handler functions (`GET`, `POST`, `PUT`, `DELETE`) from `+server.ts`
- Returns as typed function symbols

### Skip Rules (`skip-rules.ts`)
- Filters out irrelevant files: `node_modules`, `.svelte-kit`, `.git`, etc.
- Handles `.svelte.tsx` virtual path detection

### Comment Tags (`comment-tags.ts`)
- Extracts `@uml` comment annotations for diagram hints
- Supports `@uml:hide`, `@uml:group`, `@uml:color` directives
- Used by emission tag-processor to override default rendering
