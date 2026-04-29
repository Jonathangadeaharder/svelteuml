# EPIC 8: SvelteKit Route Awareness & Mapping — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thread route metadata through the full pipeline (extraction → types → emission) so PlantUML diagrams render route-aware stereotypes, dynamic segments, group layouts, and parameter matchers.

**Architecture:** Extend the existing `RouteFileSymbol` with parsed segment info (dynamic params, groups, matchers). Store route symbols in `SymbolTable`. Update emitters to use route stereotypes. The fundamental gap is that `RouteFileSymbol` is created but never stored — route metadata is lost after extraction.

**Tech Stack:** TypeScript, ts-morph, vitest, biome

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/types/ast.ts` | Add `RouteSymbol` type, `RouteParam` types, extend `SymbolTable` |
| Modify | `src/extraction/route-extractor.ts` | Add segment parsing (dynamic params, groups, matchers), export new functions |
| Modify | `src/extraction/symbol-extractor.ts` | Store `RouteSymbol[]` in symbol table during extraction |
| Modify | `src/emission/class-diagram.ts` | Render route symbols with route stereotypes |
| Modify | `src/emission/package-diagram.ts` | Render route symbols in packages with route stereotypes |
| Create | `tests/extraction/route-segment.test.ts` | Tests for segment parsing (dynamic params, groups, matchers) |
| Create | `tests/emission/route-emission.test.ts` | Tests for route stereotype rendering in class & package diagrams |

---

### Task 1: Add route types to `src/types/ast.ts`

**Files:**
- Modify: `src/types/ast.ts`

- [ ] **Step 1: Write the failing test**

Add a test that imports and validates the new types exist:

```typescript
// tests/types/route-types.test.ts
import { describe, expect, it } from "vitest";
import type { RouteParam, RouteSegment, RouteSymbol, SymbolTable } from "../../src/types/ast.js";

