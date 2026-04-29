# EPIC 7: Edge Case Management & Architectural Resilience

## Overview

Five interrelated work items that harden the pipeline against malformed input, add Svelte 5 rune awareness, distinguish module/instance script contexts, trace reactive state subscriptions, and support @sveltejs/package export conditions.

## Execution Order

1. **SUML-37** — Graceful degradation (cross-cutting error handler)
2. **SUML-35** — .svelte.ts signal file rune detection
3. **SUML-33** — Module + instance script context tagging
4. **SUML-34** — Reactive state subscription tracking (depends on SUML-35)
5. **SUML-36** — @sveltejs/package export conditions (independent)

---

## SUML-37: Graceful Degradation for Malformed/Unparseable Files

### Problem

The pipeline crashes or silently drops files when svelte2tsx or ts-morph fails. No per-file error recovery, no error reporting.

### Solution

Introduce `PipelineErrorHandler` that collects errors across phases. Each phase wraps per-file work in try/catch. Failed files become stub vertices with `<<Error>>` stereotype. Summary printed at end; full traces only with `--verbose`.

### New File: `src/pipeline/error-handler.ts`

```typescript
interface PipelineError {
  file: string;
  phase: "discovery" | "parsing" | "extraction" | "resolution";
  message: string;
  stack?: string;
}

interface ErrorSummary {
  totalErrors: number;
  errors: PipelineError[];
  phaseCounts: Record<string, number>;
}

class PipelineErrorHandler {
  addError(error: PipelineError): void;
  getSummary(): string;
  getFailedFiles(): string[];
  getErrors(): PipelineError[];
  getErrorsForPhase(phase: string): PipelineError[];
}
```

- `getSummary()` returns formatted string: error count, file list, phase breakdown
- Full stack traces included only when `verbose: true` is passed to constructor

### Modifications

**`src/cli/runner.ts`:**
- Instantiate `PipelineErrorHandler` at pipeline start
- Pass to each phase function
- After emission, print summary via `console.warn` (or progress reporter)
- Error handler injected into `RunResult` for programmatic access

**`src/extraction/symbol-extractor.ts`:**
- Wrap per-file extraction in try/catch
- On failure: call `errorHandler.addError()`, create stub `SymbolEntry`:
  ```
  { kind: "class", name: basename(file), filePath: file, stereotype: "Error", members: [] }
  ```
- Continue processing remaining files

**`src/parsing/svelte-to-tsx.ts`:**
- Already has per-file error handling with `success: false`
- Surface failed file paths to error handler in runner

**`src/emission/class-diagram.ts` and `src/emission/package-diagram.ts`:**
- Render error vertices as `class "filename" <<Error>> { .. malformed }`

### Acceptance Criteria Mapped

| Criterion | Implementation |
|-----------|---------------|
| svelte2tsx parse errors caught and logged per-file | Runner passes failed conversions to error handler |
| ts-morph errors caught and logged per-file | Symbol extractor try/catch per file |
| Stub vertex with `<<Error>>` stereotype | Created in symbol extractor catch block |
| Pipeline continues after errors | try/catch per file, never per phase |
| Final summary shows error count, paths, types | `PipelineErrorHandler.getSummary()` |
| --verbose shows full stack traces | `stack` field populated when verbose=true |

---

## SUML-35: Resolve .svelte.ts / .svelte.js Signal Files

### Problem

.svelte.ts/.svelte.js files are discovered and passed through, but rune declarations ($state, $derived, $effect) are not classified as reactive state.

### Solution

Enhance store extractor to detect Svelte 5 runes in .svelte.ts files and classify them with appropriate `runeKind`.

### Modifications

**`src/types/ast.ts`:**
- Add to `StoreSymbol`: `runeKind?: "state" | "derived"`

**`src/extraction/store-extractor.ts`:**
- Detect `$state(...)` calls → `StoreSymbol` with `runeKind: "state"`
- Detect `$derived(...)` / `$derived.by(...)` calls → `StoreSymbol` with `runeKind: "derived"`
- `$effect(...)` calls → skip (side-effect only, no exportable value)
- Only extract exported rune declarations (same rule as existing stores)
- Existing `writable()`/`readable()`/`derived()` detection unchanged

**`src/emission/class-diagram.ts`:**
- Render `runeKind: "state"` as `<<state>>` stereotype
- Render `runeKind: "derived"` as `<<derived>>` stereotype
- Existing `<<store>>` stereotype for classic stores unchanged

### Acceptance Criteria Mapped

| Criterion | Implementation |
|-----------|---------------|
| Discovery includes .svelte.ts/.svelte.js | Already implemented (file-discovery.ts) |
| Passed directly to ts-morph | Already implemented (svelte-to-tsx.ts pass-through) |
| Rune declarations extracted and classified | Store extractor detects $state/$derived |
| Exported reactive values in DAG as producers | Exported runes become StoreSymbols |
| Both .ts and .js variants | Extension-agnostic detection via AST |

