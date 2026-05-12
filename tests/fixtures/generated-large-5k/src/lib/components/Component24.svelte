<script lang="ts">
	let count = $state(0);
	let title = $state("Component 24");
	import { compute19_0 } from "../lib/utils/module19";
	import type { Entity19 } from "../lib/models/entity19";
	import { compute2_1 } from "../lib/utils/module2";
	import type { Entity2 } from "../lib/models/entity2";
	import { compute15_2 } from "../lib/utils/module15";
	import type { Entity15 } from "../lib/models/entity15";

	interface Props {
		prop0_24: string;
		prop1_24: string;
		prop2_24: string;
	}

	let { prop0_24, prop1_24, prop2_24 }: Props = $props();

	const deps = [{ id: "dep-19", value: compute19_0(24, 0) }, { id: "dep-2", value: compute2_1(24, 1) }, { id: "dep-15", value: compute15_2(24, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-24">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_24}</p>
	<p>Prop1: {prop1_24}</p>
	<p>Prop2: {prop2_24}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-24 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