describe("route types", () => {
  it("RouteParam has required fields", () => {
    const param: RouteParam = {
      name: "id",
      kind: "dynamic",
    };
    expect(param.name).toBe("id");
    expect(param.kind).toBe("dynamic");
  });

  it("RouteParam with matcher", () => {
    const param: RouteParam = {
      name: "id",
      kind: "dynamic",
      matcher: "integer",
    };
    expect(param.matcher).toBe("integer");
  });

  it("RouteSegment has required fields", () => {
    const seg: RouteSegment = {
      raw: "/game/[code]",
      params: [{ name: "code", kind: "dynamic" }],
      groups: [],
    };
    expect(seg.raw).toBe("/game/[code]");
    expect(seg.params).toHaveLength(1);
  });

  it("RouteSymbol has required fields", () => {
    const route: RouteSymbol = {
      kind: "route",
      name: "+page",
      filePath: "/src/routes/+page.svelte",
      routeKind: "page",
      isServer: false,
      routeSegment: {
        raw: "/",
        params: [],
        groups: [],
      },
    };
    expect(route.routeKind).toBe("page");
    expect(route.kind).toBe("route");
  });

  it("SymbolTable has routes field", () => {
    const table: SymbolTable = {
      classes: [],
      functions: [],
      stores: [],
      props: [],
      exports: [],
      routes: [],
    };
    expect(table.routes).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/types/route-types.test.ts`
Expected: FAIL — types `RouteParam`, `RouteSegment`, `RouteSymbol` not exported from `ast.ts`

- [ ] **Step 3: Write minimal implementation**

Add to `src/types/ast.ts` after the `ExportSymbol` interface:

```typescript
export type RouteParamKind = "static" | "dynamic" | "rest" | "optional-rest";

export interface RouteParam {
  kind: RouteParamKind;
  name: string;
  matcher?: string;
}

export interface RouteSegment {
  raw: string;
  params: RouteParam[];
  groups: string[];
}

export type RouteFileKind = "page" | "layout" | "error" | "server";

export interface RouteSymbol {
  kind: "route";
  name: string;
  filePath: string;
  routeKind: RouteFileKind;
  isServer: boolean;
  routeSegment: RouteSegment;
}
```

Update `SymbolInfo` union:
```typescript
export type SymbolInfo = ClassSymbol | FunctionSymbol | StoreSymbol | PropSymbol | ExportSymbol | RouteSymbol;
```

Add `routes` to `SymbolTable`:
```typescript
export interface SymbolTable {
  classes: ClassSymbol[];
  functions: FunctionSymbol[];
  stores: StoreSymbol[];
  props: PropSymbol[];
  exports: ExportSymbol[];
  routes: RouteSymbol[];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/types/route-types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/ast.ts tests/types/route-types.test.ts
git commit -m "feat(e8): add RouteSymbol, RouteParam, RouteSegment types to ast"
```

---

### Task 2: Add segment parsing to `route-extractor.ts`

**Files:**
- Modify: `src/extraction/route-extractor.ts`
- Create: `tests/extraction/route-segment.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/extraction/route-segment.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { parseRouteSegment, parseRouteParams, extractGroups } from "../../src/extraction/route-extractor.js";

describe("parseRouteParams", () => {
  it("returns empty array for static segment", () => {
    expect(parseRouteParams("/about")).toEqual([]);
  });

  it("parses single dynamic param [id]", () => {
    const result = parseRouteParams("/users/[id]");
    expect(result).toEqual([{ kind: "dynamic", name: "id" }]);
  });

  it("parses rest param [...slug]", () => {
    const result = parseRouteParams("/files/[...slug]");
    expect(result).toEqual([{ kind: "rest", name: "slug" }]);
  });

  it("parses optional rest param [[slug]]", () => {
    const result = parseRouteParams("/docs/[[slug]]");
    expect(result).toEqual([{ kind: "optional-rest", name: "slug" }]);
  });

  it("parses param with matcher [id=integer]", () => {
    const result = parseRouteParams("/items/[id=integer]");
    expect(result).toEqual([{ kind: "dynamic", name: "id", matcher: "integer" }]);
  });

  it("parses rest param with matcher [...path=word]", () => {
    const result = parseRouteParams("/static/[...path=word]");
    expect(result).toEqual([{ kind: "rest", name: "path", matcher: "word" }]);
  });

  it("parses multiple params in one segment", () => {
    const result = parseRouteParams("/users/[id]/posts/[postId]");
    expect(result).toEqual([
      { kind: "dynamic", name: "id" },
      { kind: "dynamic", name: "postId" },
    ]);
  });

  it("returns empty array for root segment", () => {
    expect(parseRouteParams("/")).toEqual([]);
  });
});

describe("extractGroups", () => {
  it("returns empty array when no groups present", () => {
    expect(extractGroups("/users/[id]")).toEqual([]);
  });

  it("extracts single group (auth)", () => {
    expect(extractGroups("/(auth)/login")).toEqual(["auth"]);
  });

  it("extracts multiple groups", () => {
    expect(extractGroups("/(marketing)/(public)/about")).toEqual(["marketing", "public"]);
  });

  it("extracts nested group", () => {
    expect(extractGroups("/(app)/settings/(admin)/users")).toEqual(["app", "admin"]);
  });

  it("returns empty array for root", () => {
    expect(extractGroups("/")).toEqual([]);
  });
});

describe("parseRouteSegment", () => {
  it("parses root segment", () => {
    const result = parseRouteSegment("/");
    expect(result).toEqual({ raw: "/", params: [], groups: [] });
  });

  it("parses static segment", () => {
    const result = parseRouteSegment("/about");
    expect(result).toEqual({ raw: "/about", params: [], groups: [] });
  });

  it("parses dynamic segment with group", () => {
    const result = parseRouteSegment("/(auth)/users/[id]");
    expect(result.raw).toBe("/(auth)/users/[id]");
    expect(result.params).toEqual([{ kind: "dynamic", name: "id" }]);
    expect(result.groups).toEqual(["auth"]);
  });

  it("parses segment with matcher and group", () => {
    const result = parseRouteSegment("/(app)/items/[id=integer]");
    expect(result.params).toEqual([{ kind: "dynamic", name: "id", matcher: "integer" }]);
    expect(result.groups).toEqual(["app"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/extraction/route-segment.test.ts`
Expected: FAIL — `parseRouteSegment`, `parseRouteParams`, `extractGroups` not exported

- [ ] **Step 3: Write implementation**

Add these functions to `src/extraction/route-extractor.ts`. Import the new types:

```typescript
import type { RouteParam, RouteParamKind, RouteSegment } from "../types/ast.js";
```

Add after the `routeSegmentFromPath` function:

```typescript
export function parseRouteParams(segment: string): RouteParam[] {
  const params: RouteParam[] = [];
  const pattern = /\[\[([^\]]+)\]\]|\[([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(segment)) !== null) {
    const raw = match[1] ?? match[2];
    if (!raw) continue;

    let kind: RouteParamKind;
    let name: string;
    let matcher: string | undefined;

    if (match[1] !== undefined) {
      kind = "optional-rest";
      const inner = raw.startsWith("...") ? raw.slice(3) : raw;
      const eqIndex = inner.indexOf("=");
      if (eqIndex >= 0) {
        name = inner.slice(0, eqIndex);
        matcher = inner.slice(eqIndex + 1);
      } else {
        name = inner;
      }
    } else if (raw.startsWith("...")) {
      kind = "rest";
      const inner = raw.slice(3);
      const eqIndex = inner.indexOf("=");
      if (eqIndex >= 0) {
        name = inner.slice(0, eqIndex);
        matcher = inner.slice(eqIndex + 1);
      } else {
        name = inner;
      }
    } else {
      kind = "dynamic";
      const eqIndex = raw.indexOf("=");
      if (eqIndex >= 0) {
        name = raw.slice(0, eqIndex);
        matcher = raw.slice(eqIndex + 1);
      } else {
        name = raw;
      }
    }

    const param: RouteParam = { kind, name };
    if (matcher !== undefined) param.matcher = matcher;
    params.push(param);
  }
  return params;
}

export function extractGroups(segment: string): string[] {
  const groups: string[] = [];
  const pattern = /\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(segment)) !== null) {
    groups.push(match[1]);
  }
  return groups;
}

export function parseRouteSegment(segment: string): RouteSegment {
  return {
    raw: segment,
    params: parseRouteParams(segment),
    groups: extractGroups(segment),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/extraction/route-segment.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/extraction/route-extractor.ts tests/extraction/route-segment.test.ts
git commit -m "feat(e8): add route segment parsing for dynamic params, groups, matchers"
```

---

### Task 3: Store RouteSymbol in SymbolExtractor

**Files:**
- Modify: `src/extraction/symbol-extractor.ts`

- [ ] **Step 1: Write the failing test**

Add to a new file `tests/extraction/route-symbol-integration.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { SymbolExtractor } from "../../src/extraction/symbol-extractor.js";
import type { ParsingProject } from "../../src/parsing/ts-morph-project.js";
import { PipelineErrorHandler } from "../../src/pipeline/error-handler.js";
import { buildParsingProject } from "../../src/parsing/ts-morph-project.js";
import type { SvelteUMLConfig } from "../../src/types/index.js";

function makeConfig(): SvelteUMLConfig {
  return {
    targetDir: "/project",
    outputPath: "diagram.puml",
    format: "text",
    include: ["**/*.ts", "**/*.svelte"],
    exclude: [],
    maxDepth: 10,
    excludeExternals: false,
    aliasOverrides: {},
  };
}

describe("SymbolExtractor route integration", () => {
  it("stores RouteSymbol in symbol table for route file", () => {
    const { project } = buildParsingProject(
      [],
      [
        {
          path: "/project/src/routes/+page.ts",
          content: `export function load() { return {}; }`,
        },
      ],
      makeConfig(),
      {},
    );
    const errorHandler = new PipelineErrorHandler(false);
    const extractor = new SymbolExtractor(project, errorHandler);
    const symbols = extractor.extract();
    expect(symbols.routes).toHaveLength(1);
    expect(symbols.routes[0]?.routeKind).toBe("page");
    expect(symbols.routes[0]?.isServer).toBe(false);
    expect(symbols.routes[0]?.routeSegment.raw).toBe("/");
    expect(symbols.routes[0]?.name).toBe("+page");
  });

  it("stores RouteSymbol for server route", () => {
    const { project } = buildParsingProject(
      [],
      [
        {
          path: "/project/src/routes/api/songs/+server.ts",
          content: `export function GET() { return new Response(); }`,
        },
      ],
      makeConfig(),
      {},
    );
    const errorHandler = new PipelineErrorHandler(false);
    const extractor = new SymbolExtractor(project, errorHandler);
    const symbols = extractor.extract();
    expect(symbols.routes).toHaveLength(1);
    expect(symbols.routes[0]?.routeKind).toBe("server");
    expect(symbols.routes[0]?.isServer).toBe(true);
    expect(symbols.routes[0]?.routeSegment.raw).toBe("/api/songs");
  });

  it("stores RouteSymbol with parsed params for dynamic route", () => {
    const { project } = buildParsingProject(
      [],
      [
        {
          path: "/project/src/routes/users/[id]/+page.ts",
          content: `export function load() { return {}; }`,
        },
      ],
      makeConfig(),
      {},
    );
    const errorHandler = new PipelineErrorHandler(false);
    const extractor = new SymbolExtractor(project, errorHandler);
    const symbols = extractor.extract();
    expect(symbols.routes).toHaveLength(1);
    expect(symbols.routes[0]?.routeSegment.params).toEqual([{ kind: "dynamic", name: "id" }]);
  });

  it("stores RouteSymbol with group for grouped route", () => {
    const { project } = buildParsingProject(
      [],
      [
        {
          path: "/project/src/routes/(auth)/login/+page.ts",
          content: `export function load() { return {}; }`,
        },
      ],
      makeConfig(),
      {},
    );
    const errorHandler = new PipelineErrorHandler(false);
    const extractor = new SymbolExtractor(project, errorHandler);
    const symbols = extractor.extract();
    expect(symbols.routes).toHaveLength(1);
    expect(symbols.routes[0]?.routeSegment.groups).toEqual(["auth"]);
  });

  it("stores RouteSymbol with matcher for matched route", () => {
    const { project } = buildParsingProject(
      [],
      [
        {
          path: "/project/src/routes/items/[id=integer]/+page.ts",
          content: `export function load() { return {}; }`,
        },
      ],
      makeConfig(),
      {},
    );
    const errorHandler = new PipelineErrorHandler(false);
    const extractor = new SymbolExtractor(project, errorHandler);
    const symbols = extractor.extract();
    expect(symbols.routes).toHaveLength(1);
    expect(symbols.routes[0]?.routeSegment.params).toEqual([
      { kind: "dynamic", name: "id", matcher: "integer" },
    ]);
  });

  it("stores no RouteSymbols for non-route files", () => {
    const { project } = buildParsingProject(
      [],
      [
        {
          path: "/project/src/lib/utils.ts",
          content: `export function helper() {}`,
        },
      ],
      makeConfig(),
      {},
    );
    const errorHandler = new PipelineErrorHandler(false);
    const extractor = new SymbolExtractor(project, errorHandler);
    const symbols = extractor.extract();
    expect(symbols.routes).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/extraction/route-symbol-integration.test.ts`
Expected: FAIL — `symbols.routes` is undefined or empty because `SymbolExtractor` doesn't populate it

- [ ] **Step 3: Write implementation**

Modify `src/extraction/symbol-extractor.ts`:

Add imports:
```typescript
import { classifyRouteFile, extractRouteExports, routeSegmentFromPath, parseRouteSegment } from "./route-extractor.js";
```

Add `RouteSymbol` to the type imports from `../types/ast.js`.

In the `extract()` method, add `routes` array initialization and return:

```typescript
const routes: RouteSymbol[] = [];
// ... in the loop, after extracting file:
routes.push(...extracted.routes);
// ... in the return:
return {
  // ... existing
  routes: sortBy(routes, (r) => `${r.filePath}::${r.name}`),
};
```

In `extractFile()`, add `routes` to the return type and populate it when `routeClass` is truthy:

```typescript
const routes: RouteSymbol[] = [];

// ... in the route branch:
if (routeClass) {
  const routeSegment = routeSegmentFromPath(originalPath);
  const parsedSegment = parseRouteSegment(routeSegment);
  const fileName = basename(originalPath);
  const routeName = fileName.replace(/\.(ts|js|svelte)$/, "");

  routes.push({
    kind: "route",
    name: routeName,
    filePath: originalPath,
    routeKind: routeClass.kind,
    isServer: routeClass.isServer,
    routeSegment: parsedSegment,
  });

  // ... existing function extraction code
  return { classes, functions, stores, props, routes };
}
```

Update all other return statements to include `routes: []`.

Also need `import { basename } from "node:path";`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/extraction/route-symbol-integration.test.ts`
Expected: PASS

- [ ] **Step 5: Run all existing tests**

Run: `pnpm exec vitest run`
Expected: All existing tests pass. Some may fail if they construct `SymbolTable` without `routes` — fix by adding `routes: []`.

- [ ] **Step 6: Commit**

```bash
git add src/extraction/symbol-extractor.ts tests/extraction/route-symbol-integration.test.ts
git commit -m "feat(e8): store RouteSymbol in SymbolTable during extraction"
```

---

### Task 4: Render route stereotypes in class diagram

**Files:**
- Modify: `src/emission/class-diagram.ts`
- Create: `tests/emission/route-emission.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/emission/route-emission.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { renderClassDiagram } from "../../src/emission/class-diagram.js";
import type { SymbolTable } from "../../src/types/ast.js";
import { DEFAULT_DIAGRAM_OPTIONS } from "../../src/types/diagram.js";
import { createEdgeSet } from "../../src/types/edge.js";

function makeEmptySymbolTable(overrides: Partial<SymbolTable> = {}): SymbolTable {
  return {
    classes: [],
    functions: [],
    stores: [],
    props: [],
    exports: [],
    routes: [],
    ...overrides,
  };
}

describe("route stereotype rendering in class diagram", () => {
  it("renders page route with <<page>> stereotype", () => {
    const symbols = makeEmptySymbolTable({
      routes: [
        {
          kind: "route",
          name: "+page",
          filePath: "/src/routes/+page.svelte",
          routeKind: "page",
          isServer: false,
          routeSegment: { raw: "/", params: [], groups: [] },
        },
      ],
    });
    const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
    expect(result).toContain("<<page>>");
    expect(result).toContain("+page");
  });

  it("renders layout route with <<layout>> stereotype", () => {
    const symbols = makeEmptySymbolTable({
      routes: [
        {
          kind: "route",
          name: "+layout",
          filePath: "/src/routes/+layout.svelte",
          routeKind: "layout",
          isServer: false,
          routeSegment: { raw: "/", params: [], groups: [] },
        },
      ],
    });
    const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
    expect(result).toContain("<<layout>>");
  });

  it("renders server route with <<endpoint>> stereotype", () => {
    const symbols = makeEmptySymbolTable({
      routes: [
        {
          kind: "route",
          name: "+server",
          filePath: "/src/routes/api/songs/+server.ts",
          routeKind: "server",
          isServer: true,
          routeSegment: { raw: "/api/songs", params: [], groups: [] },
        },
      ],
    });
    const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
    expect(result).toContain("<<endpoint>>");
  });

  it("renders error route with <<error-page>> stereotype", () => {
    const symbols = makeEmptySymbolTable({
      routes: [
        {
          kind: "route",
          name: "+error",
          filePath: "/src/routes/+error.svelte",
          routeKind: "error",
          isServer: false,
          routeSegment: { raw: "/", params: [], groups: [] },
        },
      ],
    });
    const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
    expect(result).toContain("<<error-page>>");
  });

  it("renders page route with server flag as <<PageLoad>>", () => {
    const symbols = makeEmptySymbolTable({
      routes: [
        {
          kind: "route",
          name: "+page.server",
          filePath: "/src/routes/+page.server.ts",
          routeKind: "page",
          isServer: true,
          routeSegment: { raw: "/", params: [], groups: [] },
        },
      ],
    });
    const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
    expect(result).toContain("<<PageLoad>>");
  });

  it("renders layout route with server flag as <<LayoutLoad>>", () => {
    const symbols = makeEmptySymbolTable({
      routes: [
        {
          kind: "route",
          name: "+layout.server",
          filePath: "/src/routes/+layout.server.ts",
          routeKind: "layout",
          isServer: true,
          routeSegment: { raw: "/", params: [], groups: [] },
        },
      ],
    });
    const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
    expect(result).toContain("<<LayoutLoad>>");
  });

  it("includes route segment path in route box", () => {
    const symbols = makeEmptySymbolTable({
      routes: [
        {
          kind: "route",
          name: "+page",
          filePath: "/src/routes/users/[id]/+page.svelte",
          routeKind: "page",
          isServer: false,
          routeSegment: { raw: "/users/[id]", params: [{ kind: "dynamic", name: "id" }], groups: [] },
        },
      ],
    });
    const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
    expect(result).toContain("/users/[id]");
  });

  it("annotates dynamic params in route box", () => {
    const symbols = makeEmptySymbolTable({
      routes: [
        {
          kind: "route",
          name: "+page",
          filePath: "/src/routes/users/[id]/+page.svelte",
          routeKind: "page",
          isServer: false,
          routeSegment: {
            raw: "/users/[id]",
            params: [{ kind: "dynamic", name: "id" }],
            groups: [],
          },
        },
      ],
    });
    const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
    expect(result).toContain("dynamic id");
  });

  it("annotates rest params in route box", () => {
    const symbols = makeEmptySymbolTable({
      routes: [
        {
          kind: "route",
          name: "+page",
          filePath: "/src/routes/docs/[...slug]/+page.svelte",
          routeKind: "page",
          isServer: false,
          routeSegment: {
            raw: "/docs/[...slug]",
            params: [{ kind: "rest", name: "slug" }],
            groups: [],
          },
        },
      ],
    });
    const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
    expect(result).toContain("rest slug");
  });

  it("annotates params with matchers", () => {
    const symbols = makeEmptySymbolTable({
      routes: [
        {
          kind: "route",
          name: "+page",
          filePath: "/src/routes/items/[id=integer]/+page.svelte",
          routeKind: "page",
          isServer: false,
          routeSegment: {
            raw: "/items/[id=integer]",
            params: [{ kind: "dynamic", name: "id", matcher: "integer" }],
            groups: [],
          },
        },
      ],
    });
    const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
    expect(result).toContain("id=integer");
  });

  it("annotates group layouts", () => {
    const symbols = makeEmptySymbolTable({
      routes: [
        {
          kind: "route",
          name: "+page",
          filePath: "/src/routes/(auth)/login/+page.svelte",
          routeKind: "page",
          isServer: false,
          routeSegment: {
            raw: "/(auth)/login",
            params: [],
            groups: ["auth"],
          },
        },
      ],
    });
    const result = renderClassDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
    expect(result).toContain("group: auth");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/emission/route-emission.test.ts`
Expected: FAIL — no `routes` rendering in class diagram

- [ ] **Step 3: Write implementation**

Modify `src/emission/class-diagram.ts`:

Add `RouteSymbol` to the type import. Add a `renderRoute` function:

```typescript
function routeStereotype(route: RouteSymbol): string {
  if (route.routeKind === "server") return "endpoint";
  if (route.routeKind === "error") return "error-page";
  if (route.routeKind === "page" && route.isServer) return "PageLoad";
  if (route.routeKind === "layout" && route.isServer) return "LayoutLoad";
  if (route.routeKind === "page" && !route.isServer) return "page";
  if (route.routeKind === "layout" && !route.isServer) return "layout";
  return route.routeKind;
}

function renderRoute(lines: string[], route: RouteSymbol): void {
  const stereotype = routeStereotype(route);
  lines.push(`class "${route.name}" <<${stereotype}>> {`);
  lines.push(`  path: ${route.routeSegment.raw}`);
  for (const param of route.routeSegment.params) {
    const matcherSuffix = param.matcher ? `=${param.matcher}` : "";
    lines.push(`  ${param.kind} ${param.name}${matcherSuffix}`);
  }
  for (const group of route.routeSegment.groups) {
    lines.push(`  group: ${group}`);
  }
  lines.push("}");
  lines.push("");
}
```

In `renderClassDiagram`, add after the functions loop:

```typescript
for (const route of symbols.routes) {
  renderRoute(lines, route);
}
```

Update `buildNameMap` to include routes:

```typescript
for (const route of symbols.routes) {
  map.set(route.name, sanitizeId(route.name));
  map.set(route.filePath, sanitizeId(route.name));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/emission/route-emission.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/emission/class-diagram.ts tests/emission/route-emission.test.ts
git commit -m "feat(e8): render route stereotypes in class diagram"
```

---

### Task 5: Render route stereotypes in package diagram

**Files:**
- Modify: `src/emission/package-diagram.ts`

- [ ] **Step 1: Write the failing tests**

Add to `tests/emission/route-emission.test.ts`:

```typescript
import { renderPackageDiagram } from "../../src/emission/package-diagram.js";

describe("route stereotype rendering in package diagram", () => {
  it("renders page route inside package with <<page>> stereotype", () => {
    const symbols = makeEmptySymbolTable({
      routes: [
        {
          kind: "route",
          name: "+page",
          filePath: "/src/routes/+page.svelte",
          routeKind: "page",
          isServer: false,
          routeSegment: { raw: "/", params: [], groups: [] },
        },
      ],
    });
    const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
    expect(result).toContain("<<page>>");
    expect(result).toContain("+page");
  });

  it("renders route in correct package directory", () => {
    const symbols = makeEmptySymbolTable({
      routes: [
        {
          kind: "route",
          name: "+page",
          filePath: "/src/routes/users/[id]/+page.svelte",
          routeKind: "page",
          isServer: false,
          routeSegment: { raw: "/users/[id]", params: [{ kind: "dynamic", name: "id" }], groups: [] },
        },
      ],
    });
    const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
    expect(result).toContain('package "/src/routes/users/[id]"');
    expect(result).toContain("<<page>>");
  });

  it("renders server route with <<endpoint>> in package", () => {
    const symbols = makeEmptySymbolTable({
      routes: [
        {
          kind: "route",
          name: "+server",
          filePath: "/src/routes/api/+server.ts",
          routeKind: "server",
          isServer: true,
          routeSegment: { raw: "/api", params: [], groups: [] },
        },
      ],
    });
    const result = renderPackageDiagram(symbols, createEdgeSet([]), DEFAULT_DIAGRAM_OPTIONS);
    expect(result).toContain("<<endpoint>>");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run tests/emission/route-emission.test.ts`
Expected: FAIL on the package diagram tests

- [ ] **Step 3: Write implementation**

Modify `src/emission/package-diagram.ts`:

Add `RouteSymbol` to imports. Add the same `routeStereotype` helper (or extract it to a shared util). For simplicity, duplicate it in this file.

In `buildPackages`, add after the functions loop:

```typescript
for (const route of symbols.routes) {
  const stereotype = routeStereotype(route);
  addEntry(route.filePath, `class "${route.name}" <<${stereotype}>>`);
}
```

Add the `routeStereotype` function to this file (same logic as in class-diagram.ts):

```typescript
function routeStereotype(route: { routeKind: string; isServer: boolean }): string {
  if (route.routeKind === "server") return "endpoint";
  if (route.routeKind === "error") return "error-page";
  if (route.routeKind === "page" && route.isServer) return "PageLoad";
  if (route.routeKind === "layout" && route.isServer) return "LayoutLoad";
  if (route.routeKind === "page") return "page";
  if (route.routeKind === "layout") return "layout";
  return route.routeKind;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run tests/emission/route-emission.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/emission/package-diagram.ts tests/emission/route-emission.test.ts
git commit -m "feat(e8): render route stereotypes in package diagram"
```

---

### Task 6: Fix existing tests and coverage

**Files:**
- Modify: any test files that construct `SymbolTable` without `routes`

- [ ] **Step 1: Run full test suite**

Run: `pnpm exec vitest run`
Expected: Some tests may fail if they construct `SymbolTable` without `routes: []`

- [ ] **Step 2: Fix failing tests**

Search all test files for `SymbolTable` construction and add `routes: []` to any that are missing it. Check:
- `tests/emission/class-diagram.test.ts` — the `makeEmptySymbolTable` helper
- `tests/emission/package-diagram.test.ts`
- `tests/dependency/edge-builder.test.ts`
- `tests/cli/runner.test.ts`

For each file's `makeEmptySymbolTable` or inline table construction, add `routes: []`.

- [ ] **Step 3: Run coverage**

Run: `pnpm exec vitest run --coverage`
Expected: All tests pass, coverage thresholds met (branches ≥ 90%)

- [ ] **Step 4: Add coverage for uncovered branches if needed**

Check coverage report. Add targeted tests for any uncovered branches in:
- `parseRouteParams` — optional-rest with matcher, empty segment edge cases
- `routeStereotype` — all routeKind/isServer combinations
- `renderRoute` — routes with no params, routes with no groups

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(e8): fix existing tests, ensure coverage thresholds"
```

---

### Task 7: Update route-extractor existing tests for routeSegment parsing

**Files:**
- Modify: `tests/extraction/route-extractor.test.ts`

- [ ] **Step 1: Add tests for routeSegmentFromPath with dynamic segments and groups**

Add to `tests/extraction/route-extractor.test.ts`:

```typescript
describe("routeSegmentFromPath with dynamic segments", () => {
  it("preserves [param] in segment", () => {
    expect(routeSegmentFromPath("/project/src/routes/users/[id]/+page.svelte")).toBe("/users/[id]");
  });

  it("preserves [...slug] in segment", () => {
    expect(routeSegmentFromPath("/project/src/routes/docs/[...slug]/+page.svelte")).toBe(
      "/docs/[...slug]",
    );
  });

  it("preserves [[optional]] in segment", () => {
    expect(routeSegmentFromPath("/project/src/routes/docs/[[lang]]/+page.svelte")).toBe(
      "/docs/[[lang]]",
    );
  });

  it("preserves (group) in segment", () => {
    expect(routeSegmentFromPath("/project/src/routes/(auth)/login/+page.svelte")).toBe(
      "/(auth)/login",
    );
  });

  it("preserves [param=matcher] in segment", () => {
    expect(routeSegmentFromPath("/project/src/routes/items/[id=integer]/+page.svelte")).toBe(
      "/items/[id=integer]",
    );
  });
});
```

- [ ] **Step 2: Run tests**

Run: `pnpm exec vitest run tests/extraction/route-extractor.test.ts`
Expected: PASS (these test existing behavior that already works)

- [ ] **Step 3: Commit**

```bash
git add tests/extraction/route-extractor.test.ts
git commit -m "test(e8): add route segment edge case tests"
```

---

### Task 8: Lint and final verification

- [ ] **Step 1: Run biome lint**

Run: `pnpm dlx @biomejs/biome check src/`
Expected: No errors

- [ ] **Step 2: Run tsc type check**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run full coverage**

Run: `pnpm exec vitest run --coverage`
Expected: All tests pass, coverage ≥ 90% branches

- [ ] **Step 4: Final commit if any lint fixes needed**

```bash
git add -A
git commit -m "chore(e8): lint and typecheck fixes"
```

---

## Self-Review Checklist

### Spec Coverage
- **SUML-38 (Route file type stereotypes):** Tasks 1, 3, 4, 5 — `RouteSymbol` with `routeKind`, stereotypes `<<page>>`, `<<layout>>`, `<<PageLoad>>`, `<<LayoutLoad>>`, `<<endpoint>>`, `<<error-page>>` ✅
- **SUML-39 (Dynamic segments):** Tasks 2, 3 — `parseRouteParams` handles `[param]`, `[...slug]`, `[[optional]]` ✅
- **SUML-40 (Group layouts):** Tasks 2, 3 — `extractGroups` handles `(auth)`, `(protected)` ✅
- **SUML-41 (Parameter matchers):** Tasks 2, 3 — `parseRouteParams` handles `[param=matcher]` ✅

### Placeholder Scan
- No TBD, TODO, or "implement later" found ✅
- All steps have code ✅
- All commands specified ✅

### Type Consistency
- `RouteSymbol.kind` = `"route"` throughout ✅
- `RouteParam` fields consistent across types, parsing, and emission ✅
- `RouteSegment` structure consistent across extraction and emission ✅
- `SymbolTable.routes: RouteSymbol[]` used consistently ✅
- `routeStereotype` logic matches between class-diagram.ts and package-diagram.ts ✅
