<script lang="ts">
	let count = $state(0);
	let title = $state("Component 13");
	import { compute2_0 } from "../lib/utils/module2";
	import type { Entity2 } from "../lib/models/entity2";
	import { compute15_1 } from "../lib/utils/module15";
	import type { Entity15 } from "../lib/models/entity15";
	import { compute28_2 } from "../lib/utils/module28";
	import type { Entity28 } from "../lib/models/entity28";

	interface Props {
		prop0_13: string;
		prop1_13: string;
		prop2_13: string;
	}

	let { prop0_13, prop1_13, prop2_13 }: Props = $props();

	const deps = [{ id: "dep-2", value: compute2_0(13, 0) }, { id: "dep-15", value: compute15_1(13, 1) }, { id: "dep-28", value: compute28_2(13, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-13">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_13}</p>
	<p>Prop1: {prop1_13}</p>
	<p>Prop2: {prop2_13}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-13 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
