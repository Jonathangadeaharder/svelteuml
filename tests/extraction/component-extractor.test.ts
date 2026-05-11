import { Project } from "ts-morph";
import { SyntaxKind } from "ts-morph";
import { describe, expect, it } from "vitest";
import {
	componentNameFromPath,
	extractComponentEvents,
	extractComponentProps,
} from "../../src/extraction/component-extractor.js";

describe("componentNameFromPath", () => {
	it("extracts name from a lib component", () => {
		expect(componentNameFromPath("/src/lib/components/HitCard.svelte")).toBe("HitCard");
	});

	it("extracts name from a route page", () => {
		expect(componentNameFromPath("/src/routes/+page.svelte")).toBe("+page");
	});

	it("extracts name from a layout file", () => {
		expect(componentNameFromPath("/src/routes/+layout.svelte")).toBe("+layout");
	});

	it("handles nested paths", () => {
		expect(componentNameFromPath("/deep/nested/path/MyComponent.svelte")).toBe("MyComponent");
	});
});

describe("extractComponentProps (Svelte 4 export let)", () => {
	function makeSourceFile(code: string, filePath = "/src/lib/Button.svelte.tsx") {
		const project = new Project({ useInMemoryFileSystem: true });
		return project.createSourceFile(filePath, code);
	}

	it("extracts a required typed prop", () => {
		// Mimics svelte2tsx output for: export let title: string;
		const sf = makeSourceFile(`
			export let title: string;
		`);
		const props = extractComponentProps(sf, "Button", "/src/lib/Button.svelte");
		expect(props).toHaveLength(1);
		expect(props[0]?.name).toBe("title");
		expect(props[0]?.type).toBe("string");
		expect(props[0]?.isRequired).toBe(true);
		expect(props[0]?.defaultValue).toBeUndefined();
	});

	it("extracts an optional prop with default value", () => {
		// Mimics: export let size: number = 16;
		const sf = makeSourceFile(`
			export let size: number = 16;
		`);
		const props = extractComponentProps(sf, "Button", "/src/lib/Button.svelte");
		expect(props).toHaveLength(1);
		expect(props[0]?.name).toBe("size");
		expect(props[0]?.type).toBe("number");
		expect(props[0]?.defaultValue).toBe("16");
	});

	it("extracts multiple props", () => {
		const sf = makeSourceFile(`
			export let label: string;
			export let disabled: boolean = false;
			export let count: number = 0;
		`);
		const props = extractComponentProps(sf, "Counter", "/src/lib/Counter.svelte");
		expect(props).toHaveLength(3);
		const names = props.map((p) => p.name);
		expect(names).toContain("label");
		expect(names).toContain("disabled");
		expect(names).toContain("count");
	});

	it("ignores non-exported variables", () => {
		const sf = makeSourceFile(`
			let internal = 42;
			export let visible: string = "hello";
		`);
		const props = extractComponentProps(sf, "Comp", "/src/lib/Comp.svelte");
		expect(props).toHaveLength(1);
		expect(props[0]?.name).toBe("visible");
	});

	it("skips arrow function exports (event handlers, not props)", () => {
		const sf = makeSourceFile(`
			export let onClick: () => void;
			export const handleEvent = () => {};
		`);
		const props = extractComponentProps(sf, "Btn", "/src/lib/Btn.svelte");
		// onClick is a prop (typed as function), handleEvent is a function export
		const onClick = props.find((p) => p.name === "onClick");
		expect(onClick).toBeDefined();
		const handleEvent = props.find((p) => p.name === "handleEvent");
		expect(handleEvent).toBeUndefined();
	});

	it("skips files in node_modules", () => {
		const sf = makeSourceFile(
			`
			export let label: string;
		`,
			"/project/node_modules/ui/Button.svelte.tsx",
		);
		const props = extractComponentProps(sf, "Button", "/project/node_modules/ui/Button.svelte");
		expect(props).toHaveLength(0);
	});

	it("assigns correct filePath and componentName", () => {
		const sf = makeSourceFile(`
			export let value: number = 0;
		`);
		const props = extractComponentProps(sf, "Slider", "/src/lib/Slider.svelte");
		expect(props[0]?.filePath).toBe("/src/lib/Slider.svelte");
		expect(props[0]?.componentName).toBe("Slider");
	});
});

