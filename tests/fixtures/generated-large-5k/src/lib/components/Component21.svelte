<script lang="ts">
	let count = $state(0);
	let title = $state("Component 21");
	import { compute28_0 } from "../lib/utils/module28";
	import type { Entity28 } from "../lib/models/entity28";
	import { compute11_1 } from "../lib/utils/module11";
	import type { Entity11 } from "../lib/models/entity11";
	import { compute24_2 } from "../lib/utils/module24";
	import type { Entity24 } from "../lib/models/entity24";

	interface Props {
		prop0_21: string;
		prop1_21: string;
		prop2_21: string;
	}

	let { prop0_21, prop1_21, prop2_21 }: Props = $props();

	const deps = [{ id: "dep-28", value: compute28_0(21, 0) }, { id: "dep-11", value: compute11_1(21, 1) }, { id: "dep-24", value: compute24_2(21, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-21">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_21}</p>
	<p>Prop1: {prop1_21}</p>
	<p>Prop2: {prop2_21}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-21 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
