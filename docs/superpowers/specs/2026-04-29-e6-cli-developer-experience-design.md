# EPIC 6: CLI & Developer Experience — Design Spec

## Overview

Command-line interface for SvelteUML. Parses arguments, loads optional config file, runs the pipeline with progress reporting, and outputs PlantUML diagrams.

## File Structure

```text
src/
  cli.ts              # Entry point: shebang, imports, calls run()
  cli/
    args.ts           # Commander program definition, CliOptions type, parseArgs()
    runner.ts         # Pipeline orchestration: config → discover → parse → extract → resolve → emit → write
    progress.ts       # TTY-aware progress reporter with spinner
    watch.ts          # Chokidar watch mode (SUML-32)
    config-loader.ts  # Config file discovery and loading (SUML-29)
```

## CLI Flags

```text
svelteuml <target-directory> [options]

Positional:
  <target-directory>       Path to SvelteKit project root (required)

Options:
  -o, --output <path>      Output file path (default: stdout for text format)
  -f, --format <type>      Output format: text|svg|png (default: text)
  --exclude-externals      Truncate traversal at node_modules boundaries
  --max-depth <n>          Max dependency traversal depth, 0 = unlimited (default: 0)
  -e, --exclude <glob...>  Glob patterns to exclude from discovery
  --hide-type-deps         Omit type-only dependency edges from output
  --hide-state-deps        Omit state/store dependency edges from output
  -q, --quiet              Suppress all non-error output
  --verbose                Print resolved config and debug information
  --watch                  Watch target directory for changes and regenerate
  -h, --help               Display help text with examples
  -V, --version            Display version from package.json
```

### Defaults

- `--format`: `text` (PlantUML source to stdout)
- `--output`: stdout when format is `text`; `diagram.svg` or `diagram.png` for binary formats
- `--max-depth`: `0` (unlimited)
- `--exclude-externals`: `false`

### Validation

- Target directory must exist and be a directory (enforced by Zod schema)
- `--format` must be one of `text`, `svg`, `png`
- `--max-depth` must be a non-negative integer
- Invalid combinations produce clear error messages with exit code 1

## CliOptions Type

```typescript
interface CliOptions {
  targetDir: string;
  outputPath?: string;
  format: "text" | "svg" | "png";
  excludeExternals: boolean;
  maxDepth: number;
  exclude: string[];
  hideTypeDeps: boolean;
  hideStateDeps: boolean;
  quiet: boolean;
  verbose: boolean;
  watch: boolean;
}
```

## Data Flow

```text
1. parseArgs(process.argv) → CliOptions
2. loadConfigFile(targetDir) → Partial<SvelteUMLConfigInput>  (SUML-29)
3. mergeConfigs(fileConfig, cliConfig) → SvelteUMLConfigInput
4. validateConfig(merged) → SvelteUMLConfig
5. Pipeline execution with progress reporting:
   a. discoverFiles(config)
   b. convertFiles(files, aliases)
   c. SymbolExtractor.extract(sources, config)
   d. scanImports(symbols) + buildEdges(imports)
   e. emitPlantUML() / renderClassDiagram() / renderPackageDiagram()
6. Write output to file or stdout
```

## Config File Support (SUML-29)

### Discovery Order

Search from CWD upward to filesystem root:
1. `svelteuml.config.ts` — TypeScript ESM config
2. `.svelteumlrc.json` — JSON config
3. `.svelteumlrc` — JSON config (no extension)

### Schema

Same fields as `SvelteUMLConfigInput`, all optional. Validated against existing Zod schema. Unknown fields produce warnings.

### Loading

- JSON files: `JSON.parse(fs.readFileSync(...))`
- TS files: dynamic `import()` (Node handles TS natively via `--experimental-strip-types` or tsx)
- Config values serve as defaults; CLI flags override them via `mergeConfigs()`

## Progress Reporter (SUML-30)

### Behavior

- **TTY detected**: Show ora spinner with current phase name and file count
- **Non-TTY (pipe)**: No progress output, only final result
- **`--quiet`**: No output except errors

### Phase Labels

| Phase | Label |
|-------|-------|
| Discovery | `Discovering files...` |
| Parsing | `Parsing {n} files...` |
| Extraction | `Extracting symbols...` |
| Resolution | `Resolving dependencies...` |
| Emission | `Generating diagram...` |

### Completion Summary

```text
✓ 42 files analyzed, 127 relationships found → diagram.puml
```

## Exclude Externals (SUML-31)

When `--exclude-externals` is set:

- Imports from `node_modules` create stub vertices with `<<External>>` stereotype
- Only the package name is shown (e.g., `svelte`, `@sveltejs/kit`)
- Internal dependencies of external packages are NOT followed
- Multiple imports from the same package collapse into a single External vertex
- Works with bare specifiers (`svelte`) and scoped packages (`@sveltejs/kit`)

Implementation in `src/dependency/import-scanner.ts`: when resolving an import, check if resolved path contains `node_modules`. If so and `excludeExternals` is true, return an external stub instead of following the import.

## Watch Mode (SUML-32)

- Uses chokidar for cross-platform file watching
- Debounce: 500ms to batch rapid saves
- Only re-analyze changed files where possible (incremental)
- Shows which file changed in spinner output
- Graceful shutdown on SIGINT/SIGTERM

## Testing Strategy

| Module | Approach |
|--------|----------|
| `args.ts` | Mock `process.argv`, test all flag combinations |
| `runner.ts` | Mock pipeline phases, test orchestration and error handling |
| `progress.ts` | Test TTY detection, quiet mode, non-TTY suppression |
| `config-loader.ts` | Test file discovery, JSON/TS parsing, merge precedence |
| `watch.ts` | Test debounce, file event handling, graceful shutdown |

Coverage target: 90% branches per module.

## Dependencies to Add

| Package | Purpose | Version |
|---------|---------|---------|
| `commander` | CLI argument parsing | ^13 |
| `ora` | Terminal spinner | ^8 |
| `chokidar` | File watching | ^4 |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Validation error / invalid arguments |
| 2 | Pipeline execution error |
