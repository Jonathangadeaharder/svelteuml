<script lang="ts">
	let count = $state(0);
	let title = $state("Component 3");
	import { compute22_0 } from "../lib/utils/module22";
	import type { Entity22 } from "../lib/models/entity22";
	import { compute5_1 } from "../lib/utils/module5";
	import type { Entity5 } from "../lib/models/entity5";
	import { compute18_2 } from "../lib/utils/module18";
	import type { Entity18 } from "../lib/models/entity18";

	interface Props {
		prop0_3: string;
		prop1_3: string;
		prop2_3: string;
	}

	let { prop0_3, prop1_3, prop2_3 }: Props = $props();

	const deps = [{ id: "dep-22", value: compute22_0(3, 0) }, { id: "dep-5", value: compute5_1(3, 1) }, { id: "dep-18", value: compute18_2(3, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-3">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_3}</p>
	<p>Prop1: {prop1_3}</p>
	<p>Prop2: {prop2_3}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-3 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
