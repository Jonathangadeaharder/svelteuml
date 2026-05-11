<script lang="ts">
	let count = $state(0);
	let title = $state("Component 18");
	import { compute7_0 } from "../lib/utils/module7";
	import type { Entity7 } from "../lib/models/entity7";
	import { compute20_1 } from "../lib/utils/module20";
	import type { Entity20 } from "../lib/models/entity20";
	import { compute3_2 } from "../lib/utils/module3";
	import type { Entity3 } from "../lib/models/entity3";

	interface Props {
		prop0_18: string;
		prop1_18: string;
		prop2_18: string;
	}

	let { prop0_18, prop1_18, prop2_18 }: Props = $props();

	const deps = [{ id: "dep-7", value: compute7_0(18, 0) }, { id: "dep-20", value: compute20_1(18, 1) }, { id: "dep-3", value: compute3_2(18, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-18">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_18}</p>
	<p>Prop1: {prop1_18}</p>
	<p>Prop2: {prop2_18}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-18 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
