<script lang="ts">
	let count = $state(0);
	let title = $state("Component 27");
	import { compute10_0 } from "../lib/utils/module10";
	import type { Entity10 } from "../lib/models/entity10";
	import { compute23_1 } from "../lib/utils/module23";
	import type { Entity23 } from "../lib/models/entity23";
	import { compute6_2 } from "../lib/utils/module6";
	import type { Entity6 } from "../lib/models/entity6";

	interface Props {
		prop0_27: string;
		prop1_27: string;
		prop2_27: string;
	}

	let { prop0_27, prop1_27, prop2_27 }: Props = $props();

	const deps = [{ id: "dep-10", value: compute10_0(27, 0) }, { id: "dep-23", value: compute23_1(27, 1) }, { id: "dep-6", value: compute6_2(27, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-27">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_27}</p>
	<p>Prop1: {prop1_27}</p>
	<p>Prop2: {prop2_27}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-27 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