describe("extractComponentProps (Svelte 5 $props rune)", () => {
	function makeSourceFile(code: string, filePath = "/src/lib/Card.svelte.tsx") {
		const project = new Project({ useInMemoryFileSystem: true });
		return project.createSourceFile(filePath, code);
	}

	it("extracts props from $props() destructure", () => {
		// Mimics svelte2tsx output for Svelte 5 $props rune
		const sf = makeSourceFile(`
			let { song, faceDown = false, size = 'md' }: {
				song: Song; faceDown?: boolean; size?: 'sm' | 'md';
			} = $props();
		`);
		const props = extractComponentProps(sf, "HitCard", "/src/lib/HitCard.svelte");
		expect(props.length).toBeGreaterThanOrEqual(1);
		const songProp = props.find((p) => p.name === "song");
		expect(songProp).toBeDefined();
		expect(songProp?.isRequired).toBe(true);
	});

	it("marks props with defaults as not required", () => {
		const sf = makeSourceFile(`
			let { label = 'default', value }: { label?: string; value: number } = $props();
		`);
		const props = extractComponentProps(sf, "Input", "/src/lib/Input.svelte");
		const labelProp = props.find((p) => p.name === "label");
		const valueProp = props.find((p) => p.name === "value");
		expect(labelProp?.isRequired).toBe(false);
		expect(valueProp?.isRequired).toBe(true);
	});

	it("captures default value text", () => {
		const sf = makeSourceFile(`
			let { theme = 'light' }: { theme?: string } = $props();
		`);
		const props = extractComponentProps(sf, "App", "/src/lib/App.svelte");
		const themeProp = props.find((p) => p.name === "theme");
		expect(themeProp?.defaultValue).toBe("'light'");
	});

	it("extracts $props() from inside $$render() function body", () => {
		// Real svelte2tsx wraps Svelte 5 components in $$render()
		const sf = makeSourceFile(`
			import type { Snippet } from 'svelte';
			;type $$ComponentProps = { kind?: 'primary' | 'ghost'; children: Snippet; };
			function $$render() {
				let { kind = 'primary', children }:/*\u03A9ignore_start\u03A9*/$$ComponentProps/*\u03A9ignore_end\u03A9*/ = $props();
				const styles = {};
			}
		`);
		const props = extractComponentProps(sf, "Button", "/src/lib/Button.svelte");
		expect(props).toHaveLength(2);
		const names = props.map((p) => p.name);
		expect(names).toContain("kind");
		expect(names).toContain("children");
		const kindProp = props.find((p) => p.name === "kind");
		expect(kindProp?.isRequired).toBe(false);
		expect(kindProp?.defaultValue).toBe("'primary'");
	});
});

describe("extractComponentEvents", () => {
	function makeSourceFile(code: string, filePath = "/src/lib/Button.svelte.tsx") {
		const project = new Project({ useInMemoryFileSystem: true });
		return project.createSourceFile(filePath, code);
	}

	it("extracts events from createEventDispatcher with type parameter", () => {
		const sf = makeSourceFile(`
			import { createEventDispatcher } from 'svelte';
			const dispatch = createEventDispatcher<{ submit: FormData; cancel: void }>();
		`);
		const events = extractComponentEvents(sf, "Button", "/src/lib/Button.svelte");
		expect(events).toHaveLength(2);
		const names = events.map((e) => e.eventName);
		expect(names).toContain("submit");
		expect(names).toContain("cancel");
		const submit = events.find((e) => e.eventName === "submit");
		expect(submit?.type).toBe("FormData");
	});

	it("returns empty array when no createEventDispatcher", () => {
		const sf = makeSourceFile(`
			export let label: string;
		`);
		const events = extractComponentEvents(sf, "Button", "/src/lib/Button.svelte");
		expect(events).toHaveLength(0);
	});

	it("extracts callback props (on-prefixed) from $props() as events", () => {
		const sf = makeSourceFile(`
			let { onclick, onsubmit, label }: {
				onclick: () => void; onsubmit: (data: FormData) => void; label: string;
			} = $props();
		`);
		const events = extractComponentEvents(sf, "Form", "/src/lib/Form.svelte");
		expect(events.length).toBeGreaterThanOrEqual(2);
		const names = events.map((e) => e.eventName);
		expect(names).toContain("onclick");
		expect(names).toContain("onsubmit");
	});

	it("ignores non-on-prefixed props from event extraction", () => {
		const sf = makeSourceFile(`
			let { label, value, onclick }: {
				label: string; value: number; onclick: () => void;
			} = $props();
		`);
		const events = extractComponentEvents(sf, "Input", "/src/lib/Input.svelte");
		const eventNames = events.map((e) => e.eventName);
		expect(eventNames).not.toContain("label");
		expect(eventNames).not.toContain("value");
		expect(eventNames).toContain("onclick");
	});

	it("deduplicates events found by both strategies", () => {
		const sf = makeSourceFile(`
			import { createEventDispatcher } from 'svelte';
			const dispatch = createEventDispatcher<{ click: MouseEvent }>();
			let { click, onclick }: { click: () => void; onclick: () => void } = $props();
		`);
		const events = extractComponentEvents(sf, "Btn", "/src/lib/Btn.svelte");
		const clicks = events.filter((e) => e.eventName === "click");
		expect(clicks).toHaveLength(1);
	});

	it("skips files in node_modules", () => {
		const sf = makeSourceFile(
			`
			import { createEventDispatcher } from 'svelte';
			const dispatch = createEventDispatcher<{ submit: FormData }>();
		`,
			"/project/node_modules/ui/Button.svelte.tsx",
		);
		const events = extractComponentEvents(sf, "Button", "/project/node_modules/ui/Button.svelte");
		expect(events).toHaveLength(0);
	});
});
