<script lang="ts">
	let count = $state(0);
	let title = $state("Component 28");
	import { compute17_0 } from "../lib/utils/module17";
	import type { Entity17 } from "../lib/models/entity17";
	import { compute30_1 } from "../lib/utils/module30";
	import type { Entity30 } from "../lib/models/entity30";
	import { compute13_2 } from "../lib/utils/module13";
	import type { Entity13 } from "../lib/models/entity13";

	interface Props {
		prop0_28: string;
		prop1_28: string;
		prop2_28: string;
	}

	let { prop0_28, prop1_28, prop2_28 }: Props = $props();

	const deps = [{ id: "dep-17", value: compute17_0(28, 0) }, { id: "dep-30", value: compute30_1(28, 1) }, { id: "dep-13", value: compute13_2(28, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-28">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_28}</p>
	<p>Prop1: {prop1_28}</p>
	<p>Prop2: {prop2_28}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-28 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
