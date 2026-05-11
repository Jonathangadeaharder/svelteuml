<script lang="ts">
	let count = $state(0);
	let title = $state("Component 2");
	import { compute15_0 } from "../lib/utils/module15";
	import type { Entity15 } from "../lib/models/entity15";
	import { compute28_1 } from "../lib/utils/module28";
	import type { Entity28 } from "../lib/models/entity28";
	import { compute11_2 } from "../lib/utils/module11";
	import type { Entity11 } from "../lib/models/entity11";

	interface Props {
		prop0_2: string;
		prop1_2: string;
		prop2_2: string;
	}

	let { prop0_2, prop1_2, prop2_2 }: Props = $props();

	const deps = [{ id: "dep-15", value: compute15_0(2, 0) }, { id: "dep-28", value: compute28_1(2, 1) }, { id: "dep-11", value: compute11_2(2, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-2">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_2}</p>
	<p>Prop1: {prop1_2}</p>
	<p>Prop2: {prop2_2}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-2 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
