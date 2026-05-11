<script lang="ts">
	let count = $state(0);
	let title = $state("Component 7");
	import { compute20_0 } from "../lib/utils/module20";
	import type { Entity20 } from "../lib/models/entity20";
	import { compute3_1 } from "../lib/utils/module3";
	import type { Entity3 } from "../lib/models/entity3";
	import { compute16_2 } from "../lib/utils/module16";
	import type { Entity16 } from "../lib/models/entity16";

	interface Props {
		prop0_7: string;
		prop1_7: string;
		prop2_7: string;
	}

	let { prop0_7, prop1_7, prop2_7 }: Props = $props();

	const deps = [{ id: "dep-20", value: compute20_0(7, 0) }, { id: "dep-3", value: compute3_1(7, 1) }, { id: "dep-16", value: compute16_2(7, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-7">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_7}</p>
	<p>Prop1: {prop1_7}</p>
	<p>Prop2: {prop2_7}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-7 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
