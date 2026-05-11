<script lang="ts">
	let count = $state(0);
	let title = $state("Component 20");
	import { compute21_0 } from "../lib/utils/module21";
	import type { Entity21 } from "../lib/models/entity21";
	import { compute4_1 } from "../lib/utils/module4";
	import type { Entity4 } from "../lib/models/entity4";
	import { compute17_2 } from "../lib/utils/module17";
	import type { Entity17 } from "../lib/models/entity17";

	interface Props {
		prop0_20: string;
		prop1_20: string;
		prop2_20: string;
	}

	let { prop0_20, prop1_20, prop2_20 }: Props = $props();

	const deps = [{ id: "dep-21", value: compute21_0(20, 0) }, { id: "dep-4", value: compute4_1(20, 1) }, { id: "dep-17", value: compute17_2(20, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-20">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_20}</p>
	<p>Prop1: {prop1_20}</p>
	<p>Prop2: {prop2_20}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-20 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
