<script lang="ts">
	let count = $state(0);
	let title = $state("Component 11");
	import { compute18_0 } from "../lib/utils/module18";
	import type { Entity18 } from "../lib/models/entity18";
	import { compute1_1 } from "../lib/utils/module1";
	import type { Entity1 } from "../lib/models/entity1";
	import { compute14_2 } from "../lib/utils/module14";
	import type { Entity14 } from "../lib/models/entity14";

	interface Props {
		prop0_11: string;
		prop1_11: string;
		prop2_11: string;
	}

	let { prop0_11, prop1_11, prop2_11 }: Props = $props();

	const deps = [{ id: "dep-18", value: compute18_0(11, 0) }, { id: "dep-1", value: compute1_1(11, 1) }, { id: "dep-14", value: compute14_2(11, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-11">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_11}</p>
	<p>Prop1: {prop1_11}</p>
	<p>Prop2: {prop2_11}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-11 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
