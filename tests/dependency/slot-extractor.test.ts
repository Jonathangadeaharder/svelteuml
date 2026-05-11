import { describe, expect, it } from "vitest";
import { extractSlotFills } from "../../src/extraction/slot-extractor.js";
import type { ResolvedImport } from "../../src/dependency/import-scanner.js";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function createScenario(
	parentContent: string,
	childName: string,
	childContent: string,
	importedName?: string,
): { parentPath: string; childPath: string; imports: ResolvedImport[] } {
	const dir = mkdtempSync(join(tmpdir(), "slot-test-"));
	const parentPath = join(dir, "Parent.svelte");
	const childPath = join(dir, childName);
	writeFileSync(parentPath, parentContent, "utf-8");
	writeFileSync(childPath, childContent, "utf-8");
	return {
		parentPath,
		childPath,
		imports: [
			{
				sourceFile: parentPath,
				targetFile: childPath,
				importedNames: [importedName ?? childName.replace(/\.svelte$/, "")],
				isTypeOnly: false,
			},
		],
	};
}

describe("extractSlotFills", () => {
	it("returns empty for no svelte files", () => {
		const result = extractSlotFills([], []);
		expect(result).toHaveLength(0);
	});

	it("detects default slot usage from component with children", () => {
		const { parentPath, childPath, imports } = createScenario(
			`<script>
  import Child from "./Child.svelte";
</script>

<Child>
  <p>Slot content</p>
</Child>
`,
			"Child.svelte",
			`<slot />`,
		);

		const result = extractSlotFills([parentPath, childPath], imports);
		expect(result).toHaveLength(1);
		expect(result[0]?.sourceFile).toBe(parentPath);
		expect(result[0]?.targetFile).toBe(childPath);
		expect(result[0]?.slotName).toBe("default");
	});

	it("detects named slot usage via slot attribute", () => {
		const { parentPath, childPath, imports } = createScenario(
			`<script>
  import Card from "./Card.svelte";
</script>

<Card>
  <h1 slot="header">Title</h1>
  <p>Body</p>
</Card>
`,
			"Card.svelte",
			`<slot name="header" /><slot />`,
		);

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
		const { parentPath, childPath, imports } = createScenario(
			`<script>
  import Button from "./Button.svelte";
</script>

<Button label="Click me" />
`,
			"Button.svelte",
			`<button><slot /></button>`,
		);

		const result = extractSlotFills([parentPath, childPath], imports);
		expect(result).toHaveLength(0);
	});

	it("ignores component with only whitespace children", () => {
		const { parentPath, childPath, imports } = createScenario(
			`<script>
  import Wrapper from "./Wrapper.svelte";
</script>

<Wrapper>

</Wrapper>
`,
			"Wrapper.svelte",
			`<slot />`,
		);

		const result = extractSlotFills([parentPath, childPath], imports);
		expect(result).toHaveLength(0);
	});

	it("skips fills when import is not found for component", () => {
		const { parentPath, childPath } = createScenario(
			`<Missing>
  <p>Content</p>
</Missing>
`,
			"Missing.svelte",
			`<slot />`,
		);

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
