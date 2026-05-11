<script lang="ts">
	let count = $state(0);
	let title = $state("Component 22");
	import { compute5_0 } from "../lib/utils/module5";
	import type { Entity5 } from "../lib/models/entity5";
	import { compute18_1 } from "../lib/utils/module18";
	import type { Entity18 } from "../lib/models/entity18";
	import { compute1_2 } from "../lib/utils/module1";
	import type { Entity1 } from "../lib/models/entity1";

	interface Props {
		prop0_22: string;
		prop1_22: string;
		prop2_22: string;
	}

	let { prop0_22, prop1_22, prop2_22 }: Props = $props();

	const deps = [{ id: "dep-5", value: compute5_0(22, 0) }, { id: "dep-18", value: compute18_1(22, 1) }, { id: "dep-1", value: compute1_2(22, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-22">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_22}</p>
	<p>Prop1: {prop1_22}</p>
	<p>Prop2: {prop2_22}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-22 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
