<script lang="ts">
	let count = $state(0);
	let title = $state("Component 10");
	import { compute11_0 } from "../lib/utils/module11";
	import type { Entity11 } from "../lib/models/entity11";
	import { compute24_1 } from "../lib/utils/module24";
	import type { Entity24 } from "../lib/models/entity24";
	import { compute7_2 } from "../lib/utils/module7";
	import type { Entity7 } from "../lib/models/entity7";

	interface Props {
		prop0_10: string;
		prop1_10: string;
		prop2_10: string;
	}

	let { prop0_10, prop1_10, prop2_10 }: Props = $props();

	const deps = [{ id: "dep-11", value: compute11_0(10, 0) }, { id: "dep-24", value: compute24_1(10, 1) }, { id: "dep-7", value: compute7_2(10, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-10">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_10}</p>
	<p>Prop1: {prop1_10}</p>
	<p>Prop2: {prop2_10}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-10 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
