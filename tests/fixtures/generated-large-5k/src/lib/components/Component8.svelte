<script lang="ts">
	let count = $state(0);
	let title = $state("Component 8");
	import { compute27_0 } from "../lib/utils/module27";
	import type { Entity27 } from "../lib/models/entity27";
	import { compute10_1 } from "../lib/utils/module10";
	import type { Entity10 } from "../lib/models/entity10";
	import { compute23_2 } from "../lib/utils/module23";
	import type { Entity23 } from "../lib/models/entity23";

	interface Props {
		prop0_8: string;
		prop1_8: string;
		prop2_8: string;
	}

	let { prop0_8, prop1_8, prop2_8 }: Props = $props();

	const deps = [{ id: "dep-27", value: compute27_0(8, 0) }, { id: "dep-10", value: compute10_1(8, 1) }, { id: "dep-23", value: compute23_2(8, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-8">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_8}</p>
	<p>Prop1: {prop1_8}</p>
	<p>Prop2: {prop2_8}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-8 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
