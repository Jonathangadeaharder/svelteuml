<script lang="ts">
	let count = $state(0);
	let title = $state("Component 1");
	import { compute8_0 } from "../lib/utils/module8";
	import type { Entity8 } from "../lib/models/entity8";
	import { compute21_1 } from "../lib/utils/module21";
	import type { Entity21 } from "../lib/models/entity21";
	import { compute4_2 } from "../lib/utils/module4";
	import type { Entity4 } from "../lib/models/entity4";

	interface Props {
		prop0_1: string;
		prop1_1: string;
		prop2_1: string;
	}

	let { prop0_1, prop1_1, prop2_1 }: Props = $props();

	const deps = [{ id: "dep-8", value: compute8_0(1, 0) }, { id: "dep-21", value: compute21_1(1, 1) }, { id: "dep-4", value: compute4_2(1, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-1">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_1}</p>
	<p>Prop1: {prop1_1}</p>
	<p>Prop2: {prop2_1}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-1 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
