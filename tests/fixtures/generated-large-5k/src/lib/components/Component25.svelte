<script lang="ts">
	let count = $state(0);
	let title = $state("Component 25");
	import { compute26_0 } from "../lib/utils/module26";
	import type { Entity26 } from "../lib/models/entity26";
	import { compute9_1 } from "../lib/utils/module9";
	import type { Entity9 } from "../lib/models/entity9";
	import { compute22_2 } from "../lib/utils/module22";
	import type { Entity22 } from "../lib/models/entity22";

	interface Props {
		prop0_25: string;
		prop1_25: string;
		prop2_25: string;
	}

	let { prop0_25, prop1_25, prop2_25 }: Props = $props();

	const deps = [{ id: "dep-26", value: compute26_0(25, 0) }, { id: "dep-9", value: compute9_1(25, 1) }, { id: "dep-22", value: compute22_2(25, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-25">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_25}</p>
	<p>Prop1: {prop1_25}</p>
	<p>Prop2: {prop2_25}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-25 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
