<script lang="ts">
	let count = $state(0);
	let title = $state("Component 23");
	import { compute12_0 } from "../lib/utils/module12";
	import type { Entity12 } from "../lib/models/entity12";
	import { compute25_1 } from "../lib/utils/module25";
	import type { Entity25 } from "../lib/models/entity25";
	import { compute8_2 } from "../lib/utils/module8";
	import type { Entity8 } from "../lib/models/entity8";

	interface Props {
		prop0_23: string;
		prop1_23: string;
		prop2_23: string;
	}

	let { prop0_23, prop1_23, prop2_23 }: Props = $props();

	const deps = [{ id: "dep-12", value: compute12_0(23, 0) }, { id: "dep-25", value: compute25_1(23, 1) }, { id: "dep-8", value: compute8_2(23, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-23">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_23}</p>
	<p>Prop1: {prop1_23}</p>
	<p>Prop2: {prop2_23}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-23 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
