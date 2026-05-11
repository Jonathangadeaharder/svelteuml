<script lang="ts">
	let count = $state(0);
	let title = $state("Component 15");
	import { compute16_0 } from "../lib/utils/module16";
	import type { Entity16 } from "../lib/models/entity16";
	import { compute29_1 } from "../lib/utils/module29";
	import type { Entity29 } from "../lib/models/entity29";
	import { compute12_2 } from "../lib/utils/module12";
	import type { Entity12 } from "../lib/models/entity12";

	interface Props {
		prop0_15: string;
		prop1_15: string;
		prop2_15: string;
	}

	let { prop0_15, prop1_15, prop2_15 }: Props = $props();

	const deps = [{ id: "dep-16", value: compute16_0(15, 0) }, { id: "dep-29", value: compute29_1(15, 1) }, { id: "dep-12", value: compute12_2(15, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-15">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_15}</p>
	<p>Prop1: {prop1_15}</p>
	<p>Prop2: {prop2_15}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-15 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
