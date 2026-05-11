import { describe, expect, it } from "vitest";
import { extractSlotFills } from "../../src/extraction/slot-extractor.js";
import type { ResolvedImport } from "../../src/dependency/import-scanner.js";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function makeImports(overrides?: Partial<ResolvedImport>): ResolvedImport {
	return {
		sourceFile: "/src/routes/+page.svelte",
		targetFile: "/src/lib/Button.svelte",
		importedNames: ["Button"],
		isTypeOnly: false,
		...overrides,
	};
}

describe("extractSlotFills", () => {
	it("returns empty for no svelte files", () => {
		const result = extractSlotFills([], []);
		expect(result).toHaveLength(0);
	});

	it("detects default slot usage from component with children", () => {
		const dir = mkdtempSync(join(tmpdir(), "slot-test-"));
		const parentPath = join(dir, "Parent.svelte");
		const childPath = join(dir, "Child.svelte");

		writeFileSync(
			parentPath,
			`<script>
  import Child from "./Child.svelte";
</script>

<Child>
  <p>Slot content</p>
</Child>
`,
			"utf-8",
		);

		writeFileSync(childPath, `<slot />`, "utf-8");

		const imports: ResolvedImport[] = [
			{
				sourceFile: parentPath,
				targetFile: childPath,
				importedNames: ["Child"],
				isTypeOnly: false,
			},
		];

		const result = extractSlotFills([parentPath, childPath], imports);
		expect(result).toHaveLength(1);
		expect(result[0]?.sourceFile).toBe(parentPath);
		expect(result[0]?.targetFile).toBe(childPath);
		expect(result[0]?.slotName).toBe("default");
	});

	it("detects named slot usage via slot attribute", () => {
		const dir = mkdtempSync(join(tmpdir(), "slot-test-"));
		const parentPath = join(dir, "Parent.svelte");
		const childPath = join(dir, "Card.svelte");

		writeFileSync(
			parentPath,
			`<script>
  import Card from "./Card.svelte";
</script>

<Card>
  <h1 slot="header">Title</h1>
  <p>Body</p>
</Card>
`,
			"utf-8",
		);

		writeFileSync(childPath, `<slot name="header" /><slot />`, "utf-8");

		const imports: ResolvedImport[] = [
			{
				sourceFile: parentPath,
				targetFile: childPath,
				importedNames: ["Card"],
				isTypeOnly: false,
			},
		];

		const result = extractSlotFills([parentPath, childPath], imports);
		expect(result.length).toBeGreaterThanOrEqual(2);

		const headerFill = result.find((r) => r.slotName === "header");
		expect(headerFill).toBeDefined();
		expect(headerFill?.sourceFile).toBe(parentPath);
		expect(headerFill?.targetFile).toBe(childPath);

		const defaultFill = result.find((r) => r.slotName === "default");
		expect(defaultFill).toBeDefined();
		expect(defaultFill?.sourceFile).toBe(parentPath);
		expect(defaultFill?.targetFile).toBe(childPath);
	});

	it("ignores self-closing component usage", () => {
		const dir = mkdtempSync(join(tmpdir(), "slot-test-"));
		const parentPath = join(dir, "Parent.svelte");
		const childPath = join(dir, "Button.svelte");

		writeFileSync(
			parentPath,
			`<script>
  import Button from "./Button.svelte";
</script>

<Button label="Click me" />
`,
			"utf-8",
		);

		writeFileSync(childPath, `<button><slot /></button>`, "utf-8");

		const imports: ResolvedImport[] = [
			{
				sourceFile: parentPath,
				targetFile: childPath,
				importedNames: ["Button"],
				isTypeOnly: false,
			},
		];

		const result = extractSlotFills([parentPath, childPath], imports);
		expect(result).toHaveLength(0);
	});

	it("ignores component with only whitespace children", () => {
		const dir = mkdtempSync(join(tmpdir(), "slot-test-"));
		const parentPath = join(dir, "Parent.svelte");
		const childPath = join(dir, "Wrapper.svelte");

		writeFileSync(
			parentPath,
			`<script>
  import Wrapper from "./Wrapper.svelte";
</script>

<Wrapper>

</Wrapper>
`,
			"utf-8",
		);

		writeFileSync(childPath, `<slot />`, "utf-8");

		const imports: ResolvedImport[] = [
			{
				sourceFile: parentPath,
				targetFile: childPath,
				importedNames: ["Wrapper"],
				isTypeOnly: false,
			},
		];

		const result = extractSlotFills([parentPath, childPath], imports);
		expect(result).toHaveLength(0);
	});

	it("skips fills when import is not found for component", () => {
		const dir = mkdtempSync(join(tmpdir(), "slot-test-"));
		const parentPath = join(dir, "Parent.svelte");
		const childPath = join(dir, "Missing.svelte");

		writeFileSync(
			parentPath,
			`<Missing>
  <p>Content</p>
</Missing>
`,
			"utf-8",
		);

		writeFileSync(childPath, `<slot />`, "utf-8");

		const result = extractSlotFills([parentPath, childPath], [
			{
				sourceFile: parentPath,
				targetFile: childPath,
				importedNames: ["OtherName"],
				isTypeOnly: false,
			},
		]);
		expect(result).toHaveLength(0);
	});
});
