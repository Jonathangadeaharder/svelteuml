# E3+E4: Dependency Resolution & PlantUML Emission

## Context

Pipeline stages Config → Discovery → Parsing → Extraction are complete. The next two stages are dependency resolution (building edges from import relationships) and PlantUML emission (rendering diagrams).

## E3: Dependency Resolution (`src/dependency/`)

### Modules

- `import-scanner.ts` — Extracts `ImportDeclaration` nodes from each source file in the `ParsingProject`, resolves module specifiers to original file paths using the alias map and ts-morph's module resolver
- `edge-builder.ts` — Takes resolved imports + `SymbolTable` → produces `Edge[]` classified by relationship type
- `index.ts` — Barrel re-export

### Edge Classification

| Type | Trigger |
|---|---|
| `extends` | `class A extends B` (detected from `ClassSymbol.extends`) |
| `implements` | `class A implements I` (detected from `ClassSymbol.implements[]`) |
| `composition` | Component imports a store, or a class is used as a property type |
| `dependency` | Generic import of functions, types, or values |
| `association` | Route file imports a component (rendering relationship) |

### Import Resolution Strategy

1. Parse `ImportDeclaration` nodes from each source file via ts-morph
2. Get the module specifier string
3. Try alias resolution first (match against `AliasMap` keys like `$lib`)
4. Fall back to ts-morph's resolved module (handles relative paths)
5. Map resolved path back to original path via `ParsingProject.resolveOriginalFile()`
6. Skip external/unresolvable imports (node_modules, built-ins)

### Edge Source/Target

- Source: importing file path (normalized)
- Target: imported file path (normalized, resolved to original)
- Label: imported symbol name(s) when available

### API

```typescript
interface ResolvedImport {
  sourceFile: string;        // original path of importing file
  targetFile: string;        // original path of imported file (resolved)
  importedNames: string[];   // specific names imported (empty for namespace imports)
  isTypeOnly: boolean;       // `import type`
}

function scanImports(parsingProject: ParsingProject, aliases: AliasMap): ResolvedImport[];

function buildEdges(
  imports: ResolvedImport[],
  symbols: SymbolTable,
): Edge[];
```

## E4: PlantUML Emission (`src/emission/`)

### Modules

- `plantuml-emitter.ts` — Main entry: takes `SymbolTable` + `EdgeSet` + `DiagramOptions` → produces PlantUML string
- `class-diagram.ts` — Renders class diagram: entities with members/methods, relationship arrows
- `package-diagram.ts` — Renders package diagram: files grouped by directory, package-level dependencies
- `index.ts` — Barrel re-export

### PlantUML Output Format

```
@startuml <title>
skinparam classAttributeIconSize 0

class "ClassName" as ClassName {
  + propertyName: Type
  - methodName(param: Type): ReturnType
}

ClassName <|-- ChildClass
ClassName ..> Dependency

package "src/lib" as lib {
  class Helper { ... }
}

@enduml
```

### Rendering Rules

- Classes/interfaces rendered as PlantUML `class`/`interface` stereotypes
- Functions rendered as `class` with `<<function>>` stereotype (when standalone)
- Stores rendered as `class` with `<<store>>` stereotype
- Components rendered as `class` with `<<component>>` stereotype, props as members
- Arrow types: `<|--` for extends, `..|>` for implements, `*--` for composition, `..>` for dependency, `-->` for association
- `DiagramOptions` controls: `showMembers`, `showMethods`, `showVisibility`, `showStores`, `showProps`, `hideEmptyPackages`

### API

```typescript
function emitPlantUML(
  symbols: SymbolTable,
  edges: EdgeSet,
  options?: DiagramOptions,
): EmissionResult;
```

`EmissionResult` already defined in `types/pipeline.ts` with `content` (the PlantUML string) and `diagramKind`.

## Testing

- Each module gets its own test file in `tests/dependency/` and `tests/emission/`
- Test fixtures reuse the existing `tests/fixtures/` patterns
- Coverage targets: 90% branch coverage (per vitest.config.ts thresholds)
- Import scanning tested with ts-morph SourceFile fixtures
- Edge building tested with mock SymbolTable + resolved imports
- PlantUML emission tested with snapshot-style assertions on output strings

## File Layout

```
src/
  dependency/
    import-scanner.ts
    edge-builder.ts
    index.ts
  emission/
    plantuml-emitter.ts
    class-diagram.ts
    package-diagram.ts
    index.ts
tests/
  dependency/
    import-scanner.test.ts
    edge-builder.test.ts
  emission/
    plantuml-emitter.test.ts
    class-diagram.test.ts
    package-diagram.test.ts
```
