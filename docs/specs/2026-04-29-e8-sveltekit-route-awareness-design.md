# EPIC 8 Design: SvelteKit Route Awareness & Mapping

## Overview

Thread route metadata through the full svelteuml pipeline so PlantUML diagrams render route-aware stereotypes, dynamic parameter annotations, group layout markers, and parameter matcher labels.

## Problem

`RouteFileSymbol` is created in `route-extractor.ts` but never stored in `SymbolTable`. The `SymbolExtractor` calls `classifyRouteFile()` and `extractRouteExports()` separately, discarding the combined route metadata. Emitters only see `FunctionSymbol[]` — all route context (file type, segment, params) is lost.

## Solution

### 1. New Types (`src/types/ast.ts`)

- **`RouteParamKind`**: `"static" | "dynamic" | "rest" | "optional-rest"`
- **`RouteParam`**: `{ kind, name, matcher? }` — parsed from `[id]`, `[...slug]`, `[[lang]]`, `[id=integer]`
- **`RouteSegment`**: `{ raw, params[], groups[] }` — full parsed route segment
- **`RouteSymbol`**: `{ kind: "route", name, filePath, routeKind, isServer, routeSegment }` — stored in SymbolTable
- **`SymbolTable.routes`**: `RouteSymbol[]` — new field

### 2. Segment Parsing (`src/extraction/route-extractor.ts`)

Three new functions:

- **`parseRouteParams(segment)`** — regex-based parser for `[param]`, `[...slug]`, `[[optional]]`, `[param=matcher]`
- **`extractGroups(segment)`** — extracts `(group)` names from parenthesized directories
- **`parseRouteSegment(segment)`** — combines both into `RouteSegment`

### 3. Pipeline Integration (`src/extraction/symbol-extractor.ts`)

`SymbolExtractor.extractFile()` now creates `RouteSymbol` objects when route files are detected, using `parseRouteSegment(routeSegmentFromPath(filePath))` to populate params/groups.

### 4. Emission (`src/emission/class-diagram.ts`, `package-diagram.ts`)

Route stereotype mapping:

| routeKind | isServer | Stereotype |
|-----------|----------|-----------|
| page | false | `<<page>>` |
| page | true | `<<PageLoad>>` |
| layout | false | `<<layout>>` |
| layout | true | `<<LayoutLoad>>` |
| server | true | `<<endpoint>>` |
| error | false | `<<error-page>>` |

Route boxes show:
- `path:` field with raw segment
- Dynamic/rest/optional-rest params annotated
- Matcher suffix (`id=integer`)
- Group labels (`group: auth`)

## File Impact

| File | Change |
|------|--------|
| `src/types/ast.ts` | Add 4 types, extend SymbolTable |
| `src/extraction/route-extractor.ts` | Add 3 parsing functions |
| `src/extraction/symbol-extractor.ts` | Store RouteSymbol[] |
| `src/emission/class-diagram.ts` | Render route boxes |
| `src/emission/package-diagram.ts` | Render routes in packages |

## Risks

- **exactOptionalPropertyTypes**: `matcher` field on `RouteParam` must be omitted when absent, not set to `undefined`
- **Coverage**: New functions need thorough branch coverage (all param kinds, matcher present/absent, group present/absent)
