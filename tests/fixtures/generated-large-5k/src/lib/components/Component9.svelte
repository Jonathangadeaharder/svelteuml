<script lang="ts">
	let count = $state(0);
	let title = $state("Component 9");
	import { compute4_0 } from "../lib/utils/module4";
	import type { Entity4 } from "../lib/models/entity4";
	import { compute17_1 } from "../lib/utils/module17";
	import type { Entity17 } from "../lib/models/entity17";
	import { compute30_2 } from "../lib/utils/module30";
	import type { Entity30 } from "../lib/models/entity30";

	interface Props {
		prop0_9: string;
		prop1_9: string;
		prop2_9: string;
	}

	let { prop0_9, prop1_9, prop2_9 }: Props = $props();

	const deps = [{ id: "dep-4", value: compute4_0(9, 0) }, { id: "dep-17", value: compute17_1(9, 1) }, { id: "dep-30", value: compute30_2(9, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-9">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_9}</p>
	<p>Prop1: {prop1_9}</p>
	<p>Prop2: {prop2_9}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-9 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
