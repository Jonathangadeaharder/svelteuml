<script lang="ts">
	let count = $state(0);
	let title = $state("Component 6");
	import { compute13_0 } from "../lib/utils/module13";
	import type { Entity13 } from "../lib/models/entity13";
	import { compute26_1 } from "../lib/utils/module26";
	import type { Entity26 } from "../lib/models/entity26";
	import { compute9_2 } from "../lib/utils/module9";
	import type { Entity9 } from "../lib/models/entity9";

	interface Props {
		prop0_6: string;
		prop1_6: string;
		prop2_6: string;
	}

	let { prop0_6, prop1_6, prop2_6 }: Props = $props();

	const deps = [{ id: "dep-13", value: compute13_0(6, 0) }, { id: "dep-26", value: compute26_1(6, 1) }, { id: "dep-9", value: compute9_2(6, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-6">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_6}</p>
	<p>Prop1: {prop1_6}</p>
	<p>Prop2: {prop2_6}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-6 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