---

## SUML-33: Module + Instance Script Merging

### Problem

svelte2tsx merges module + instance scripts into a single TSX, but the extraction phase cannot distinguish which declarations came from which context.

### Solution

Parse the SFC to build a line-range-to-context map before svelte2tsx conversion. Use this map during extraction to tag symbols with their script context.

### New File: `src/parsing/script-context.ts`

```typescript
type ScriptBlock = {
  context: "module" | "instance";
  startLine: number;
  endLine: number;
};

type ScriptContextMap = {
  sourcePath: string;
  blocks: ScriptBlock[];
};

function parseScriptContexts(content: string): ScriptContextMap;
function getContextForLine(map: ScriptContextMap, line: number): "module" | "instance" | undefined;
```

- Regex-parse `<script context="module">` and `<script>` blocks
- Map line ranges (1-indexed) to context
- `getContextForLine()` used during extraction to tag symbols

### Modifications

**`src/parsing/svelte-to-tsx.ts`:**
- `SvelteToTsxResult` gains optional `scriptContext?: ScriptContextMap`
- `convertSvelteToTsx()` calls `parseScriptContexts()` on raw content, attaches to result

**`src/extraction/component-extractor.ts`:**
- Accept `scriptContextMap` parameter (passed via `ParsingProject` metadata or conversion result)
- For each extracted prop/symbol, look up line number in context map
- Tag with `accessibility: "public"` (module) or `accessibility: "internal"` (instance)

**`src/types/ast.ts`:**
- Add `accessibility?: "public" | "internal"` to `PropSymbol`

### Acceptance Criteria Mapped

| Criterion | Implementation |
|-----------|---------------|
| Detect files with both contexts | parseScriptContexts identifies both blocks |
| Merge into single virtual TSX | svelte2tsx already does this |
| Module exports tagged as public | accessibility field from line lookup |
| Instance members tagged as internal | accessibility field from line lookup |
| Reactive declarations attributed to instance | Line lookup places $: in instance context |
| No duplicate symbols | Existing dedup unchanged |

---

## SUML-34: Reactive State Subscription Tracking

### Problem

Cross-file reactive state references ($state/$derived consumed in other files) are not tracked. Need STATE_DEPENDENCY edges in the DAG.

### Solution

Use ts-morph `findReferencesAsNodes()` to trace where exported $state/$derived values are consumed across file boundaries. Create `state_dependency` edge type.

### New File: `src/dependency/reactive-tracker.ts`

```typescript
interface StateDependency {
  sourceFile: string;
  targetFile: string;
  symbolName: string;
  dependencyKind: "state" | "derived";
}

function trackReactiveDependencies(
  parsingProject: ParsingProject,
  reactiveSymbols: StoreSymbol[],
): StateDependency[];
```

- For each exported `$state`/`$derived` StoreSymbol:
  1. Find the declaration node in the ts-morph project
  2. Call `findReferencesAsNodes()` to find all reference sites
  3. For each reference in a different file → create `StateDependency`
- Filter: skip type-only imports (already handled by import scanner)
- Filter: skip same-file references (not cross-file)
- Distinguish direct import (value consumed) from re-export (value forwarded):
  - Re-export detected by checking if reference is inside an `export` declaration

### Modifications

**`src/types/edge.ts`:**
- Add `"state_dependency"` to `EdgeType` union
- Arrow style: `..>` with `<<state>>` label (dashed, like dependency but labeled)

**`src/dependency/edge-builder.ts`:**
- Accept `StateDependency[]` parameter
- Convert to edges with `type: "state_dependency"`
- Deduplicate (existing EdgeSet handles this)

**`src/cli/runner.ts`:**
- After extraction, collect StoreSymbols with `runeKind`
- Call `trackReactiveDependencies()`
- Pass results to `buildEdges()`

**`src/emission/class-diagram.ts` and `src/emission/package-diagram.ts`:**
- Render `state_dependency` edges as `source ..> target <<state>>`

### Acceptance Criteria Mapped

| Criterion | Implementation |
|-----------|---------------|
| Detect $state/$derived in .svelte.ts | Store extractor (SUML-35) |
| Track cross-file references | findReferencesAsNodes() in reactive-tracker |
| STATE_DEPENDENCY edges | New edge type, integrated into edge builder |
| Direct import vs re-export | Reference parent check for export keyword |
| .svelte.ts as first-class modules | Already discovered and parsed |
| No false edges for type-only imports | Filter type-only imports |

---

## SUML-36: @sveltejs/package Export Conditions Support

### Problem

Projects using @sveltejs/package define exports in package.json with Svelte-specific conditions. These export maps must be resolved to find source files and mark public API.

