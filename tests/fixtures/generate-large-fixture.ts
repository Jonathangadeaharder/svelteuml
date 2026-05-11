import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURE_DIR = resolve(import.meta.dirname, "generated-large-5k");
const SRC_DIR = resolve(FIXTURE_DIR, "src");

interface FileSpec {
	path: string;
	content: string;
}

let lineCount = 0;

function w(path: string, content: string): FileSpec {
	lineCount += content.split("\n").length;
	return { path, content };
}

function storeModule(i: number): string {
	return `import { writable, derived } from "svelte/store";

export interface Data${i} {
	id: number;
	name: string;
	value: number;
	metadata: Record<string, string>;
}

export function createStore${i}(initial: Data${i}) {
	const store = writable<Data${i}>(initial);
	const doubled = derived(store, ($s) => ({ ...$s, value: $s.value * 2 }));
	const metadata = derived(store, ($s) => Object.keys($s.metadata));
	return { store, doubled, metadata };
}

export function resetStore${i}() {
	return createStore${i}({ id: ${i}, name: "item-${i}", value: ${i}00, metadata: { type: "auto" } });
}
`;
}

function utilModule(i: number): string {
	const fns: string[] = [];
	for (let j = 0; j < 5; j++) {
		fns.push(`export function compute${i}_${j}(a: number, b: number): number {
	const base = a * b + ${i} + ${j};
	const factor = Math.min(a, b) > 0 ? base / Math.max(a, b) : base;
	return Math.round(factor * 100) / 100;
}

export function format${i}_${j}(value: number, prefix = ""): string {
	const abs = Math.abs(value);
	if (abs >= 1_000_000) return \`\${prefix}\${(value / 1_000_000).toFixed(1)}M\`;
	if (abs >= 1_000) return \`\${prefix}\${(value / 1_000).toFixed(1)}K\`;
	return \`\${prefix}\${value.toFixed(2)}\`;
}

export function validate${i}_${j}(input: string): { valid: boolean; reason?: string } {
	if (!input || input.trim().length === 0) return { valid: false, reason: "empty" };
	if (input.length > 255) return { valid: false, reason: "too long" };
	const pattern = /^[a-zA-Z0-9_\\-\\s]+$/;
	if (!pattern.test(input)) return { valid: false, reason: "invalid chars" };
	return { valid: true };
}

export interface Result${i}_${j} {
	ok: boolean;
	data: string[];
	error?: string;
	timestamp: number;
}

export async function fetch${i}_${j}(url: string): Promise<Result${i}_${j}> {
	try {
		const response = await fetch(url);
		const body = await response.json() as string[];
		return { ok: true, data: body, timestamp: Date.now() };
	} catch (e) {
		return { ok: false, data: [], error: String(e), timestamp: Date.now() };
	}
}
`);
	}
	return fns.join("\n");
}

function classModule(i: number): string {
	return `export interface Entity${i} {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}

export abstract class BaseService${i} {
	protected items: Map<string, Entity${i}> = new Map();

	abstract create(data: Omit<Entity${i}, "id" | "createdAt" | "updatedAt">): Entity${i};

	findById(id: string): Entity${i} | undefined {
		return this.items.get(id);
	}

	findAll(): Entity${i}[] {
		return Array.from(this.items.values());
	}

	delete(id: string): boolean {
		return this.items.delete(id);
	}

	count(): number {
		return this.items.size;
	}
}

export class MemoryService${i} extends BaseService${i} {
	create(data: Omit<Entity${i}, "id" | "createdAt" | "updatedAt">): Entity${i} {
		const now = new Date();
		const entity: Entity${i} = {
			id: crypto.randomUUID(),
			...data,
			createdAt: now,
			updatedAt: now,
		};
		this.items.set(entity.id, entity);
		return entity;
	}

	bulkCreate(items: Array<Omit<Entity${i}, "id" | "createdAt" | "updatedAt">>): Entity${i}[] {
		return items.map((item) => this.create(item));
	}
}

export class CachedService${i} extends BaseService${i} {
	private cache = new Map<string, { data: Entity${i}; ttl: number }>();
	private readonly ttlMs: number;

	constructor(ttlMs = 60_000) {
		super();
		this.ttlMs = ttlMs;
	}

	create(data: Omit<Entity${i}, "id" | "createdAt" | "updatedAt">): Entity${i} {
		const entity = super.create(data);
		this.cache.set(entity.id, { data: entity, ttl: Date.now() + this.ttlMs });
		return entity;
	}

	findById(id: string): Entity${i} | undefined {
		const cached = this.cache.get(id);
		if (cached && cached.ttl > Date.now()) return cached.data;
		return super.findById(id);
	}
}
`;
}

function svelteComponent(i: number, depCount: number): string {
	const deps: string[] = [];
	const imports: string[] = [];
	for (let d = 0; d < depCount; d++) {
		const depIdx = ((i * 7 + d * 13) % 30) + 1;
		imports.push(`import { compute${depIdx}_${d % 5} } from "../lib/utils/module${depIdx}";`);
		imports.push(`import type { Entity${depIdx} } from "../lib/models/entity${depIdx}";`);
		deps.push(`{ id: "dep-${depIdx}", value: compute${depIdx}_${d % 5}(${i}, ${d}) }`);
	}
	const propTypes: string[] = [];
	for (let p = 0; p < 3; p++) {
		propTypes.push(`prop${p}_${i}: string;`);
	}

	return `<script lang="ts">
	let count = $state(0);
	let title = $state("Component ${i}");
	${imports.join("\n\t")}

	interface Props {
		${propTypes.join("\n\t\t")}
	}

	let { prop0_${i}, prop1_${i}, prop2_${i} }: Props = $props();

	const deps = [${deps.join(", ")}];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-${i}">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_${i}}</p>
	<p>Prop1: {prop1_${i}}</p>
	<p>Prop2: {prop2_${i}}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-${i} {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
`;
}

