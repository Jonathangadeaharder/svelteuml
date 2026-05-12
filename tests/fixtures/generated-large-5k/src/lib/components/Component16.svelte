<script lang="ts">
	let count = $state(0);
	let title = $state("Component 16");
	import { compute23_0 } from "../lib/utils/module23";
	import type { Entity23 } from "../lib/models/entity23";
	import { compute6_1 } from "../lib/utils/module6";
	import type { Entity6 } from "../lib/models/entity6";
	import { compute19_2 } from "../lib/utils/module19";
	import type { Entity19 } from "../lib/models/entity19";

	interface Props {
		prop0_16: string;
		prop1_16: string;
		prop2_16: string;
	}

	let { prop0_16, prop1_16, prop2_16 }: Props = $props();

	const deps = [{ id: "dep-23", value: compute23_0(16, 0) }, { id: "dep-6", value: compute6_1(16, 1) }, { id: "dep-19", value: compute19_2(16, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-16">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_16}</p>
	<p>Prop1: {prop1_16}</p>
	<p>Prop2: {prop2_16}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-16 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
