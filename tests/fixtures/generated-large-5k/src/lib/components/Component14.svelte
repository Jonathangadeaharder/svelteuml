<script lang="ts">
	let count = $state(0);
	let title = $state("Component 14");
	import { compute9_0 } from "../lib/utils/module9";
	import type { Entity9 } from "../lib/models/entity9";
	import { compute22_1 } from "../lib/utils/module22";
	import type { Entity22 } from "../lib/models/entity22";
	import { compute5_2 } from "../lib/utils/module5";
	import type { Entity5 } from "../lib/models/entity5";

	interface Props {
		prop0_14: string;
		prop1_14: string;
		prop2_14: string;
	}

	let { prop0_14, prop1_14, prop2_14 }: Props = $props();

	const deps = [{ id: "dep-9", value: compute9_0(14, 0) }, { id: "dep-22", value: compute22_1(14, 1) }, { id: "dep-5", value: compute5_2(14, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-14">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_14}</p>
	<p>Prop1: {prop1_14}</p>
	<p>Prop2: {prop2_14}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-14 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
