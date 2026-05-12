<script lang="ts">
	let count = $state(0);
	let title = $state("Component 26");
	import { compute3_0 } from "../lib/utils/module3";
	import type { Entity3 } from "../lib/models/entity3";
	import { compute16_1 } from "../lib/utils/module16";
	import type { Entity16 } from "../lib/models/entity16";
	import { compute29_2 } from "../lib/utils/module29";
	import type { Entity29 } from "../lib/models/entity29";

	interface Props {
		prop0_26: string;
		prop1_26: string;
		prop2_26: string;
	}

	let { prop0_26, prop1_26, prop2_26 }: Props = $props();

	const deps = [{ id: "dep-3", value: compute3_0(26, 0) }, { id: "dep-16", value: compute16_1(26, 1) }, { id: "dep-29", value: compute29_2(26, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-26">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_26}</p>
	<p>Prop1: {prop1_26}</p>
	<p>Prop2: {prop2_26}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-26 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