function routePage(i: number): string {
	return `<script lang="ts">
	import { page } from "$app/stores";
	import Component${i} from "../lib/components/Component${i}.svelte";

	let search = $state("");
	let items = $state<string[]>([]);

	function handleSubmit() {
		items = [...items, search];
		search = "";
	}
</script>

<h1>Page ${i}</h1>
<input bind:value={search} placeholder="Search..." />
<button onclick={handleSubmit}>Add</button>
<Component${i} prop0_${i}="val0" prop1_${i}="val1" prop2_${i}="val2" />
<ul>
	{#each items as item}
		<li>{item}</li>
	{/each}
</ul>
`;
}

function routeServer(i: number): string {
	return `import type { RequestEvent } from "@sveltejs/kit";

export interface Item${i} {
	id: number;
	label: string;
	value: number;
	tags: string[];
}

const items = new Map<number, Item${i}>();

export async function GET(event: RequestEvent): Promise<Response> {
	const id = Number(event.url.searchParams.get("id") ?? "0");
	const item = items.get(id);
	return Response.json(item ?? null);
}

export async function POST(event: RequestEvent): Promise<Response> {
	const body = (await event.request.json()) as Omit<Item${i}, "id">;
	const id = items.size + 1;
	items.set(id, { id, ...body });
	return Response.json({ id }, { status: 201 });
}

export async function DELETE(event: RequestEvent): Promise<Response> {
	const id = Number(event.url.searchParams.get("id") ?? "0");
	items.delete(id);
	return new Response(null, { status: 204 });
}
`;
}

function routePageLoad(i: number): string {
	return `import type { PageLoad } from "./$types";

export interface PageData${i} {
	title: string;
	items: number[];
	metadata: Record<string, string>;
}

export const load: PageLoad<PageData${i}> = async ({ fetch, params }) => {
	const response = await fetch("/api/data");
	const data = (await response.json()) as { items: number[] };
	return {
		title: \`Page \${params.slug ?? "default"}\`,
		items: data.items,
		metadata: { page: "${i}", version: "1.0" },
	};
};
`;
}

function generateFixture(): void {
	const files: FileSpec[] = [];

	// Config files
	files.push(w(
		"svelte.config.js",
		`import adapter from "@sveltejs/kit/adapter-auto";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		alias: {
			$lib: "./src/lib",
		},
	},
};

export default config;
`,
	));

	// Svelte components (30)
	for (let i = 1; i <= 30; i++) {
		files.push(w(`src/lib/components/Component${i}.svelte`, svelteComponent(i, 3)));
	}

	// TypeScript util modules (30)
	for (let i = 1; i <= 30; i++) {
		files.push(w(`src/lib/utils/module${i}.ts`, utilModule(i)));
	}

	// TypeScript class modules (10)
	for (let i = 1; i <= 10; i++) {
		files.push(w(`src/lib/models/entity${i}.ts`, classModule(i)));
	}

	// Store modules (10)
	for (let i = 1; i <= 10; i++) {
		files.push(w(`src/lib/stores/store${i}.ts`, storeModule(i)));
	}

	// Routes - page directories (20)
	for (let i = 1; i <= 20; i++) {
		const dir = `src/routes/page${i}`;
		files.push(w(`${dir}/+page.svelte`, routePage(i)));
		files.push(w(`${dir}/+page.ts`, routePageLoad(i)));
	}

	// API route directories (10)
	for (let i = 1; i <= 10; i++) {
		const dir = `src/routes/api/v${i}`;
		files.push(w(`${dir}/+server.ts`, routeServer(i)));
	}

	// Root layout
	files.push(w(
		"src/routes/+layout.svelte",
		`<script lang="ts">
	import Component1 from "$lib/components/Component1.svelte";

	let { children } = $props();
</script>

<nav>
	<a href="/">Home</a>
	<a href="/page1">Page 1</a>
	<a href="/page2">Page 2</a>
</nav>
<main>
	{@render children()}
</main>
`,
	));

	// Root layout TS
	files.push(w(
		"src/routes/+layout.ts",
		`export const prerender = false;
export const ssr = true;
`,
	));

	// Root page
	files.push(w(
		"src/routes/+page.svelte",
		`<script lang="ts">
	import Component1 from "$lib/components/Component1.svelte";
	import Component2 from "$lib/components/Component2.svelte";
</script>

<h1>Dashboard</h1>
<Component1 prop0_1="a" prop1_1="b" prop2_1="c" />
<Component2 prop0_2="x" prop1_2="y" prop2_2="z" />
`,
	));

	// Root page load
	files.push(w(
		"src/routes/+page.ts",
		`import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
	return {
		timestamp: Date.now(),
	};
};
`,
	));

	// Build all directories and write files
	for (const file of files) {
		const fullPath = resolve(SRC_DIR, file.path);
		mkdirSync(new URL(`.`, `file://${fullPath}`).pathname, { recursive: true });
		writeFileSync(fullPath, file.content, "utf-8");
	}

	console.log(`Generated ${files.length} files, ${lineCount} LOC`);
}

generateFixture();
