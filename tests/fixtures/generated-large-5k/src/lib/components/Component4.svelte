<script lang="ts">
	let count = $state(0);
	let title = $state("Component 4");
	import { compute29_0 } from "../lib/utils/module29";
	import type { Entity29 } from "../lib/models/entity29";
	import { compute12_1 } from "../lib/utils/module12";
	import type { Entity12 } from "../lib/models/entity12";
	import { compute25_2 } from "../lib/utils/module25";
	import type { Entity25 } from "../lib/models/entity25";

	interface Props {
		prop0_4: string;
		prop1_4: string;
		prop2_4: string;
	}

	let { prop0_4, prop1_4, prop2_4 }: Props = $props();

	const deps = [{ id: "dep-29", value: compute29_0(4, 0) }, { id: "dep-12", value: compute12_1(4, 1) }, { id: "dep-25", value: compute25_2(4, 2) }];

	function increment() {
		count += 1;
	}

	function reset() {
		count = 0;
	}
</script>

<div class="component-4">
	<h2>{title}</h2>
	<p>Count: {count}</p>
	<p>Prop0: {prop0_4}</p>
	<p>Prop1: {prop1_4}</p>
	<p>Prop2: {prop2_4}</p>
	<button onclick={increment}>+</button>
	<button onclick={reset}>Reset</button>
	{#each deps as dep}
		<span>{dep.id}: {dep.value}</span>
	{/each}
</div>

<style>
	.component-4 {
		padding: 1rem;
		margin: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>
