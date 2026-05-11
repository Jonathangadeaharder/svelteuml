<script lang="ts">
	let count = $state(0);
	let title = $state("Component 12");
	import { compute25_0 } from "../lib/utils/module25";
	import type { Entity25 } from "../lib/models/entity25";
	import { compute8_1 } from "../lib/utils/module8";
	import type { Entity8 } from "../lib/models/entity8";
	import { compute21_2 } from "../lib/utils/module21";
	import type { Entity21 } from "../lib/models/entity21";

	interface Props {
		prop0_12: string;
		prop1_12: string;
		prop2_12: string;
	}

	let { prop0_12, prop1_12, prop2_12 }: Props = $props();

	const deps = [{ id: "dep-25", value: compute25_0(12, 0) }, { id: "dep-8", value: compute8_1(12, 1) }, { id: "dep-21", value: compute21_2(12, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-12">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_12}</p>
	<p>Prop1: {prop1_12}</p>
	<p>Prop2: {prop2_12}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-12 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
