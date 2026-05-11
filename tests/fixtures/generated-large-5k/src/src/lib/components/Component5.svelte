<script lang="ts">
	let count = $state(0);
	let title = $state("Component 5");
	import { compute6_0 } from "../lib/utils/module6";
	import type { Entity6 } from "../lib/models/entity6";
	import { compute19_1 } from "../lib/utils/module19";
	import type { Entity19 } from "../lib/models/entity19";
	import { compute2_2 } from "../lib/utils/module2";
	import type { Entity2 } from "../lib/models/entity2";

	interface Props {
		prop0_5: string;
		prop1_5: string;
		prop2_5: string;
	}

	let { prop0_5, prop1_5, prop2_5 }: Props = $props();

	const deps = [{ id: "dep-6", value: compute6_0(5, 0) }, { id: "dep-19", value: compute19_1(5, 1) }, { id: "dep-2", value: compute2_2(5, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-5">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_5}</p>
	<p>Prop1: {prop1_5}</p>
	<p>Prop2: {prop2_5}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-5 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
