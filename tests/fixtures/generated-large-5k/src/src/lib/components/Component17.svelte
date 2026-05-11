<script lang="ts">
	let count = $state(0);
	let title = $state("Component 17");
	import { compute30_0 } from "../lib/utils/module30";
	import type { Entity30 } from "../lib/models/entity30";
	import { compute13_1 } from "../lib/utils/module13";
	import type { Entity13 } from "../lib/models/entity13";
	import { compute26_2 } from "../lib/utils/module26";
	import type { Entity26 } from "../lib/models/entity26";

	interface Props {
		prop0_17: string;
		prop1_17: string;
		prop2_17: string;
	}

	let { prop0_17, prop1_17, prop2_17 }: Props = $props();

	const deps = [{ id: "dep-30", value: compute30_0(17, 0) }, { id: "dep-13", value: compute13_1(17, 1) }, { id: "dep-26", value: compute26_2(17, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-17">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_17}</p>
	<p>Prop1: {prop1_17}</p>
	<p>Prop2: {prop2_17}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-17 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