### Solution

Parse package.json exports field for Svelte conditions, resolve to source paths, tag exported symbols.

### New File: `src/discovery/package-exports.ts`

```typescript
interface PackageExport {
  exportName: string;
  resolvedPath: string;
  conditions: string[];
}

interface PackageExportMap {
  projectRoot: string;
  exports: PackageExport[];
}

function resolvePackageExports(projectRoot: string): PackageExportMap | null;
```

- Read `package.json` from project root
- Parse `exports` field (string or conditional object)
- Resolve Svelte conditions in order: `svelte` > `default` > `import` > `require`
- Map resolved paths back to source files (strip dist/ prefix if library build)
- Return `null` if no exports field (fallback to directory scanning)

### Modifications

**`src/discovery/file-discovery.ts`:**
- Call `resolvePackageExports()` during discovery
- Merge discovered exports with file scan results
- Mark exported files in `DiscoveredFiles` (new field)

**`src/types/ast.ts`:**
- Add `isExported?: boolean` to symbol types (ClassSymbol, FunctionSymbol, StoreSymbol)

**`src/extraction/symbol-extractor.ts`:**
- When processing a file in the exports map, set `isExported: true` on extracted symbols

**`src/emission/class-diagram.ts` and `src/emission/package-diagram.ts`:**
- Add `<<Exported>>` stereotype for symbols where `isExported === true`
- Combine with existing stereotypes: e.g., `<<Exported>> <<component>>`

### Acceptance Criteria Mapped

| Criterion | Implementation |
|-----------|---------------|
| Parse package.json exports | resolvePackageExports() |
| Resolve to source paths | Condition resolution + dist/ stripping |
| Distinguish public vs internal | isExported flag |
| <<Exported>> stereotype in PlantUML | Emission renders compound stereotypes |
| Fallback to directory scanning | Return null when no exports field |

---

## Cross-Cutting Type Changes

### `src/types/ast.ts`

```typescript
// PropSymbol
accessibility?: "public" | "internal";

// StoreSymbol
runeKind?: "state" | "derived";

// ClassSymbol, FunctionSymbol, StoreSymbol
isExported?: boolean;
```

### `src/types/edge.ts`

```typescript
type EdgeType =
  | "extends"
  | "implements"
  | "composition"
  | "dependency"
  | "association"
  | "state_dependency";
```

### `src/types/pipeline.ts` (new section)

```typescript
interface PipelineError {
  file: string;
  phase: "discovery" | "parsing" | "extraction" | "resolution";
  message: string;
  stack?: string;
}

interface StateDependency {
  sourceFile: string;
  targetFile: string;
  symbolName: string;
  dependencyKind: "state" | "derived";
}

interface PackageExport {
  exportName: string;
  resolvedPath: string;
  conditions: string[];
}
```

---

## File Change Summary

| Action | File | Work Items |
|--------|------|------------|
| New | `src/pipeline/error-handler.ts` | SUML-37 |
| New | `src/parsing/script-context.ts` | SUML-33 |
| New | `src/dependency/reactive-tracker.ts` | SUML-34 |
| New | `src/discovery/package-exports.ts` | SUML-36 |
| Modify | `src/types/ast.ts` | SUML-33, 34, 35, 36 |
| Modify | `src/types/edge.ts` | SUML-34 |
| Modify | `src/types/pipeline.ts` | SUML-37, 34, 36 |
| Modify | `src/cli/runner.ts` | SUML-37, 34 |
| Modify | `src/extraction/symbol-extractor.ts` | SUML-37, 36 |
| Modify | `src/extraction/store-extractor.ts` | SUML-35 |
| Modify | `src/extraction/component-extractor.ts` | SUML-33 |
| Modify | `src/parsing/svelte-to-tsx.ts` | SUML-33 |
| Modify | `src/dependency/edge-builder.ts` | SUML-34 |
| Modify | `src/emission/class-diagram.ts` | SUML-37, 34, 35, 36 |
| Modify | `src/emission/package-diagram.ts` | SUML-37, 34, 35, 36 |
| Modify | `src/discovery/file-discovery.ts` | SUML-36 |

---

## Testing Strategy

Each work item gets its own test file:

| Test File | Work Items |
|-----------|------------|
| `tests/pipeline/error-handler.test.ts` | SUML-37 |
| `tests/parsing/script-context.test.ts` | SUML-33 |
| `tests/dependency/reactive-tracker.test.ts` | SUML-34 |
| `tests/extraction/store-extractor.test.ts` (extend) | SUML-35 |
| `tests/discovery/package-exports.test.ts` | SUML-36 |
| `tests/cli/runner.test.ts` (extend) | SUML-37 integration |

Branch coverage target: 90%+ for all new and modified files.
