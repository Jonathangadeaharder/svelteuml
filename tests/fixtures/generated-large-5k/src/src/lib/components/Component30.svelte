<script lang="ts">
	let count = $state(0);
	let title = $state("Component 30");
	import { compute1_0 } from "../lib/utils/module1";
	import type { Entity1 } from "../lib/models/entity1";
	import { compute14_1 } from "../lib/utils/module14";
	import type { Entity14 } from "../lib/models/entity14";
	import { compute27_2 } from "../lib/utils/module27";
	import type { Entity27 } from "../lib/models/entity27";

	interface Props {
		prop0_30: string;
		prop1_30: string;
		prop2_30: string;
	}

	let { prop0_30, prop1_30, prop2_30 }: Props = $props();

	const deps = [{ id: "dep-1", value: compute1_0(30, 0) }, { id: "dep-14", value: compute14_1(30, 1) }, { id: "dep-27", value: compute27_2(30, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-30">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_30}</p>
	<p>Prop1: {prop1_30}</p>
	<p>Prop2: {prop2_30}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-30 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
